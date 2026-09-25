import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.STUDIO_LAS_PLAYWRIGHT_MODULE || "playwright");

const appBase = new URL(process.env.STUDIO_LAS_E2E_URL || "http://127.0.0.1:8790/studio-las-os.html");
assert(["127.0.0.1", "localhost"].includes(appBase.hostname), "Dzisiaj V2 regression must use a local preview");
const fixtureBase = new URL("/tools/today-v2-fixture.html", appBase);
const output = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.STUDIO_LAS_BROWSER_CHANNEL ? { channel: process.env.STUDIO_LAS_BROWSER_CHANNEL } : {})
});

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  assert(metrics.scrollWidth <= metrics.clientWidth + 2,
    `${label}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
}

async function planScenario(viewport, name) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(new URL("?fixture=plan", fixtureBase).href, { waitUntil: "networkidle" });

  await page.getByRole("heading", { name: "Dzisiaj", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Dziś liczy się to, co ustalone.", exact: true }).waitFor();
  await page.getByText("Ustalone przez trenera", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Po wykonaniu", exact: true }).waitFor();
  await page.getByText("Sygnał dla trenera", { exact: true }).waitFor();
  assert.equal(await page.getByText("Minimum / Standard / Więcej", { exact: true }).count(), 0,
    `${name}: mockup-only service-dose choices leaked into runtime`);
  assert.equal(await page.locator("#today-v2-focus .client-response").count(), 0,
    `${name}: response form is competing inside the primary focus card`);
  assert.equal(await page.locator("#today-v2-signal .client-response").count(), 2,
    `${name}: expected canonical per-item response flows in the signal card`);

  const firstResponse = page.locator("#today-v2-signal .client-response").first();
  await firstResponse.getByLabel("Twoja odpowiedź — opcjonalnie", { exact: true })
    .fill("Ruch spokojny, bez bólu ponad ustaloną granicę.");
  await firstResponse.getByRole("button", { name: "Zapisz odpowiedź", exact: true }).click();
  await page.getByText("Odpowiedź zapisana", { exact: false }).first().waitFor();

  await assertNoOverflow(page, name);
  if (viewport.width <= 460) {
    const heroArtDisplay = await page.locator(".sl-hero-art").evaluate(node => getComputedStyle(node).display);
    assert.equal(heroArtDisplay, "none", `${name}: decorative hero art should yield space on small screens`);
  }
  assert.deepEqual(errors, [], `${name}: page errors detected`);
  await page.screenshot({ path: `${output}/today-v2-${name}.png`, fullPage: true });
  await context.close();
}

async function emptyScenario() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(new URL("?fixture=empty", fixtureBase).href, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Dziś niczego nie trzeba dokładać.", exact: true }).waitFor();
  await page.getByText("Bez dodatkowego zadania", { exact: true }).waitFor();
  assert.equal(await page.locator("#today-v2-signal").count(), 0,
    "Empty plan must not ask the client for an execution signal");
  await assertNoOverflow(page, "empty-mobile");
  await context.close();
}

async function uncertainScenario() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(new URL("?fixture=uncertain", fixtureBase).href, { waitUntil: "networkidle" });
  const retry = page.getByRole("button", { name: "Sprawdź i ponów ten sam zapis", exact: true });
  await retry.waitFor();
  await retry.click();
  await page.getByText("Odpowiedź zapisana", { exact: false }).first().waitFor();
  await context.close();
}

try {
  await planScenario({ width: 1280, height: 900 }, "desktop");
  await planScenario({ width: 390, height: 844 }, "mobile");
  await emptyScenario();
  await uncertainScenario();
  console.log("TODAY_V2_LOCAL_BROWSER_PASS");
} finally {
  await browser.close();
}
