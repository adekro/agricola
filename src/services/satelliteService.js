/**
 * Service to handle satellite data and indices.
 */

const COPERNICUS_STATS_ENDPOINT =
  import.meta.env.VITE_COPERNICUS_STATS_ENDPOINT ||
  "/api/copernicus-statistics";

export const satelliteService = {
  async getSatelliteIndices(coordinates, options = {}) {
    if (!coordinates || coordinates.length === 0) return null;

    const response = await fetch(COPERNICUS_STATS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        maxCloudCoverage: options.maxCloudCoverage,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(
        payload?.message ||
          "Errore durante il recupero degli indici satellitari",
      );
    }

    return payload.indices || null;
  },
};
