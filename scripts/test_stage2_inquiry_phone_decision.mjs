import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures, FICTIONAL_NOTICE } from "../prototypes/stage-2-inquiry-phone-decision/fixtures.js";
import {
  DECISIONS, INFORMATION_TYPES, OPERATIONAL_ROLES, QUESTION_STATUSES, activeRecords, assertInformationType,
  callReadiness, createAuditEvent, createDraftVersion, deriveEditedRecord, editDraftVersion,
  decisionHistoryEntries, eligibleEvidence, exactRef, invalidateDependents, makePhoneRecord, makeRecord,
  makeSourceArtifact, recordQuestionStatus, resolvePreparationMode, saveDecisionVersion, transitionReview
} from "../prototypes/stage-2-inquiry-phone-decision/workflow-state.js";

const here = dirname(fileURLToPath(import.meta.url));
const prototypeDir = join(here, "..", "prototypes", "stage-2-inquiry-phone-decision");
const read = name => readFileSync(join(prototypeDir, name), "utf8");
const html = read("index.html");
const css = read("styles.css");
const app = read("app.js");
const model = read("workflow-state.js");
const fixtureSource = read("fixtures.js");
const runtimeSource = [html, css, app, model, fixtureSource].join("\n");

const passes = [];
function check(name, assertion) { assertion(); passes.push(name); }
function record(overrides = {}) {
  return makeRecord({
    id: overrides.id ?? "record-1", version: overrides.version ?? 1,
    content: overrides.content ?? "Fikcyjna treść", author: overrides.author ?? "fictional_ai",
    informationType: overrides.informationType === undefined ? "ai_suggestion" : overrides.informationType,
    operationalRole: overrides.operationalRole ?? "call_question", section: overrides.section ?? "questions",
    derivedFrom: overrides.derivedFrom ?? ["source-1@v1"], reviewState: overrides.reviewState ?? "needs_review",
    flagged: overrides.flagged, isPlaceholder: overrides.isPlaceholder, supersedes: overrides.supersedes
  });
}

check("closed Stage 1 information_type vocabulary is enforced by constructors", () => {
  assert.deepEqual(INFORMATION_TYPES, [
    "source_artifact", "source_fact", "extracted_fact", "trainer_observation", "ai_hypothesis",
    "ai_suggestion", "trainer_interpretation", "trainer_decision", "client_material"
  ]);
  for (const value of INFORMATION_TYPES) assert.equal(assertInformationType(value), value);
  for (const forbidden of ["preparation_gap", "trainer_preparation", "client_statement", "client_signal"]) {
    assert.throws(() => makeRecord({ id: "x", content: "x", author: "x", informationType: forbidden }), /Unapproved information_type/);
  }
  assert.equal(makePhoneRecord({ id: "statement", role: "client_statement", content: "Tak" }).informationType, "source_fact");
  assert.equal(makePhoneRecord({ id: "reaction", role: "client_reaction", content: "Spokojnie" }).informationType, "source_fact");
});

check("workflow roles stay separate from information types", () => {
  assert.ok(OPERATIONAL_ROLES.includes("preparation_gap"));
  assert.ok(OPERATIONAL_ROLES.includes("call_question"));
  assert.ok(OPERATIONAL_ROLES.includes("client_statement"));
  assert.equal(INFORMATION_TYPES.includes("call_question"), false);
  const question = record();
  assert.equal(question.operationalRole, "call_question");
  assert.equal(question.informationType, "ai_suggestion");
});

check("source artifacts require an explicit bounded author category", () => {
  const fixtureSourceRecord = makeSourceArtifact({ id: "source", text: "Fikcyjne zgłoszenie", label: "fictional_fixture:01", author: "client", capturedAt: "t" });
  assert.equal(fixtureSourceRecord.informationType, "source_artifact");
  assert.equal(fixtureSourceRecord.author, "client");
  assert.equal(fixtureSourceRecord.sourceAuthorCategory, "client");
  const manualSourceRecord = makeSourceArtifact({ id: "manual", text: "Fikcyjny tekst", label: "manual_paste:fictional", author: "unknown_source_author", capturedAt: "t" });
  assert.equal(manualSourceRecord.sourceAuthorCategory, "unknown_source_author");
  assert.throws(() => makeSourceArtifact({ id: "bad", text: "x", label: "x", author: "system", capturedAt: "t" }), /Unsupported source author category/);
});

check("editing creates a trainer derivative and preserves the machine original", () => {
  const original = record({ id: "q1", content: "Oryginalna sugestia" });
  const snapshot = JSON.stringify(original);
  const edited = deriveEditedRecord(original, "Pytanie Damiana", "q1-edit");
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(edited.author, "damian");
  assert.equal(edited.informationType, null);
  assert.equal(edited.operationalRole, "call_question");
  assert.equal(edited.supersedes, "q1@v1");
  assert.ok(edited.derivedFrom.includes("q1@v1"));
  assert.deepEqual(activeRecords([original, edited]), [edited]);
});

check("review transitions append exact versions instead of rewriting records", () => {
  const original = record({ id: "fact", section: "facts", operationalRole: null, informationType: "extracted_fact" });
  const reviewed = transitionReview(original, "approved");
  assert.equal(original.reviewState, "needs_review");
  assert.equal(reviewed.version, 2);
  assert.equal(reviewed.supersedes, "fact@v1");
  assert.deepEqual(activeRecords([original, reviewed]), [reviewed]);
});

check("call gate blocks placeholders, unreviewed machine output, and flagged content", () => {
  assert.equal(callReadiness([record({ isPlaceholder: true, author: "damian" })]).ready, false);
  assert.equal(callReadiness([record()]).ready, false);
  assert.equal(callReadiness([record({ reviewState: "approved", flagged: true })]).ready, false);
  assert.equal(callReadiness([record({ reviewState: "approved" })]).ready, true);
  const trainerQuestion = deriveEditedRecord(record({ id: "machine-q" }), "Jawne pytanie Damiana", "trainer-q");
  assert.equal(callReadiness([record({ id: "machine-q" }), trainerQuestion]).ready, true);
  const machineFact = record({ id: "machine-fact", section: "facts", operationalRole: null, informationType: "extracted_fact" });
  const correctedFact = deriveEditedRecord(machineFact, "Skorygowany fakt", "trainer-fact");
  assert.equal(callReadiness([record({ reviewState: "approved" }), machineFact, correctedFact]).ready, false);
  const reviewedFact = transitionReview(correctedFact, "approved");
  assert.equal(callReadiness([record({ reviewState: "approved" }), machineFact, correctedFact, reviewedFact]).ready, true);
});

check("decision evidence excludes unreviewed, rejected, placeholder, and suggestion records", () => {
  const reviewedFact = record({ id: "fact-ok", section: "facts", operationalRole: null, informationType: "extracted_fact", reviewState: "approved" });
  const pendingFact = record({ id: "fact-pending", section: "facts", operationalRole: null, informationType: "extracted_fact" });
  const placeholder = record({ id: "placeholder", section: "facts", operationalRole: null, informationType: "extracted_fact", author: "damian", isPlaceholder: true, reviewState: "approved" });
  const suggestion = record({ id: "suggestion", reviewState: "approved" });
  const observation = makePhoneRecord({ id: "obs", role: "trainer_observation", content: "Fikcyjna obserwacja" });
  assert.deepEqual(eligibleEvidence([reviewedFact, pendingFact, placeholder, suggestion], [observation]).map(exactRef), ["fact-ok@v1", "obs@v1"]);
  assert.throws(() => saveDecisionVersion({ id: "bad-decision", value: "CONTINUE", rationale: "Powód", evidence: [pendingFact], inputRevision: 1, now: "t" }), /reviewed, eligible/);
});

check("manual paste can never claim a fictional assisted run", () => {
  assert.equal(resolvePreparationMode({ requested: "assisted", hasFixture: false, aiAvailable: undefined }), "manual_fallback");
  assert.equal(resolvePreparationMode({ requested: "assisted", hasFixture: true, aiAvailable: false }), "manual_fallback");
  assert.equal(resolvePreparationMode({ requested: "assisted", hasFixture: true, aiAvailable: true }), "fictional_assisted");
});

check("phone statements and reactions use version and supersession semantics", () => {
  const first = makePhoneRecord({ id: "statement", role: "client_statement", content: "Pierwsza wersja" });
  const corrected = makePhoneRecord({ id: "ignored", role: "client_statement", content: "Wersja skorygowana", previous: first });
  assert.equal(first.content, "Pierwsza wersja");
  assert.equal(corrected.id, first.id);
  assert.equal(corrected.version, 2);
  assert.equal(corrected.supersedes, "statement@v1");
  assert.equal(corrected.informationType, "source_fact");
});

check("question outcomes are closed, versioned and tied to an exact question", () => {
  const question = record({ id: "question" });
  let previous = null;
  for (const status of QUESTION_STATUSES) {
    const current = recordQuestionStatus({ id: "question-status", question, status, previous, now: `time-${status}` });
    assert.equal(current.status, status);
    assert.equal(current.questionRef, "question@v1");
    assert.equal(current.version, previous ? previous.version + 1 : 1);
    if (previous) assert.equal(current.supersedes, exactRef(previous));
    previous = current;
  }
  assert.throws(() => recordQuestionStatus({ id: "bad", question, status: "completed", now: "t" }), /Unsupported question status/);
  const differentQuestion = record({ id: "other-question" });
  assert.throws(() => recordQuestionStatus({ id: "bad", question: differentQuestion, status: "asked", previous, now: "t" }), /one exact question/);
  const event = createAuditEvent({ id: "status-event", eventType: "question_status_changed", actor: "damian", object: previous, related: [question], outcome: `status:${previous.status}`, time: "t" });
  assert.equal(event.outcome, "status:incomplete_answer");
  assert.deepEqual(event.relatedRefs, ["question@v1"]);
});

check("material upstream changes invalidate exact decision and draft versions", () => {
  const decision = { id: "decision", version: 1, status: "active" };
  const draft = { id: "draft", version: 1, status: "active" };
  const invalidated = invalidateDependents({ decision, draft }, "note@v2");
  assert.equal(invalidated.decision.status, "invalidated");
  assert.equal(invalidated.decision.invalidatedBy, "note@v2");
  assert.equal(invalidated.draft.status, "invalidated");
  assert.equal(decision.status, "active");
  assert.equal(draft.status, "active");
});

check("decision saves exact evidence versions and supersedes the prior decision", () => {
  const evidence = makePhoneRecord({ id: "obs", role: "trainer_observation", content: "Dowód" });
  const first = saveDecisionVersion({ id: "decision", value: "CONTINUE", rationale: "Jawny powód", evidence: [evidence], inputRevision: 4, now: "t1" });
  const second = saveDecisionVersion({ id: "ignored", previous: first, value: "DEFER_OR_CONSULT", rationale: "Nowy powód", evidence: [evidence], inputRevision: 5, now: "t2" });
  assert.deepEqual(first.evidenceRefs, ["obs@v1"]);
  assert.deepEqual(first.derivedFrom, ["obs@v1"]);
  assert.equal(second.version, 2);
  assert.equal(second.supersedes, "decision@v1");
  assert.equal(second.inputRevision, 5);
  const invalidatedFirst = { ...first, status: "invalidated", invalidatedBy: "obs@v2" };
  const history = decisionHistoryEntries([invalidatedFirst, second]);
  assert.deepEqual(history, [
    { ref: "decision@v1", status: "invalidated", superseded: true, derivedFrom: ["obs@v1"] },
    { ref: "decision@v2", status: "active", superseded: false, derivedFrom: ["obs@v1"] }
  ]);
});

check("every draft is deterministic from the saved decision and exact evidence", () => {
  const evidence = makePhoneRecord({ id: "fact", role: "client_statement", content: "Fakt" });
  const expected = { CONTINUE: "kontynuacji", SEND_FULL_INTAKE: "ankieta", DEFER_OR_CONSULT: "odłożeniu", NOT_RIGHT_PRODUCT: "nie jest teraz właściwym" };
  for (const value of DECISIONS) {
    const decision = saveDecisionVersion({ id: `decision-${value}`, value, rationale: "Powód", evidence: [evidence], inputRevision: 1, now: "t1" });
    const draft = createDraftVersion({ id: `draft-${value}`, decision, evidence: [evidence], now: "t2" });
    assert.match(draft.content, new RegExp(expected[value], "i"));
    assert.deepEqual(draft.derivedFrom, [exactRef(decision), exactRef(evidence)]);
    assert.equal(draft.reviewState, "needs_review");
    assert.equal(draft.publicationState, "unpublished");
    assert.equal(draft.author, "studio_las_system");
    assert.equal(draft.draftingActor, "studio_las_system");
    assert.equal(draft.intendedUse, "post_call_follow_up");
  }
  const decision = saveDecisionVersion({ id: "decision-mismatch", value: "CONTINUE", rationale: "Powód", evidence: [evidence], inputRevision: 1, now: "t1" });
  const newerEvidence = makePhoneRecord({ id: "ignored", role: "client_statement", content: "Korekta", previous: evidence });
  assert.throws(() => createDraftVersion({ id: "draft", decision, evidence: [newerEvidence], now: "t2" }), /do not match/);
});

check("editing client material creates a new unpublished needs-review version", () => {
  const evidence = makePhoneRecord({ id: "fact", role: "client_statement", content: "Fakt" });
  const decision = saveDecisionVersion({ id: "decision", value: "CONTINUE", rationale: "Powód", evidence: [evidence], inputRevision: 1, now: "t1" });
  const first = createDraftVersion({ id: "draft", decision, evidence: [evidence], now: "t2" });
  const edited = editDraftVersion({ draft: first, content: "Jawnie poprawiona wersja", now: "t3" });
  assert.equal(first.content.includes("kontynuacji"), true);
  assert.equal(edited.version, 2);
  assert.equal(edited.supersedes, "draft@v1");
  assert.ok(edited.derivedFrom.includes("draft@v1"));
  assert.equal(edited.reviewState, "needs_review");
  assert.equal(edited.publicationState, "unpublished");
  assert.equal(edited.author, "damian");
  assert.equal(edited.draftingActor, "damian");
  assert.equal(edited.intendedUse, "post_call_follow_up");
  assert.deepEqual(activeRecords([first, edited]), [edited]);
});

check("audit events require actor and exact object/version references without content", () => {
  const object = { id: "decision", version: 2 };
  const related = [{ id: "fact", version: 3 }];
  const event = createAuditEvent({ id: "event", eventType: "decision_recorded", actor: "damian", object, related, outcome: "ok", time: "12:00" });
  assert.equal(event.actor, "damian");
  assert.equal(event.objectRef, "decision@v2");
  assert.deepEqual(event.relatedRefs, ["fact@v3"]);
  assert.equal("content" in event, false);
  assert.throws(() => createAuditEvent({ id: "bad", eventType: "x", object, outcome: "x", time: "x" }), /actor/);
});

check("source and decision histories expose required provenance metadata", () => {
  assert.match(app, /makeSourceArtifact/);
  assert.match(app, /renderDecisionHistory/);
  assert.match(html, /id="decision-history"/);
});

check("offline, session-only, no-send and no-production boundaries remain", () => {
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(runtimeSource, /https?:\/\//i);
  assert.doesNotMatch(runtimeSource, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/i);
  assert.doesNotMatch(html, /type="submit"|<form\b|formaction=|action="https?:/i);
  assert.doesNotMatch(app, /\.submit\s*\(|requestSubmit|window\.open|location\.href\s*=|mailto:|sms:/i);
  assert.match(html, /DO SPRAWDZENIA — NIE WYSŁANO/);
  assert.doesNotMatch([app, model, fixtureSource].join("\n"), /createClient\s*\(|supabaseUrl|formspreeEndpoint/i);
});

check("fixtures, equal decisions, keyboard and 360 px boundaries remain", () => {
  assert.equal(fixtures.length, 15);
  assert.equal(FICTIONAL_NOTICE.startsWith("FIKCYJNY PRZYPADEK"), true);
  for (const fixture of fixtures) { assert.equal(fixture.fictional, true); assert.ok(fixture.id.startsWith("fictional-")); }
  for (const decision of DECISIONS) assert.match(html, new RegExp(`value=["']${decision}["']`));
  assert.equal((html.match(/name="decision"/g) || []).length, 4);
  assert.doesNotMatch(html, /name="decision"[^>]+checked/i);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:/s);
  assert.match(css, /@media\s*\(max-width:\s*480px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

for (const name of passes) console.log(`PASS — ${name}`);
console.log(`Stage 2 inquiry-phone-decision behavioral contract: ${passes.length}/${passes.length} PASS`);
