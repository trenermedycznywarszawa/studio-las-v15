import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const STAGING_REF = "ulauyoqjoetjqktegeuq";
const STAGING_ORIGIN = `https://${STAGING_REF}.supabase.co`;
const PREVIEW_URL = process.env.STUDIO_LAS_E2E_URL || "http://127.0.0.1:8790/studio-las-os.html";
const QA_EMAIL = String(process.env.STUDIO_LAS_QA_EMAIL || "").trim();
const QA_PASSWORD = String(process.env.STUDIO_LAS_QA_PASSWORD || "");
const QA_TOTP_SECRET = String(process.env.STUDIO_LAS_QA_TOTP_SECRET || "").trim();
const PUBLISHABLE_KEY = String(process.env.STUDIO_LAS_STAGING_PUBLISHABLE_KEY || "").trim();
const RUN_MARKER = `E2E-${String(process.env.STUDIO_LAS_E2E_MARKER || `GHA-${Date.now()}`)
  .replace(/[^A-Za-z0-9_-]/g, "-")
  .slice(0, 80)}`;
const ARTIFACT_DIR = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";
const SYNTHETIC_NAME = "QA Inquiry (synthetic)";

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
  assert(PUBLISHABLE_KEY.length >= 40, "Missing staging publishable key");
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
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 360, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const protectedDirectWrites = [];
  const rpcRequests = [];
  let inquiryId = "";
  let convertedClientId = "";
  let token = "";

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => failedRequests.push(`${request.method()} ${request.url()}`));
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.origin !== STAGING_ORIGIN) return;
    if (url.pathname.startsWith("/rest/v1/rpc/")) rpcRequests.push(`${request.method()} ${url.pathname}`);
    if (["POST", "PATCH", "DELETE"].includes(request.method())
        && /^\/rest\/v1\/(inquiries|inquiry_decisions|clients)$/.test(url.pathname)) {
      protectedDirectWrites.push(`${request.method()} ${url.pathname}`);
    }
  });

  try {
    token = await loginToAal2(page);

    const anonymousRead = await api(query("inquiries", { select: "id", source_request_key: `eq.${RUN_MARKER}` }), { allowFailure: true });
    assert(!Array.isArray(anonymousRead.payload) || anonymousRead.payload.length === 0,
      "Anonymous actor could read a known inquiry");
    const anonymousWrite = await api("/rest/v1/inquiries", {
      method: "POST",
      body: { submitted_name: "forbidden" },
      allowFailure: true
    });
    assert(!anonymousWrite.ok, "Anonymous actor could directly insert inquiry");

    const fixture = await rpc(token, "create_stage2_synthetic_inquiry_e2e", { p_marker: RUN_MARKER });
    inquiryId = String(fixture?.inquiryId || "");
    assert(/^[0-9a-f-]{20,64}$/i.test(inquiryId), "Synthetic inquiry fixture returned invalid id");

    await page.getByRole("button", { name: "Odśwież" }).click();
    const inquirySelect = page.getByLabel("Wybierz pierwszy kontakt");
    await inquirySelect.waitFor({ state: "visible" });
    await inquirySelect.selectOption({ label: `${SYNTHETIC_NAME} · Otwarte` });
    await page.getByText("Do czego konkretnie chcesz wrócić?", { exact: true }).waitFor({ state: "visible" });
    assert(await page.getByText("Nie zakładaj diagnozy", { exact: false }).isVisible(), "Call Brief guardrail missing");

    await page.getByRole("button", { name: "Kontakt w toku" }).click();
    await page.getByText("Kontakt w toku", { exact: true }).first().waitFor({ state: "visible" });

    const clientBefore = (await api(query("clients", { name: `eq.${SYNTHETIC_NAME}`, select: "id" }), { token })).payload;
    assert(Array.isArray(clientBefore) && clientBefore.length === 0, "Synthetic conversion client existed before PWD decision");

    await page.getByLabel("Co ta osoba chce realnie odzyskać?").fill("Chcę znowu biegać 5 km.");
    await page.getByLabel("Co dziś najbardziej utrudnia kolejny krok?").fill("Nie wiem od czego rozsądnie zacząć.");
    await page.getByLabel("Jaki jest właściwy kolejny krok?").selectOption("FOLLOW_UP");
    await page.getByLabel("Jak wracamy do rozmowy?").selectOption("message");
    await page.getByLabel("Kiedy?").fill("2026-09-03T18:00");
    await page.getByLabel("Decyzja i powód").fill("Potrzebujemy jeszcze krótkiego kontaktu przed decyzją o PWD.");
    await page.getByRole("button", { name: "Zapisz decyzję" }).click();
    await page.getByText("v1 · FOLLOW_UP · aktualna", { exact: true }).waitFor({ state: "visible" });

    await page.getByLabel("Co ta osoba chce realnie odzyskać?").fill("Chcę znowu biegać 5 km.");
    await page.getByLabel("Co dziś najbardziej utrudnia kolejny krok?").fill("Potrzebuje bezpiecznego punktu startowego.");
    await page.getByLabel("Jaki jest właściwy kolejny krok?").selectOption("PWD");
    await page.getByLabel("Decyzja i powód").fill("PWD jest właściwym następnym krokiem po rozmowie.");
    await page.getByRole("button", { name: "Zapisz decyzję" }).click();
    await page.getByText("v2 · PWD · aktualna", { exact: true }).waitFor({ state: "visible" });
    await page.getByText("v1 · FOLLOW_UP", { exact: false }).waitFor({ state: "visible" });

    const clientAfterDecision = (await api(query("clients", { name: `eq.${SYNTHETIC_NAME}`, select: "id" }), { token })).payload;
    assert(Array.isArray(clientAfterDecision) && clientAfterDecision.length === 0,
      "PWD decision alone created a client");

    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Utwórz klienta do PWD" }).click();
    await page.getByRole("heading", { name: SYNTHETIC_NAME }).waitFor({ state: "visible", timeout: 20_000 });

    const converted = (await api(query("inquiries", {
      id: `eq.${inquiryId}`,
      select: "id,inquiry_status,converted_client_id"
    }), { token })).payload;
    assert(Array.isArray(converted) && converted.length === 1 && converted[0].inquiry_status === "converted",
      "Inquiry was not converted atomically");
    convertedClientId = String(converted[0].converted_client_id || "");
    assert(/^[0-9a-f-]{20,64}$/i.test(convertedClientId), "Converted client id missing");

    const repeat = await rpc(token, "convert_inquiry_to_pwd_client", { p_inquiry_id: inquiryId });
    assert(repeat?.alreadyConverted === true && repeat?.clientId === convertedClientId,
      "Repeated conversion is not safely idempotent");

    const [sessions, plans, users] = await Promise.all([
      api(query("sessions", { client_id: `eq.${convertedClientId}`, select: "id" }), { token }),
      api(query("home_plans", { client_id: `eq.${convertedClientId}`, select: "id" }), { token }),
      api(query("client_users", { client_id: `eq.${convertedClientId}`, select: "id" }), { token })
    ]);
    assert(sessions.payload.length === 0, "Conversion created PWD/session data");
    assert(plans.payload.length === 0, "Conversion created Guidance/Home Plan data");
    assert(users.payload.length === 0, "Conversion created a client account relationship");
    assert(protectedDirectWrites.length === 0, `Browser performed direct protected-table writes: ${protectedDirectWrites.join(", ")}`);

    await page.keyboard.press("Tab");
    const focusTag = await page.evaluate(() => document.activeElement?.tagName || "");
    assert(["BUTTON", "SELECT", "INPUT", "TEXTAREA", "A", "SUMMARY"].includes(focusTag), "Keyboard smoke did not reach an interactive element");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "360x900 view has horizontal overflow");

    assert(consoleErrors.length === 0, `Browser console errors: ${consoleErrors.join(" | ")}`);
    assert(failedRequests.length === 0, `Browser request failures: ${failedRequests.join(" | ")}`);
  } finally {
    if (token && inquiryId) {
      await rpc(token, "cleanup_stage2_synthetic_inquiry_e2e", {
        p_inquiry_id: inquiryId,
        p_marker: RUN_MARKER
      }).catch(error => failedRequests.push(`cleanup: ${error.message}`));
    }

    const result = {
      stagingRef: STAGING_REF,
      runMarker: RUN_MARKER,
      inquiryId,
      convertedClientId,
      rpcRequests,
      protectedDirectWrites,
      consoleErrors,
      failedRequests,
      viewport: { width: 360, height: 900 },
      status: consoleErrors.length || protectedDirectWrites.length || failedRequests.length ? "FAIL" : "PASS"
    };
    await writeFile(`${ARTIFACT_DIR}/stage2-result.json`, JSON.stringify(result, null, 2));
    await browser.close();
  }

  const remaining = token && inquiryId
    ? (await api(query("inquiries", { id: `eq.${inquiryId}`, select: "id" }), { token })).payload
    : [];
  assert(Array.isArray(remaining) && remaining.length === 0, "Stage 2 cleanup left the synthetic inquiry behind");
  console.log("STAGE2_BROWSER_E2E_SUCCESS PASS");
}

await main();
