import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fixtures, FICTIONAL_NOTICE } from "../prototypes/stage-2-inquiry-phone-decision/fixtures.js";

const here = dirname(fileURLToPath(import.meta.url));
const prototypeDir = join(here, "..", "prototypes", "stage-2-inquiry-phone-decision");
const read = name => readFileSync(join(prototypeDir, name), "utf8");

const html = read("index.html");
const css = read("styles.css");
const app = read("app.js");
const fixtureSource = read("fixtures.js");
const runtimeSource = [html, css, app, fixtureSource].join("\n");

const passes = [];
function check(name, assertion) {
  assertion();
  passes.push(name);
}

check("no external requests or runtime dependencies", () => {
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(runtimeSource, /https?:\/\//i);
  assert.doesNotMatch(app, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker/i);
  assert.doesNotMatch(app, /import\s*\(\s*["'](?:https?:)?\/\//i);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=["'](?:https?:)?\/\//i);
});

check("no persistent browser storage", () => {
  assert.doesNotMatch(app, /localStorage|sessionStorage|indexedDB|document\.cookie/i);
});

check("no keys, credentials, or real client identifiers", () => {
  assert.doesNotMatch(runtimeSource, /(?:sk|pk|ghp|gho|sbp)_[A-Za-z0-9_-]{16,}/);
  assert.doesNotMatch(runtimeSource, /Bearer\s+[A-Za-z0-9._-]{12,}/i);
  assert.doesNotMatch(runtimeSource, /service[_-]?role\s*[:=]/i);
  assert.doesNotMatch(fixtureSource, /\b\d{3}[ -]\d{3}[ -]\d{3}\b/);
  assert.doesNotMatch(fixtureSource, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});

check("four explicit Damian decisions with no preselection", () => {
  for (const decision of ["CONTINUE", "SEND_FULL_INTAKE", "DEFER_OR_CONSULT", "NOT_RIGHT_PRODUCT"]) {
    assert.match(html, new RegExp(`value=["']${decision}["']`));
  }
  assert.equal((html.match(/name="decision"/g) || []).length, 4);
  assert.doesNotMatch(html, /name="decision"[^>]+checked/i);
  assert.doesNotMatch(app, /input\.checked\s*=\s*true/);
  assert.match(app, /actor:\s*"damian"/);
});

check("no real send, publication, booking, or form submission", () => {
  assert.doesNotMatch(html, /type="submit"|<form\b|formaction=|action="https?:/i);
  assert.doesNotMatch(app, /\.submit\s*\(|requestSubmit|window\.open|location\.href\s*=|mailto:|sms:/i);
  assert.match(html, /DO SPRAWDZENIA — NIE WYSŁANO/);
  assert.match(app, /reviewState:\s*"needs_review"/);
  assert.match(app, /publicationState:\s*"unpublished"/);
  assert.match(app, /unpublished_needs_review/);
});

check("manual fallback remains a complete first-class path", () => {
  assert.match(html, /Przejdź całkowicie ręcznie/);
  assert.match(app, /manual_fallback/);
  assert.match(app, /buildManualPreparation/);
  assert.match(fixtureSource, /fictional-11-ai-unavailable/);
  assert.equal(fixtures.find(item => item.id === "fictional-11-ai-unavailable")?.aiAvailable, false);
});

check("information meanings remain visibly separate", () => {
  for (const informationType of [
    "source_artifact",
    "extracted_fact",
    "ai_suggestion",
    "ai_hypothesis",
    "trainer_interpretation",
    "trainer_decision",
    "client_material",
    "client_statement",
    "trainer_observation"
  ]) {
    assert.match(runtimeSource, new RegExp(informationType));
  }
  assert.match(app, /derivedFrom/);
  assert.match(app, /locator/);
  assert.match(app, /reviewState/);
});

check("no scoring or automatic qualification mechanism", () => {
  assert.doesNotMatch(html, /id="[^"]*(?:score|rating|rank|probability)[^"]*"/i);
  assert.doesNotMatch(app, /\bscore\s*[:=]|conversionProbability|qualificationResult/i);
  assert.match(fixtureSource, /blockedAutomaticQualification:\s*true/);
  assert.match(app, /automatic_qualification_attempt_blocked/);
});

check("cross-client disclosure is denied", () => {
  assert.match(fixtureSource, /crossClientAttempt:\s*true/);
  assert.match(app, /cross_client_request_denied/);
  assert.match(app, /denied_no_disclosure/);
  assert.doesNotMatch(app, /clients\s*=|clientList|findClient|searchClients/i);
});

check("at least 12 explicit fictional fixtures cover all required cases", () => {
  assert.equal(fixtures.length, 15);
  assert.equal(FICTIONAL_NOTICE.startsWith("FIKCYJNY PRZYPADEK"), true);
  for (const fixture of fixtures) {
    assert.equal(fixture.fictional, true, `${fixture.id} must be marked fictional`);
    assert.match(fixture.source, /FIKCYJNY PRZYPADEK/);
    assert.ok(fixture.id.startsWith("fictional-"));
    if (fixture.aiAvailable) {
      assert.ok(fixture.questions.length >= 5 && fixture.questions.length <= 8, `${fixture.id} must have 5-8 questions`);
    }
  }
  for (const id of [
    "fictional-04-conflict",
    "fictional-06-consult-first",
    "fictional-09-inappropriate-question",
    "fictional-10-answer-changed",
    "fictional-11-ai-unavailable",
    "fictional-12-unsent-draft",
    "fictional-13-auto-qualification",
    "fictional-14-cross-client",
    "fictional-15-partial-source"
  ]) {
    assert.ok(fixtures.some(item => item.id === id), `missing fixture ${id}`);
  }
});

check("360 px responsive contract avoids fixed overflow risks", () => {
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.match(css, /\*\s*\{\s*box-sizing:\s*border-box;/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /@media\s*\(max-width:\s*480px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(css, /min-width:\s*(?:3[7-9]\d|[4-9]\d{2,})px/i);
});

check("keyboard semantics and visible focus are present", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:/s);
  assert.match(html, /class="skip-link"/);
  assert.doesNotMatch(html, /<(?:div|span|section)[^>]+onclick=/i);
  assert.ok((html.match(/<button\b/g) || []).length >= 12);
  assert.ok((html.match(/<label\b/g) || []).length >= 8);
  assert.match(html, /aria-current="step"/);
  assert.match(html, /aria-label="Etapy procesu"/);
});

check("empty and invalid states are announced", () => {
  assert.ok((html.match(/role="alert"/g) || []).length >= 4);
  assert.match(app, /Najpierw wybierz lub zapisz fikcyjne źródło/);
  assert.match(app, /Wpisz treść notatki/);
  assert.match(app, /Wybierz świadomie jedną z czterech decyzji/);
  assert.match(app, /Wpisz krótkie uzasadnienie decyzji Damiana/);
});

check("prototype remains session-memory-only and resettable", () => {
  assert.match(html, /Wyczyść sesję/);
  assert.match(app, /function resetWorkflow/);
  assert.match(html, /Odświeżenie usuwa zmiany/);
});

for (const name of passes) console.log(`PASS — ${name}`);
console.log(`Stage 2 inquiry-phone-decision prototype: ${passes.length}/${passes.length} contract checks PASS`);
