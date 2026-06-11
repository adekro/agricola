/**
 * Satellite layers configuration.
 * Using open/public services where possible.
 */

export const SATELLITE_LAYERS = [
  {
    key: "s2cloudless",
    label: "Sentinel-2 Cloudless (EOX)",
    type: "wmts",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg",
    attribution: "Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020)",
    enabled: true,
  },
];

export function getEnabledSatelliteLayers() {
  return SATELLITE_LAYERS.filter((layer) => layer.enabled);
}
