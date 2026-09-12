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
const CLIENT_NAME = "QA PWD Client (synthetic)";
const QUESTIONNAIRE_TITLE = "QA · Ankieta przed pierwszą wizytą";
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
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  if (remaining <= 4) await new Promise(resolve => setTimeout(resolve, (remaining + 1) * 1000));
  return totpCode(secret);
}

async function apiRequest(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${STAGING_ORIGIN}${path}`, {
    method,
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { error: "non_json_response" }; }
  }
  if (!response.ok) {
    const code = payload?.error || payload?.code || "unknown_error";
    throw new Error(`Staging ${method} ${path} failed with ${response.status} (${code})`);
  }
  return payload;
}

async function fixtureRequest(token, action, assignmentId = "") {
  return apiRequest("/functions/v1/questionnaire-e2e-fixture", {
    token,
    method: "POST",
    body: {
      action,
      marker: RUN_MARKER,
      ...(assignmentId ? { assignmentId } : {})
    }
  });
}

async function loginTrainerAal2(page) {
  await page.goto(PREVIEW_URL, { waitUntil: "domcontentloaded" });
  await page.getByText("STAGING / QA", { exact: false }).first().waitFor({ state: "visible" });
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
  assert(rawSession, "Trainer AAL2 session not found");
  const session = JSON.parse(rawSession);
  assert(decodeJwt(session.access_token).aal === "aal2", "Trainer session did not reach AAL2");
  return session.access_token;
}

async function loginClient(page, email, password) {
  await page.goto(PREVIEW_URL, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Hasło").fill(password);
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await page.getByRole("heading", { name: /Dzień dobry/ }).waitFor({ state: "visible", timeout: 20_000 });
  await page.getByRole("heading", { name: "ANKIETY" }).waitFor({ state: "visible", timeout: 20_000 });
}

async function choose(page, name, value) {
  const input = page.locator(`[name="${name}"][value="${value}"]`);
  await input.check();
}

async function fill(page, name, value) {
  await page.locator(`[name="${name}"]`).fill(value);
}

async function baselineGuidance(token, clientId) {
  const params = new URLSearchParams({
    client_id: `eq.${clientId}`,
    deleted_at: "is.null",
    select: "id,status,guidance_channel,delivery_status",
    order: "id.asc"
  });
  return apiRequest(`/rest/v1/home_plans?${params}`, { token });
}

async function openQuestionnaire(page, label = /Wypełnij|Kontynuuj/) {
  const action = page.getByRole("button", { name: label });
  assert(await action.count() === 1, `Expected exactly one current questionnaire action for ${String(label)}`);
  const card = action.locator("xpath=ancestor::article[1]");
  await card.getByText(QUESTIONNAIRE_TITLE, { exact: true }).waitFor({ state: "visible", timeout: 20_000 });
  await action.click();
  await page.getByRole("heading", { name: "ANKIETA · przed pierwszą wizytą" })
    .waitFor({ state: "visible", timeout: 20_000 });
}

async function fillSafePath(page) {
  await fill(page, "age", "44");
  await fill(page, "emergency_contact_name", "Osoba Testowa");
  await fill(page, "emergency_contact_phone", "+48111222333");
  await fill(page, "emergency_contact_relation", "Bliska osoba");

  await choose(page, "q2_goal_current", "yes");
  await choose(page, "q3_goal_ability", "6");
  await choose(page, "q4_main_barriers", "general_fitness");
  await choose(page, "q5_work_day", "mostly_standing_walking");

  await page.locator('[name="health_data_processing_gate"]').check();
  await page.locator('[name="q7_exertion_symptoms"][value="none"]').waitFor({ state: "visible", timeout: 15_000 });
  await choose(page, "q7_exertion_symptoms", "none");
  await choose(page, "q8_chronic_condition", "no");
  await choose(page, "q9_movement_restriction", "no");
}

async function finishSafePath(page) {
  await choose(page, "q10_medication", "no");
  await choose(page, "q11_supplements", "no");
  await choose(page, "q12_balance", "none");
  await choose(page, "q12a_walking_aid", "no");
  await choose(page, "q13_pain", "no");
  await choose(page, "q14_major_injury_surgery", "no");
  await choose(page, "q15_hospital_12m", "no");
  await choose(page, "q_pregnancy_applicability", "not_applicable");
  await choose(page, "q18_exercise_frequency", "1_week");
  await choose(page, "q19_break", "1_3m");
  await choose(page, "q20_future_intensity", "no");
  await choose(page, "q21_weekly_time", "2");
  await choose(page, "q22_session_time", "45_60");
  await choose(page, "q23_adherence_barriers", "nothing_significant");
  await choose(page, "q24_water", "1_5_2");
  await choose(page, "q25_sleep", "7");
  await choose(page, "q26_energy", "7");
  await choose(page, "q27_stress", "4");
  await choose(page, "q28_meals", "regular_varied");
  await choose(page, "q29_fruit_veg", "3_4");
  await page.locator('[name="confirm_best_knowledge"]').check();
  await page.locator('[name="confirm_trainer_not_doctor"]').check();
}

async function run() {
  assert(QA_EMAIL && QA_PASSWORD && QA_TOTP_SECRET, "QA trainer credentials are not configured");
  assert(PUBLISHABLE_KEY.length >= 40, "Staging publishable key is not configured");
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const trainerContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const trainerPage = await trainerContext.newPage();
  let clientContext = null;
  let trainerToken = "";
  let fixture = null;
  let guidanceBefore = null;
  let primaryError = null;
  const directWrites = [];
  const foreignSupabase = [];
  const badResponses = [];

  try {
    trainerToken = await loginTrainerAal2(trainerPage);
    const prepared = await fixtureRequest(trainerToken, "prepare");
    fixture = prepared?.fixture || null;
    assert(fixture?.assignmentId && fixture?.clientEmail && fixture?.clientPassword, "Questionnaire E2E fixture is incomplete");
    guidanceBefore = await baselineGuidance(trainerToken, fixture.clientId);

    clientContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const clientPage = await clientContext.newPage();
    clientPage.on("request", request => {
      let url;
      try { url = new URL(request.url()); } catch { return; }
      if (url.hostname.endsWith(".supabase.co") && url.origin !== STAGING_ORIGIN) foreignSupabase.push(url.href);
      if (url.origin === STAGING_ORIGIN
          && ["POST", "PATCH", "PUT", "DELETE"].includes(request.method())
          && /^\/rest\/v1\/(questionnaire_|client_profile_details)/.test(url.pathname)) {
        directWrites.push(`${request.method()} ${url.pathname}`);
      }
    });
    clientPage.on("response", response => {
      let url;
      try { url = new URL(response.url()); } catch { return; }
      if (url.origin === STAGING_ORIGIN && response.status() >= 400) {
        badResponses.push(`${response.status()} ${response.request().method()} ${url.pathname}`);
      }
    });

    await loginClient(clientPage, fixture.clientEmail, fixture.clientPassword);
    const submittedBefore = await clientPage.getByText("Wypełniona", { exact: true }).count();
    await openQuestionnaire(clientPage, "Wypełnij");
    await fillSafePath(clientPage);

    await clientPage.waitForTimeout(1800);
    await clientPage.reload({ waitUntil: "domcontentloaded" });
    await clientPage.getByRole("heading", { name: /Dzień dobry/ }).waitFor({ state: "visible", timeout: 20_000 });
    await clientPage.getByRole("button", { name: "Kontynuuj" }).waitFor({ state: "visible", timeout: 20_000 });
    await openQuestionnaire(clientPage, "Kontynuuj");
    assert(await clientPage.locator('[name="age"]').inputValue() === "44", "Profile context did not resume from server");
    assert(await clientPage.locator('[name="q2_goal_current"][value="yes"]').isChecked(), "Starting-point answer did not resume");
    assert(await clientPage.locator('[name="q7_exertion_symptoms"][value="none"]').isChecked(), "Health answer did not resume");

    const trainerSelect = trainerPage.getByLabel("Wybierz klienta");
    await trainerSelect.selectOption({ label: CLIENT_NAME });
    await trainerPage.getByRole("heading", { name: CLIENT_NAME }).waitFor({ state: "visible", timeout: 20_000 });
    await trainerPage.waitForTimeout(1000);
    const priorBrief = trainerPage.getByRole("heading", { name: "PRZED WIZYTĄ — 60 SEKUND" });
    if (await priorBrief.count()) {
      const priorText = await priorBrief.locator("xpath=ancestor::section[contains(@class,'panel')]").innerText();
      assert(!priorText.includes(RUN_MARKER), "Trainer saw the current questionnaire draft before conscious submission");
    }

    await finishSafePath(clientPage);
    await clientPage.getByRole("button", { name: "Przekaż ankietę trenerowi" }).click();
    const openActions = clientPage.getByRole("button", { name: /Wypełnij|Kontynuuj/ });
    if (await openActions.count()) {
      await openActions.first().waitFor({ state: "detached", timeout: 20_000 });
    }
    assert(await openActions.count() === 0, "Submitted questionnaire remained editable in client list");
    assert(await clientPage.getByText("Wypełniona", { exact: true }).count() === submittedBefore + 1,
      "Current questionnaire did not add exactly one submitted history entry");

    await trainerPage.getByRole("button", { name: "Odśwież" }).click();
    const briefHeading = trainerPage.getByRole("heading", { name: "PRZED WIZYTĄ — 60 SEKUND" });
    await briefHeading.waitFor({ state: "visible", timeout: 20_000 });
    const briefPanel = briefHeading.locator("xpath=ancestor::section[contains(@class,'panel')]");
    const briefText = await briefPanel.innerText();
    assert(briefText.includes(RUN_MARKER), "Trainer brief did not switch to the current submitted assignment");
    assert(briefText.includes("Na ile możesz dziś zrobić to, na czym najbardziej Ci zależy?"), "Trainer brief lost goal-ability source");
    assert(briefText.includes("6"), "Trainer brief lost submitted goal-ability value");
    assert(briefText.includes("Żadne z powyższych"), "Trainer brief lost safety answer");
    assert(!briefText.match(/GREEN|YELLOW|RED|scoring|punktacj/i), "Trainer brief introduced scoring language");

    const guidanceAfter = await baselineGuidance(trainerToken, fixture.clientId);
    assert(JSON.stringify(guidanceAfter) === JSON.stringify(guidanceBefore),
      "Questionnaire submission changed Guidance/Home Plan state");
    assert(directWrites.length === 0, `Client made direct questionnaire/profile table writes: ${directWrites.join(", ")}`);
    assert(foreignSupabase.length === 0, "Client contacted a non-staging Supabase project");
    assert(badResponses.length === 0, `Staging returned unexpected errors: ${badResponses.join(", ")}`);

    await trainerPage.screenshot({ path: `${ARTIFACT_DIR}/questionnaire-trainer-brief.png`, fullPage: true });
    await writeFile(`${ARTIFACT_DIR}/questionnaire-e2e.json`, JSON.stringify({
      marker: RUN_MARKER,
      assignmentId: fixture.assignmentId,
      clientId: fixture.clientId,
      draftHiddenFromTrainer: true,
      resumeVerified: true,
      consciousSubmitVerified: true,
      trainerBriefVerified: true,
      guidanceUnchanged: true
    }, null, 2));
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      if (trainerToken && fixture?.assignmentId) {
        await fixtureRequest(trainerToken, "cleanup", fixture.assignmentId);
      }
    } catch (cleanupError) {
      if (!primaryError) throw cleanupError;
      console.error(`Questionnaire E2E cleanup failed: ${cleanupError.message}`);
    } finally {
      await clientContext?.close().catch(() => {});
      await trainerContext.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});