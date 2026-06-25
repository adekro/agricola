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

export async function getPoligonoMappale(params) {
  const query = new URLSearchParams();
  if (params.comune) query.set("comune", params.comune);
  if (params.foglio) query.set("foglio", params.foglio);
  if (params.mappale) query.set("mappale", params.mappale);

  // Prefer new GML-based endpoint, fallback to WFS endpoint
  const endpoints = ["/api/catasto-gml", "/api/catasto-poligono"];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?${query}`);

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        lastError = error?.error ?? `HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      if (data && data.geometry) {
        return data;
      }

      lastError = data?.error || "Nessuna geometria disponibile";
    } catch (error) {
      lastError = error.message;
    }
  }

  throw new Error(lastError || "Errore recupero poligono catastale");
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
