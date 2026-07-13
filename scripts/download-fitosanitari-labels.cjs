const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const https = require("node:https");
const path = require("node:path");
const tls = require("node:tls");

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const OUTPUT_DIR = "C:\\siti\\id";
const DATASET_DAYS_TO_TRY = 45;
const REQUEST_DELAY_MS = 300;
const SUPABASE_BATCH_SIZE = 200;
const FITOSANITARI_HOST = "www.fitosanitari.salute.gov.it";
const FITOSANITARI_PATH = "/fitosanitariws_new/FitosanitariServlet";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const defaultAgent = new https.Agent({ keepAlive: true });

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variabile ambiente obbligatoria: ${name}`);
  return value;
}

const SUPABASE_URL = requiredEnvironment("SUPABASE_URL").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const OPENROUTER_API_KEY = requiredEnvironment("OPENROUTER_API_KEY");

function requestMinisterial(requestUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: FITOSANITARI_HOST,
        port: 443,
        servername: FITOSANITARI_HOST,
        rejectUnauthorized: false,
      },
      () => {
        const body = options.body || "";
        const headers = {
          Host: FITOSANITARI_HOST,
          Connection: "close",
          "Accept-Encoding": "identity",
          ...options.headers,
        };
        const headerLines = Object.entries(headers).map(
          ([name, value]) => `${name}: ${value}`,
        );
        socket.write(
          `${options.method || "GET"} ${requestUrl.pathname}${requestUrl.search} HTTP/1.1\r\n${headerLines.join("\r\n")}\r\n\r\n${body}`,
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
        reject(new Error("Risposta HTTP ministeriale non valida"));
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
    req.setTimeout(120000, () => req.destroy(new Error("Timeout della richiesta")));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function withRetry(operation, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

async function supabaseRequest(table, options = {}) {
  const query = options.query ? `?${options.query}` : "";
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const response = await request(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: options.method || "GET",
    body,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/json",
      ...(body
        ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
        : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
  });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `Supabase ${table}: HTTP ${response.statusCode} ${response.body.toString("utf8")}`,
    );
  }
  return response.body.length ? JSON.parse(response.body.toString("utf8")) : null;
}

async function upsert(table, rows, conflict) {
  if (!rows.length) return;
  await supabaseRequest(table, {
    method: "POST",
    query: `on_conflict=${encodeURIComponent(conflict)}`,
    body: rows,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

async function loadLatestDataset() {
  const date = new Date();
  for (let offset = 0; offset < DATASET_DAYS_TO_TRY; offset += 1) {
    const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
    const fileName = `PROD_FTS_6_${datePart}.json`;
    const url = `https://www.dati.salute.gov.it/sites/default/files/opendata/${fileName}`;
    const response = await request(url);
    if (response.statusCode === 200) {
      console.log(`Dataset trovato: ${url}`);
      return { fileName, products: JSON.parse(response.body.toString("utf8")) };
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

async function synchronizeProducts(products, datasetFile) {
  const syncedAt = new Date().toISOString();
  const rows = products.map((product) => ({
    num_registration: product.num_registrazione,
    name: product.denominazione_prodotto || "-",
    company_name: product.ragione_sociale || null,
    administrative_status: product.stato_amministrativo || null,
    is_active: isActive(product),
    source_data: product,
    dataset_file: datasetFile,
    last_synced_at: syncedAt,
  }));
  for (let index = 0; index < rows.length; index += SUPABASE_BATCH_SIZE) {
    await withRetry(() =>
      upsert(
        "phytosanitary_products",
        rows.slice(index, index + SUPABASE_BATCH_SIZE),
        "num_registration",
      ),
    );
  }
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
  return response.body.toString("latin1").match(/EtichettaServlet\?id=(\d+)/i)?.[1] || null;
}

async function ensureLabelPdf(registrationNumber, labelId) {
  const destination = path.join(OUTPUT_DIR, `${registrationNumber}_${labelId}.pdf`);
  try {
    if ((await fs.stat(destination)).size > 0) {
      return { destination, result: "existing" };
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const response = await request(
    `https://${FITOSANITARI_HOST}/fitosanitariws_new/EtichettaServlet?id=${labelId}`,
  );
  if (response.statusCode !== 200 || response.body.subarray(0, 4).toString() !== "%PDF") {
    throw new Error(`Risposta PDF non valida (HTTP ${response.statusCode})`);
  }
  await fs.writeFile(destination, response.body);
  return { destination, result: "downloaded" };
}

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ocr_text: { type: "string" },
    review_required: { type: "boolean" },
    copper: {
      type: "object",
      additionalProperties: false,
      properties: {
        value_g_per_kg: { type: ["number", "null"] },
        raw_value: { type: ["number", "null"] },
        raw_unit: { type: ["string", "null"] },
        source_text: { type: ["string", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        ambiguous: { type: "boolean" },
      },
      required: ["value_g_per_kg", "raw_value", "raw_unit", "source_text", "confidence", "ambiguous"],
    },
    authorized_uses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          crop_name: { type: "string" },
          dose_min: { type: ["number", "null"] },
          dose_max: { type: ["number", "null"] },
          dose_unit: { type: ["string", "null"] },
          max_treatments: { type: ["integer", "null"] },
          interval_min_days: { type: ["integer", "null"] },
          interval_max_days: { type: ["integer", "null"] },
          preharvest_interval_days: { type: ["integer", "null"] },
          source_text: { type: ["string", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          ambiguous: { type: "boolean" },
        },
        required: [
          "crop_name", "dose_min", "dose_max", "dose_unit", "max_treatments",
          "interval_min_days", "interval_max_days", "preharvest_interval_days",
          "source_text", "confidence", "ambiguous",
        ],
      },
    },
  },
  required: ["ocr_text", "review_required", "copper", "authorized_uses"],
};

function validateExtraction(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.authorized_uses)) {
    throw new Error("Risposta AI priva degli usi autorizzati");
  }
  if (typeof value.ocr_text !== "string" || !value.copper) {
    throw new Error("Risposta AI incompleta");
  }
  for (const use of value.authorized_uses) {
    if (!use.crop_name || typeof use.confidence !== "number") {
      throw new Error("Uso autorizzato AI non valido");
    }
  }
  return value;
}

async function extractLabel(pdfPath) {
  const pdf = await fs.readFile(pdfPath);
  const payload = JSON.stringify({
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Trascrivi e analizza questa etichetta fitosanitaria italiana.",
              "Estrai ogni coltura separatamente con dose minima/massima e unità originali,",
              "numero massimo di trattamenti, intervallo minimo/massimo e tempo di carenza.",
              "Estrai il rame in g/kg solo quando ricavabile senza densità o assunzioni;",
              "altrimenti conserva valore e unità originali e marca ambiguous=true.",
              "Non inventare dati mancanti. source_text deve riportare il passaggio utile.",
            ].join(" "),
          },
          {
            type: "file",
            file: {
              filename: path.basename(pdfPath),
              file_data: `data:application/pdf;base64,${pdf.toString("base64")}`,
            },
          },
        ],
      },
    ],
    plugins: [{ id: "file-parser", pdf: { engine: "cloudflare-ai" } }],
    response_format: {
      type: "json_schema",
      json_schema: { name: "phytosanitary_label", strict: true, schema: extractionSchema },
    },
    provider: { require_parameters: true },
    temperature: 0,
  });
  const response = await request("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    body: payload,
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "HTTP-Referer": "https://github.com/adekro/agricola",
      "X-Title": "Agricola Fitosanitari Sync",
    },
  });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`OpenRouter HTTP ${response.statusCode}: ${response.body.toString("utf8")}`);
  }
  const rawResponse = JSON.parse(response.body.toString("utf8"));
  const content = rawResponse.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenRouter non ha restituito JSON testuale");
  return { extraction: validateExtraction(JSON.parse(content)), rawResponse };
}

async function getExistingLabel(registrationNumber, labelId) {
  const query = new URLSearchParams({
    select: "id,extraction_status",
    num_registration: `eq.${registrationNumber}`,
    ministry_label_id: `eq.${labelId}`,
    limit: "1",
  });
  return (await supabaseRequest("phytosanitary_labels", { query: query.toString() }))?.[0] || null;
}

async function saveExtraction(labelRecord, registrationNumber, labelId, pdfPath, result) {
  const labelIdUuid = labelRecord?.id || crypto.randomUUID();
  const needsReview =
    result.extraction.review_required ||
    result.extraction.copper.ambiguous ||
    result.extraction.authorized_uses.some((use) => use.ambiguous);
  await upsert(
    "phytosanitary_labels",
    [{
      id: labelIdUuid,
      num_registration: registrationNumber,
      ministry_label_id: Number(labelId),
      pdf_path: pdfPath,
      extraction_status: needsReview ? "review_required" : "completed",
      ocr_text: result.extraction.ocr_text,
      copper_g_per_kg: result.extraction.copper.value_g_per_kg,
      copper_raw_value: result.extraction.copper.raw_value,
      copper_raw_unit: result.extraction.copper.raw_unit,
      copper_source_text: result.extraction.copper.source_text,
      copper_confidence: result.extraction.copper.confidence,
      ai_model: OPENROUTER_MODEL,
      ai_raw_response: result.rawResponse,
      error_message: null,
      extracted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    "num_registration,ministry_label_id",
  );
  await supabaseRequest("phytosanitary_authorized_uses", {
    method: "DELETE",
    query: `label_id=eq.${labelIdUuid}`,
  });
  const uses = result.extraction.authorized_uses.map((use) => ({
    label_id: labelIdUuid,
    crop_name: use.crop_name,
    dose_min: use.dose_min,
    dose_max: use.dose_max,
    dose_unit: use.dose_unit,
    max_treatments: use.max_treatments,
    interval_min_days: use.interval_min_days,
    interval_max_days: use.interval_max_days,
    preharvest_interval_days: use.preharvest_interval_days,
    source_text: use.source_text,
    confidence: use.confidence,
    review_required: use.ambiguous,
  }));
  if (uses.length) {
    await supabaseRequest("phytosanitary_authorized_uses", {
      method: "POST",
      body: uses,
      prefer: "return=minimal",
    });
  }
}

async function saveFailure(labelRecord, registrationNumber, labelId, pdfPath, error) {
  await upsert(
    "phytosanitary_labels",
    [{
      id: labelRecord?.id || crypto.randomUUID(),
      num_registration: registrationNumber,
      ministry_label_id: Number(labelId),
      pdf_path: pdfPath || null,
      extraction_status: "failed",
      ai_model: OPENROUTER_MODEL,
      error_message: error.message,
      updated_at: new Date().toISOString(),
    }],
    "num_registration,ministry_label_id",
  );
}

async function updateProductLabel(registrationNumber, labelId) {
  await supabaseRequest("phytosanitary_products", {
    method: "PATCH",
    query: `num_registration=eq.${registrationNumber}`,
    body: { current_label_id: Number(labelId), last_synced_at: new Date().toISOString() },
    prefer: "return=minimal",
  });
}

async function updateSyncRun(runId, values) {
  await supabaseRequest("phytosanitary_sync_runs", {
    method: "PATCH",
    query: `id=eq.${runId}`,
    body: values,
    prefer: "return=minimal",
  });
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const { fileName, products } = await loadLatestDataset();
  const uniqueProducts = [...new Map(products.map((item) => [item.num_registrazione, item])).values()];
  const activeProducts = uniqueProducts.filter(isActive);
  const runId = crypto.randomUUID();
  const summary = {
    labels_downloaded: 0,
    labels_existing: 0,
    labels_missing: 0,
    labels_processed: 0,
    labels_skipped: 0,
    labels_failed: 0,
  };

  await supabaseRequest("phytosanitary_sync_runs", {
    method: "POST",
    body: {
      id: runId,
      dataset_file: fileName,
      status: "running",
      products_total: uniqueProducts.length,
      products_active: activeProducts.length,
    },
    prefer: "return=minimal",
  });

  try {
    await synchronizeProducts(uniqueProducts, fileName);
    const cookies = await createMinisterialSession();
    console.log(`Prodotti attivi da elaborare: ${activeProducts.length}`);

    for (const [index, product] of activeProducts.entries()) {
      const registrationNumber = product.num_registrazione;
      let labelRecord = null;
      let labelId = null;
      let pdfPath = null;
      try {
        labelId = await withRetry(() => findLabelId(registrationNumber, cookies));
        if (!labelId) {
          summary.labels_missing += 1;
          console.warn(`[${index + 1}/${activeProducts.length}] ${registrationNumber}: etichetta assente`);
          continue;
        }
        await updateProductLabel(registrationNumber, labelId);
        labelRecord = await getExistingLabel(registrationNumber, labelId);
        if (["completed", "review_required"].includes(labelRecord?.extraction_status)) {
          summary.labels_skipped += 1;
          console.log(`[${index + 1}/${activeProducts.length}] ${registrationNumber}: già elaborata`);
          continue;
        }

        const pdf = await withRetry(() => ensureLabelPdf(registrationNumber, labelId));
        pdfPath = pdf.destination;
        summary[`labels_${pdf.result}`] += 1;
        const extraction = await withRetry(() => extractLabel(pdfPath));
        await saveExtraction(labelRecord, registrationNumber, labelId, pdfPath, extraction);
        summary.labels_processed += 1;
        console.log(`[${index + 1}/${activeProducts.length}] ${registrationNumber}_${labelId}.pdf: analizzata`);
      } catch (error) {
        summary.labels_failed += 1;
        if (labelId) {
          await saveFailure(labelRecord, registrationNumber, labelId, pdfPath, error).catch(() => {});
        }
        console.error(`[${index + 1}/${activeProducts.length}] ${registrationNumber}: ${error.message}`);
      }
      await delay(REQUEST_DELAY_MS);
    }

    await updateSyncRun(runId, {
      status: "completed",
      ...summary,
      completed_at: new Date().toISOString(),
    });
    console.log("Operazione completata:", summary);
  } catch (error) {
    await updateSyncRun(runId, {
      status: "failed",
      ...summary,
      error_message: error.message,
      completed_at: new Date().toISOString(),
    }).catch(() => {});
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
