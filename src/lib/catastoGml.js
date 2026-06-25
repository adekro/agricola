import { XMLParser } from "fast-xml-parser";
import proj4 from "proj4";

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

export function validateGmlParcel(parcel, { comune, foglio, mappale }) {
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
      reason: "GML privo di metadati utili",
    };
  }

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

export function parseGmlParcels(gmlText) {
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

export function extractParcelGeometry(parcel) {
  const geometry = parcel["CP:msGeometry"] || parcel;
  return extractGeometry(geometry);
}

export { GML_PARSER, getTextContent, normalizeText, normalizeNumeric };
