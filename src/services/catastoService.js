import { supabase } from "../lib/supabaseClient";

const LEGACY_SUPABASE_LON_OFFSET = 0.0003385;
const LEGACY_SUPABASE_LAT_OFFSET = -0.0014878;

function roundCoordinate(value) {
  return Math.round(value * 1e8) / 1e8;
}

function normalizeComune(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeNumericField(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, "");
  return normalized.replace(/^0+/, "") || "0";
}

function normalizePolygon(value) {
  if (!Array.isArray(value) || value.length < 4) return null;

  const polygon = value
    .map((pair) =>
      Array.isArray(pair) && pair.length >= 2
        ? [Number(pair[0]), Number(pair[1])]
        : null,
    )
    .filter(
      (pair) =>
        pair &&
        Number.isFinite(pair[0]) &&
        Number.isFinite(pair[1]),
    );

  return polygon.length >= 4 ? polygon : null;
}

function normalizeBbox(value) {
  if (!Array.isArray(value) || value.length !== 4) return null;

  const bbox = value.map(Number);
  return bbox.every(Number.isFinite) ? bbox : null;
}

function buildBboxFromPolygon(polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0) return null;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  polygon.forEach(([lon, lat]) => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  });

  if (
    !Number.isFinite(minLon) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLon) ||
    !Number.isFinite(maxLat)
  ) {
    return null;
  }

  return [minLon, minLat, maxLon, maxLat];
}

function correctLegacySupabasePolygon(polygon) {
  if (!Array.isArray(polygon)) return null;

  return polygon.map(([lon, lat]) => [
    roundCoordinate(Number(lon) + LEGACY_SUPABASE_LON_OFFSET),
    roundCoordinate(Number(lat) + LEGACY_SUPABASE_LAT_OFFSET),
  ]);
}

function buildFoglioLookupCandidates(value) {
  const normalized = normalizeNumericField(value);
  const candidates = new Set([normalized]);

  if (/^\d+$/.test(normalized)) {
    const numeric = String(Number(normalized));
    candidates.add(numeric);
    candidates.add(`${numeric}00`);
    candidates.add(numeric.padStart(6, "0"));
  } else {
    candidates.add(normalized.replace(/0+$/, ""));
    candidates.add(normalized.padStart(6, "0"));
  }

  return [...candidates].filter(Boolean);
}

function buildFoglioMatchSet(value) {
  return new Set(buildFoglioLookupCandidates(value).map(normalizeNumericField));
}

export async function getPoligonoMappale(params) {
  const comune = normalizeComune(params.comune);
  const foglio = normalizeNumericField(params.foglio);
  const mappale = normalizeNumericField(params.mappale);
  const adminCode = String(params.adminCode || "")
    .trim()
    .toUpperCase();
  const foglioCandidates = buildFoglioLookupCandidates(foglio);
  const foglioMatchSet = buildFoglioMatchSet(foglio);

  try {
    const response = await fetch(
      `/api/catasto-poligono?comune=${encodeURIComponent(comune)}&foglio=${encodeURIComponent(foglio)}&mappale=${encodeURIComponent(mappale)}`,
    );

    if (response.ok) {
      const data = await response.json();
      const polygon = normalizePolygon(data?.geometry?.coordinates?.[0]);
      const bbox = buildBboxFromPolygon(polygon);

      if (polygon && bbox) {
        return {
          adminCode: adminCode || null,
          comune: data.comune || comune,
          foglio,
          mappale: data.mappale || mappale,
          label: data.label || null,
          nationalReference: null,
          bbox4326: bbox,
          polygon4326: polygon,
          source: data.source || "api",
          validated: data.validated !== false,
        };
      }
    }
  } catch {
    // Fallback to Supabase below.
  }

  let query = supabase.from("cadastral_parcels").select(`
      admin_code,
      comune,
      foglio,
      mappale,
      bbox_4326,
      polygon_4326,
      label,
      national_reference
    `);

  if (adminCode) query = query.eq("admin_code", adminCode);
  else query = query.eq("comune", comune);

  const { data, error } = await query.in("foglio", foglioCandidates).eq(
    "mappale",
    mappale,
  );

  if (error) {
    throw new Error(error.message || "Errore recupero poligono catastale");
  }

  const parcel = (data || []).find((item) =>
    foglioMatchSet.has(normalizeNumericField(item?.foglio)),
  );
  const polygon = normalizePolygon(parcel?.polygon_4326);
  const correctedPolygon = correctLegacySupabasePolygon(polygon);
  const bbox =
    buildBboxFromPolygon(correctedPolygon) || normalizeBbox(parcel?.bbox_4326);

  if (!parcel || !correctedPolygon || !bbox) {
    throw new Error("Nessuna geometria disponibile per questa particella");
  }

  return {
    adminCode: parcel.admin_code || adminCode || null,
    comune: parcel.comune || comune,
    foglio,
    mappale: parcel.mappale || mappale,
    label: parcel.label || null,
    nationalReference: parcel.national_reference || null,
    bbox4326: bbox,
    polygon4326: correctedPolygon,
    source: "supabase",
    validated: true,
  };
}

/**
 * Parse rows pasted from Excel (tab-separated).
 * Expected columns: Comune (or CodiceComuneCatastale), Foglio, Mappale
 */
export function parseExcelRows(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Try to detect separator: tab or semicolon or comma
  const sample = lines[0] || "";
  let separator = "\t";
  if (sample.includes(";")) separator = ";";
  else if (sample.includes(",")) separator = ",";

  return lines
    .map((line) => {
      const parts = line.split(separator).map((p) => p.trim());
      const comune = normalizeComune(parts[0] || "");
      const foglioRaw = parts[1] || "";
      const mappaleRaw = parts[2] || "";
      const foglio = normalizeNumericField(foglioRaw);
      const mappale = normalizeNumericField(mappaleRaw);

      const isHeaderRow =
        comune === "COMUNE" &&
        normalizeComune(foglioRaw) === "FOGLIO" &&
        normalizeComune(mappaleRaw) === "MAPPALE";

      if (isHeaderRow || !comune || !foglioRaw || !mappaleRaw) return null;

      return {
        comune,
        foglio,
        mappale,
      };
    })
    .filter(Boolean);
}
