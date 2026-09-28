import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const STAGING_REF = "ulauyoqjoetjqktegeuq";
const STAGING_ORIGIN = `https://${STAGING_REF}.supabase.co`;
const PREVIEW_URL = process.env.STUDIO_LAS_E2E_URL || "http://127.0.0.1:8791/studio-las-os.html?trainer-ui=attention-v1";
const QA_EMAIL = String(process.env.STUDIO_LAS_QA_EMAIL || "").trim();
const QA_PASSWORD = String(process.env.STUDIO_LAS_QA_PASSWORD || "");
const QA_TOTP_SECRET = String(process.env.STUDIO_LAS_QA_TOTP_SECRET || "").trim();
const ARTIFACT_DIR = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/trainer-attention-staging";

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

async function loginToTrainer(page) {
  await page.goto(PREVIEW_URL, { waitUntil: "domcontentloaded" });
  await page.getByText("STAGING / QA", { exact: false }).first().waitFor({ state: "visible", timeout: 15_000 });
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
}

async function run() {
  assert(QA_EMAIL && QA_PASSWORD && QA_TOTP_SECRET, "QA browser credentials are missing");
  assert(new URL(PREVIEW_URL).searchParams.get("trainer-ui") === "attention-v1",
    "Preview URL is missing the explicit Trainer Attention flag");
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const appWrites = [];
  const foreignSupabaseRequests = [];
  const pageErrors = [];

  page.on("pageerror", error => pageErrors.push(String(error?.message || error)));
  page.on("request", request => {
    let url;
    try { url = new URL(request.url()); } catch { return; }
    if (url.hostname.endsWith(".supabase.co") && url.origin !== STAGING_ORIGIN) {
      foreignSupabaseRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
    }
    if (url.origin === STAGING_ORIGIN
        && url.pathname.startsWith("/rest/v1/")
        && !["GET", "HEAD"].includes(request.method())) {
      appWrites.push(`${request.method()} ${url.pathname}`);
    }
  });

  try {
    await loginToTrainer(page);
    await page.getByRole("heading", { name: "Kto dziś wymaga Twojej uwagi?" }).waitFor({ timeout: 20_000 });
    await page.getByText("To nie jest ranking klientów.", { exact: false }).waitFor();
    assert(await page.locator(".sl-attention-runtime").count() === 1, "Trainer Attention preview did not render");
    assert(await page.getByRole("button", { name: "Uwaga" }).count() === 1, "Trainer Attention navigation control is missing");

    await page.screenshot({ path: `${ARTIFACT_DIR}/trainer-attention-preview.png`, fullPage: true });

    const attentionOpen = page.locator(".sl-attention-open").first();
    if (await attentionOpen.count()) {
      await attentionOpen.click();
    } else {
      const quiet = page.locator(".sl-attention-quiet-details");
      await quiet.locator("summary").click();
      const quietClient = quiet.locator(".sl-attention-quiet-button").first();
      assert(await quietClient.count() === 1, "Preview has neither an attention item nor a quiet client to open");
      await quietClient.click();
    }

    await page.locator(".workspace").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.querySelector(".sl-attention-runtime"), null, { timeout: 20_000 });
    const selectedClient = await page.getByLabel("Wybierz klienta").inputValue();
    assert(selectedClient, "Opening Attention context did not select a client");

    await page.getByRole("button", { name: "Uwaga" }).click();
    await page.getByRole("heading", { name: "Kto dziś wymaga Twojej uwagi?" }).waitFor({ timeout: 20_000 });

    assert.deepEqual(appWrites, [], `Trainer Attention preview performed application writes: ${appWrites.join(", ")}`);
    assert.deepEqual(foreignSupabaseRequests, [], `Preview contacted a non-staging Supabase project: ${foreignSupabaseRequests.join(", ")}`);
    assert.deepEqual(pageErrors, [], `Preview raised browser errors: ${pageErrors.join(" | ")}`);
    console.log("TRAINER_ATTENTION_PREVIEW_STAGING_PASS");
  } finally {
    await browser.close();
  }
}

await run();
