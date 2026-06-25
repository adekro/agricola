/**
 * API endpoint to fetch a cadastral parcel polygon from the Agenzia delle Entrate WFS.
 * GET /api/catasto-poligono?comune=STRADELLA&foglio=2&mappale=745
 * or with codiceComuneCatastale: GET /api/catasto-poligono?codiceComuneCatastale=I968&foglio=2&mappale=745
 */
export default async function handler(req, res) {
  const { comune, codiceComuneCatastale, foglio, mappale } = req.query;

  if ((!comune && !codiceComuneCatastale) || !foglio || !mappale) {
    return res.status(400).json({
      error:
        "Parametri obbligatori: (comune o codiceComuneCatastale), foglio, mappale",
    });
  }

  const WFS_URL =
    "https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php";

  try {
    const wfsUrl = new URL(WFS_URL);

    wfsUrl.searchParams.set("SERVICE", "WFS");
    wfsUrl.searchParams.set("VERSION", "2.0.0");
    wfsUrl.searchParams.set("REQUEST", "GetFeature");
    wfsUrl.searchParams.set("TYPENAMES", "CP:CadastralParcel");
    wfsUrl.searchParams.set("OUTPUTFORMAT", "application/json");
    wfsUrl.searchParams.set("SRSNAME", "EPSG:4326");

    // Build CQL filter based on available parameters
    const filterParts = [];

    if (codiceComuneCatastale) {
      filterParts.push(
        `nationalCadastralReference LIKE '${codiceComuneCatastale}%'`,
      );
    } else if (comune) {
      // Try matching by text - some WFS implementations support localId
      filterParts.push(`localId LIKE '%${comune}%'`);
    }

    filterParts.push(`nationalCadastralReference LIKE '%${foglio}%'`);
    filterParts.push(`nationalCadastralReference LIKE '%${mappale}%'`);

    wfsUrl.searchParams.set("CQL_FILTER", filterParts.join(" AND "));

    console.log("WFS Request URL:", wfsUrl.toString());

    const response = await fetch(wfsUrl.toString(), {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Vercel-Proxy-Agricola/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WFS error response:", response.status, errorText);
      return res.status(502).json({
        error: "Errore chiamata WFS Agenzia Entrate",
        status: response.status,
        details: errorText,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (
      contentType.includes("application/json") ||
      contentType.includes("text/json")
    ) {
      data = await response.json();
    } else {
      const text = await response.text();
      // Try to parse as JSON anyway
      try {
        data = JSON.parse(text);
      } catch {
        return res.status(502).json({
          error: "Risposta non JSON dal WFS",
          contentType,
          preview: text.substring(0, 500),
        });
      }
    }

    if (!data.features?.length) {
      return res.status(404).json({
        error: "Particella non trovata",
        comune: comune || codiceComuneCatastale,
        foglio,
        mappale,
      });
    }

    // Return the first matching feature's geometry
    return res.status(200).json({
      comune: comune || codiceComuneCatastale,
      foglio,
      mappale,
      geometry: data.features[0].geometry,
      feature: data.features[0],
    });
  } catch (error) {
    console.error("Catasto Poligono Error:", error);
    return res.status(500).json({
      error: "Errore interno del server",
      message: error.message,
    });
  }
}
