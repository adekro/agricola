/**
 * Cadastral layers exposed by Agenzia delle Entrate.
 * Official WMS documentation:
 * https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/consultazione-cartografia-catastale/servizio-consultazione-cartografia
 */

export const CADASTRAL_LAYERS = [
  {
    key: "agenziaEntrateParcel",
    label: "Particelle catastali (Agenzia Entrate)",
    type: "wms",
    url: "/api/cadastral-wms",
    layers: "CP.CadastralParcel,codice_plla,simbolo_graffa",
    sourceProjection: "EPSG:6706",
    version: "1.1.1",
    attribution: "Agenzia delle Entrate - Cartografia catastale WMS",
    enabled: true,
  },
];

export function getEnabledCadastralLayers() {
  return CADASTRAL_LAYERS.filter((layer) => layer.enabled);
}
