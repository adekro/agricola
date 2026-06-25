export async function getPoligonoMappale(params) {
  const query = new URLSearchParams();
  if (params.foglio) query.set("foglio", params.foglio);
  if (params.mappale) query.set("mappale", params.mappale);

  const response = await fetch(`/api/catasto-poligono?${query}`);

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? "Errore recupero poligono catastale");
  }

  return response.json();
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
      const headers = sample === line ? null : null; // we don't have explicit header detection

      const comune = parts[0] || "";
      const foglio = parts[1] || "";
      const mappale = parts[2] || "";

      if (!foglio || !mappale) return null;

      return {
        comune: comune || undefined,
        foglio: foglio.replace(/^0+/, ""), // Remove leading zeros from foglio
        mappale: mappale.replace(/^0+/, ""), // Remove leading zeros from mappale
      };
    })
    .filter(Boolean);
}
