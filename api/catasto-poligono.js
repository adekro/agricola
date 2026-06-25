/**
 * API endpoint to fetch cadastral parcel polygon from the Agenzia delle Entrate WFS.
 * Uses CQL_FILTER to find parcels by LABEL or NATIONALCADASTRALREFERENCE.
 * Coordinate parsing includes EPSG:6706 → EPSG:4326 conversion.
 *
 * GET /api/catasto-poligono?comune=PINAROLO+PO&foglio=5&mappale=166
 * GET /api/catasto-poligono?label=ACQUA001
 * GET /api/catasto-poligono?nationalRef=A000A090500.ACQUA001
 */
import { XMLParser } from "fast-xml-parser";
import proj4 from "proj4";

proj4.defs(
  "EPSG:6706",
  "+proj=longlat +ellps=WGS84 +towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +no_defs +type=crs",
);

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  isArray: (name) => ["wfs:member", "gml:posList", "gml:pos"].includes(name),
});

const WFS_URL =
  "https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php";

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

export default async function handler(req, res) {
  const { label, nationalRef, foglio, mappale } = req.query;

  // Build CQL filter
  let cqlFilter = "";
  if (label) {
    cqlFilter = `LABEL LIKE '%${label}%'`;
  } else if (nationalRef) {
    cqlFilter = `NATIONALCADASTRALREFERENCE LIKE '%${nationalRef}%'`;
  } else if (foglio && mappale) {
    const f = foglio.replace(/^0+/, "");
    const m = mappale.replace(/^0+/, "");
    cqlFilter = `LABEL LIKE '%${f}${m}%'`;
  } else {
    return res.status(400).json({
      error: "Specificare label, nationalRef o (foglio + mappale)",
    });
  }

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

    if (!xmlText.includes("<wfs:member>")) {
      return res.status(404).json({
        error: "Particella non trovata",
        filter: cqlFilter,
      });
    }

    let parsed;
    try {
      parsed = XML_PARSER.parse(xmlText);
    } catch (e) {
      return res.status(502).json({
        error: "Errore parsing XML",
        preview: xmlText.substring(0, 500),
      });
    }

    const fc = parsed["wfs:FeatureCollection"];
    if (!fc?.["wfs:member"]?.length) {
      return res.status(404).json({ error: "Particella non trovata" });
    }

    const feat = fc["wfs:member"][0];
    const parcel = feat["CP:CadastralParcel"] || feat;
    const geometry = parcel["CP:msGeometry"] || parcel;
    const coords = extractGeometry(geometry);

    if (!coords?.length) {
      return res.status(502).json({ error: "Geometria non valida" });
    }

    return res.status(200).json({
      label: getTextContent(parcel["CP:LABEL"]) || "",
      inspireId: getTextContent(parcel["CP:INSPIREID_LOCALID"]) || "",
      nationalCadastralReference:
        getTextContent(parcel["CP:NATIONALCADASTRALREFERENCE"]) || "",
      administrativeUnit: getTextContent(parcel["CP:ADMINISTRATIVEUNIT"]) || "",
      geometry: { type: "Polygon", coordinates: [coords] },
      feature: {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
      },
    });
  } catch (error) {
    console.error("Catasto Poligono Error:", error);
    return res.status(500).json({
      error: "Errore interno del server",
      message: error.message,
    });
  }
}
