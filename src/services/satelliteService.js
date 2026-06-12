/**
 * Service to handle satellite data and indices.
 */

export const satelliteService = {
  /**
   * Fetches satellite indices for a given polygon.
   * In a real-world scenario, this would call the Sentinel Hub Statistical API.
   * For now, it returns mock data based on the polygon coordinates to simulate the feature.
   *
   * @param {Array} coordinates - Array of [lon, lat] coordinates defining the polygon.
   * @returns {Promise<Object>} Object containing the calculated indices.
   */
  async getSatelliteIndices(coordinates) {
    if (!coordinates || coordinates.length === 0) return null;

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate pseudo-random but consistent values based on coordinates
    // this ensures that the same farmland always shows the same indices
    const seed = coordinates.reduce((acc, coord) => acc + coord[0] + coord[1], 0);
    const pseudoRandom = (offset) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    // Mock indices calculation
    const ndvi = 0.3 + pseudoRandom(1) * 0.5; // typical range 0.3 to 0.8
    const evi = 0.2 + pseudoRandom(2) * 0.5;
    const gndvi = 0.3 + pseudoRandom(3) * 0.4;
    const ndwi = -0.5 + pseudoRandom(4) * 0.4; // usually negative for vegetation
    const mndwi = -0.6 + pseudoRandom(5) * 0.3;
    const ndmi = 0.1 + pseudoRandom(6) * 0.4;
    const nbr = 0.4 + pseudoRandom(7) * 0.3;
    const ndbi = -0.4 + pseudoRandom(8) * 0.3;
    const bsi = 0.1 + pseudoRandom(9) * 0.2;

    return {
      ndvi: {
        value: ndvi.toFixed(3),
        label: "NDVI",
        description: "Stato di salute della vegetazione",
        status: this.getNdviStatus(ndvi),
      },
      evi: {
        value: evi.toFixed(3),
        label: "EVI",
        description: "Indice di vegetazione potenziato",
        status: evi > 0.4 ? "Vegetazione fitta" : "Vegetazione moderata",
      },
      gndvi: {
        value: gndvi.toFixed(3),
        label: "GNDVI",
        description: "Agricoltura di precisione",
        status: gndvi > 0.5 ? "Ottimale" : "Monitorare",
      },
      ndwi: {
        value: ndwi.toFixed(3),
        label: "NDWI",
        description: "Indice dell'acqua",
        status: ndwi > 0 ? "Presenza acqua" : "Assenza acqua superficiale",
      },
      mndwi: {
        value: mndwi.toFixed(3),
        label: "MNDWI",
        description: "Indice acqua modificato",
        status: mndwi > 0 ? "Acqua rilevata" : "Suolo asciutto",
      },
      ndmi: {
        value: ndmi.toFixed(3),
        label: "NDMI",
        description: "Umidità delle piante",
        status: ndmi > 0.2 ? "Buona idratazione" : "Stress idrico possibile",
      },
      nbr: {
        value: nbr.toFixed(3),
        label: "NBR",
        description: "Indice di bruciatura",
        status: nbr > 0.1 ? "Sano" : "Abitato/Bruciato",
      },
      ndbi: {
        value: ndbi.toFixed(3),
        label: "NDBI",
        description: "Indice aree edificate",
        status: ndbi < 0 ? "Naturale" : "Infrastrutture",
      },
      bsi: {
        value: bsi.toFixed(3),
        label: "BSI",
        description: "Indice suolo nudo",
        status: bsi > 0.2 ? "Terreno esposto" : "Copertura vegetale",
      },
    };
  },

  getNdviStatus(value) {
    if (value < 0) return "Acqua/Neve";
    if (value < 0.2) return "Terreno nudo";
    if (value < 0.5) return "Vegetazione debole";
    return "Vegetazione sana";
  },
};
