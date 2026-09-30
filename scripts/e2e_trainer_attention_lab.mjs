import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.env.STUDIO_LAS_LAB_URL || "http://127.0.0.1:8793/tools/trainer-attention-lab.html";
const output = process.env.STUDIO_LAS_LAB_ARTIFACT_DIR || "output/playwright/attention-lab";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    const writes = [];
    const external = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => {
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(url).origin) external.push(request.url());
    });
    await page.goto(url);
    await page.waitForSelector("#lab-count");
    assert.equal(await page.locator("#lab-count").textContent(), "0 spraw");
    assert.equal(await page.locator(".sl-attention-item").count(), 0);
    assert.equal(await page.getByText("Brak spraw do przejrzenia.", { exact: true }).count(), 1);
    await page.screenshot({ path: `${output}/quiet-${viewport.width}.png`, fullPage: true });

    await page.getByRole("button", { name: "Pytanie klienta", exact: true }).click();
    assert.equal(await page.locator("#lab-count").textContent(), "1 sprawa");
    await page.getByRole("button", { name: "Otwórz kontekst: Anna K.", exact: true }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "lab-context");
    await page.screenshot({ path: `${output}/question-${viewport.width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Przejrzane · bez zmiany", exact: true }).click();
    assert.equal(await page.locator("#lab-count").textContent(), "0 spraw");
    await page.getByRole("button", { name: "Historia", exact: true }).click();
    assert.equal(await page.locator(".sl-lab-content .sl-lab-history li").count(), 1);

    await page.getByRole("button", { name: "Otwarty kontakt", exact: true }).click();
    await page.getByRole("button", { name: "Otwórz kontekst: Anna K.", exact: true }).click();
    assert.equal(await page.locator("#lab-count").textContent(), "1 sprawa");
    await page.getByRole("button", { name: "Kontakt zakończony", exact: true }).click();
    assert.equal(await page.locator("#lab-count").textContent(), "0 spraw");
    assert.equal(await page.locator("#lab-context .sl-lab-history li").count(), 2);

    await page.getByRole("button", { name: "Sygnał po sesji", exact: true }).click();
    await page.getByRole("button", { name: "Otwórz kontekst: Piotr R.", exact: true }).click();
    await page.getByRole("button", { name: "Potrzebny kontakt", exact: true }).click();
    assert.equal(await page.locator("#lab-count").textContent(), "1 sprawa");
    assert.equal(await page.locator(".sl-attention-item").count(), 1);
    await page.getByRole("button", { name: "Kontakt zakończony", exact: true }).click();
    assert.equal(await page.locator("#lab-count").textContent(), "0 spraw");

    await page.getByRole("button", { name: "Bez nowych zdarzeń", exact: true }).click();
    await page.getByRole("button", { name: "Klienci", exact: true }).click();
    await page.getByRole("button", { name: "Marek P.", exact: true }).click();
    assert.equal(await page.locator("#lab-count").textContent(), "0 spraw", "opening a quiet client must not create a situation");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
    assert.deepEqual(errors, [], "no browser errors");
    assert.deepEqual(writes, [], "preview must not write application data");
    assert.deepEqual(external, [], "preview must not contact any external service");
    await page.close();
  }
  console.log("TRAINER_ATTENTION_LAB_BROWSER_PASS: desktop/mobile, question/review/contact/history, zero writes, zero external requests");
} finally {
  await browser.close();
}
