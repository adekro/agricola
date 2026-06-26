/**
 * API endpoint that tries to retrieve a parcel geometry from the INSPIRE WFS.
 * The WFS is known to expose demo data, so every match is treated as untrusted
 * until it passes a strict validation against the requested comune/foglio/mappale.
 *
 * GET /api/catasto-poligono?comune=STRADELLA&foglio=2&mappale=5
 */
import { XMLParser } from "fast-xml-parser";
import proj4 from "proj4";

proj4.defs(
  "EPSG:6706",
  "+proj=longlat +ellps=GRS80 +no_defs +type=crs",
);

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  isArray: (name) => ["wfs:member", "gml:posList", "gml:pos"].includes(name),
});

const WFS_URL =
  "https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeNumeric(value) {
  return String(value || "").trim().replace(/^0+/, "") || "0";
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

function buildStrongMatchPatterns(foglio, mappale) {
  const escapedFoglio = foglio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedMappale = mappale.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return [
    new RegExp(`(?:^|\\D)${escapedFoglio}[./\\-\\s]+${escapedMappale}(?:\\D|$)`),
    new RegExp(`(?:^|\\D)${escapedFoglio}${escapedMappale}(?:\\D|$)`),
    new RegExp(`(?:^|\\D)${escapedMappale.padStart(4, "0")}(?:\\D|$)`),
  ];
}

export function validateWfsParcel(parcel, { comune, foglio, mappale }) {
  const normalizedComune = normalizeText(comune);
  const normalizedFoglio = normalizeNumeric(foglio);
  const normalizedMappale = normalizeNumeric(mappale);
  const label = getTextContent(parcel?.["CP:LABEL"]) || "";
  const nationalRef =
    getTextContent(parcel?.["CP:NATIONALCADASTRALREFERENCE"]) || "";

  const flattenedTexts = collectTextContent(parcel);
  const normalizedTexts = flattenedTexts.map(normalizeText).filter(Boolean);
  const combinedText = normalizedTexts.join(" ");

  if (!combinedText) {
    return {
      valid: false,
      reason: "Risposta WFS priva di metadati utili",
    };
  }

  if (
    normalizedTexts.some(
      (value) =>
        value.startsWith("ACQUA") ||
        value.includes("DATI DIMOSTRATIVI") ||
        value.includes("DEMO"),
    )
  ) {
    return {
      valid: false,
      reason: "Risposta WFS dimostrativa",
    };
  }

  if (!normalizedTexts.some((value) => value.includes(normalizedComune))) {
    return {
      valid: false,
      reason: "Risposta WFS non coerente con il comune richiesto",
    };
  }

  const textsToCheck = [label, nationalRef, ...flattenedTexts]
    .map(normalizeText)
    .filter(Boolean);
  const patterns = buildStrongMatchPatterns(normalizedFoglio, normalizedMappale);
  const hasStrongParcelMatch = textsToCheck.some((value) =>
    patterns.some((pattern) => pattern.test(value)),
  );

  if (!hasStrongParcelMatch) {
    return {
      valid: false,
      reason: "Risposta WFS non coerente con foglio e mappale richiesti",
    };
  }

  return {
    valid: true,
  };
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

  // Try multiple CQL filter patterns on WFS. Any response still requires validation.
  const filters = [
    `LABEL LIKE '%${f}${m}%'`,
    `LABEL LIKE '%${f}.${m}%'`,
    `LABEL LIKE '%${m.padStart(4, "0")}%'`,
    `LABEL LIKE '%${m.padStart(3, "0")}%'`,
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
        const parsed = XML_PARSER.parse(xmlText);
        const fc = parsed["wfs:FeatureCollection"];
        const member = fc?.["wfs:member"]?.[0];
        if (member) {
          const parcel = member["CP:CadastralParcel"] || member;
          const validation = validateWfsParcel(parcel, {
            comune: c,
            foglio: f,
            mappale: m,
          });

          if (!validation.valid) {
            continue;
          }

          const geometry = parcel["CP:msGeometry"] || parcel;
          const coords = extractGeometry(geometry);

          if (coords?.length) {
            const label = getTextContent(parcel["CP:LABEL"]) || "";
            return res.status(200).json({
              comune: c,
              foglio,
              mappale,
              label,
              validated: true,
              geometry: { type: "Polygon", coordinates: [coords] },
              feature: {
                type: "Feature",
                geometry: { type: "Polygon", coordinates: [coords] },
                properties: { label, comune: c, validated: true },
              },
            });
          }
        }
      }
    } catch {
      // Continue to next filter
    }
  }

  // Not found from WFS - tell the frontend
  return res.status(404).json({
    error: "Nessun match WFS affidabile per questa particella. Usa il layer WMS.",
    comune: c,
    foglio: f,
    mappale: m,
  });
}
