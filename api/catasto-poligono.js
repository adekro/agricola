/**
 * API endpoint that proxies the WMS GetFeatureInfo to return parcel data.
 * WFS has only demo data, so we use WMS + CQL_FILTER for real parcels.
 *
 * GET /api/catasto-poligono?foglio=2&mappale=5
 *
 * We search for the parcel label by trying multiple CQL patterns on the WFS.
 * If not found, return 404 (the frontend will use WMS highlight instead).
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
  const { foglio, mappale } = req.query;

  if (!foglio || !mappale) {
    return res
      .status(400)
      .json({ error: "Parametri obbligatori: foglio, mappale" });
  }

  const f = String(foglio).replace(/^0+/, "");
  const m = String(mappale).replace(/^0+/, "");

  // Try multiple CQL filter patterns on WFS
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
          const geometry = parcel["CP:msGeometry"] || parcel;
          const coords = extractGeometry(geometry);

          if (coords?.length) {
            const label = getTextContent(parcel["CP:LABEL"]) || "";
            return res.status(200).json({
              foglio,
              mappale,
              label,
              geometry: { type: "Polygon", coordinates: [coords] },
              feature: {
                type: "Feature",
                geometry: { type: "Polygon", coordinates: [coords] },
                properties: { label },
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
    error: "Particella non trovata via WFS. Usa evidenziazione WMS.",
    foglio: f,
    mappale: m,
  });
}
