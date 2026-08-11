import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "../prototypes/stage-4-pwd-decision-conversation/fixtures.js";
import {
  COMPARABILITY, DECISIONS, INFORMATION_TYPES, OBSERVATION_STATES,
  addManualConversationOption, assessComparability, assertCaseIsolation,
  conversationGate, createWorkspace, exactRef, makeFollowupDraft, makeHandoff,
  makeSimulatedSuggestions, makeTanitaPackage, materialHandoffChange,
  recordObservation, reviewSuggestion, saveDecision, saveTrainerInterpretation
} from "../prototypes/stage-4-pwd-decision-conversation/workflow-state.js";

const here = dirname(fileURLToPath(import.meta.url));
const prototypeDir = join(here, "..", "prototypes", "stage-4-pwd-decision-conversation");
const read = name => readFileSync(join(prototypeDir, name), "utf8");
const html = read("index.html");
const css = read("styles.css");
const app = read("app.js");
const model = read("workflow-state.js");
const fixtureSource = read("fixtures.js");
const runtime = [html, css, app, model, fixtureSource].join("\n");
const passes = [];
const check = (name, assertion) => { assertion(); passes.push(name); };

function context(index = 0) {
  const fixture = fixtures[index];
  const handoff = makeHandoff(fixture);
  const workspace = createWorkspace({ fixture, handoff });
  const tanitaPackage = makeTanitaPackage({ fixture, handoff });
  return { fixture, handoff, workspace, tanitaPackage };
}

check("Stage 1 information vocabulary remains closed", () => {
  assert.deepEqual(INFORMATION_TYPES, [
    "source_artifact", "source_fact", "extracted_fact", "trainer_observation",
    "ai_hypothesis", "ai_suggestion", "trainer_interpretation", "trainer_decision", "client_material"
  ]);
});

check("task and exact current Stage 3 handoff create one isolated workspace", () => {
  const { handoff, workspace } = context();
  assert.equal(handoff.decision, "READY_TO_PREPARE_PWD");
  assert.equal(handoff.informationType, "trainer_decision");
  assert.equal(workspace.taskId, "conduct_pwd_and_record_trainer_decision");
  assert.equal(workspace.contractVersion, "stage4-v1");
  assert.equal(workspace.currentHandoffRef, exactRef(handoff));
});

check("Tanita is optional and a missing package does not block workspace creation", () => {
  const withoutTanita = context(2);
  assert.equal(withoutTanita.tanitaPackage, null);
  assert.equal(withoutTanita.workspace.status, "active");
  const withTanita = context(0);
  assert.equal(withTanita.tanitaPackage.source.informationType, "source_artifact");
  assert.ok(withTanita.tanitaPackage.facts.every(item => item.informationType === "extracted_fact"));
  assert.ok(withTanita.tanitaPackage.facts.every(item => item.sourceLocator));
});

check("Tanita comparability is explicit, unscored and Damian-owned", () => {
  const { workspace, tanitaPackage } = context();
  assert.throws(() => assessComparability({ workspace, tanitaPackage, value: undefined, rationale: "x" }), /Explicit/);
  assert.throws(() => assessComparability({ workspace, tanitaPackage, value: "comparable", rationale: "" }), /rationale/);
  for (const value of COMPARABILITY) {
    const result = assessComparability({ workspace, tanitaPackage, value, rationale: `Jawne uzasadnienie ${value}` });
    assert.equal(result.value, value);
    assert.equal(result.author, "damian");
    assert.equal(result.informationType, "trainer_interpretation");
  }
});

check("observation states are performed, skipped and stopped without a canonical catalogue", () => {
  assert.deepEqual(OBSERVATION_STATES, ["performed", "skipped", "stopped"]);
  for (const [index, executionState] of OBSERVATION_STATES.entries()) {
    const { handoff, workspace } = context(index === 0 ? 0 : 4);
    const candidate = handoff.candidates[index === 2 ? 1 : 0];
    const result = recordObservation({
      workspace, handoff, candidateId: candidate.id, executionState,
      observationText: `Jawny opis ${executionState}`,
      clientReaction: executionState === "skipped" ? "" : `Fikcyjna reakcja ${executionState}`
    });
    assert.equal(result.observation.informationType, "trainer_observation");
    assert.equal(result.observation.executionState, executionState);
    if (result.reaction) {
      assert.equal(result.reaction.informationType, "source_fact");
      assert.equal(result.reaction.author, "fictional_client");
    }
  }
});

check("observation, reaction and trainer interpretation remain separate", () => {
  const { handoff, workspace } = context();
  const recorded = recordObservation({
    workspace, handoff, candidateId: handoff.candidates[0].id, executionState: "performed",
    observationText: "Damian zauważył spokojne tempo.", clientReaction: "Fikcyjna osoba poprosiła o krótką przerwę."
  });
  const interpretation = saveTrainerInterpretation({
    workspace, evidence: [handoff, recorded.observation, recorded.reaction],
    content: "Znaczenie nadaje Damian.", uncertainty: "Niepewność pozostaje jawna."
  });
  assert.notEqual(recorded.observation.id, recorded.reaction.id);
  assert.notEqual(recorded.observation.id, interpretation.id);
  assert.equal(interpretation.informationType, "trainer_interpretation");
  assert.deepEqual(interpretation.derivedFrom.slice(1), [handoff, recorded.observation, recorded.reaction].map(exactRef));
});

check("simulated AI creates conversation wording only and every item starts needs_review", () => {
  const { fixture, handoff, workspace } = context();
  const records = makeSimulatedSuggestions({ fixture, workspace, evidence: [handoff] });
  assert.ok(records.length > 0);
  for (const item of records) {
    assert.equal(item.informationType, "ai_suggestion");
    assert.equal(item.author, "fictional_ai");
    assert.equal(item.reviewState, "needs_review");
    assert.doesNotMatch(item.content, /START|DEFER_CONSULT|NOT_THIS_PRODUCT|warunek rozpoczęcia/i);
  }
  const unsafeFixture = { ...fixture, suggestions: ["Ustaw START"] };
  assert.throws(() => makeSimulatedSuggestions({ fixture: unsafeFixture, workspace, evidence: [handoff] }), /may not suggest/);
});

check("approve edit and reject append review history", () => {
  const { fixture, handoff, workspace } = context();
  const [first, second] = makeSimulatedSuggestions({ fixture, workspace, evidence: [handoff] });
  const approved = reviewSuggestion(first, "approve");
  assert.equal(approved.previous.status, "superseded");
  assert.equal(approved.current.reviewState, "approved");
  const edited = reviewSuggestion(second, "edit", "Pytanie zapisane przez Damiana.");
  assert.equal(edited.current.author, "damian");
  assert.equal(edited.current.informationType, null);
  assert.equal(edited.current.reviewState, "approved");
  const third = makeSimulatedSuggestions({ fixture, workspace, evidence: [handoff] })[0];
  const rejected = reviewSuggestion(third, "reject");
  assert.equal(rejected.current.status, "rejected");
  assert.equal(rejected.current.reviewState, "rejected");
  assert.equal(conversationGate([approved.current, edited.current, rejected.current]).ready, true);
});

check("manual path creates zero AI objects and remains complete", () => {
  const { fixture, workspace } = context(5);
  const suggestions = makeSimulatedSuggestions({ fixture, workspace, evidence: [] });
  assert.deepEqual(suggestions, []);
  const manual = addManualConversationOption({ workspace, content: "Ręczna notatka Damiana." });
  assert.equal(manual.author, "damian");
  assert.equal(manual.informationType, null);
  assert.equal(manual.reviewState, "approved");
  assert.equal(conversationGate([]).ready, true);
});

check("all four equal decisions require explicit input, rationale and evidence", () => {
  assert.deepEqual(DECISIONS, ["START", "START_CONDITIONAL", "DEFER_CONSULT", "NOT_THIS_PRODUCT"]);
  const { handoff, workspace } = context();
  assert.throws(() => saveDecision({ workspace, value: undefined, rationale: "x", evidence: [handoff] }), /Explicit/);
  assert.throws(() => saveDecision({ workspace, value: "START", rationale: "", evidence: [handoff] }), /rationale/);
  assert.throws(() => saveDecision({ workspace, value: "START", rationale: "x", evidence: [] }), /evidence/);
  for (const value of DECISIONS) {
    const conditions = value === "START_CONDITIONAL"
      ? [{ statement: "Warunek Damiana", verification: "Jawne potwierdzenie przez Damiana" }]
      : [];
    const decision = saveDecision({ workspace, value, rationale: `Jawne uzasadnienie ${value}`, evidence: [handoff], conditions });
    assert.equal(decision.value, value);
    assert.equal(decision.author, "damian");
  }
});

check("START_CONDITIONAL accepts only complete Damian-authored conditions", () => {
  const { handoff, workspace } = context(1);
  assert.throws(() => saveDecision({ workspace, value: "START_CONDITIONAL", rationale: "x", evidence: [handoff], conditions: [] }), /complete/);
  assert.throws(() => saveDecision({ workspace, value: "START_CONDITIONAL", rationale: "x", evidence: [handoff], conditions: [{ statement: "x", verification: "" }] }), /complete/);
  assert.throws(() => saveDecision({ workspace, value: "START", rationale: "x", evidence: [handoff], conditions: [{ statement: "x", verification: "y" }] }), /only for/);
  const result = saveDecision({ workspace, value: "START_CONDITIONAL", rationale: "x", evidence: [handoff], conditions: [{ statement: "x", verification: "y" }] });
  assert.equal(result.conditions[0].author, "damian");
});

check("follow-up is trainer-only unpublished and has no send capability", () => {
  const { handoff, workspace } = context(2);
  const decision = saveDecision({ workspace, value: "DEFER_CONSULT", rationale: "Najpierw dodatkowa informacja.", evidence: [handoff] });
  const draft = makeFollowupDraft({ decision, content: "Niewysłany fikcyjny szkic." });
  assert.equal(draft.informationType, "client_material");
  assert.equal(draft.visibility, "trainer_only");
  assert.equal(draft.publicationState, "unpublished");
  assert.equal(draft.sendCapability, "none");
});

check("cross-case reference fails before mutation", () => {
  const first = context(0); const second = context(1);
  const target = [];
  const before = JSON.stringify(target);
  assert.throws(() => target.push(recordObservation({
    workspace: first.workspace,
    handoff: second.handoff,
    candidateId: second.handoff.candidates[0].id,
    executionState: "performed",
    observationText: "Nie zapisuj",
    clientReaction: ""
  })), /Cross-case/);
  assert.equal(JSON.stringify(target), before);
  assert.throws(() => assertCaseIsolation(first.fixture.id, [second.handoff]), /Cross-case/);
});

check("prompt-injection-like source remains inert text", () => {
  const { handoff } = context(6);
  assert.match(handoff.sourceStatement, /Zignoruj zasady/);
  assert.equal(handoff.informationType, "trainer_decision");
  assert.doesNotMatch(runtime, /\beval\s*\(|new Function\s*\(/);
});

check("material handoff change invalidates workspace and downstream decision while preserving history", () => {
  const { handoff, workspace } = context(8);
  const decision = saveDecision({ workspace, value: "DEFER_CONSULT", rationale: "Fikcyjne uzasadnienie.", evidence: [handoff] });
  const result = materialHandoffChange({ handoff, workspace, downstream: [decision], summary: "Nowa materialna informacja." });
  assert.equal(result.handoffs.length, 2);
  assert.equal(result.handoffs[0].status, "superseded");
  assert.equal(result.handoffs[1].version, 2);
  assert.equal(result.workspaces[1].status, "invalidated");
  assert.equal(result.downstream[1].status, "invalidated");
  assert.equal(result.workspaces[1].invalidatedBy, exactRef(result.handoffs[1]));
  assert.throws(() => saveDecision({ workspace: result.workspaces[1], value: "START", rationale: "x", evidence: [result.handoffs[1]] }), /Active workspace/);
});

check("all fixtures are pseudonymous, fictional and contain no contact identity", () => {
  assert.equal(fixtures.length, 9);
  for (const [index, fixture] of fixtures.entries()) {
    assert.equal(fixture.id, `fictional-${String(index + 1).padStart(2, "0")}`);
    assert.doesNotMatch(JSON.stringify(fixture), /@[a-z0-9]|\+48|telefon|e-mail|nazwisko/i);
    if (fixture.tanita) assert.equal(fixture.tanita.fictional, true);
  }
});

check("UI has four unselected decisions and no generated condition", () => {
  for (const value of DECISIONS) assert.match(html, new RegExp(`value=["']${value}["']`));
  assert.equal((html.match(/name="pwd-decision"/g) || []).length, 4);
  assert.doesNotMatch(html, /name="pwd-decision"[^>]+checked/i);
  assert.match(html, /id="condition-statement"/);
  assert.match(html, /id="condition-verification"/);
  assert.doesNotMatch(fixtureSource, /conditionStatement|conditionVerification|expectedDecision/);
});

check("runtime is offline, session-only and detached from production", () => {
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(runtime, /https?:\/\//i);
  assert.doesNotMatch(runtime, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|serviceWorker\.register/i);
  assert.doesNotMatch(runtime, /createClient\s*\(|supabaseUrl|formspree|mailto:|sms:|type="file"|<form\b/i);
  assert.doesNotMatch(app, /assets\/os|studio-las-config|client-access-admin/i);
});

check("no send, publication, price, payment or booking control exists", () => {
  assert.doesNotMatch(html, />(Wyślij|Opublikuj|Zapłać|Kup|Zarezerwuj)</i);
  assert.doesNotMatch(app, /window\.location|location\.assign|\.submit\s*\(/i);
});

check("keyboard, focus and exact 360 px layout contracts are present", () => {
  assert.match(css, /:focus-visible\s*\{/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*480px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /<button(?![^>]*type="button")/i);
});

check("Registry keeps the general PRD rule and records only the narrow PRD 004 exception", () => {
  const registry = readFileSync(join(here, "..", "docs", "governance", "00_SOURCE_OF_TRUTH_REGISTRY.md"), "utf8");
  assert.match(registry, /PRD may not begin until the following are resolved/);
  assert.match(registry, /Narrow Stage 4A fictional prototype exception/);
  assert.match(registry, /PRD 004 may exist only as the contract for the isolated/);
  assert.match(registry, /does not extend to a real runtime, later PRDs/);
});

for (const name of passes) console.log(`PASS — ${name}`);
console.log(`Stage 4A PWD decision conversation contract: ${passes.length}/${passes.length} PASS`);
