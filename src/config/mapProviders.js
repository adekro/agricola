const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY;
const thunderforestKey = import.meta.env.VITE_THUNDERFOREST_KEY;

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
  {
    key: "cartoPositron",
    label: "CartoDB Positron",
    url: "https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
    enabled: true,
  },
  {
    key: "mapTilerSatellite",
    label: "MapTiler Satellite",
    url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${mapTilerKey}`,
    attribution: "© MapTiler © OpenStreetMap contributors",
    requiresKey: true,
    enabled: Boolean(mapTilerKey),
  },
  {
    key: "mapTilerOutdoor",
    label: "MapTiler Outdoor",
    url: `https://api.maptiler.com/maps/outdoor/{z}/{x}/{y}.png?key=${mapTilerKey}`,
    attribution: "© MapTiler © OpenStreetMap contributors",
    requiresKey: true,
    enabled: Boolean(mapTilerKey),
  },
  {
    key: "thunderforestLandscape",
    label: "Thunderforest Landscape",
    url: `https://{a-c}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=${thunderforestKey}`,
    attribution: "© Thunderforest © OpenStreetMap contributors",
    requiresKey: true,
    enabled: Boolean(thunderforestKey),
  },
  {
    key: "thunderforestOutdoors",
    label: "Thunderforest Outdoors",
    url: `https://{a-c}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${thunderforestKey}`,
    attribution: "© Thunderforest © OpenStreetMap contributors",
    requiresKey: true,
    enabled: Boolean(thunderforestKey),
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
