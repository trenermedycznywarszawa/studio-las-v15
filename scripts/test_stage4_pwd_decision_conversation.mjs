import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "../prototypes/stage-4-pwd-decision-conversation/fixtures.js";
import {
  COMPARABILITY, DECISIONS, INFORMATION_TYPES, OBSERVATION_STATES,
  addManualConversationOption, assessComparability, assertCaseIsolation,
  conversationGate, createWorkspace, exactRef, invalidateDependentRecords,
  makeFollowupDraft, makeHandoff, makeTanitaPackage, materialHandoffChange,
  prepareConversationRun, recordObservation, reviewSuggestion, saveDecision,
  saveTrainerInterpretation
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

const saveManualDecision = ({ workspace, value, rationale, evidence, conditions = [], previous = null }) => saveDecision({
  workspace, value, rationale, evidence, conditions, previous, conversationRecords: []
});

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

check("Tanita comparability is explicit, unscored, versioned and Damian-owned", () => {
  const { workspace, tanitaPackage } = context();
  assert.throws(() => assessComparability({ workspace, tanitaPackage, value: undefined, rationale: "x" }), /Explicit/);
  assert.throws(() => assessComparability({ workspace, tanitaPackage, value: "comparable", rationale: "" }), /rationale/);
  for (const value of COMPARABILITY) {
    const result = assessComparability({ workspace, tanitaPackage, value, rationale: `Jawne uzasadnienie ${value}` }).current;
    assert.equal(result.value, value);
    assert.equal(result.author, "damian");
    assert.equal(result.informationType, "trainer_interpretation");
  }
  const first = assessComparability({ workspace, tanitaPackage, value: "unknown", rationale: "Pierwsza treść." }).current;
  const second = assessComparability({ workspace, tanitaPackage, value: "comparable", rationale: "Druga treść.", previous: first });
  assert.equal(second.previous.status, "superseded");
  assert.equal(second.current.version, 2);
  assert.equal(second.current.supersedes, exactRef(first));
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
    if (result.reaction) assert.equal(result.reaction.author, "fictional_client");
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
  }).current;
  assert.notEqual(recorded.observation.id, recorded.reaction.id);
  assert.notEqual(recorded.observation.id, interpretation.id);
  assert.equal(interpretation.informationType, "trainer_interpretation");
  assert.deepEqual(interpretation.derivedFrom.slice(1), [handoff, recorded.observation, recorded.reaction].map(exactRef));
});

check("interpretation v1 and v2 preserve different content and resolvable original references", () => {
  const { handoff, workspace } = context();
  const v1 = saveTrainerInterpretation({
    workspace, evidence: [handoff], content: "Treść interpretacji v1.", uncertainty: "Niepewność v1."
  }).current;
  const originalRefs = [...v1.derivedFrom];
  const transition = saveTrainerInterpretation({
    workspace, evidence: [handoff], content: "Treść interpretacji v2.", uncertainty: "Niepewność v2.", previous: v1
  });
  assert.equal(transition.previous.content, "Treść interpretacji v1.");
  assert.equal(transition.previous.status, "superseded");
  assert.deepEqual(transition.previous.derivedFrom, originalRefs);
  assert.equal(transition.current.content, "Treść interpretacji v2.");
  assert.equal(transition.current.version, 2);
  assert.equal(transition.current.supersedes, exactRef(v1));
  assert.notEqual(exactRef(transition.previous), exactRef(transition.current));
});

check("nested derivedFrom arrays are immutable", () => {
  const { handoff, workspace } = context();
  const interpretation = saveTrainerInterpretation({
    workspace, evidence: [handoff], content: "Treść.", uncertainty: "Niepewność."
  }).current;
  assert.equal(Object.isFrozen(interpretation), true);
  assert.equal(Object.isFrozen(interpretation.derivedFrom), true);
  assert.throws(() => interpretation.derivedFrom.push("forged@v1"), TypeError);
});

check("simulated AI creates conversation wording only and every item starts needs_review", () => {
  const { fixture, handoff, workspace } = context();
  const prepared = prepareConversationRun({ fixture, workspace, evidence: [handoff], mode: "assisted" });
  assert.ok(prepared.suggestions.length > 0);
  for (const item of prepared.suggestions) {
    assert.equal(item.informationType, "ai_suggestion");
    assert.equal(item.author, "fictional_ai");
    assert.equal(item.reviewState, "needs_review");
    assert.equal(item.conversationRunRef, exactRef(prepared.runTransition.current));
    assert.doesNotMatch(item.content, /START|DEFER_CONSULT|NOT_THIS_PRODUCT|warunek rozpoczęcia/i);
  }
  const unsafeFixture = { ...fixture, suggestions: ["Ustaw START"] };
  assert.throws(() => prepareConversationRun({ fixture: unsafeFixture, workspace, evidence: [handoff], mode: "assisted" }), /may not suggest/);
});

check("approve edit and reject append review history", () => {
  const { fixture, handoff, workspace } = context();
  const prepared = prepareConversationRun({ fixture, workspace, evidence: [handoff], mode: "assisted" });
  const [first, second] = prepared.suggestions;
  const approved = reviewSuggestion(first, "approve");
  assert.equal(approved.previous.status, "superseded");
  assert.equal(approved.current.reviewState, "approved");
  const edited = reviewSuggestion(second, "edit", "Pytanie zapisane przez Damiana.");
  assert.equal(edited.current.author, "damian");
  assert.equal(edited.current.informationType, null);
  assert.equal(edited.current.reviewState, "approved");
  const rejected = reviewSuggestion(prepared.suggestions[0], "reject");
  assert.equal(rejected.current.status, "rejected");
  assert.equal(conversationGate([approved.current, edited.current, rejected.current]).ready, true);
});

check("preparing conversation again creates a separate run and preserves prior run and suggestion history", () => {
  const { fixture, handoff, workspace } = context();
  const first = prepareConversationRun({ fixture, workspace, evidence: [handoff], mode: "assisted" });
  const second = prepareConversationRun({
    fixture, workspace, evidence: [handoff], mode: "assisted",
    previousRun: first.runTransition.current, activeSuggestions: first.suggestions
  });
  const history = [first.runTransition.current, second.runTransition.previous, second.runTransition.current,
    ...first.suggestions, ...second.suggestionTransitions.flatMap(item => [item.previous, item.current]), ...second.suggestions];
  assert.equal(second.runTransition.previous.status, "superseded");
  assert.equal(second.runTransition.current.version, 2);
  assert.equal(second.runTransition.current.supersedes, exactRef(first.runTransition.current));
  assert.ok(history.some(item => exactRef(item) === exactRef(first.suggestions[0]) && item.content === first.suggestions[0].content));
  assert.notEqual(first.suggestions[0].id, second.suggestions[0].id);
  assert.equal(second.suggestionTransitions[0].current.status, "invalidated");
});

check("manual path creates zero AI objects and remains complete", () => {
  const { fixture, handoff, workspace } = context(5);
  const prepared = prepareConversationRun({ fixture, workspace, evidence: [handoff], mode: "manual" });
  assert.deepEqual(prepared.suggestions, []);
  const manual = addManualConversationOption({ workspace, content: "Ręczna notatka Damiana." });
  assert.equal(manual.author, "damian");
  assert.equal(manual.informationType, null);
  assert.equal(manual.reviewState, "approved");
  assert.equal(conversationGate([]).ready, true);
});

check("same-length manual notes receive different deterministic unique identifiers", () => {
  const { workspace } = context(5);
  const first = addManualConversationOption({ workspace, content: "ABCD", existingRecords: [] });
  const second = addManualConversationOption({ workspace, content: "WXYZ", existingRecords: [first] });
  const repeated = addManualConversationOption({ workspace, content: "WXYZ", existingRecords: [first] });
  assert.notEqual(first.id, second.id);
  assert.equal(second.id, repeated.id);
  assert.equal(first.content.length, second.content.length);
});

check("domain decision gate blocks an active needs_review suggestion", () => {
  const { fixture, handoff, workspace } = context();
  const prepared = prepareConversationRun({ fixture, workspace, evidence: [handoff], mode: "assisted" });
  assert.throws(() => saveDecision({
    workspace, value: "START", rationale: "Jawne uzasadnienie.", evidence: [handoff], conversationRecords: prepared.suggestions
  }), /Conversation gate blocked/);
  assert.throws(() => saveDecision({
    workspace, value: "START", rationale: "Jawne uzasadnienie.", evidence: [handoff]
  }), /Conversation records required/);
});

check("all four equal decisions require explicit input, rationale and evidence", () => {
  assert.deepEqual(DECISIONS, ["START", "START_CONDITIONAL", "DEFER_CONSULT", "NOT_THIS_PRODUCT"]);
  const { handoff, workspace } = context();
  assert.throws(() => saveManualDecision({ workspace, value: undefined, rationale: "x", evidence: [handoff] }), /Explicit/);
  assert.throws(() => saveManualDecision({ workspace, value: "START", rationale: "", evidence: [handoff] }), /rationale/);
  assert.throws(() => saveManualDecision({ workspace, value: "START", rationale: "x", evidence: [] }), /evidence/);
  for (const value of DECISIONS) {
    const conditions = value === "START_CONDITIONAL"
      ? [{ statement: "Warunek Damiana", verification: "Jawne potwierdzenie przez Damiana" }]
      : [];
    const decision = saveManualDecision({ workspace, value, rationale: `Jawne uzasadnienie ${value}`, evidence: [handoff], conditions }).current;
    assert.equal(decision.value, value);
    assert.equal(decision.author, "damian");
  }
});

check("START_CONDITIONAL accepts only complete Damian-authored conditions", () => {
  const { handoff, workspace } = context(1);
  assert.throws(() => saveManualDecision({ workspace, value: "START_CONDITIONAL", rationale: "x", evidence: [handoff], conditions: [] }), /complete/);
  assert.throws(() => saveManualDecision({ workspace, value: "START_CONDITIONAL", rationale: "x", evidence: [handoff], conditions: [{ statement: "x", verification: "" }] }), /complete/);
  assert.throws(() => saveManualDecision({ workspace, value: "START", rationale: "x", evidence: [handoff], conditions: [{ statement: "x", verification: "y" }] }), /only for/);
  const result = saveManualDecision({ workspace, value: "START_CONDITIONAL", rationale: "x", evidence: [handoff], conditions: [{ statement: "x", verification: "y" }] }).current;
  assert.equal(result.conditions[0].author, "damian");
  assert.equal(Object.isFrozen(result.conditions[0]), true);
});

check("decision v1 and v2 preserve different content, lineage, and follow-up origin", () => {
  const { handoff, workspace } = context(2);
  const v1 = saveManualDecision({ workspace, value: "DEFER_CONSULT", rationale: "Decyzja v1.", evidence: [handoff] }).current;
  const draft = makeFollowupDraft({ decision: v1, content: "Niewysłany szkic z v1." });
  const transition = saveManualDecision({
    workspace, value: "NOT_THIS_PRODUCT", rationale: "Decyzja v2.", evidence: [handoff], previous: v1
  });
  assert.equal(transition.previous.rationale, "Decyzja v1.");
  assert.equal(transition.previous.status, "superseded");
  assert.equal(transition.current.rationale, "Decyzja v2.");
  assert.equal(transition.current.supersedes, exactRef(v1));
  assert.deepEqual(draft.derivedFrom, [exactRef(v1)]);
  assert.notEqual(draft.derivedFrom[0], exactRef(transition.current));
  const invalidated = invalidateDependentRecords({ changedRecords: [v1], records: [draft], invalidatedBy: exactRef(transition.current) });
  assert.equal(invalidated[0].current.status, "invalidated");
  assert.deepEqual(invalidated[0].current.derivedFrom, [exactRef(v1)]);
});

check("follow-up is trainer-only unpublished and has no send capability", () => {
  const { handoff, workspace } = context(2);
  const decision = saveManualDecision({ workspace, value: "DEFER_CONSULT", rationale: "Najpierw dodatkowa informacja.", evidence: [handoff] }).current;
  const draft = makeFollowupDraft({ decision, content: "Niewysłany fikcyjny szkic." });
  assert.equal(draft.informationType, "client_material");
  assert.equal(draft.visibility, "trainer_only");
  assert.equal(draft.publicationState, "unpublished");
  assert.equal(draft.sendCapability, "none");
});

check("Tanita facts cannot become decision evidence without exact active package comparability", () => {
  const { handoff, workspace, tanitaPackage } = context();
  assert.throws(() => saveManualDecision({
    workspace, value: "START", rationale: "x", evidence: [handoff, tanitaPackage.facts[0]]
  }), /Tanita facts require/);
  const comparison = assessComparability({
    workspace, tanitaPackage, value: "comparable", rationale: "Dokładny bieżący pakiet."
  }).current;
  const decision = saveManualDecision({
    workspace, value: "START", rationale: "Jawne uzasadnienie.", evidence: [handoff, tanitaPackage.facts[0], comparison]
  }).current;
  assert.ok(decision.derivedFrom.includes(exactRef(tanitaPackage.facts[0])));
  const withoutTanita = context(2);
  assert.doesNotThrow(() => saveManualDecision({
    workspace: withoutTanita.workspace, value: "DEFER_CONSULT", rationale: "Bez Tanita.", evidence: [withoutTanita.handoff]
  }));
});

check("changing interpretation invalidates dependent run, suggestions, decision and follow-up without deleting history", () => {
  const { fixture, handoff, workspace } = context(2);
  const v1 = saveTrainerInterpretation({ workspace, evidence: [handoff], content: "Interpretacja v1.", uncertainty: "Niepewność v1." }).current;
  const run = prepareConversationRun({ fixture, workspace, evidence: [handoff, v1], mode: "manual" }).runTransition.current;
  const decision = saveManualDecision({ workspace, value: "DEFER_CONSULT", rationale: "Decyzja zależna.", evidence: [handoff, v1] }).current;
  const followup = makeFollowupDraft({ decision, content: "Zależny szkic." });
  const v2 = saveTrainerInterpretation({ workspace, evidence: [handoff], content: "Interpretacja v2.", uncertainty: "Niepewność v2.", previous: v1 }).current;
  const transitions = invalidateDependentRecords({
    changedRecords: [v1], records: [run, decision, followup], invalidatedBy: exactRef(v2)
  });
  assert.equal(transitions.length, 3);
  assert.ok(transitions.every(item => item.previous.status === "superseded"));
  assert.ok(transitions.every(item => item.current.status === "invalidated"));
  assert.deepEqual(transitions.find(item => item.previous.id === followup.id).previous.derivedFrom, [exactRef(decision)]);
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

check("material handoff v2 rejects v1 and is the only source for a new workspace", () => {
  const { fixture, handoff, workspace } = context(8);
  const decision = saveManualDecision({ workspace, value: "DEFER_CONSULT", rationale: "Fikcyjne uzasadnienie.", evidence: [handoff] }).current;
  const result = materialHandoffChange({ handoff, workspace, downstream: [decision], summary: "Nowa materialna informacja." });
  const oldHandoff = result.handoffs[0];
  const currentHandoff = result.handoffs[1];
  const invalidatedWorkspace = result.workspaceTransition.current;
  assert.equal(oldHandoff.status, "superseded");
  assert.equal(currentHandoff.version, 2);
  assert.equal(invalidatedWorkspace.status, "invalidated");
  assert.equal(invalidatedWorkspace.invalidatedBy, exactRef(currentHandoff));
  assert.throws(() => createWorkspace({ fixture, handoff: oldHandoff, previousWorkspace: invalidatedWorkspace }), /Active READY/);
  const nextWorkspace = createWorkspace({ fixture, handoff: currentHandoff, previousWorkspace: invalidatedWorkspace });
  assert.equal(nextWorkspace.status, "active");
  assert.equal(nextWorkspace.currentHandoffRef, exactRef(currentHandoff));
  assert.equal(nextWorkspace.derivedFrom[0], exactRef(currentHandoff));
  assert.equal(nextWorkspace.supersedes, exactRef(invalidatedWorkspace));
  assert.throws(() => saveManualDecision({ workspace: invalidatedWorkspace, value: "START", rationale: "x", evidence: [currentHandoff] }), /Active workspace/);
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
  assert.match(html, /<h2[^>]+tabindex="-1"/);
  assert.match(app, /focus\(\{ preventScroll: true \}\)/);
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
