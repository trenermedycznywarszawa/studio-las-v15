import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_PROMPTS, MODULE_IDS, fixtures } from "../prototypes/stage-3-full-intake-pwd-preparation/fixtures.js";
import {
  CORE_QUESTION_IDS, INFORMATION_TYPES, MODULE_STATES, READINESS_DECISIONS, RESPONSE_STATES,
  activeRecords, addManualRecord, assembleBrief, assertCaseIsolation, assertInformationType,
  assertModuleState, createAuditEvent, editDerivative, eligibleEvidence, exactRef, invalidateDownstream,
  isCandidateDomainValid, makeDerivative, makePreparationRecords, makeResponse, makeSubmission,
  reviewGate, saveReadinessDecision, transitionReview
} from "../prototypes/stage-3-full-intake-pwd-preparation/workflow-state.js";

const here = dirname(fileURLToPath(import.meta.url));
const prototypeDir = join(here, "..", "prototypes", "stage-3-full-intake-pwd-preparation");
const read = name => readFileSync(join(prototypeDir, name), "utf8");
const html = read("index.html");
const css = read("styles.css");
const app = read("app.js");
const model = read("workflow-state.js");
const fixtureSource = read("fixtures.js");
const runtime = [html, css, app, model, fixtureSource].join("\n");
const passes = [];
function check(name, assertion) { assertion(); passes.push(name); }

function sourceFor(fixture = fixtures[0]) {
  const submission = makeSubmission({ caseId: fixture.id, capturedAt: "2026-08-10T10:00:00Z", partial: fixture.partial });
  const responses = fixture.responses.map(response => makeResponse({ submission, questionId: response.questionId, state: response.state, content: response.content }));
  return { submission, responses };
}

function approveAll(records) {
  return records.flatMap(record => [record, transitionReview(record, "approved")]);
}

check("Stage 1 information vocabulary remains closed to nine values", () => {
  assert.equal(INFORMATION_TYPES.length, 9);
  for (const value of INFORMATION_TYPES) assert.equal(assertInformationType(value), value);
  for (const forbidden of ["intake_response", "preparation_gap", "candidate_observation_domain", "pwd_readiness"]) {
    assert.throws(() => assertInformationType(forbidden), /Unapproved information_type/);
  }
});

check("the recovered core is exactly 26 stable prompts rather than an invented 42", () => {
  assert.equal(CORE_PROMPTS.length, 26);
  assert.deepEqual(CORE_QUESTION_IDS, CORE_PROMPTS.map(prompt => prompt.id));
  assert.deepEqual(CORE_QUESTION_IDS, ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "B5", "C1", "C2", "C3", "C4", "D1", "D2", "D3", "D4", "D5", "D6", "E1", "E2", "E3", "F1", "F2", "F3", "F4"]);
});

check("submission and response sources are immutable, scoped and exactly referenced", () => {
  const { submission, responses } = sourceFor();
  assert.equal(submission.informationType, "source_artifact");
  assert.equal(submission.immutable, true);
  assert.equal(responses.length, 26);
  assert.equal(responses[0].informationType, "source_fact");
  assert.equal(responses[0].questionRef, "stage3-core@v1#A1");
  assert.equal(responses[0].submissionRef, exactRef(submission));
  assert.equal(Object.isFrozen(submission), true);
  assert.equal(Object.isFrozen(responses[0]), true);
});

check("response states are closed and never collapse missing states into false", () => {
  assert.deepEqual(RESPONSE_STATES, ["answered", "unanswered", "declined", "not_applicable", "not_asked"]);
  const submission = makeSubmission({ caseId: "fictional-x", capturedAt: "t" });
  for (const state of RESPONSE_STATES) {
    const content = state === "answered" ? "Fikcyjna odpowiedź" : "";
    assert.equal(makeResponse({ submission, questionId: "A1", state, content }).state, state);
  }
  assert.throws(() => makeResponse({ submission, questionId: "A1", state: "no", content: "" }), /Unsupported response state/);
  assert.throws(() => makeResponse({ submission, questionId: "A1", state: "unanswered", content: "Nie" }), /Only answered/);
});

check("conditional module states are explicit and bounded", () => {
  assert.deepEqual(MODULE_IDS, ["pregnancy_postpartum", "oncology", "service_test", "pain_injury"]);
  assert.deepEqual(MODULE_STATES, ["not_applicable", "active_incomplete", "active_complete", "declined"]);
  for (const value of MODULE_STATES) assert.equal(assertModuleState(value), value);
  assert.throws(() => assertModuleState("inferred_from_gender"), /Unsupported module state/);
});

check("machine derivatives start needs-review and preserve exact source lineage", () => {
  const fixture = fixtures[0]; const { responses } = sourceFor(fixture);
  const records = makePreparationRecords({ fixture, responses, mode: "fictional_assisted" });
  assert.ok(records.length >= 8);
  for (const record of records) {
    assert.equal(record.reviewState, "needs_review");
    assert.equal(record.author, "fictional_ai");
    assert.ok(record.derivedFrom.every(ref => /@v1$/.test(ref)));
  }
});

check("editing creates a trainer-authored version and does not mutate the machine original", () => {
  const fixture = fixtures[0]; const { responses } = sourceFor(fixture);
  const original = makePreparationRecords({ fixture, responses, mode: "fictional_assisted" }).find(record => record.section === "questions");
  const snapshot = JSON.stringify(original);
  const edited = editDerivative(original, "Jawnie poprawione pytanie Damiana");
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(edited.author, "damian");
  assert.equal(edited.informationType, null);
  assert.equal(edited.supersedes, exactRef(original));
  assert.ok(edited.derivedFrom.includes(exactRef(original)));
});

check("review transitions append versions and rejected records leave the active brief", () => {
  const record = makeDerivative({ id: "q", content: "Pytanie", operationalRole: "pwd_question", section: "questions", derivedFrom: ["answer@v1"], caseId: "fictional-x" });
  const rejected = transitionReview(record, "rejected");
  assert.equal(record.reviewState, "needs_review");
  assert.equal(rejected.version, 2);
  assert.equal(rejected.supersedes, exactRef(record));
  assert.deepEqual(activeRecords([record, rejected]), [rejected]);
});

check("candidate observation domains require purpose, observation, stop and decision impact", () => {
  const valid = makeDerivative({ id: "domain", content: "Cel", operationalRole: "candidate_observation_domain", section: "domains", derivedFrom: ["answer@v1"], caseId: "fictional-x", fields: { purpose: "Cel", observe: "Obserwacja", stopCriteria: "Kryterium", decisionImpact: "Wpływ" } });
  const invalid = makeDerivative({ id: "bad-domain", content: "Cel", operationalRole: "candidate_observation_domain", section: "domains", derivedFrom: ["answer@v1"], caseId: "fictional-x", fields: { purpose: "Cel", observe: "", stopCriteria: "Kryterium", decisionImpact: "Wpływ" } });
  assert.equal(isCandidateDomainValid(valid), true);
  assert.equal(isCandidateDomainValid(invalid), false);
});

check("brief gate blocks pending, malformed, flagged and incomplete-module state", () => {
  const pending = makeDerivative({ id: "pending", content: "x", operationalRole: "pwd_question", section: "questions", derivedFrom: ["a@v1"], caseId: "fictional-x" });
  assert.equal(reviewGate({ records: [pending], moduleStates: {} }).ready, false);
  const approved = transitionReview(pending, "approved");
  assert.equal(reviewGate({ records: [pending, approved], moduleStates: { pain_injury: "active_incomplete" } }).ready, false);
  assert.equal(reviewGate({ records: [pending, approved], moduleStates: { pain_injury: "active_complete" } }).ready, true);
});

check("manual fallback is complete without pretending an AI run occurred", () => {
  const fixture = fixtures.find(item => item.scenario === "manual_fallback"); const { responses } = sourceFor(fixture);
  assert.deepEqual(makePreparationRecords({ fixture, responses, mode: "manual_fallback" }), []);
  const manual = addManualRecord({ id: "manual-1", content: "Pytanie Damiana", section: "questions", role: "pwd_question", caseId: fixture.id, derivedFrom: [exactRef(responses[0])] });
  assert.equal(manual.author, "damian");
  assert.equal(manual.reviewState, "approved");
  assert.equal(manual.informationType, null);
});

check("contradiction fixture preserves both source response versions", () => {
  const fixture = fixtures.find(item => item.scenario === "conflict"); const { responses } = sourceFor(fixture);
  const issue = makePreparationRecords({ fixture, responses, mode: "fictional_assisted" }).find(record => record.operationalRole === "preparation_conflict");
  const b1 = responses.find(response => response.questionRef.endsWith("#B1"));
  const c4 = responses.find(response => response.questionRef.endsWith("#C4"));
  assert.deepEqual(issue.derivedFrom, [exactRef(b1), exactRef(c4)]);
});

check("prompt-injection text stays inert source content", () => {
  const fixture = fixtures.find(item => item.scenario === "prompt_injection"); const { responses } = sourceFor(fixture);
  const answer = responses.find(response => response.questionRef.endsWith("#A3"));
  assert.match(answer.content, /Zignoruj zasady/);
  assert.equal(answer.informationType, "source_fact");
  assert.doesNotMatch(model, /eval\s*\(|new Function/);
});

check("cross-case references fail closed", () => {
  const first = sourceFor(fixtures[0]); const second = sourceFor(fixtures[1]);
  assert.equal(assertCaseIsolation(fixtures[0].id, [first.submission, ...first.responses]), true);
  assert.throws(() => assertCaseIsolation(fixtures[0].id, [second.submission]), /Cross-case reference denied/);
});

check("approved records assemble one nine-section trainer brief with exact lineage", () => {
  const fixture = fixtures[0]; const { submission, responses } = sourceFor(fixture);
  const records = approveAll(makePreparationRecords({ fixture, responses, mode: "fictional_assisted" }));
  const brief = assembleBrief({ caseId: fixture.id, submission, responses, records, moduleStates: fixture.modules, now: "t" });
  assert.equal(Object.keys(brief.sections).length, 9);
  assert.equal(brief.sections.client_goal[0].content, responses[0].content);
  assert.ok(brief.derivedFrom.includes(exactRef(submission)));
  assert.ok(brief.derivedFrom.includes(exactRef(responses[0])));
  assert.equal(brief.sections.trainer_decision_required[0].content.includes("nie wybiera"), true);
});

check("brief assembly rejects unresolved machine material", () => {
  const fixture = fixtures[0]; const { submission, responses } = sourceFor(fixture);
  const records = makePreparationRecords({ fixture, responses, mode: "fictional_assisted" });
  assert.throws(() => assembleBrief({ caseId: fixture.id, submission, responses, records, moduleStates: fixture.modules, now: "t" }), /Brief blocked/);
});

check("readiness decision has three equal values and requires rationale, evidence and active brief", () => {
  assert.deepEqual(READINESS_DECISIONS, ["READY_TO_PREPARE_PWD", "NEEDS_CLARIFICATION", "DEFER_OR_CONSULT_BEFORE_PWD"]);
  const fixture = fixtures[0]; const { submission, responses } = sourceFor(fixture);
  const records = approveAll(makePreparationRecords({ fixture, responses, mode: "fictional_assisted" }));
  const brief = assembleBrief({ caseId: fixture.id, submission, responses, records, moduleStates: fixture.modules, now: "t" });
  const evidence = eligibleEvidence(records, responses);
  assert.throws(() => saveReadinessDecision({ caseId: fixture.id, value: undefined, rationale: "x", evidence: [evidence[0]], brief, now: "t" }), /Explicit readiness/);
  assert.throws(() => saveReadinessDecision({ caseId: fixture.id, value: READINESS_DECISIONS[0], rationale: "", evidence: [evidence[0]], brief, now: "t" }), /rationale/);
  assert.throws(() => saveReadinessDecision({ caseId: fixture.id, value: READINESS_DECISIONS[0], rationale: "x", evidence: [], brief, now: "t" }), /evidence/);
  const decision = saveReadinessDecision({ caseId: fixture.id, value: READINESS_DECISIONS[1], rationale: "Najpierw wyjaśnić sprzeczność", evidence: [evidence[0]], brief, now: "t" });
  assert.equal(decision.author, "damian");
  assert.deepEqual(decision.derivedFrom, [exactRef(brief), exactRef(evidence[0])]);
});

check("material upstream change invalidates brief and readiness decision without deleting history", () => {
  const brief = { id: "brief", version: 1, status: "active" };
  const decision = { id: "decision", version: 1, status: "active" };
  const result = invalidateDownstream({ brief, decision }, "fact@v2");
  assert.equal(result.brief.status, "invalidated");
  assert.equal(result.decision.status, "invalidated");
  assert.equal(result.brief.invalidatedBy, "fact@v2");
  assert.equal(brief.status, "active");
});

check("audit events contain metadata references and no source content", () => {
  const object = { id: "brief", version: 2 }; const related = { id: "response", version: 1 };
  const event = createAuditEvent({ id: "event", eventType: "brief_assembled", actor: "damian", object, related: [related], outcome: "active", time: "t" });
  assert.equal(event.objectRef, "brief@v2");
  assert.deepEqual(event.relatedRefs, ["response@v1"]);
  assert.equal("content" in event, false);
});

check("all 15 fictional acceptance cases exist and contain no contact identity", () => {
  assert.equal(fixtures.length, 15);
  for (const [index, fixture] of fixtures.entries()) {
    assert.equal(fixture.fictional, true);
    assert.equal(fixture.id, `fictional-${String(index + 1).padStart(2, "0")}`);
    assert.equal(fixture.responses.length, 26);
    assert.doesNotMatch(JSON.stringify(fixture), /@|\+48|telefon|e-mail/i);
  }
});

check("UI exposes equal unselected decisions, validation and no client send surface", () => {
  for (const value of READINESS_DECISIONS) assert.match(html, new RegExp(`value=["']${value}["']`));
  assert.equal((html.match(/name="readiness-decision"/g) || []).length, 3);
  assert.doesNotMatch(html, /name="readiness-decision"[^>]+checked/i);
  assert.match(html, /id="decision-rationale"/);
  assert.match(html, /id="evidence-list"/);
  assert.match(app, /Wybierz decyzję o gotowości\./);
  assert.match(app, /Wpisz uzasadnienie decyzji\./);
  assert.match(app, /Wybierz co najmniej jedną dokładną wersję dowodu\./);
  assert.doesNotMatch(html, /Wyślij|Opublikuj|Zarezerwuj|type="submit"|<form\b/i);
});

check("runtime is offline, session-only and contains no persistence or production integration", () => {
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(runtime, /https?:\/\//i);
  assert.doesNotMatch(runtime, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/i);
  assert.doesNotMatch(runtime, /createClient\s*\(|supabaseUrl|formspree|mailto:|sms:/i);
});

check("keyboard focus and 360 px layout contracts are present", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:/s);
  assert.match(css, /@media\s*\(max-width:\s*480px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(html, /<button[^>]+type="button"/);
});

check("source evidence hashes and unsupported 42-question assumption are documented", () => {
  const product = readFileSync(join(here, "..", "docs", "product", "08_FULL_INTAKE_AND_PWD_PREPARATION_SYSTEM.md"), "utf8");
  assert.match(product, /66b495053e72d8f742b6bcc6dc1b2c40ff473752e0e8315da1e51b25607be785/);
  assert.match(product, /8ecc7addbb38002c51c9424e91bbe0dde61ecc091ab812b9c5d1ef50094203fc/);
  assert.match(product, /42 questions.*rejected|42 pytań.*odrzucone/i);
});

for (const name of passes) console.log(`PASS — ${name}`);
console.log(`Stage 3 full-intake/PWD-preparation behavioral contract: ${passes.length}/${passes.length} PASS`);
