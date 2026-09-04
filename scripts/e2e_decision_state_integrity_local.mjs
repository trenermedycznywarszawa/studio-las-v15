import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const PREVIEW_URL = process.env.STUDIO_LAS_E2E_URL || "http://127.0.0.1:8790/studio-las-os.html";
const preview = new URL(PREVIEW_URL);
const FIXTURE_URL = `${preview.origin}/scripts/fixtures/decision-state-integrity.html`;
const ARTIFACT_DIR = process.env.STUDIO_LAS_E2E_ARTIFACT_DIR || "artifacts/browser-e2e";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await mkdir(ARTIFACT_DIR, { recursive: true });
const browserChannel = process.env.STUDIO_LAS_E2E_BROWSER_CHANNEL;
const browser = await chromium.launch({
  headless: true,
  ...(browserChannel ? { channel: browserChannel } : {})
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const externalRequests = [];
page.on("request", request => {
  const url = new URL(request.url());
  if (!["http:", "https:"].includes(url.protocol)) return;
  if (url.origin !== preview.origin) externalRequests.push(request.url());
});

try {
  await page.goto(FIXTURE_URL, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Panel trenera" }).waitFor();
  await page.getByRole("heading", { name: "Teraz" }).waitFor();
  assert(await page.getByRole("heading", { name: "Anna Przykładowa", exact: true }).isVisible(), "client identity is not immediately visible");
  assert(await page.getByText("Wymaga decyzji co dalej", { exact: true }).isVisible(), "cycle closure decision is not surfaced");
  assert(await page.locator(".now-item").filter({ hasText: "Otwarty sygnał wymagający uwagi" }).count() === 1,
    "Teraz must expose at most one open signal");
  assert(await page.getByText("Aktywna", { exact: true }).isVisible(), "human Guidance status is missing");
  assert(await page.getByText("Papier + aplikacja", { exact: true }).isVisible(), "human Guidance channel is missing");
  assert(!(await page.getByText("active · hybrid", { exact: false }).count()), "technical Guidance enums leaked to the UI");

  const draftGroup = page.locator(".draft-items-group").filter({ hasText: "Szkic: Kolejny spokojny kierunek" });
  assert(await draftGroup.getByText("Działanie tylko tego szkicu", { exact: true }).isVisible(), "draft action is not grouped with its home_plan_id");
  assert(!(await draftGroup.getByText("Aktywne działanie", { exact: true }).count()), "active Guidance action leaked into the draft group");
  assert(await page.getByRole("button", { name: "Potwierdź wycofanie poprzedniej kopii papierowej" }).isVisible(),
    "legal paper-retirement action is missing while a successor draft waits");

  assert(await page.getByText("Najnowsza obserwacja PWD", { exact: true }).first().isVisible(), "latest PWD is not visible");
  assert(!(await page.getByText("Starsza obserwacja PWD", { exact: true }).isVisible()), "older PWD is expanded by default");
  assert(await page.getByText("Dodaj korektę / nową iterację PWD", { exact: true }).isVisible(), "PWD iteration copy is missing");
  assert(await page.getByText("Spokojniejszy rytm.", { exact: true }).first().isVisible(), "latest session is not visible");
  assert(!(await page.getByText("Wcześniejsza obserwacja.", { exact: true }).isVisible()), "session history is expanded by default");
  await page.getByText("Pokaż pełną historię sesji", { exact: true }).click();
  assert(await page.getByText("Wcześniejsza obserwacja.", { exact: true }).isVisible(), "session history cannot be expanded");

  const openSignal = page.locator(".signal-list > .record-list article.signal").first();
  await openSignal.getByText("Zapisz wynik przeglądu", { exact: true }).click();
  await openSignal.getByLabel("Wynik przeglądu").selectOption("noted_no_change");
  await openSignal.getByRole("button", { name: "Zapisz wynik" }).click();
  await page.getByText("Brak otwartych sygnałów wymagających przeglądu.", { exact: true }).waitFor();
  await page.getByText("Pokaż historię przejrzanych sygnałów", { exact: true }).click();
  assert(await page.getByText("Uwzględniono — bez zmiany", { exact: true }).isVisible(), "reviewed signal did not remain in history");
  await page.evaluate(() => window.advanceDecisionSignalDate("2026-09-05"));
  assert(await page.locator(".signal-list > .record-list article.signal").count() === 1, "same signal type with a new source date did not reopen");

  await page.locator("summary").filter({ hasText: "Zapisz decyzję co dalej" }).click();
  await page.locator('select[name="decision"]').selectOption("independent");
  await page.getByLabel("Krótkie uzasadnienie trenera").fill("Klient ma jasny kierunek samodzielnej pracy.");
  await page.getByRole("button", { name: "Zapisz decyzję co dalej" }).click();
  assert(!(await page.getByText("Wymaga decyzji co dalej", { exact: true }).count()), "closure warning remained after explicit decision");
  assert(await page.getByText("Samodzielność", { exact: true }).first().isVisible(), "saved cycle decision is not human-readable");
  const twelveWeekReport = page.locator(".report-record").first();
  assert(await twelveWeekReport.getByText("Raport 12 tygodni", { exact: true }).first().isVisible(), "12-week report is not exposed before older reports");
  assert(await twelveWeekReport.getByText("Decyzja co dalej", { exact: true }).isVisible(), "12-week report omits the decision heading");
  assert(await twelveWeekReport.getByText("Klient ma jasny kierunek samodzielnej pracy.", { exact: true }).isVisible(), "12-week report omits decision rationale");

  await page.evaluate(() => window.setDecisionFixtureDraftVisible(false));
  assert(!(await page.getByRole("button", { name: "Potwierdź wycofanie poprzedniej kopii papierowej" }).count()),
    "paper-retirement action remained visible when there was no successor draft");
  assert(!(await page.getByText("Dodaj działanie do szkicu", { exact: true }).count()),
    "add-draft-action form remained visible when there was no legal draft target");

  await page.setViewportSize({ width: 360, height: 900 });
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  assert(overflow.document <= overflow.viewport && overflow.body <= overflow.viewport,
    `mobile horizontal overflow: viewport=${overflow.viewport}, document=${overflow.document}, body=${overflow.body}`);
  await page.screenshot({ path: `${ARTIFACT_DIR}/decision-state-integrity-mobile.png`, fullPage: true });
  assert(externalRequests.length === 0, `synthetic fixture made external requests: ${externalRequests.join(", ")}`);

  console.log("DECISION_STATE_INTEGRITY_BROWSER_SUCCESS desktop flow + 360x900 overflow PASS");
} finally {
  await browser.close();
}
