const TOKEN_URL =
  process.env.VITE_COPERNICUS_TOKEN_URL ||
  process.env.COPERNICUS_TOKEN_URL ||
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

const CLIENT_ID =
  process.env.VITE_COPERNICUS_CLIENT_ID ||
  process.env.COPERNICUS_CLIENT_ID ||
  "cdse-public";

let cachedToken = null;
let tokenExpiresAt = 0;

function toFriendlyAuthMessage(errorDescription) {
  const message = `${errorDescription || ""}`.toLowerCase();

  if (message.includes("account is not fully set up")) {
    return "Account Copernicus non completato. Effettua login su Copernicus Data Space, verifica email, accetta termini/consensi e completa il profilo, poi riprova.";
  }

  if (message.includes("invalid user credentials")) {
    return "Credenziali Copernicus non valide. Controlla username/password e riprova.";
  }

  if (message.includes("temporarily disabled")) {
    return "Account temporaneamente bloccato. Attendi alcuni minuti e riprova.";
  }

  return errorDescription || "Unable to retrieve Copernicus token";
}

async function requestToken() {
  const username =
    process.env.VITE_COPERNICUS_USERNAME || process.env.COPERNICUS_USERNAME;
  const password =
    process.env.VITE_COPERNICUS_PASSWORD || process.env.COPERNICUS_PASSWORD;

  if (!username || !password) {
    const err = new Error("Missing Copernicus credentials");
    err.statusCode = 500;
    throw err;
  }

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: CLIENT_ID,
    username,
    password,
  });

  const clientSecret =
    process.env.VITE_COPERNICUS_CLIENT_SECRET ||
    process.env.COPERNICUS_CLIENT_SECRET;
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    const err = new Error(toFriendlyAuthMessage(payload.error_description));
    err.statusCode = response.status || 502;
    throw err;
  }

  const expiresIn = Number(payload.expires_in || 0);
  const safeTtlMs = Math.max(0, (expiresIn - 30) * 1000);

  cachedToken = payload.access_token;
  tokenExpiresAt = Date.now() + safeTtlMs;

  return cachedToken;
}

export async function getCopernicusToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  return requestToken();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = await getCopernicusToken();
    return res.status(200).json({ token, expiresAt: tokenExpiresAt });
  } catch (error) {
    const status = error.statusCode || 502;
    return res.status(status).json({
      error: "Copernicus authentication failed",
      message: error.message,
    });
  }
}
