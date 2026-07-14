export const MAP_PROVIDERS = [
  {
    key: "osm",
    label: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    enabled: true,
  },
  {
    key: "openTopoMap",
    label: "OpenTopoMap",
    url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap",
    enabled: true,
  },
  {
    key: "esriWorldImagery",
    label: "Esri World Imagery",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/" +
      "World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and others",
    enabled: true,
  },
];

export const DEFAULT_MAP_PROVIDER_KEY = "osm";

export function getEnabledMapProviders() {
  return MAP_PROVIDERS.filter((provider) => provider.enabled);
}

export function getMapProvider(key) {
  return (
    MAP_PROVIDERS.find((provider) => provider.key === key && provider.enabled) ??
    MAP_PROVIDERS.find((provider) => provider.key === DEFAULT_MAP_PROVIDER_KEY)
  );
}
