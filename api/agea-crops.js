const AGEA_API_BASE_URL = process.env.AGEA_API_BASE_URL;
const AGEA_API_KEY = process.env.AGEA_API_KEY;
const AGEA_API_AUTH_HEADER = process.env.AGEA_API_AUTH_HEADER || "x-api-key";
const AGEA_API_QUERY_PARAM = process.env.AGEA_API_QUERY_PARAM || "q";
const AGEA_API_LIMIT_PARAM = process.env.AGEA_API_LIMIT_PARAM || "limit";
const AGEA_API_RESPONSE_PATH = process.env.AGEA_API_RESPONSE_PATH || "";

function getByPath(source, path) {
  if (!path) return source;

  return path.split(".").reduce((value, key) => {
    if (value && typeof value === "object") {
      return value[key];
    }

    return undefined;
  }, source);
}

function normalizeCrop(item) {
  const code = item?.code || item?.codice || item?.id || item?.value || "";
  const label =
    item?.label ||
    item?.descrizione ||
    item?.description ||
    item?.name ||
    item?.text ||
    "";

  return {
    code: String(code || "").trim(),
    label: String(label || "").trim(),
  };
}

export default async function handler(req, res) {
  const query = String(req.query.q || "").trim();
  const limit = Number.parseInt(req.query.limit, 10) || 20;

  if (!query) {
    return res.status(200).json({ items: [] });
  }

  if (!AGEA_API_BASE_URL) {
    return res.status(200).json({
      items: [],
      warning:
        "AGEA_API_BASE_URL non configurato. Impostare l'endpoint del servizio AGEA.",
    });
  }

  const targetUrl = new URL(AGEA_API_BASE_URL);
  targetUrl.searchParams.set(AGEA_API_QUERY_PARAM, query);
  targetUrl.searchParams.set(AGEA_API_LIMIT_PARAM, String(limit));

  const headers = {
    Accept: "application/json",
    "User-Agent": "Agricola-AGEA-Proxy/1.0",
  };

  if (AGEA_API_KEY) {
    headers[AGEA_API_AUTH_HEADER] = AGEA_API_KEY;
  }

  try {
    const response = await fetch(targetUrl, { headers });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Remote server responded with ${response.status}`,
      });
    }

    const payload = await response.json();
    const rawItems = getByPath(payload, AGEA_API_RESPONSE_PATH);
    const items = Array.isArray(rawItems)
      ? rawItems.map(normalizeCrop).filter((item) => item.code && item.label)
      : [];

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json({ items });
  } catch (error) {
    console.error("AGEA crops proxy error:", error);
    return res.status(502).json({
      error: "Bad Gateway from AGEA service",
      message: error.message,
    });
  }
}
