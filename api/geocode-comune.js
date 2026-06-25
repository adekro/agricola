const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export default async function handler(req, res) {
  const { comune } = req.query;

  if (!comune) {
    return res.status(400).json({
      error: "Parametro obbligatorio: comune",
    });
  }

  const targetUrl = new URL(NOMINATIM_URL);
  targetUrl.searchParams.set("q", `${comune}, Italia`);
  targetUrl.searchParams.set("format", "jsonv2");
  targetUrl.searchParams.set("limit", "1");
  targetUrl.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Agricola/1.0",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(response.status).json({
        error: "Errore geocoding comune",
        message: body,
      });
    }

    const results = await response.json();
    const match = Array.isArray(results) ? results[0] : null;

    if (!match) {
      return res.status(404).json({
        error: "Comune non trovato",
        comune,
      });
    }

    return res.status(200).json({
      comune,
      lat: Number(match.lat),
      lon: Number(match.lon),
      boundingbox: (match.boundingbox || []).map(Number),
      displayName: match.display_name,
    });
  } catch (error) {
    return res.status(502).json({
      error: "Errore geocoding comune",
      message: error.message,
    });
  }
}
