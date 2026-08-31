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
const CLIENT_NAME = "QA PWD Client (synthetic)";
const RUN_MARKER = String(process.env.STUDIO_LAS_E2E_MARKER || `GHA-${Date.now()}`)
  .replace(/[^A-Za-z0-9_-]/g, "-")
  .slice(0, 80);
const ZERO_MARKER = `E2E-${RUN_MARKER}-ZERO`;
const THREE_MARKER = `E2E-${RUN_MARKER}-THREE`;
const ARTIFACT_DIR = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeJwt(token) {
  const part = String(token || "").split(".")[1];
  if (!part) return {};
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function normalizeTotpSecret(value) {
  const raw = String(value || "").trim();
  if (/^otpauth:\/\//i.test(raw)) {
    const url = new URL(raw);
    return String(url.searchParams.get("secret") || "").replace(/\s+/g, "");
  }
  return raw.replace(/\s+/g, "");
}

function decodeBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = normalizeTotpSecret(input).toUpperCase().replace(/=+$/g, "");
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
  const seconds = Math.floor(Date.now() / 1000) % 30;
  const remaining = 30 - seconds;
  if (remaining <= 4) {
    await new Promise(resolve => setTimeout(resolve, (remaining + 1) * 1000));
  }
  return totpCode(secret);
}

async function apiRequest(path, { token, method = "GET", body = undefined, prefer = "" } = {}) {
  assert(PUBLISHABLE_KEY.length >= 40, "Missing staging publishable key");
  const response = await fetch(`${STAGING_ORIGIN}${path}`, {
    method,
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    throw new Error(`Staging REST ${method} ${path.split("?")[0]} failed with ${response.status}`);
  }
  return payload;
}

function queryPath(table, params) {
  return `/rest/v1/${table}?${new URLSearchParams(params).toString()}`;
}

async function getClientBaseline(token, clientId) {
  const rows = await apiRequest(queryPath("clients", {
    id: `eq.${clientId}`,
    select: "id,goal,motivation"
  }), { token });
  assert(Array.isArray(rows) && rows.length === 1, "Synthetic QA client baseline not found");
  return rows[0];
}

async function getGuidanceBaseline(token, clientId) {
  const plans = await apiRequest(queryPath("home_plans", {
    client_id: `eq.${clientId}`,
    deleted_at: "is.null",
    select: "id,status,guidance_channel,delivery_status",
    order: "id.asc"
  }), { token });
  const items = await apiRequest(queryPath("home_plan_items", {
    client_id: `eq.${clientId}`,
    deleted_at: "is.null",
    select: "id,home_plan_id,name",
    order: "id.asc"
  }), { token });
  return { plans, items };
}

async function findPwdSessions(token, clientId, marker) {
  return apiRequest(queryPath("sessions", {
    client_id: `eq.${clientId}`,
    session_type: "eq.pwd",
    deleted_at: "is.null",
    client_summary: `like.*${marker}*`,
    select: "id,date,trainer_decision,client_next_step,client_summary",
    order: "created_at.asc"
  }), { token });
}

async function getSessionObservations(token, sessionId) {
  return apiRequest(queryPath("assessment_results", {
    session_id: `eq.${sessionId}`,
    deleted_at: "is.null",
    select: "id,session_id,test_id,test_name,result_text,observation_type,reaction_text,trainer_decision,next_step",
    order: "created_at.asc"
  }), { token });
}

async function cleanupRun(token, clientId, baseline) {
  if (!token || !clientId || !baseline) return;
  const cleanupMarker = `E2E-${RUN_MARKER}`;
  const cleanup = await apiRequest("/rest/v1/rpc/cleanup_synthetic_pwd_e2e", {
    token,
    method: "POST",
    body: {
      p_client_id: clientId,
      p_marker: cleanupMarker,
      p_restore_goal: baseline.goal ?? null,
      p_restore_motivation: baseline.motivation ?? null
    }
  });
  assert(cleanup && Number.isFinite(Number(cleanup.sessionCount)),
    "Synthetic cleanup RPC returned an invalid response");

  const remaining = [
    ...(await findPwdSessions(token, clientId, ZERO_MARKER)),
    ...(await findPwdSessions(token, clientId, THREE_MARKER))
  ];
  assert(remaining.length === 0, "Browser E2E cleanup left active PWD sessions behind");
  const restored = await getClientBaseline(token, clientId);
  assert(restored.goal === baseline.goal && restored.motivation === baseline.motivation,
    "Browser E2E cleanup did not restore synthetic client baseline");
}

async function loginToAal2(page) {
  await page.goto(PREVIEW_URL, { waitUntil: "domcontentloaded" });
  await page.getByText("STAGING / QA", { exact: false }).first().waitFor({ state: "visible" });
  const mode = await page.evaluate(() => window.STUDIO_LAS_CONFIG?.mode);
  const ref = await page.evaluate(() => window.STUDIO_LAS_CONFIG?.supabase?.projectRef);
  assert(mode === "staging" && ref === STAGING_REF, "Preview is not pinned to canonical staging");

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
    const code = await freshTotpCode(QA_TOTP_SECRET);
    await page.getByLabel("Sześciocyfrowy kod jednorazowy").fill(code);
    await page.getByRole("button", { name: "Potwierdź kod" }).click();
  }

  await trainerHeading.waitFor({ state: "visible", timeout: 20_000 });
  await page.getByText("QA Trainer (synthetic)", { exact: true }).waitFor({ state: "visible" });
  const rawSession = await page.evaluate(() => sessionStorage.getItem("studio-las-auth-session"));
  assert(rawSession, "AAL2 trainer session was not persisted to sessionStorage");
  const session = JSON.parse(rawSession);
  assert(decodeJwt(session.access_token).aal === "aal2", "Trainer session did not reach AAL2");
  return session.access_token;
}

async function selectSyntheticClient(page) {
  const select = page.getByLabel("Wybierz klienta");
  await select.selectOption({ label: CLIENT_NAME });
  const clientId = await select.inputValue();
  assert(/^[0-9a-f-]{20,64}$/i.test(clientId), "Synthetic QA client id is invalid");
  await page.getByRole("heading", { name: CLIENT_NAME }).waitFor({ state: "visible" });
  return clientId;
}

async function openPwdForm(page) {
  const heading = page.getByRole("heading", { name: "Pierwsza Wizyta Diagnostyczna" });
  const section = heading.locator("xpath=ancestor::section[contains(@class, 'panel')]");
  const details = section.locator("details").filter({ has: page.locator("summary", { hasText: "Zapisz PWD" }) });
  const summary = details.locator("summary");
  if (!(await details.evaluate(node => node.open))) await summary.click();
  const form = details.locator("form");
  await form.waitFor({ state: "visible" });
  return { section, details, summary, form };
}

function pwdSessionArticle(page, marker) {
  const heading = page.getByRole("heading", { name: "Pierwsza Wizyta Diagnostyczna" });
  const section = heading.locator("xpath=ancestor::section[contains(@class, 'panel')]");
  const sessionList = section.locator(".record-list").first();
  return sessionList.locator(":scope > article.record").filter({ hasText: marker });
}

async function fillPwdCore(form, marker, decision = "") {
  const today = new Date().toISOString().slice(0, 10);
  await form.locator('[name="date"]').fill(today);
  await form.locator('[name="realLifeGoal"]').fill(`${marker} — pewne wejście i zejście po schodach`);
  await form.locator('[name="whyImportant"]').fill(`${marker} — samodzielność poza domem`);
  await form.locator('[name="contextBoundaries"]').fill(`${marker} — spokojne tempo, bez forsowania`);
  await form.locator('[name="trainerInterpretation"]').fill(`${marker} — interpretacja należy do trenera`);
  await form.locator('[name="nextStep"]').fill(`${marker} — omówić wzorzec na kolejnym spotkaniu`);
  if (decision) await form.locator('[name="trainerDecision"]').selectOption(decision);
}

async function reloadAndSelect(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Panel trenera" }).waitFor({ state: "visible", timeout: 20_000 });
  return selectSyntheticClient(page);
}

async function run() {
  assert(QA_EMAIL && QA_PASSWORD && QA_TOTP_SECRET, "QA browser E2E secrets are not configured");
  assert(PUBLISHABLE_KEY.length >= 40, "Staging publishable key is not configured");
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const foreignSupabaseRequests = [];
  const badSupabaseResponses = [];
  const rpcRequests = [];
  const directPwdWrites = [];
  let token = "";
  let clientId = "";
  let clientBaseline = null;
  let guidanceBaseline = null;
  let primaryError = null;

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(String(error?.message || error)));
  page.on("requestfailed", request => failedRequests.push(`${request.method()} ${request.url()}`));
  page.on("request", request => {
    let url;
    try { url = new URL(request.url()); } catch { return; }
    if (url.hostname.endsWith(".supabase.co") && url.origin !== STAGING_ORIGIN) {
      foreignSupabaseRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
    }
    if (url.origin === STAGING_ORIGIN && request.method() === "POST" && url.pathname === "/rest/v1/rpc/save_pwd_workflow") {
      rpcRequests.push(url.pathname);
    }
    if (url.origin === STAGING_ORIGIN
        && ["POST", "PATCH", "PUT", "DELETE"].includes(request.method())
        && /^\/rest\/v1\/(clients|sessions|assessment_results)$/.test(url.pathname)) {
      directPwdWrites.push(`${request.method()} ${url.pathname}`);
    }
  });
  page.on("response", response => {
    let url;
    try { url = new URL(response.url()); } catch { return; }
    if (url.origin === STAGING_ORIGIN && response.status() >= 400) {
      badSupabaseResponses.push(`${response.status()} ${response.request().method()} ${url.pathname}`);
    }
  });

  try {
    token = await loginToAal2(page);
    clientId = await selectSyntheticClient(page);
    clientBaseline = await getClientBaseline(token, clientId);
    guidanceBaseline = await getGuidanceBaseline(token, clientId);

    // PWD #1: zero observations + required-decision validation.
    let pwd = await openPwdForm(page);
    assert(await pwd.form.locator("[data-pwd-observation-card]").count() === 0,
      "New PWD form did not start with zero observations");
    await fillPwdCore(pwd.form, ZERO_MARKER);
    const rpcBeforeValidation = rpcRequests.length;
    await pwd.form.locator('button[type="submit"]').click();
    await page.waitForTimeout(250);
    const validationMessage = await pwd.form.locator('[name="trainerDecision"]').evaluate(element => element.validationMessage);
    assert(validationMessage.length > 0, "Missing trainer decision did not trigger browser validation");
    assert(rpcRequests.length === rpcBeforeValidation, "Missing trainer decision triggered an RPC mutation");

    await pwd.form.locator('[name="trainerDecision"]').selectOption("clarify_or_observe");
    const rpcBeforeZero = rpcRequests.length;
    await pwd.form.locator('button[type="submit"]').click();
    await page.getByText(ZERO_MARKER, { exact: false }).first().waitFor({ state: "visible", timeout: 20_000 });
    assert(rpcRequests.length === rpcBeforeZero + 1, "Zero-observation PWD did not use exactly one save_pwd_workflow RPC");

    let zeroSessions = await findPwdSessions(token, clientId, ZERO_MARKER);
    assert(zeroSessions.length === 1, "Zero-observation PWD did not create exactly one active session");
    assert((await getSessionObservations(token, zeroSessions[0].id)).length === 0,
      "Zero-observation PWD unexpectedly created assessments");

    await reloadAndSelect(page);
    const zeroArticle = pwdSessionArticle(page, ZERO_MARKER);
    assert(await zeroArticle.count() === 1, "Zero-observation PWD did not rehydrate exactly once after reload");
    assert((await zeroArticle.innerText()).includes("Brak obserwacji w tej PWD."),
      "Zero-observation PWD lost its empty-observation state after reload");

    // PWD #2: all three structural observation types.
    pwd = await openPwdForm(page);
    const addObservation = pwd.form.getByRole("button", { name: "Dodaj obserwację" });
    await addObservation.click();
    await addObservation.click();
    await addObservation.click();
    assert(await pwd.form.locator("[data-pwd-observation-card]").count() === 3,
      "PWD form did not create exactly three observation cards");
    assert(await addObservation.isDisabled(), "Fourth PWD observation was not blocked at the product limit");

    await pwd.form.locator('[name="pwdObservationType_0"]').selectOption("reference");
    await pwd.form.locator('[name="pwdObservationReference_0"]').selectOption("sit_to_stand");
    assert(await pwd.form.locator('[name="pwdObservationName_0"]').inputValue() === "Siad–wstań bez rąk",
      "Reference library did not populate the observation name");
    await pwd.form.locator('[name="pwdObservationNoticed_0"]').fill(`${THREE_MARKER}-REF — wykonane spokojnie bez podparcia`);
    await pwd.form.locator('[name="pwdObservationReaction_0"]').fill(`${THREE_MARKER}-REF — klient czuł się pewnie`);

    await pwd.form.locator('[name="pwdObservationType_1"]').selectOption("goal_task");
    await pwd.form.locator('[name="pwdObservationName_1"]').fill("Wejście po schodach");
    await pwd.form.locator('[name="pwdObservationNoticed_1"]').fill(`${THREE_MARKER}-GOAL — jedno piętro bez zatrzymania`);
    await pwd.form.locator('[name="pwdObservationReaction_1"]').fill(`${THREE_MARKER}-GOAL — wysiłek akceptowalny`);

    await pwd.form.locator('[name="pwdObservationType_2"]').selectOption("trainer_observation");
    await pwd.form.locator('[name="pwdObservationName_2"]').fill("Kontrola tempa");
    await pwd.form.locator('[name="pwdObservationNoticed_2"]').fill(`${THREE_MARKER}-TRAINER — klient sam zwolnił przy niepewności`);

    await fillPwdCore(pwd.form, THREE_MARKER, "continue_guidance");
    const rpcBeforeThree = rpcRequests.length;
    await pwd.form.locator('button[type="submit"]').click();
    await page.getByText(THREE_MARKER, { exact: false }).first().waitFor({ state: "visible", timeout: 20_000 });
    assert(rpcRequests.length === rpcBeforeThree + 1, "Three-observation PWD did not use exactly one save_pwd_workflow RPC");

    const threeSessions = await findPwdSessions(token, clientId, THREE_MARKER);
    assert(threeSessions.length === 1, "Three-observation PWD did not create exactly one active session");
    const observations = await getSessionObservations(token, threeSessions[0].id);
    assert(observations.length === 3, "Three-observation PWD did not persist exactly three assessments");
    const byType = Object.fromEntries(observations.map(item => [item.observation_type, item]));
    assert(byType.reference?.test_name === "Siad–wstań bez rąk", "Reference observation name was not preserved");
    assert(byType.reference?.reaction_text === `${THREE_MARKER}-REF — klient czuł się pewnie`, "Reference reaction was not preserved");
    assert(byType.goal_task?.test_name === "Wejście po schodach", "Goal-task observation name was not preserved");
    assert(byType.goal_task?.reaction_text === `${THREE_MARKER}-GOAL — wysiłek akceptowalny`, "Goal-task reaction was not preserved");
    assert(byType.trainer_observation?.test_name === "Kontrola tempa", "Trainer observation name was not preserved");
    assert(byType.trainer_observation?.reaction_text === null, "Optional trainer-observation reaction did not remain null");
    assert(observations.every(item => item.trainer_decision === "obserwuj" && item.next_step === null),
      "PWD-level decision leaked into assessment semantics");

    await reloadAndSelect(page);
    zeroSessions = await findPwdSessions(token, clientId, ZERO_MARKER);
    const zeroAfter = pwdSessionArticle(page, ZERO_MARKER);
    const threeAfter = pwdSessionArticle(page, THREE_MARKER);
    assert(zeroSessions.length === 1 && await zeroAfter.count() === 1, "First PWD was lost or duplicated after second PWD");
    assert(await threeAfter.count() === 1, "Second PWD was lost or duplicated after reload");
    const threeText = await threeAfter.innerText();
    assert(threeText.includes(`${THREE_MARKER}-REF`) && threeText.includes(`${THREE_MARKER}-GOAL`) && threeText.includes(`${THREE_MARKER}-TRAINER`),
      "Second PWD did not rehydrate all three observations");
    assert(!(await zeroAfter.innerText()).includes(THREE_MARKER), "Observations leaked between exact PWD sessions");

    const ordinaryHeading = page.getByRole("heading", { name: "Obserwacje ruchowe" });
    const ordinaryPanel = ordinaryHeading.locator("xpath=ancestor::section[contains(@class, 'panel')]");
    const ordinaryText = await ordinaryPanel.innerText();
    assert(!ordinaryText.includes(ZERO_MARKER) && !ordinaryText.includes(THREE_MARKER),
      "PWD observations were duplicated as ordinary assessments");

    const guidanceAfter = await getGuidanceBaseline(token, clientId);
    assert(JSON.stringify(guidanceAfter) === JSON.stringify(guidanceBaseline),
      "PWD browser flow changed guidance/home-plan state");

    assert(rpcRequests.length === 2, `Expected exactly two successful PWD RPC requests, got ${rpcRequests.length}`);
    assert(directPwdWrites.length === 0, `Browser made direct PWD table writes: ${directPwdWrites.join(", ")}`);
    assert(foreignSupabaseRequests.length === 0, "Browser contacted a non-staging Supabase project");
    assert(badSupabaseResponses.length === 0, `Supabase returned errors: ${badSupabaseResponses.join(", ")}`);
    assert(failedRequests.length === 0, `Browser request failures: ${failedRequests.join(", ")}`);
    assert(consoleErrors.length === 0, `Browser console errors: ${consoleErrors.join(" | ")}`);
    assert(pageErrors.length === 0, `Browser page errors: ${pageErrors.join(" | ")}`);

    // Mobile + keyboard smoke without a write.
    await page.setViewportSize({ width: 360, height: 900 });
    await page.waitForTimeout(100);
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    assert(!horizontalOverflow, "360x900 viewport has horizontal page overflow");
    const mobilePwd = await openPwdForm(page);
    await mobilePwd.summary.focus();
    await page.keyboard.press("Enter");
    assert(!(await mobilePwd.details.evaluate(node => node.open)), "PWD summary did not close from keyboard Enter");
    await page.keyboard.press("Enter");
    assert(await mobilePwd.details.evaluate(node => node.open), "PWD summary did not open from keyboard Enter");
    await page.keyboard.press("Tab");
    const activeName = await page.evaluate(() => document.activeElement?.getAttribute("name") || "");
    assert(activeName === "date", "Keyboard focus did not move from PWD summary to the first form control");

    await writeFile(`${ARTIFACT_DIR}/result.json`, JSON.stringify({
      verdict: "PASS",
      stagingRef: STAGING_REF,
      marker: RUN_MARKER,
      aal: "aal2",
      rpcRequests: rpcRequests.length,
      zeroObservationPwd: "PASS",
      threeObservationPwd: "PASS",
      reloadSeparation: "PASS",
      decisionValidation: "PASS",
      guidanceIsolation: "PASS",
      mobileKeyboard: "PASS"
    }, null, 2));
  } catch (error) {
    primaryError = error;
    await page.screenshot({ path: `${ARTIFACT_DIR}/failure.png`, fullPage: true }).catch(() => {});
    await writeFile(`${ARTIFACT_DIR}/result.json`, JSON.stringify({
      verdict: "FAIL",
      stagingRef: STAGING_REF,
      marker: RUN_MARKER,
      reason: String(error?.message || error)
    }, null, 2)).catch(() => {});
  } finally {
    let cleanupError = null;
    try {
      await cleanupRun(token, clientId, clientBaseline);
    } catch (error) {
      cleanupError = error;
    }
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (cleanupError) {
      throw new Error(`${primaryError ? `${primaryError.message}; ` : ""}cleanup failed: ${cleanupError.message}`);
    }
    if (primaryError) throw primaryError;
  }

  console.log("STUDIO_LAS_BROWSER_E2E_PASS");
}

await run();
