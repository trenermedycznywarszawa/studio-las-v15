import { createHmac } from "node:crypto";
import { appendFile } from "node:fs/promises";

const STAGING_REF = "ulauyoqjoetjqktegeuq";
const STAGING_ORIGIN = `https://${STAGING_REF}.supabase.co`;
const PUBLISHABLE_KEY = String(process.env.STUDIO_LAS_STAGING_PUBLISHABLE_KEY || "").trim();
const QA_EMAIL = String(process.env.STUDIO_LAS_QA_EMAIL || "").trim();
const QA_PASSWORD = String(process.env.STUDIO_LAS_QA_PASSWORD || "");
const RUN_MARKER = String(process.env.STUDIO_LAS_E2E_MARKER || `GHA-${Date.now()}`)
  .replace(/[^A-Za-z0-9_-]/g, "-")
  .slice(0, 80);
const GITHUB_ENV = String(process.env.GITHUB_ENV || "");
const FACTOR_PREFIX = "Studio Las · QA E2E";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeJwt(token) {
  const part = String(token || "").split(".")[1];
  if (!part) return {};
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function decodeBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = String(input || "").trim().toUpperCase().replace(/\s+/g, "").replace(/=+$/g, "");
  assert(normalized.length >= 16, "Ephemeral QA TOTP secret is missing or too short");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    assert(index >= 0, "Ephemeral QA TOTP secret is not valid Base32");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function freshTotpCode(secret) {
  const seconds = Math.floor(Date.now() / 1000) % 30;
  const remaining = 30 - seconds;
  if (remaining <= 4) {
    await new Promise(resolve => setTimeout(resolve, (remaining + 1) * 1000));
  }
  return totpCode(secret);
}

async function authRequest(path, { token = "", method = "GET", body = undefined } = {}) {
  assert(PUBLISHABLE_KEY.length >= 40, "Missing canonical staging publishable key");
  const headers = {
    apikey: PUBLISHABLE_KEY,
    Accept: "application/json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${STAGING_ORIGIN}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    const code = typeof payload === "object" && payload ? String(payload.code || payload.error_code || "") : "";
    const suffix = code ? ` (${code})` : "";
    throw new Error(`Staging Auth ${method} ${path.split("?")[0]} failed with ${response.status}${suffix}`);
  }
  return payload;
}

async function passwordSession() {
  assert(QA_EMAIL && QA_PASSWORD, "QA email/password secrets are not configured");
  const payload = await authRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email: QA_EMAIL, password: QA_PASSWORD }
  });
  assert(payload?.access_token, "Password login did not return an access token");
  return payload;
}

async function userFactors(token) {
  const user = await authRequest("/auth/v1/user", { token });
  return Array.isArray(user?.factors) ? user.factors : [];
}

async function enrollTotp(token) {
  const friendlyName = `${FACTOR_PREFIX} ${RUN_MARKER}`.slice(0, 64);
  const factor = await authRequest("/auth/v1/factors", {
    token,
    method: "POST",
    body: {
      factor_type: "totp",
      friendly_name: friendlyName,
      issuer: "Studio Las"
    }
  });
  assert(factor?.id && factor?.totp?.secret, "Staging Auth did not return the ephemeral TOTP factor and secret");
  return { id: String(factor.id), secret: String(factor.totp.secret), friendlyName };
}

async function verifyFactor(token, factorId, secret) {
  const challenge = await authRequest(`/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`, {
    token,
    method: "POST",
    body: { factorId }
  });
  assert(challenge?.id, "Staging Auth did not create a TOTP challenge");
  const code = await freshTotpCode(secret);
  const verified = await authRequest(`/auth/v1/factors/${encodeURIComponent(factorId)}/verify`, {
    token,
    method: "POST",
    body: { challenge_id: String(challenge.id), code }
  });
  const session = verified?.session || verified;
  assert(session?.access_token, "TOTP verification did not return an AAL2 access token");
  assert(decodeJwt(session.access_token).aal === "aal2", "Ephemeral TOTP verification did not reach AAL2");
  return session;
}

async function deleteFactor(token, factorId) {
  await authRequest(`/auth/v1/factors/${encodeURIComponent(factorId)}`, {
    token,
    method: "DELETE"
  });
}

async function bootstrap() {
  assert(GITHUB_ENV, "GITHUB_ENV is required for ephemeral QA TOTP handoff");
  const password = await passwordSession();
  let ephemeral = null;
  let aal2 = null;
  try {
    ephemeral = await enrollTotp(password.access_token);
    aal2 = await verifyFactor(password.access_token, ephemeral.id, ephemeral.secret);

    const factors = await userFactors(aal2.access_token);
    for (const factor of factors) {
      const id = String(factor?.id || "");
      if (id && id !== ephemeral.id) await deleteFactor(aal2.access_token, id);
    }

    process.stdout.write(`::add-mask::${ephemeral.secret}\n`);
    await appendFile(GITHUB_ENV, `STUDIO_LAS_QA_TOTP_SECRET=${ephemeral.secret}\n`, { encoding: "utf8" });
    await appendFile(GITHUB_ENV, `STUDIO_LAS_QA_E2E_FACTOR_ID=${ephemeral.id}\n`, { encoding: "utf8" });
    console.log("STUDIO_LAS_QA_MFA_BOOTSTRAP_PASS");
  } catch (error) {
    if (ephemeral?.id && aal2?.access_token) {
      await deleteFactor(aal2.access_token, ephemeral.id).catch(() => {});
    }
    throw error;
  }
}

async function cleanup() {
  const factorId = String(process.env.STUDIO_LAS_QA_E2E_FACTOR_ID || "").trim();
  const secret = String(process.env.STUDIO_LAS_QA_TOTP_SECRET || "").trim();
  if (!factorId || !secret) {
    console.log("STUDIO_LAS_QA_MFA_CLEANUP_NOOP");
    return;
  }

  const password = await passwordSession();
  const factors = await userFactors(password.access_token);
  if (!factors.some(factor => String(factor?.id || "") === factorId)) {
    console.log("STUDIO_LAS_QA_MFA_CLEANUP_ALREADY_DONE");
    return;
  }

  const aal2 = await verifyFactor(password.access_token, factorId, secret);
  await deleteFactor(aal2.access_token, factorId);

  const postCleanupPassword = await passwordSession();
  const remaining = await userFactors(postCleanupPassword.access_token);
  const verifiedTotp = remaining.filter(factor => factor?.factor_type === "totp" && factor?.status === "verified");
  assert(verifiedTotp.length === 0, "Ephemeral QA MFA cleanup left a verified TOTP factor behind");
  console.log("STUDIO_LAS_QA_MFA_CLEANUP_PASS");
}

const command = String(process.argv[2] || "");
if (command === "bootstrap") await bootstrap();
else if (command === "cleanup") await cleanup();
else throw new Error("Use: node scripts/e2e_mfa_bootstrap.mjs bootstrap|cleanup");
