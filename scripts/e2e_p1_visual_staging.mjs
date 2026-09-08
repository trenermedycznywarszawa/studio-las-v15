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
const GOAL_MARKER = `P1-VISUAL-${RUN_MARKER} — swobodne i pewne chodzenie po schodach`;
const ARTIFACT_DIR = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";

const VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1280, height: 900 }),
  mobile: Object.freeze({ width: 360, height: 900 })
});

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

async function readClient(token, clientId) {
  const rows = await apiRequest(queryPath("clients", {
    id: `eq.${clientId}`,
    select: "id,stage,goal"
  }), { token });
  assert(Array.isArray(rows) && rows.length === 1, "Synthetic QA client baseline not found");
  return rows[0];
}

async function patchClient(token, clientId, patch) {
  const rows = await apiRequest(queryPath("clients", {
    id: `eq.${clientId}`,
    select: "id,stage,goal"
  }), {
    token,
    method: "PATCH",
    body: patch,
    prefer: "return=representation"
  });
  assert(Array.isArray(rows) && rows.length === 1, "Synthetic QA client patch did not return exactly one row");
  return rows[0];
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

async function reloadAndSelect(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Panel trenera" }).waitFor({ state: "visible", timeout: 20_000 });
  return selectSyntheticClient(page);
}

function identityPanel(page) {
  return page.getByRole("heading", { name: CLIENT_NAME })
    .locator("xpath=ancestor::section[contains(@class, 'panel')]");
}

function indexOfHeading(headings, label) {
  return headings.findIndex(value => value === label);
}

function assertBefore(headings, first, second, stage) {
  const firstIndex = indexOfHeading(headings, first);
  const secondIndex = indexOfHeading(headings, second);
  assert(firstIndex >= 0, `Stage ${stage}: missing section ${first}`);
  assert(secondIndex >= 0, `Stage ${stage}: missing section ${second}`);
  assert(firstIndex < secondIndex, `Stage ${stage}: expected ${first} before ${second}`);
}

function assertStageHierarchy(stage, headings) {
  assert(headings[0] === CLIENT_NAME, `Stage ${stage}: client identity is not first`);
  assert(headings[1] === "Teraz", `Stage ${stage}: Teraz is not second`);

  if (stage === 1) {
    assertBefore(headings, "Pierwsza Wizyta Diagnostyczna", "Prowadzenie klienta", stage);
    assertBefore(headings, "Pierwsza Wizyta Diagnostyczna", "Sesje", stage);
  } else if (stage === 2) {
    assertBefore(headings, "Prowadzenie klienta", "Pierwsza Wizyta Diagnostyczna", stage);
    assertBefore(headings, "Sygnały do przeglądu", "Pierwsza Wizyta Diagnostyczna", stage);
  } else if (stage === 3) {
    assertBefore(headings, "Sesje", "Pierwsza Wizyta Diagnostyczna", stage);
    assertBefore(headings, "Prowadzenie klienta", "Pierwsza Wizyta Diagnostyczna", stage);
  } else if (stage === 4) {
    assertBefore(headings, "Decyzja co dalej", "Raporty", stage);
    assertBefore(headings, "Raporty", "Pierwsza Wizyta Diagnostyczna", stage);
  }
}

async function captureLayout(page, stage, viewportName) {
  const headings = (await page.locator("main.workspace > section.panel > .section-heading > h2").allTextContents())
    .map(value => value.trim());
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll("main.workspace > section.panel"));
    const positionByHeading = {};
    for (const section of sections) {
      const heading = section.querySelector(":scope > .section-heading > h2");
      if (!heading) continue;
      positionByHeading[String(heading.textContent || "").trim()] = Math.round(section.getBoundingClientRect().top);
    }
    const goalLabel = Array.from(document.querySelectorAll("main.workspace span"))
      .find(node => String(node.textContent || "").trim() === "Cel klienta");
    const goalCard = goalLabel?.closest("article") || null;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      horizontalOverflow: root.scrollWidth > root.clientWidth + 2,
      goalCardTop: goalCard ? Math.round(goalCard.getBoundingClientRect().top) : null,
      positions: positionByHeading
    };
  });

  assert(!metrics.horizontalOverflow, `Stage ${stage} ${viewportName}: horizontal page overflow`);
  assertStageHierarchy(stage, headings);
  const identity = identityPanel(page);
  assert(await identity.getByText(GOAL_MARKER, { exact: true }).count() === 1,
    `Stage ${stage} ${viewportName}: canonical client goal is missing from identity`);
  assert(await identity.getByText("Cel klienta", { exact: true }).count() === 1,
    `Stage ${stage} ${viewportName}: client goal label is missing or duplicated in identity`);

  return { headings, ...metrics };
}

async function run() {
  assert(QA_EMAIL && QA_PASSWORD && QA_TOTP_SECRET, "QA browser E2E secrets are not configured");
  assert(PUBLISHABLE_KEY.length >= 40, "Staging publishable key is not configured");
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  let token = "";
  let clientId = "";
  let baseline = null;
  let primaryError = null;
  const stages = [];

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(String(error?.message || error)));
  page.on("requestfailed", request => failedRequests.push(`${request.method()} ${request.url()}`));

  try {
    token = await loginToAal2(page);
    clientId = await selectSyntheticClient(page);
    baseline = await readClient(token, clientId);

    for (const stage of [1, 2, 3, 4]) {
      const patched = await patchClient(token, clientId, { stage, goal: GOAL_MARKER });
      assert(Number(patched.stage) === stage, `Stage ${stage}: staging client stage patch was not persisted`);
      assert(patched.goal === GOAL_MARKER, `Stage ${stage}: staging client goal patch was not persisted`);

      await page.setViewportSize(VIEWPORTS.desktop);
      await reloadAndSelect(page);
      await identityPanel(page).getByText(GOAL_MARKER, { exact: true }).waitFor({ state: "visible", timeout: 20_000 });
      const desktop = await captureLayout(page, stage, "desktop");
      await page.screenshot({
        path: `${ARTIFACT_DIR}/p1-stage${stage}-desktop.png`,
        fullPage: true
      });

      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(150);
      const mobile = await captureLayout(page, stage, "mobile");
      await page.screenshot({
        path: `${ARTIFACT_DIR}/p1-stage${stage}-mobile.png`,
        fullPage: true
      });

      stages.push({ stage, desktop, mobile });
    }

    assert(consoleErrors.length === 0, `Browser console errors: ${consoleErrors.join(" | ")}`);
    assert(pageErrors.length === 0, `Browser page errors: ${pageErrors.join(" | ")}`);
    assert(failedRequests.length === 0, `Browser request failures: ${failedRequests.join(", ")}`);

    await writeFile(`${ARTIFACT_DIR}/p1-visual-validation.json`, JSON.stringify({
      verdict: "PASS",
      stagingRef: STAGING_REF,
      marker: RUN_MARKER,
      aal: "aal2",
      canonicalGoalSource: "clients.goal",
      stages
    }, null, 2));
  } catch (error) {
    primaryError = error;
    await page.screenshot({ path: `${ARTIFACT_DIR}/p1-visual-failure.png`, fullPage: true }).catch(() => {});
    await writeFile(`${ARTIFACT_DIR}/p1-visual-validation.json`, JSON.stringify({
      verdict: "FAIL",
      stagingRef: STAGING_REF,
      marker: RUN_MARKER,
      reason: String(error?.message || error),
      stages
    }, null, 2)).catch(() => {});
  } finally {
    let cleanupError = null;
    if (token && clientId && baseline) {
      try {
        const restored = await patchClient(token, clientId, {
          stage: Number(baseline.stage),
          goal: baseline.goal ?? null
        });
        assert(Number(restored.stage) === Number(baseline.stage), "P1 visual cleanup did not restore client stage");
        assert((restored.goal ?? null) === (baseline.goal ?? null), "P1 visual cleanup did not restore client goal");
      } catch (error) {
        cleanupError = error;
      }
    }
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (cleanupError) {
      throw new Error(`${primaryError ? `${primaryError.message}; ` : ""}cleanup failed: ${cleanupError.message}`);
    }
    if (primaryError) throw primaryError;
  }

  console.log("P1_VISUAL_STAGING_PASS");
}

await run();
