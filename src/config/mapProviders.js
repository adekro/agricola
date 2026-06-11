
export const MAP_PROVIDERS = [
  {
    key: "osm",
    label: "OpenStreetMap",
    attribution: "© OpenStreetMap contributors",
    enabled: true,
  },
  {
    key: "esri",
    label: "Esri World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    enabled: true,
  },
  {
    key: "maptiler",
    label: "MapTiler Satellite",
    url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${import.meta.env.VITE_MAPTILER_KEY}`,
    attribution: "© MapTiler © OpenStreetMap contributors",
    enabled: Boolean(import.meta.env.VITE_MAPTILER_KEY),
  },
  {
    key: "thunderforest",
    label: "Thunderforest Landscape",
    url: `https://{a-c}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=${import.meta.env.VITE_THUNDERFOREST_KEY}`,
    attribution: "© Thunderforest © OpenStreetMap contributors",
    enabled: Boolean(import.meta.env.VITE_THUNDERFOREST_KEY),
  },
];

export function getEnabledMapProviders() {
  return MAP_PROVIDERS.filter((p) => p.enabled);
}
