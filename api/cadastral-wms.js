const WMS_BASE_URL =
  "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php";

function appendQueryParams(url, query) {
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      return;
    }

    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  });
}

export default async function handler(req, res) {
  const targetUrl = new URL(WMS_BASE_URL);
  appendQueryParams(targetUrl, req.query);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Accept: req.headers.accept || "*/*",
        "User-Agent": "Vercel-Proxy-Agricola/1.0",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).send(errorBody);
    }

    const contentType = response.headers.get("content-type");
    const cacheControl = response.headers.get("cache-control");
    const body = Buffer.from(await response.arrayBuffer());
    const isGetMapRequest = `${req.query.REQUEST || req.query.request || ""}`.toUpperCase() === "GETMAP";

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    if (isGetMapRequest && contentType && !contentType.startsWith("image/")) {
      res.setHeader("X-Upstream-Content-Type", contentType);
    }

    if (cacheControl) {
      res.setHeader("Cache-Control", cacheControl);
    }

    return res.status(200).send(body);
  } catch (error) {
    console.error("Cadastral WMS Proxy Error:", error);
    return res.status(502).json({
      error: "Bad Gateway from cadastral WMS",
      message: error.message,
    });
  }
}
