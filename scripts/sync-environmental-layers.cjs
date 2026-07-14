const { createClient } = require("@supabase/supabase-js");

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const SOURCES = {
  lombardia: {
    regionCode: "IT-25",
    layerType: "nitrate_vulnerable_zones",
    name: "Zone vulnerabili ai nitrati - Lombardia",
    url: "https://www.cartografia.servizirl.it/arcgis2/rest/services/ambiente/Zone_vulnerabili_nitrati/MapServer/1/query",
    license: "CC BY 4.0",
    sourceUpdatedAt: "2020-03-12T00:00:00Z",
  },
};

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variabile ambiente obbligatoria: ${name}`);
  return value;
}

async function main() {
  const region = process.argv.find((item) => item.startsWith("--region="))
    ?.split("=")[1] || "lombardia";
  const source = SOURCES[region];
  if (!source) throw new Error(`Regione non supportata: ${region}`);

  const query = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  const response = await fetch(`${source.url}?${query}`);
  if (!response.ok) {
    throw new Error(`Download layer fallito: HTTP ${response.status}`);
  }
  const geojson = await response.json();
  if (geojson.type !== "FeatureCollection" || !geojson.features?.length) {
    throw new Error("La fonte non ha restituito geometrie GeoJSON valide");
  }

  const supabase = createClient(
    requiredEnvironment("SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await supabase.from("environmental_layers").upsert(
    {
      region_code: source.regionCode,
      layer_type: source.layerType,
      name: source.name,
      geojson,
      source_url: source.url,
      source_license: source.license,
      source_updated_at: source.sourceUpdatedAt,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "region_code,layer_type" },
  );
  if (error) throw error;
  console.log(`Layer aggiornato: ${source.name} (${geojson.features.length} geometrie)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
