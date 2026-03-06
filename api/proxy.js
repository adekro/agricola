export default async function handler(req, res) {
  const { path } = req.query;
  const targetUrl = `https://www.dati.salute.gov.it/${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Vercel-Proxy-Agricola/1.0",
      },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Remote server responded with ${response.status}` });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate"); // Cache JSON for 1 hour
    return res.status(200).json(data);
  } catch (error) {
    console.error("Proxy Error:", error);
    return res
      .status(502)
      .json({
        error: "Bad Gateway from destination server",
        message: error.message,
      });
  }
}
