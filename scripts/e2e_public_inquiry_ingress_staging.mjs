import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const STAGING_REF = "ulauyoqjoetjqktegeuq";
const STAGING_ORIGIN = `https://${STAGING_REF}.supabase.co`;
const FUNCTION_URL = `${STAGING_ORIGIN}/functions/v1/public-inquiry-ingress`;
const PREVIEW_URL = process.env.STUDIO_LAS_E2E_URL || "http://127.0.0.1:8790/studio-las-os.html";
const PUBLIC_ORIGIN = "http://127.0.0.1:8790";
const QA_EMAIL = String(process.env.STUDIO_LAS_QA_EMAIL || "").trim();
const QA_PASSWORD = String(process.env.STUDIO_LAS_QA_PASSWORD || "");
const QA_TOTP_SECRET = String(process.env.STUDIO_LAS_QA_TOTP_SECRET || "").trim();
const PUBLISHABLE_KEY = String(process.env.STUDIO_LAS_STAGING_PUBLISHABLE_KEY || "").trim();
const RAW_MARKER = String(process.env.STUDIO_LAS_E2E_MARKER || `GHA-${Date.now()}`)
  .replace(/[^A-Za-z0-9_-]/g, "-")
  .slice(0, 70);
const MARKER = `E2E-PUBLIC-${RAW_MARKER}`;
const ARTIFACT_DIR = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";
const PRIMARY_NAME = `QA Public Inquiry ${RAW_MARKER}`.slice(0, 110);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeJwt(token) {
  const part = String(token || "").split(".")[1];
  return part ? JSON.parse(Buffer.from(part, "base64url").toString("utf8")) : {};
}

function decodeBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = String(input || "").trim().toUpperCase().replace(/\s+/g, "").replace(/=+$/g, "");
  assert(normalized.length >= 16, "QA TOTP secret is missing or too short");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    assert(index >= 0, "QA TOTP secret is not valid Base32");
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
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  if (remaining <= 4) await new Promise(resolve => setTimeout(resolve, (remaining + 1) * 1000));
  return totpCode(secret);
}

async function api(path, { token = "", method = "GET", body, allowFailure = false } = {}) {
  const response = await fetch(`${STAGING_ORIGIN}${path}`, {
    method,
    headers: {
      apikey: PUBLISHABLE_KEY,
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok && !allowFailure) throw new Error(`Staging ${method} ${path.split("?")[0]} failed with ${response.status}`);
  return { status: response.status, ok: response.ok, payload };
}

function query(table, params) {
  return `/rest/v1/${table}?${new URLSearchParams(params).toString()}`;
}

async function publicSubmit(payload, { origin = PUBLIC_ORIGIN, rawBody = null } = {}) {
  const body = rawBody ?? JSON.stringify(payload);
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      apikey: PUBLISHABLE_KEY,
      Origin: origin,
      "Content-Type": "application/json"
    },
    body
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }
  return { status: response.status, ok: response.ok, payload: parsed, headers: response.headers };
}

function validPayload(requestId, overrides = {}) {
  return {
    requestId,
    name: PRIMARY_NAME,
    phone: "+48 600 000 001",
    email: "qa-public-ingress@example.test",
    preferredContactWindow: "18:00–20:00",
    broadGoal: "Powrót do aktywności lub sportu",
    personWords: "Chcę znowu spokojnie biegać 5 km.",
    contactConsent: true,
    privacyNoticeVersion: "first-contact-consent-v1",
    formVersion: "first-contact-v1",
    honeypot: "",
    ...overrides
  };
}

async function loginToAal2(page) {
  await page.goto(PREVIEW_URL, { waitUntil: "domcontentloaded" });
  await page.getByText("STAGING / QA", { exact: false }).first().waitFor({ state: "visible" });
  assert(await page.evaluate(() => window.STUDIO_LAS_CONFIG?.supabase?.projectRef) === STAGING_REF,
    "Preview is not pinned to canonical staging");

  await page.getByLabel("Email").fill(QA_EMAIL);
  await page.getByLabel("Hasło").fill(QA_PASSWORD);
  await page.getByRole("button", { name: "Zaloguj" }).click();

  const mfaHeading = page.getByRole("heading", { name: "Weryfikacja dwuetapowa" });
  const trainerHeading = page.getByRole("heading", { name: "Panel trenera" });
  await Promise.race([
    mfaHeading.waitFor({ state: "visible", timeout: 15_000 }),
    trainerHeading.waitFor({ state: "visible", timeout: 15_000 })
  ]);

  if (await mfaHeading.isVisible().catch(() => false)) {
    await page.getByLabel("Sześciocyfrowy kod jednorazowy").fill(await freshTotpCode(QA_TOTP_SECRET));
    await page.getByRole("button", { name: "Potwierdź kod" }).click();
  }

  await trainerHeading.waitFor({ state: "visible", timeout: 20_000 });
  const rawSession = await page.evaluate(() => sessionStorage.getItem("studio-las-auth-session"));
  assert(rawSession, "AAL2 trainer session missing");
  const token = JSON.parse(rawSession).access_token;
  assert(decodeJwt(token).aal === "aal2", "Trainer session did not reach AAL2");
  return token;
}

async function rpc(token, name, body) {
  const result = await api(`/rest/v1/rpc/${name}`, { token, method: "POST", body });
  return result.payload;
}

async function main() {
  assert(QA_EMAIL && QA_PASSWORD && QA_TOTP_SECRET, "QA credentials/TOTP are missing");
  assert(PUBLISHABLE_KEY.startsWith("sb_publishable_"), "Staging publishable key missing");
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 360, height: 900 }, timezoneId: "Europe/Warsaw" });
  const page = await context.newPage();
  let token = "";
  const observations = [];

  try {
    token = await loginToAal2(page);
    await rpc(token, "prepare_public_inquiry_ingress_e2e", { p_marker: MARKER });

    const primaryId = `${MARKER}-valid`;
    const valid = await publicSubmit(validPayload(primaryId));
    assert(valid.status === 202 && valid.payload?.ok === true, `Valid ingress failed: ${valid.status}`);
    observations.push("valid=202");

    const replay = await publicSubmit(validPayload(primaryId));
    assert(replay.status === 202 && replay.payload?.ok === true, "Idempotent replay was not generic success");
    observations.push("replay=202");

    const invalid = await publicSubmit(validPayload(`${MARKER}-invalid`, { broadGoal: "diagnosis" }));
    assert(invalid.status === 400, `Invalid payload did not fail 400: ${invalid.status}`);

    const unknown = await publicSubmit({ ...validPayload(`${MARKER}-unknown`), unexpected: "forbidden" });
    assert(unknown.status === 400, `Unknown field did not fail 400: ${unknown.status}`);

    const honeypot = await publicSubmit(validPayload(`${MARKER}-honeypot`, { honeypot: "bot-value" }));
    assert(honeypot.status === 202 && honeypot.payload?.ok === true, "Honeypot did not return generic success");

    const badOrigin = await publicSubmit(validPayload(`${MARKER}-origin`), { origin: "https://example.com" });
    assert(badOrigin.status === 403, `Disallowed origin did not fail 403: ${badOrigin.status}`);

    const oversized = await publicSubmit({}, { rawBody: JSON.stringify({ ...validPayload(`${MARKER}-oversize`), padding: "x".repeat(9000) }) });
    assert(oversized.status === 413 || oversized.status === 400, `Oversized request was not rejected: ${oversized.status}`);

    const anonRead = await api(query("inquiries", { select: "id", source_request_key: `eq.${primaryId}` }), { allowFailure: true });
    assert(!Array.isArray(anonRead.payload) || anonRead.payload.length === 0, "Anonymous actor read public inquiry");
    const anonWrite = await api("/rest/v1/inquiries", {
      method: "POST",
      body: { submitted_name: "forbidden" },
      allowFailure: true
    });
    assert(!anonWrite.ok, "Anonymous actor directly inserted inquiry");

    for (let index = 1; index <= 4; index += 1) {
      const accepted = await publicSubmit(validPayload(`${MARKER}-rate-${index}`, {
        name: `${PRIMARY_NAME} rate ${index}`.slice(0, 120),
        email: null
      }));
      assert(accepted.status === 202, `Expected accepted rate probe ${index}, got ${accepted.status}`);
    }
    const limitedId = `${MARKER}-rate-5`;
    const limited = await publicSubmit(validPayload(limitedId, { email: null }));
    assert(limited.status === 429, `Sixth new request was not rate-limited: ${limited.status}`);
    assert(limited.headers.get("retry-after") === "900", "Rate-limited response missing Retry-After");
    observations.push("rate_limit=429");

    const rows = (await api(query("inquiries", {
      source_request_key: `like.${MARKER}%`,
      select: "id,source_channel,source_version,form_version,source_request_key,submitted_name,submitted_phone,submitted_email,preferred_contact_window,broad_goal,person_words,privacy_notice_version,inquiry_status,contact_status,converted_client_id",
      order: "source_request_key.asc"
    }), { token })).payload;
    assert(Array.isArray(rows), "Trainer inquiry query did not return rows");
    assert(rows.length === 5, `Expected exactly 5 accepted inquiries, got ${rows.length}`);
    assert(rows.filter(row => row.source_request_key === primaryId).length === 1, "Replay created a duplicate inquiry");
    assert(rows.every(row => row.source_channel === "public_first_contact" && row.source_version === "public-ingress-v1"),
      "Accepted inquiry provenance is incorrect");
    assert(rows.every(row => row.inquiry_status === "open" && row.contact_status === "pending" && !row.converted_client_id),
      "Public ingress mutated process/client state");
    assert(!rows.some(row => row.source_request_key === limitedId), "Rate-limited request persisted inquiry content");

    const inquiryIds = rows.map(row => row.id);
    const decisions = (await api(query("inquiry_decisions", {
      inquiry_id: `in.(${inquiryIds.join(",")})`,
      select: "id"
    }), { token })).payload;
    assert(Array.isArray(decisions) && decisions.length === 0, "Public ingress created inquiry decisions");

    const clients = (await api(query("clients", { name: `like.QA Public Inquiry ${RAW_MARKER}%`, select: "id" }), { token })).payload;
    assert(Array.isArray(clients) && clients.length === 0, "Public ingress created clients");

    await page.getByRole("button", { name: "Odśwież" }).click();
    const inquirySelect = page.getByLabel("Wybierz pierwszy kontakt");
    await inquirySelect.waitFor({ state: "visible" });
    await inquirySelect.selectOption({ label: `${PRIMARY_NAME} · Otwarte` });
    await page.getByText("Powrót do aktywności lub sportu", { exact: true }).first().waitFor({ state: "visible" });
    assert(await page.getByText("Chcę znowu spokojnie biegać 5 km.", { exact: true }).isVisible(),
      "Accepted public inquiry is not visible in trainer Stage 2 workspace");

    await page.keyboard.press("Tab");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "360x900 view has horizontal overflow");
  } finally {
    if (token) {
      await rpc(token, "cleanup_public_inquiry_ingress_e2e", { p_marker: MARKER })
        .catch(error => observations.push(`cleanup_error=${error.message}`));
    }
    await writeFile(`${ARTIFACT_DIR}/public-inquiry-ingress-result.json`, JSON.stringify({
      stagingRef: STAGING_REF,
      marker: MARKER,
      observations,
      status: observations.some(item => item.startsWith("cleanup_error=")) ? "FAIL" : "PASS"
    }, null, 2));
    await browser.close();
  }

  if (token) {
    const remaining = (await api(query("inquiries", {
      source_request_key: `like.${MARKER}%`,
      select: "id"
    }), { token })).payload;
    assert(Array.isArray(remaining) && remaining.length === 0, "Synthetic public inquiries remain after cleanup");
  }

  console.log("PUBLIC_INQUIRY_INGRESS_E2E_SUCCESS PASS");
}

await main();
