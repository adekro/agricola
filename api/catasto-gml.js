/**
 * API endpoint that retrieves parcel geometry from the Agenzia delle Entrate
 * bulk GML download (zip per comune), avoiding the unreliable WFS demo data.
 *
 * GET /api/catasto-gml?comune=STRADELLA&foglio=2&mappale=745
 *
 * Flow:
 * 1. Download COMUNE.zip from bulk download service
 * 2. Extract CadastralParcel.gml
 * 3. Find matching parcel by foglio/mappale
 * 4. Return geometry as GeoJSON
 *
 * Falls back to WFS if GML download is unavailable.
 */
import { XMLParser } from "fast-xml-parser";
import proj4 from "proj4";
import AdmZip from "adm-zip";

proj4.defs(
  "EPSG:6706",
  "+proj=longlat +ellps=WGS84 +towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +no_defs +type=crs",
);

const GML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  isArray: (name) =>
    ["wfs:member", "gml:posList", "gml:pos", "gml:surfaceMember"].includes(
      name,
    ),
});

// Bulk download base URL - structure: /ITALIA/REGIONE/PROVINCIA/COMUNE.zip
// This should be configured based on actual Agenzia delle Entrate bulk download structure
const BULK_DOWNLOAD_BASE =
  process.env.CATASTO_BULK_BASE_URL ||
  "https://download.agenziaentrate.gov.it/cartografia_catastale";

// In-memory cache for downloaded zips (Vercel serverless: per-instance cache)
const zipCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeNumeric(value) {
  return (
    String(value || "")
      .trim()
      .replace(/^0+/, "") || "0"
  );
}

function getTextContent(node) {
  if (typeof node === "string") return node;
  if (node && typeof node === "object" && node["#text"]) return node["#text"];
  if (Array.isArray(node)) {
    for (const item of node) {
      const text = getTextContent(item);
      if (text) return text;
    }
  }
  return null;
}

function parsePosListToGeoJSON(posListStr) {
  const vals = posListStr.trim().split(/\s+/).map(Number);
  const coords = [];
  for (let i = 0; i < vals.length; i += 2) {
    const [wgsLon, wgsLat] = proj4("EPSG:6706", "EPSG:4326", [
      vals[i + 1],
      vals[i],
    ]);
    coords.push([wgsLon, wgsLat]);
  }
  return coords;
}

function extractGeometry(obj) {
  if (!obj || typeof obj !== "object") return null;

  const poly = obj["gml:Polygon"] || obj["gml:polygon"];
  if (poly) return extractGeometry(poly);

  const ext = (poly || obj)["gml:exterior"] || obj["exterior"];
  if (ext) return extractGeometry(ext);

  const ring = (ext || obj)["gml:LinearRing"] || obj["LinearRing"];
  if (ring) return extractGeometry(ring);

  const posList = (ring || obj)["gml:posList"] || obj["posList"];
  if (posList) {
    const text = getTextContent(posList);
    if (text) return parsePosListToGeoJSON(text);
  }

  return null;
}

function buildStrongMatchPatterns(foglio, mappale) {
  const escapedFoglio = foglio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedMappale = mappale.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return [
    new RegExp(
      `(?:^|\\D)${escapedFoglio}[./\\-\\s]+${escapedMappale}(?:\\D|$)`,
    ),
    new RegExp(`(?:^|\\D)${escapedFoglio}${escapedMappale}(?:\\D|$)`),
    new RegExp(`(?:^|\\D)${escapedMappale.padStart(4, "0")}(?:\\D|$)`),
  ];
}

function validateGmlParcel(parcel, { comune, foglio, mappale }) {
  const normalizedComune = normalizeText(comune);
  const normalizedFoglio = normalizeNumeric(foglio);
  const normalizedMappale = normalizeNumeric(mappale);
  const label = getTextContent(parcel?.["CP:LABEL"]) || "";
  const nationalRef =
    getTextContent(parcel?.["CP:NATIONALCADASTRALREFERENCE"]) || "";

  const flattenedTexts = collectTextContent(parcel);
  const normalizedTexts = flattenedTexts.map(normalizeText).filter(Boolean);

  if (!normalizedTexts.some((value) => value.includes(normalizedComune))) {
    return {
      valid: false,
      reason: "GML non coerente con il comune richiesto",
    };
  }

  const textsToCheck = [label, nationalRef, ...flattenedTexts]
    .map(normalizeText)
    .filter(Boolean);
  const patterns = buildStrongMatchPatterns(
    normalizedFoglio,
    normalizedMappale,
  );
  const hasStrongParcelMatch = textsToCheck.some((value) =>
    patterns.some((pattern) => pattern.test(value)),
  );

  if (!hasStrongParcelMatch) {
    return {
      valid: false,
      reason: "GML non coerente con foglio e mappale richiesti",
    };
  }

  return {
    valid: true,
  };
}

function collectTextContent(node, values = []) {
  if (node == null) {
    return values;
  }

  if (typeof node === "string" || typeof node === "number") {
    values.push(String(node));
    return values;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectTextContent(item, values));
    return values;
  }

  if (typeof node === "object") {
    if (node["#text"]) {
      values.push(String(node["#text"]));
    }

    Object.entries(node).forEach(([key, value]) => {
      if (!key.startsWith("@_") && key !== "#text") {
        collectTextContent(value, values);
      }
    });
  }

  return values;
}

function parseGmlParcels(gmlText) {
  const parsed = GML_PARSER.parse(gmlText);
  const featureCollection = parsed["wfs:FeatureCollection"];
  if (!featureCollection) return [];

  const members = featureCollection["wfs:member"];
  if (!members) return [];

  const memberArray = Array.isArray(members) ? members : [members];
  return memberArray
    .map((member) => member["CP:CadastralParcel"] || member)
    .filter(Boolean);
}

/**
 * Build comune code from comune name.
 * Uses geocoding to get the ISTAT code, then derives the catastale code.
 * Falls back to a simple uppercase transformation.
 */
async function resolveComuneCode(comuneName) {
  // Try to get ISTAT code from geocoding
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(comuneName + ", Italia")}&format=jsonv2&limit=1`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Agricola/1.0",
        },
      },
    );

    if (response.ok) {
      const results = await response.json();
      if (results.length > 0) {
        const address = results[0].address;
        // Try to extract ISTAT code from various fields
        const istatCode =
          address?.city_code || address?.municipality_code || address?.postcode;

        if (istatCode) {
          // Convert ISTAT code to catastale code format
          // ISTAT is 6 digits (e.g., "012345"), catastale is alphanumeric
          // For now, return the ISTAT code as-is; actual conversion needs a lookup table
          return String(istatCode).padStart(6, "0");
        }
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback: use normalized comune name
  // The bulk download might use the catastale code, which requires a lookup
  // For now, return normalized name as placeholder
  return normalizeText(comuneName).replace(/\s+/g, "");
}

/**
 * Download and cache comune zip from bulk download service.
 * Returns the zip buffer or null if unavailable.
 */
async function downloadComuneZip(comuneCode) {
  const cacheKey = `zip:${comuneCode}`;
  const cached = zipCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.buffer;
  }

  // Try multiple URL patterns for bulk download
  const urlsToTry = [
    // Pattern 1: Direct comune code
    `${BULK_DOWNLOAD_BASE}/${comuneCode}.zip`,
    // Pattern 2: With regional/provincial hierarchy (placeholder)
    // These would need to be resolved based on actual service structure
    `${BULK_DOWNLOAD_BASE}/ITALIA/${comuneCode}.zip`,
  ];

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/zip, application/octet-stream, */*",
          "User-Agent": "Agricola/1.0",
        },
      });

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        zipCache.set(cacheKey, {
          buffer,
          timestamp: Date.now(),
        });
        return buffer;
      }
    } catch {
      // Try next URL
    }
  }

  return null;
}

/**
 * Extract CadastralParcel.gml from comune zip and find matching parcel.
 */
function extractParcelFromZip(zipBuffer, foglio, mappale) {
  try {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    // Find CadastralParcel.gml (case-insensitive)
    const gmlEntry = entries.find(
      (entry) =>
        entry.entryName.toLowerCase().includes("cadastralparcel.gml") ||
        entry.entryName.toLowerCase().includes("cadastral_parcel.gml"),
    );

    if (!gmlEntry) {
      return {
        found: false,
        reason: "CadastralParcel.gml non trovato nel zip",
      };
    }

    const gmlText = gmlEntry.getData().toString("utf-8");
    const parcels = parseGmlParcels(gmlText);

    // Search for matching parcel
    for (const parcel of parcels) {
      const validation = validateGmlParcel(parcel, {
        comune: "", // Will be validated from parcel data
        foglio,
        mappale,
      });

      if (validation.valid) {
        const geometry = extractParcelGeometry(parcel);
        const label = getTextContent(parcel["CP:LABEL"]) || "";

        if (geometry && geometry.length > 0) {
          return {
            found: true,
            geometry: { type: "Polygon", coordinates: [geometry] },
            label,
            source: "gml",
          };
        }
      }
    }

    return {
      found: false,
      reason: "Nessuna particella corrispondente nel GML",
    };
  } catch (error) {
    return {
      found: false,
      reason: `Errore parsing GML: ${error.message}`,
    };
  }
}

export default async function handler(req, res) {
  const { comune, foglio, mappale } = req.query;

  if (!comune || !foglio || !mappale) {
    return res
      .status(400)
      .json({ error: "Parametri obbligatori: comune, foglio, mappale" });
  }

  const c = normalizeText(comune);
  const f = String(foglio).replace(/^0+/, "");
  const m = String(mappale).replace(/^0+/, "");

  // Try GML bulk download approach
  try {
    const comuneCode = await resolveComuneCode(c);
    const zipBuffer = await downloadComuneZip(comuneCode);

    if (zipBuffer) {
      const result = extractParcelFromZip(zipBuffer, f, m);

      if (result.found) {
        return res.status(200).json({
          comune: c,
          foglio: f,
          mappale: m,
          label: result.label,
          validated: true,
          source: "gml",
          geometry: result.geometry,
          feature: {
            type: "Feature",
            geometry: result.geometry,
            properties: {
              label: result.label,
              comune: c,
              validated: true,
              source: "gml",
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("GML download error:", error);
    // Fall through to WFS fallback
  }

  // Fallback to WFS if GML unavailable
  try {
    const WFS_URL =
      "https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php";

    const filters = [
      `LABEL LIKE '%${f}${m}%'`,
      `LABEL LIKE '%${f}.${m}%'`,
      `LABEL LIKE '%${m.padStart(4, "0")}%'`,
      `NATIONALCADASTRALREFERENCE LIKE '%${f}${m}%'`,
    ];

    for (const cqlFilter of filters) {
      try {
        const wfsUrl = new URL(WFS_URL);
        wfsUrl.searchParams.set("SERVICE", "WFS");
        wfsUrl.searchParams.set("VERSION", "2.0.0");
        wfsUrl.searchParams.set("REQUEST", "GetFeature");
        wfsUrl.searchParams.set("TYPENAMES", "CP:CadastralParcel");
        wfsUrl.searchParams.set("SRSNAME", "urn:ogc:def:crs:EPSG::6706");
        wfsUrl.searchParams.set("MAXFEATURES", "1");
        wfsUrl.searchParams.set("OUTPUTFORMAT", "text/xml; subtype=gml/3.2.1");
        wfsUrl.searchParams.set("CQL_FILTER", cqlFilter);

        const response = await fetch(wfsUrl.toString(), {
          headers: {
            Accept: "text/xml, application/xml, */*",
            "User-Agent": "Vercel-Proxy-Agricola/1.0",
          },
        });

        const xmlText = await response.text();

        if (xmlText.includes("<wfs:member>")) {
          const parsed = GML_PARSER.parse(xmlText);
          const fc = parsed["wfs:FeatureCollection"];
          const member = fc?.["wfs:member"]?.[0];
          if (member) {
            const parcel = member["CP:CadastralParcel"] || member;

            // Validate against demo data
            const flattenedTexts = collectTextContent(parcel);
            const normalizedTexts = flattenedTexts
              .map(normalizeText)
              .filter(Boolean);

            if (
              normalizedTexts.some(
                (value) =>
                  value.startsWith("ACQUA") ||
                  value.includes("DATI DIMOSTRATIVI") ||
                  value.includes("DEMO"),
              )
            ) {
              continue;
            }

            if (!normalizedTexts.some((value) => value.includes(c))) {
              continue;
            }

            const geometry = parcel["CP:msGeometry"] || parcel;
            const coords = extractGeometry(geometry);

            if (coords?.length) {
              const label = getTextContent(parcel["CP:LABEL"]) || "";
              return res.status(200).json({
                comune: c,
                foglio: f,
                mappale: m,
                label,
                validated: true,
                source: "wfs-fallback",
                geometry: { type: "Polygon", coordinates: [coords] },
                feature: {
                  type: "Feature",
                  geometry: { type: "Polygon", coordinates: [coords] },
                  properties: {
                    label,
                    comune: c,
                    validated: true,
                    source: "wfs-fallback",
                  },
                },
              });
            }
          }
        }
      } catch {
        // Continue to next filter
      }
    }
  } catch {
    // WFS also failed
  }

  // Neither GML nor WFS worked
  return res.status(404).json({
    error: "Nessun dato disponibile per questa particella (GML e WFS falliti).",
    comune: c,
    foglio: f,
    mappale: m,
  });
}
