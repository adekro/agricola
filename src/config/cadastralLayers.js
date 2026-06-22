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
    url: "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php",
    layers: "CP.CadastralParcel",
    attribution: "Agenzia delle Entrate - Cartografia catastale WMS",
    enabled: true,
  },
];

export function getEnabledCadastralLayers() {
  return CADASTRAL_LAYERS.filter((layer) => layer.enabled);
}
