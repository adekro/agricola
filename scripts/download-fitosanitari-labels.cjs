const fs = require("node:fs/promises");
const https = require("node:https");
const path = require("node:path");
const tls = require("node:tls");

const OUTPUT_DIR = "C:\\siti\\id";
const DATASET_DAYS_TO_TRY = 45;
const REQUEST_DELAY_MS = 300;
const FITOSANITARI_HOST = "www.fitosanitari.salute.gov.it";
const FITOSANITARI_PATH = "/fitosanitariws_new/FitosanitariServlet";
const defaultAgent = new https.Agent({ keepAlive: true });

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function requestMinisterial(requestUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: FITOSANITARI_HOST, port: 443, servername: FITOSANITARI_HOST, rejectUnauthorized: false },
      () => {
        const body = options.body || "";
        const headers = {
          Host: FITOSANITARI_HOST,
          Connection: "close",
          "Accept-Encoding": "identity",
          ...options.headers,
        };
        const headerLines = Object.entries(headers).map(([name, value]) => `${name}: ${value}`);
        socket.write(
          `${options.method || "GET"} ${requestUrl.pathname}${requestUrl.search} HTTP/1.1\r\n${headerLines.join("\r\n")}\r\n\r\n${body}`,
        );
      },
    );
    const chunks = [];
    socket.setTimeout(30000, () => socket.destroy(new Error("Timeout della richiesta")));
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("error", reject);
    socket.on("end", () => {
      const response = Buffer.concat(chunks);
      const separator = response.indexOf("\r\n\r\n");
      if (separator < 0) return reject(new Error("Risposta HTTP ministeriale non valida"));

      const headerText = response.subarray(0, separator).toString("latin1");
      const [statusLine, ...headerLines] = headerText.split("\r\n");
      const statusCode = Number(statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/)?.[1]);
      const headers = {};
      for (const line of headerLines) {
        const colon = line.indexOf(":");
        if (colon < 1) continue;
        const name = line.slice(0, colon).toLowerCase();
        const value = line.slice(colon + 1).trim();
        if (name === "set-cookie") {
          headers[name] = [...(headers[name] || []), value];
        } else {
          headers[name] = value;
        }
      }
      resolve({ statusCode, headers, body: response.subarray(separator + 4) });
    });
  });
}

function request(url, options = {}, redirects = 0) {
  const requestUrl = new URL(url);
  if (requestUrl.hostname === FITOSANITARI_HOST) {
    return requestMinisterial(requestUrl, options);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      requestUrl,
      {
        agent: defaultAgent,
        ...options,
        headers: { "Accept-Encoding": "identity", ...options.headers },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", async () => {
          const body = Buffer.concat(chunks);
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location &&
            redirects < 5
          ) {
            try {
              resolve(
                await request(
                  new URL(response.headers.location, url),
                  options,
                  redirects + 1,
                ),
              );
            } catch (error) {
              reject(error);
            }
            return;
          }
          resolve({ statusCode: response.statusCode, headers: response.headers, body });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(30000, () => req.destroy(new Error("Timeout della richiesta")));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function withRetry(operation, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(attempt * 1000);
    }
  }
  throw lastError;
}

async function loadLatestDataset() {
  const date = new Date();
  for (let offset = 0; offset < DATASET_DAYS_TO_TRY; offset += 1) {
    const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
    const url = `https://www.dati.salute.gov.it/sites/default/files/opendata/PROD_FTS_6_${datePart}.json`;
    const response = await request(url);
    if (response.statusCode === 200) {
      console.log(`Dataset trovato: ${url}`);
      return JSON.parse(response.body.toString("utf8"));
    }
    date.setUTCDate(date.getUTCDate() - 1);
  }
  throw new Error("Nessun dataset ministeriale recente trovato");
}

function isActive(product) {
  const status = product.stato_amministrativo || "";
  return (
    status.startsWith("Autorizzato") ||
    status.startsWith("Ri-registrato") ||
    status.startsWith("Rinnovato")
  );
}

async function createMinisterialSession() {
  const response = await request(`https://${FITOSANITARI_HOST}${FITOSANITARI_PATH}`);
  const cookies = (response.headers["set-cookie"] || [])
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
  if (!cookies) throw new Error("Il Ministero non ha restituito una sessione");
  return cookies;
}

async function findLabelId(registrationNumber, cookies) {
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
  const response = await request(`https://${FITOSANITARI_HOST}${FITOSANITARI_PATH}`, {
    method: "POST",
    body,
    headers: {
      Cookie: cookies,
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  });
  const match = response.body
    .toString("latin1")
    .match(/EtichettaServlet\?id=(\d+)/i);
  return match?.[1] || null;
}

async function downloadLabel(registrationNumber, labelId) {
  const destination = path.join(
    OUTPUT_DIR,
    `${registrationNumber}_${labelId}.pdf`,
  );
  try {
    if ((await fs.stat(destination)).size > 0) return "existing";
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const url = `https://${FITOSANITARI_HOST}/fitosanitariws_new/EtichettaServlet?id=${labelId}`;
  const response = await request(url);
  if (response.statusCode !== 200 || !response.body.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    throw new Error(`Risposta PDF non valida (HTTP ${response.statusCode})`);
  }
  await fs.writeFile(destination, response.body);
  return "downloaded";
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const products = await loadLatestDataset();
  const activeProducts = [
    ...new Map(
      products
        .filter(isActive)
        .map((product) => [product.num_registrazione, product]),
    ).values(),
  ];
  const cookies = await createMinisterialSession();
  const summary = { downloaded: 0, existing: 0, missing: 0, failed: 0 };

  console.log(`Prodotti attivi da elaborare: ${activeProducts.length}`);
  for (const [index, product] of activeProducts.entries()) {
    const registrationNumber = product.num_registrazione;
    try {
      const labelId = await withRetry(() => findLabelId(registrationNumber, cookies));
      if (!labelId) {
        summary.missing += 1;
        console.warn(`[${index + 1}/${activeProducts.length}] ${registrationNumber}: etichetta assente`);
      } else {
        const result = await withRetry(() =>
          downloadLabel(registrationNumber, labelId),
        );
        summary[result] += 1;
        console.log(
          `[${index + 1}/${activeProducts.length}] ${registrationNumber}: ${registrationNumber}_${labelId}.pdf`,
        );
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`[${index + 1}/${activeProducts.length}] ${registrationNumber}: ${error.message}`);
    }
    await delay(REQUEST_DELAY_MS);
  }

  console.log("Operazione completata:", summary);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
