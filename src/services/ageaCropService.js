const AGEA_CROPS_ENDPOINT =
  import.meta.env.VITE_AGEA_CROPS_ENDPOINT || "/api/agea-crops";

export const ageaCropService = {
  async searchCrops(query, limit = 20) {
    const trimmedQuery = String(query || "").trim();
    if (!trimmedQuery) {
      return [];
    }

    const response = await fetch(
      `${AGEA_CROPS_ENDPOINT}?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`,
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Errore nel recupero colture AGEA.");
    }

    return Array.isArray(payload?.items) ? payload.items : [];
  },
};
