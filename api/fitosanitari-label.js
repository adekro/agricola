import tls from "node:tls";

const HOST = "www.fitosanitari.salute.gov.it";
const SEARCH_PATH = "/fitosanitariws_new/FitosanitariServlet";

function requestMinisterial(path, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: HOST, port: 443, servername: HOST, rejectUnauthorized: false },
      () => {
        const body = options.body || "";
        const headers = {
          Host: HOST,
          Connection: "close",
          "Accept-Encoding": "identity",
          ...options.headers,
        };
        const headerLines = Object.entries(headers).map(
          ([name, value]) => `${name}: ${value}`,
        );
        socket.write(
          `${options.method || "GET"} ${path} HTTP/1.1\r\n${headerLines.join("\r\n")}\r\n\r\n${body}`,
        );
      },
    );
    const chunks = [];
    socket.setTimeout(30000, () =>
      socket.destroy(new Error("Timeout della richiesta ministeriale")),
    );
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("error", reject);
    socket.on("end", () => {
      const response = Buffer.concat(chunks);
      const separator = response.indexOf("\r\n\r\n");
      if (separator < 0) {
        reject(new Error("Risposta ministeriale non valida"));
        return;
      }

      const headerText = response.subarray(0, separator).toString("latin1");
      const [statusLine, ...headerLines] = headerText.split("\r\n");
      const statusCode = Number(
        statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/)?.[1],
      );
      const headers = {};
      for (const line of headerLines) {
        const colon = line.indexOf(":");
        if (colon < 1) continue;
        const name = line.slice(0, colon).toLowerCase();
        const value = line.slice(colon + 1).trim();
        headers[name] =
          name === "set-cookie"
            ? [...(headers[name] || []), value]
            : value;
      }
      resolve({ statusCode, headers, body: response.subarray(separator + 4) });
    });
  });
}

async function findLabel(registrationNumber) {
  const sessionResponse = await requestMinisterial(SEARCH_PATH);
  const cookies = (sessionResponse.headers["set-cookie"] || [])
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
  if (!cookies) throw new Error("Sessione ministeriale non disponibile");

  const body = new URLSearchParams({
    ACTION: "cercaProdotti",
    FROM: "0",
    TO: "49",
    PROVENIENZA: "RICERCA",
    NOME: "",
    NOME_SOSTANZA: "",
    NUMERO_REGISTRAZIONE: registrationNumber,
    ATTIVITA: "",
    STATO_AMMINISTRATIVO: "",
    DT_IN_REGISTRAZIONE: "",
    DT_FN_REGISTRAZIONE: "",
    DT_IN_SCADENZA: "",
    DT_FN_SCADENZA: "",
    PRODOTTO_IP: "",
    PRODOTTO_PPO: "",
    PRODOTTO_PFnPE: "",
  }).toString();
  const searchResponse = await requestMinisterial(SEARCH_PATH, {
    method: "POST",
    body,
    headers: {
      Cookie: cookies,
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  });
  return searchResponse.body
    .toString("latin1")
    .match(/EtichettaServlet\?id=(\d+)/i)?.[1];
}

export default async function handler(req, res) {
  const registrationNumber = String(req.query.registration || "").trim();
  if (!/^\d{1,6}$/.test(registrationNumber)) {
    return res.status(400).json({ error: "Numero di registrazione non valido" });
  }

  try {
    const labelId = await findLabel(registrationNumber);
    if (!labelId) {
      return res.status(404).json({ error: "Etichetta non trovata" });
    }

    const pdf = await requestMinisterial(
      `/fitosanitariws_new/EtichettaServlet?id=${labelId}`,
    );
    if (pdf.statusCode !== 200 || pdf.body.subarray(0, 4).toString() !== "%PDF") {
      return res.status(502).json({ error: "PDF ministeriale non valido" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${registrationNumber}_${labelId}.pdf"`,
    );
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).send(pdf.body);
  } catch (error) {
    return res.status(502).json({
      error: "Errore durante il recupero dell'etichetta",
      message: error.message,
    });
  }
}
