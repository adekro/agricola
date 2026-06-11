
const sentinelHubInstanceId = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;
const copernicusBaseUrl =
  import.meta.env.VITE_COPERNICUS_BASE_URL ||
  "https://sh.dataspace.copernicus.eu";

export const SATELLITE_LAYERS = [
  {
    key: "sentinel2TrueColor",
    label: "ESA Sentinel-2 True Color",
    type: "wms",
    url: `${copernicusBaseUrl}/ogc/wms/${sentinelHubInstanceId}`,
    layers: "TRUE_COLOR",
    attribution: "© Copernicus Sentinel data",
    enabled: Boolean(sentinelHubInstanceId),
  },
  {
    key: "sentinel2Ndvi",
    label: "ESA Sentinel-2 NDVI",
    type: "wms",
    url: `${copernicusBaseUrl}/ogc/wms/${sentinelHubInstanceId}`,
    layers: "NDVI",
    attribution: "© Copernicus Sentinel data",
    enabled: Boolean(sentinelHubInstanceId),
  },
  {
    key: "sentinel1Radar",
    label: "ESA Sentinel-1 Radar",
    type: "wms",
    url: `${copernicusBaseUrl}/ogc/wms/${sentinelHubInstanceId}`,
    layers: "SENTINEL1_RADAR",
    attribution: "© Copernicus Sentinel data",
    enabled: Boolean(sentinelHubInstanceId),
  },
];

export function getEnabledSatelliteLayers() {
  return SATELLITE_LAYERS.filter((layer) => layer.enabled);
}
