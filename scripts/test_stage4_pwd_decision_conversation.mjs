import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "../prototypes/stage-4-pwd-decision-conversation/fixtures.js";
import {
  COMPARABILITY, DECISIONS, INFORMATION_TYPES, OBSERVATION_STATES,
  addManualConversationOption, assessComparability, assertCaseIsolation,
  conversationGate, conversationRecordsForRun, createSessionAggregate,
  createWorkspace, exactRef, invalidateDependentRecords, makeFollowupDraft,
  makeHandoff, makeTanitaPackage, materialHandoffChange, prepareConversationRun,
  recordObservation, resolveExactReference, reviewSourceFact, reviewSuggestion,
  saveDecision, saveTrainerInterpretation
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

function replaceExact(records, original, replacement) {
  const reference = exactRef(original);
  const index = records.findIndex(item => exactRef(item) === reference);
  if (index < 0) throw new Error(`Missing harness record ${reference}.`);
  records[index] = replacement;
}

function put(ctx, ...records) {
  for (const record of records.filter(Boolean)) {
    const reference = exactRef(record);
    const existing = ctx.records.findIndex(item => exactRef(item) === reference);
    if (existing >= 0) {
      assert.deepEqual(ctx.records[existing], record, `Harness refuses divergent exact-ref upsert for ${reference}.`);
    } else {
      ctx.records.push(record);
    }
  }
}

function applyTransition(ctx, transition) {
  if (transition.previous) replaceExact(ctx.records, transition.previous, transition.previous);
  put(ctx, transition.current);
  return transition.current;
}

function context(index = 0) {
  const fixture = fixtures[index];
  const ctx = {
    fixture,
    records: [],
    aggregate() { return createSessionAggregate({ caseId: fixture.id, records: this.records }); }
  };
  ctx.handoff = makeHandoff(fixture);
  put(ctx, ctx.handoff);
  ctx.workspace = createWorkspace({ fixture, handoff: ctx.handoff, session: ctx.aggregate() });
  put(ctx, ctx.workspace);
  ctx.tanitaPackage = makeTanitaPackage({
    fixture, handoff: ctx.handoff, workspace: ctx.workspace, session: ctx.aggregate()
  });
  if (ctx.tanitaPackage) put(ctx, ctx.tanitaPackage.source, ...ctx.tanitaPackage.facts);
  return ctx;
}

function prepare(ctx, mode = "manual", evidence = [ctx.handoff]) {
  const prepared = prepareConversationRun({
    session: ctx.aggregate(), fixture: ctx.fixture, workspace: ctx.workspace,
    evidence, mode, previousRun: ctx.run || null
  });
  prepared.invalidationTransitions.forEach(transition => applyTransition(ctx, transition));
  applyTransition(ctx, prepared.runTransition);
  put(ctx, ...prepared.suggestions);
  ctx.run = prepared.runTransition.current;
  return prepared;
}

function decision(ctx, { value = "DEFER_CONSULT", rationale = "Jawne uzasadnienie.", evidence = [ctx.handoff], conditions = [], previous = null, records } = {}) {
  const conversationRecords = records ?? conversationRecordsForRun({ session: ctx.aggregate(), run: ctx.run });
  return saveDecision({
    session: ctx.aggregate(), workspace: ctx.workspace, conversationRun: ctx.run,
    value, rationale, evidence, conditions, conversationRecords, previous
  });
}

function applyMaterialChange(ctx) {
  const originalHandoff = ctx.handoff;
  const result = materialHandoffChange({
    session: ctx.aggregate(), handoff: ctx.handoff, workspace: ctx.workspace,
    summary: "Nowa materialna informacja."
  });
  replaceExact(ctx.records, originalHandoff, result.handoffs[0]);
  put(ctx, result.handoffs[1]);
  applyTransition(ctx, result.workspaceTransition);
  result.downstreamTransitions.forEach(transition => applyTransition(ctx, transition));
  ctx.handoff = result.handoffs[1];
  ctx.workspace = result.workspaceTransition.current;
  return { result, originalHandoff };
}

check("Stage 1 information vocabulary remains closed", () => {
  assert.deepEqual(INFORMATION_TYPES, [
    "source_artifact", "source_fact", "extracted_fact", "trainer_observation",
    "ai_hypothesis", "ai_suggestion", "trainer_interpretation", "trainer_decision", "client_material"
  ]);
});

check("canonical immutable aggregate resolves exact references and rejects conflicting copies", () => {
  const ctx = context();
  const session = ctx.aggregate();
  assert.equal(Object.isFrozen(session), true);
  assert.equal(Object.isFrozen(session.byRef), true);
  assert.equal(resolveExactReference(session, ctx.workspace, { current: true }), ctx.workspace);
  const forged = { ...ctx.workspace, taskId: "forged" };
  assert.throws(() => resolveExactReference(session, forged, { current: true }), /conflicts with canonical/);
});

check("test harness refuses divergent content under an existing exact reference", () => {
  const ctx = context();
  const rewrite = Object.freeze({ ...ctx.workspace, taskId: "rewritten-under-same-ref" });
  assert.throws(() => put(ctx, rewrite), /Harness refuses divergent exact-ref upsert/);
  assert.equal(ctx.workspace.taskId, "conduct_pwd_and_record_trainer_decision");
});

check("task and exact current Stage 3 handoff create one isolated workspace", () => {
  const ctx = context();
  assert.equal(ctx.workspace.taskId, "conduct_pwd_and_record_trainer_decision");
  assert.equal(ctx.workspace.contractVersion, "stage4-v1");
  assert.equal(ctx.workspace.currentHandoffRef, exactRef(ctx.handoff));
});

check("existing workspace lineage cannot be rewritten as another v1", () => {
  const ctx = context();
  assert.throws(() => createWorkspace({
    fixture: ctx.fixture, handoff: ctx.handoff, session: ctx.aggregate()
  }), /allowed canonical lineage tip|previous canonical lineage tip/);
  assert.equal(ctx.workspace.version, 1);
});

check("Tanita is optional and package is bound to exact handoff and workspace", () => {
  const withoutTanita = context(2);
  assert.equal(withoutTanita.tanitaPackage, null);
  const withTanita = context(0);
  assert.equal(withTanita.tanitaPackage.source.workspaceRef, exactRef(withTanita.workspace));
  assert.equal(withTanita.tanitaPackage.source.handoffRef, exactRef(withTanita.handoff));
  assert.ok(withTanita.tanitaPackage.facts.every(item => item.derivedFrom[0] === exactRef(withTanita.tanitaPackage.source)));
});

check("Tanita comparability is explicit, unscored, versioned and Damian-owned", () => {
  for (const value of COMPARABILITY) {
    const ctx = context();
    const transition = assessComparability({
      session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: ctx.tanitaPackage,
      value, rationale: `Jawne uzasadnienie ${value}`
    });
    assert.equal(transition.current.value, value);
    assert.equal(transition.current.author, "damian");
  }
  const ctx = context();
  assert.throws(() => assessComparability({ session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: ctx.tanitaPackage, value: undefined, rationale: "x" }), /Explicit/);
  const first = assessComparability({ session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: ctx.tanitaPackage, value: "unknown", rationale: "Pierwsza." });
  applyTransition(ctx, first);
  const second = assessComparability({ session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: ctx.tanitaPackage, value: "comparable", rationale: "Druga.", previous: first.current });
  assert.equal(second.previous.status, "superseded");
  assert.equal(second.current.supersedes, exactRef(first.current));
});

check("Tanita comparability derives vN+1 from the aggregate when previous is omitted", () => {
  const ctx = context();
  const first = assessComparability({
    session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: ctx.tanitaPackage,
    value: "unknown", rationale: "Porównanie v1."
  });
  applyTransition(ctx, first);
  const second = assessComparability({
    session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: ctx.tanitaPackage,
    value: "comparable", rationale: "Porównanie v2."
  });
  applyTransition(ctx, second);
  assert.equal(second.current.version, 2);
  assert.equal(second.current.supersedes, exactRef(first.current));
  assert.equal(ctx.records.find(item => exactRef(item) === exactRef(first.current)).rationale, "Porównanie v1.");
  assert.equal(ctx.records.find(item => exactRef(item) === exactRef(second.current)).rationale, "Porównanie v2.");
});

check("observation states remain explicit and bounded", () => {
  assert.deepEqual(OBSERVATION_STATES, ["performed", "skipped", "stopped"]);
  for (const [index, executionState] of OBSERVATION_STATES.entries()) {
    const ctx = context(index === 0 ? 0 : 4);
    const recorded = recordObservation({
      session: ctx.aggregate(), workspace: ctx.workspace, handoff: ctx.handoff,
      candidateId: ctx.handoff.candidates[index === 2 ? 1 : 0].id,
      executionState, observationText: `Opis ${executionState}`, clientReaction: ""
    });
    assert.equal(recorded.observation.executionState, executionState);
  }
});

check("source_fact needs_review is rejected and exact Damian-approved version passes", () => {
  const ctx = context();
  const recorded = recordObservation({
    session: ctx.aggregate(), workspace: ctx.workspace, handoff: ctx.handoff,
    candidateId: ctx.handoff.candidates[0].id, executionState: "performed",
    observationText: "Obserwacja Damiana.", clientReaction: "Fikcyjna reakcja klienta."
  });
  put(ctx, recorded.observation, recorded.reaction);
  assert.equal(recorded.reaction.reviewState, "needs_review");
  assert.throws(() => saveTrainerInterpretation({
    session: ctx.aggregate(), workspace: ctx.workspace, evidence: [recorded.reaction],
    content: "Nie zapisuj.", uncertainty: "Niepewność."
  }), /source_fact requires Damian review/);
  const review = reviewSourceFact({ session: ctx.aggregate(), record: recorded.reaction, action: "approve" });
  applyTransition(ctx, review);
  const interpretation = saveTrainerInterpretation({
    session: ctx.aggregate(), workspace: ctx.workspace, evidence: [review.current],
    content: "Interpretacja Damiana.", uncertainty: "Niepewność pozostaje."
  });
  assert.equal(review.current.reviewedBy, "damian");
  assert.equal(review.current.reviewedVersion, exactRef(recorded.reaction));
  assert.equal(interpretation.current.derivedFrom.at(-1), exactRef(review.current));
});

check("source_fact cannot enter a decision indirectly through an unreviewed interpretation", () => {
  const ctx = context();
  const forgedSource = Object.freeze({
    id: `${ctx.fixture.id}-forged-source`, caseId: ctx.fixture.id, version: 1,
    informationType: "source_fact", operationalRole: "client_reaction_during_pwd",
    author: "fictional_client", derivedFrom: [exactRef(ctx.workspace)], status: "active",
    visibility: "trainer_only", publicationState: "unpublished", reviewState: "needs_review", content: "Fikcyjna treść."
  });
  const forgedInterpretation = Object.freeze({
    id: `${ctx.fixture.id}-forged-interpretation`, caseId: ctx.fixture.id, version: 1,
    informationType: "trainer_interpretation", operationalRole: "pwd_trainer_interpretation",
    author: "damian", derivedFrom: [exactRef(ctx.workspace), exactRef(forgedSource)], status: "active",
    visibility: "trainer_only", publicationState: "unpublished", reviewState: "approved", content: "Treść", uncertainty: "Niepewność"
  });
  put(ctx, forgedSource, forgedInterpretation);
  prepare(ctx, "manual", [ctx.handoff]);
  assert.throws(() => decision(ctx, { evidence: [forgedInterpretation] }), /source_fact requires Damian review/);
});

check("interpretation with an unresolved source_fact provenance blocks decision", () => {
  const ctx = context(2);
  const interpretation = Object.freeze({
    id: `${ctx.fixture.id}-unresolved-source-interpretation`, caseId: ctx.fixture.id, version: 1,
    informationType: "trainer_interpretation", operationalRole: "pwd_trainer_interpretation",
    author: "damian", derivedFrom: [exactRef(ctx.workspace), `${ctx.fixture.id}-missing-source-fact@v1`],
    status: "active", visibility: "trainer_only", publicationState: "unpublished",
    reviewState: "approved", content: "Niekompletny graf.", uncertainty: "Brak źródła."
  });
  put(ctx, interpretation);
  prepare(ctx, "manual", [ctx.handoff]);
  assert.throws(() => decision(ctx, { evidence: [interpretation] }), /Exact reference is not present.*missing-source-fact/);
});

check("unresolved exact object reference in derivedFrom is rejected", () => {
  const ctx = context(2);
  const observation = Object.freeze({
    id: `${ctx.fixture.id}-unresolved-observation`, caseId: ctx.fixture.id, version: 1,
    informationType: "trainer_observation", operationalRole: "selected_pwd_observation",
    author: "damian", derivedFrom: [`${ctx.fixture.id}-missing-object@v1`], status: "active",
    visibility: "trainer_only", publicationState: "unpublished", reviewState: "approved", content: "Niekompletny graf."
  });
  put(ctx, observation);
  prepare(ctx, "manual", [ctx.handoff]);
  assert.throws(() => decision(ctx, { evidence: [observation] }), /Exact reference is not present.*missing-object/);
});

check("missing Tanita package, fact, or comparison blocks decision", () => {
  const missingPackage = context();
  const orphanFact = Object.freeze({
    id: `${missingPackage.fixture.id}-orphan-tanita-fact`, caseId: missingPackage.fixture.id, version: 1,
    informationType: "extracted_fact", operationalRole: "prepared_fictional_tanita_fact",
    author: "fictional_fixture", derivedFrom: [`${missingPackage.fixture.id}-missing-package@v1`],
    status: "active", visibility: "trainer_only", publicationState: "unpublished", reviewState: "approved"
  });
  put(missingPackage, orphanFact);
  prepare(missingPackage, "manual", [missingPackage.handoff]);
  assert.throws(() => decision(missingPackage, { evidence: [orphanFact] }), /Exact reference is not present.*missing-package/);

  const missingFact = context();
  const incompleteComparison = Object.freeze({
    id: `${missingFact.fixture.id}-incomplete-comparison`, caseId: missingFact.fixture.id, version: 1,
    informationType: "trainer_interpretation", operationalRole: "tanita_comparability_assessment",
    author: "damian", derivedFrom: [exactRef(missingFact.workspace), exactRef(missingFact.tanitaPackage.source), `${missingFact.fixture.id}-missing-tanita-fact@v1`],
    status: "active", visibility: "trainer_only", publicationState: "unpublished", reviewState: "approved",
    value: "unknown", rationale: "Niekompletne porównanie."
  });
  put(missingFact, incompleteComparison);
  prepare(missingFact, "manual", [missingFact.handoff]);
  assert.throws(() => decision(missingFact, { evidence: [incompleteComparison] }), /Exact reference is not present.*missing-tanita-fact/);

  const missingComparison = context();
  prepare(missingComparison, "manual", [missingComparison.handoff]);
  assert.throws(() => decision(missingComparison, { evidence: [missingComparison.tanitaPackage.facts[0]] }), /Tanita facts require/);
});

check("interpretation versions preserve content, exact lineage and nested immutability", () => {
  const ctx = context();
  const first = saveTrainerInterpretation({ session: ctx.aggregate(), workspace: ctx.workspace, evidence: [ctx.handoff], content: "Treść v1.", uncertainty: "Niepewność v1." });
  applyTransition(ctx, first);
  const second = saveTrainerInterpretation({ session: ctx.aggregate(), workspace: ctx.workspace, evidence: [ctx.handoff], content: "Treść v2.", uncertainty: "Niepewność v2.", previous: first.current });
  assert.equal(second.previous.content, "Treść v1.");
  assert.equal(second.current.content, "Treść v2.");
  assert.equal(second.current.supersedes, exactRef(first.current));
  assert.equal(Object.isFrozen(second.current.derivedFrom), true);
  assert.throws(() => second.current.derivedFrom.push("forged@v1"), TypeError);
});

check("interpretation derives vN+1 from the aggregate when previous is omitted", () => {
  const ctx = context(2);
  const first = saveTrainerInterpretation({
    session: ctx.aggregate(), workspace: ctx.workspace, evidence: [ctx.handoff], content: "Treść v1.", uncertainty: "U1."
  });
  applyTransition(ctx, first);
  const second = saveTrainerInterpretation({
    session: ctx.aggregate(), workspace: ctx.workspace, evidence: [ctx.handoff], content: "Treść v2.", uncertainty: "U2."
  });
  applyTransition(ctx, second);
  assert.equal(second.current.version, 2);
  assert.equal(second.current.supersedes, exactRef(first.current));
  assert.equal(ctx.records.find(item => exactRef(item) === exactRef(first.current)).content, "Treść v1.");
  assert.equal(ctx.records.find(item => exactRef(item) === exactRef(second.current)).content, "Treść v2.");
});

check("simulated assisted run creates complete needs_review records", () => {
  const ctx = context();
  const prepared = prepare(ctx, "assisted");
  assert.ok(prepared.suggestions.length > 0);
  assert.deepEqual(ctx.run.expectedConversationOptionIds, prepared.suggestions.map(item => item.id));
  assert.ok(prepared.suggestions.every(item => item.reviewState === "needs_review" && item.conversationRunRef === exactRef(ctx.run)));
});

check("conversation run derives vN+1 from the aggregate when previousRun is omitted", () => {
  const ctx = context(2);
  prepare(ctx, "manual");
  const firstRun = ctx.run;
  const second = prepareConversationRun({
    session: ctx.aggregate(), fixture: ctx.fixture, workspace: ctx.workspace,
    evidence: [ctx.handoff], mode: "assisted"
  });
  second.invalidationTransitions.forEach(transition => applyTransition(ctx, transition));
  applyTransition(ctx, second.runTransition);
  put(ctx, ...second.suggestions);
  assert.equal(second.runTransition.current.version, 2);
  assert.equal(second.runTransition.current.supersedes, exactRef(firstRun));
  assert.equal(second.runTransition.previous.mode, "manual");
  assert.equal(ctx.records.find(item => exactRef(item) === exactRef(firstRun)).mode, "manual");
  assert.equal(ctx.records.find(item => exactRef(item) === exactRef(second.runTransition.current)).mode, "assisted");
});

check("suggestion approve edit and reject append exact review versions", () => {
  const ctx = context();
  const prepared = prepare(ctx, "assisted");
  const approve = reviewSuggestion({ session: ctx.aggregate(), record: prepared.suggestions[0], action: "approve" });
  applyTransition(ctx, approve);
  const edit = reviewSuggestion({ session: ctx.aggregate(), record: prepared.suggestions[1], action: "edit", editedContent: "Pytanie Damiana." });
  applyTransition(ctx, edit);
  assert.equal(approve.current.reviewState, "approved");
  assert.equal(edit.current.author, "damian");
  assert.equal(edit.current.conversationRunRef, exactRef(ctx.run));
});

check("assisted pending plus empty conversationRecords is rejected", () => {
  const ctx = context();
  prepare(ctx, "assisted");
  assert.throws(() => decision(ctx, { records: [] }), /complete canonical run set/);
});

check("omitting one pending assisted record is rejected", () => {
  const ctx = context();
  prepare(ctx, "assisted");
  const complete = conversationRecordsForRun({ session: ctx.aggregate(), run: ctx.run });
  assert.throws(() => decision(ctx, { records: complete.slice(1) }), /complete canonical run set/);
});

check("complete assisted pending set is blocked by the domain gate", () => {
  const ctx = context();
  prepare(ctx, "assisted");
  assert.throws(() => decision(ctx), /Conversation gate blocked/);
});

check("missing active run rejects while genuine manual zero-AI run passes", () => {
  const ctx = context(5);
  assert.throws(() => saveDecision({
    session: ctx.aggregate(), workspace: ctx.workspace, conversationRun: null,
    value: "DEFER_CONSULT", rationale: "x", evidence: [ctx.handoff], conversationRecords: []
  }), /Exact versioned object required|canonical lineage tip/);
  prepare(ctx, "manual");
  assert.equal(conversationRecordsForRun({ session: ctx.aggregate(), run: ctx.run }).length, 0);
  assert.doesNotThrow(() => decision(ctx));
});

check("manual notes belong to one exact run and same-length notes have unique deterministic ids", () => {
  const ctx = context(5);
  prepare(ctx, "manual");
  const first = addManualConversationOption({ session: ctx.aggregate(), workspace: ctx.workspace, run: ctx.run, content: "ABCD" });
  put(ctx, first);
  const second = addManualConversationOption({ session: ctx.aggregate(), workspace: ctx.workspace, run: ctx.run, content: "WXYZ" });
  const repeated = addManualConversationOption({ session: ctx.aggregate(), workspace: ctx.workspace, run: ctx.run, content: "WXYZ" });
  assert.notEqual(first.id, second.id);
  assert.equal(second.id, repeated.id);
  assert.equal(first.conversationRunRef, exactRef(ctx.run));
});

check("manual option from run 1 is invalidated and is not active in run 2", () => {
  const ctx = context(5);
  prepare(ctx, "manual");
  const run1 = ctx.run;
  const option = addManualConversationOption({ session: ctx.aggregate(), workspace: ctx.workspace, run: run1, content: "Opcja runu 1." });
  put(ctx, option);
  const second = prepare(ctx, "manual");
  const invalidated = second.invalidationTransitions.find(item => item.previous.id === option.id);
  assert.equal(invalidated.current.status, "invalidated");
  assert.equal(conversationRecordsForRun({ session: ctx.aggregate(), run: ctx.run }).length, 0);
});

check("new run invalidates dependent decision and follow-up while preserving history", () => {
  const ctx = context(2);
  prepare(ctx, "manual");
  const saved = decision(ctx);
  applyTransition(ctx, saved);
  const followup = makeFollowupDraft({ session: ctx.aggregate(), decision: saved.current, content: "Niewysłany szkic." });
  put(ctx, followup);
  const second = prepare(ctx, "manual");
  const roles = new Map(second.dependentTransitions.map(item => [item.previous.operationalRole, item.current]));
  assert.equal(roles.get("pwd_outcome").status, "invalidated");
  assert.equal(roles.get("unsent_followup_draft").status, "invalidated");
  assert.deepEqual(roles.get("unsent_followup_draft").derivedFrom, [exactRef(saved.current)]);
});

check("all four decisions remain equal, explicit and unselected", () => {
  assert.deepEqual(DECISIONS, ["START", "START_CONDITIONAL", "DEFER_CONSULT", "NOT_THIS_PRODUCT"]);
  for (const value of DECISIONS) {
    const ctx = context();
    prepare(ctx, "manual");
    const conditions = value === "START_CONDITIONAL" ? [{ statement: "Warunek Damiana", verification: "Jawna weryfikacja" }] : [];
    const saved = decision(ctx, { value, rationale: `Uzasadnienie ${value}`, conditions });
    assert.equal(saved.current.value, value);
    assert.equal(saved.current.conversationRunRef, exactRef(ctx.run));
  }
  assert.doesNotMatch(html, /name="pwd-decision"[^>]+checked/i);
});

check("START_CONDITIONAL accepts only complete Damian-authored conditions", () => {
  const ctx = context(1);
  prepare(ctx, "manual");
  assert.throws(() => decision(ctx, { value: "START_CONDITIONAL", conditions: [] }), /complete/);
  const saved = decision(ctx, { value: "START_CONDITIONAL", conditions: [{ statement: "x", verification: "y" }] });
  assert.equal(saved.current.conditions[0].author, "damian");
  assert.equal(Object.isFrozen(saved.current.conditions[0]), true);
});

check("decision v1 and v2 preserve content and an existing follow-up stays on v1", () => {
  const ctx = context(2);
  prepare(ctx, "manual");
  const first = decision(ctx, { rationale: "Decyzja v1." });
  applyTransition(ctx, first);
  const followup = makeFollowupDraft({ session: ctx.aggregate(), decision: first.current, content: "Szkic z v1." });
  put(ctx, followup);
  const second = decision(ctx, { value: "NOT_THIS_PRODUCT", rationale: "Decyzja v2.", previous: first.current });
  assert.equal(second.previous.rationale, "Decyzja v1.");
  assert.equal(second.current.rationale, "Decyzja v2.");
  assert.deepEqual(followup.derivedFrom, [exactRef(first.current)]);
  assert.notEqual(followup.derivedFrom[0], exactRef(second.current));
});

check("decision derives vN+1 from the aggregate when previous is omitted", () => {
  const ctx = context(2);
  prepare(ctx, "manual");
  const first = decision(ctx, { rationale: "Decyzja v1." });
  applyTransition(ctx, first);
  const second = decision(ctx, { value: "NOT_THIS_PRODUCT", rationale: "Decyzja v2." });
  applyTransition(ctx, second);
  assert.equal(second.current.version, 2);
  assert.equal(second.current.supersedes, exactRef(first.current));
  assert.equal(ctx.records.find(item => exactRef(item) === exactRef(first.current)).rationale, "Decyzja v1.");
  assert.equal(ctx.records.find(item => exactRef(item) === exactRef(second.current)).rationale, "Decyzja v2.");
  assert.throws(() => decision(ctx, {
    value: "DEFER_CONSULT", rationale: "Nie zapisuj.", previous: exactRef(first.current)
  }), /does not match the exact current canonical lineage tip/);
});

check("follow-up remains trainer-only unpublished and technically unsendable", () => {
  const ctx = context(2);
  prepare(ctx, "manual");
  const saved = decision(ctx);
  applyTransition(ctx, saved);
  const followup = makeFollowupDraft({ session: ctx.aggregate(), decision: saved.current, content: "Niewysłany szkic." });
  assert.equal(followup.visibility, "trainer_only");
  assert.equal(followup.publicationState, "unpublished");
  assert.equal(followup.sendCapability, "none");
});

check("Tanita facts require exact active comparability and no-Tanita path remains valid", () => {
  const ctx = context();
  prepare(ctx, "manual");
  assert.throws(() => decision(ctx, { evidence: [ctx.handoff, ctx.tanitaPackage.facts[0]] }), /Tanita facts require/);
  const comparison = assessComparability({ session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: ctx.tanitaPackage, value: "comparable", rationale: "Dokładny pakiet." });
  applyTransition(ctx, comparison);
  assert.doesNotThrow(() => decision(ctx, { evidence: [ctx.handoff, ctx.tanitaPackage.facts[0], comparison.current] }));
  const noTanita = context(2);
  prepare(noTanita, "manual");
  assert.doesNotThrow(() => decision(noTanita));
});

check("preserved original handoff v1 is rejected after transition to v2", () => {
check("Tanita fact cannot reach a decision indirectly without exact comparability", () => {
  const ctx = context();
  const interpretation = saveTrainerInterpretation({
    session: ctx.aggregate(), workspace: ctx.workspace, evidence: [ctx.tanitaPackage.facts[0]],
    content: "Interpretacja fikcyjnego faktu Tanita.", uncertainty: "Porównywalność nieustalona."
  });
  applyTransition(ctx, interpretation);
  prepare(ctx, "manual", [ctx.handoff]);
  assert.throws(() => decision(ctx, { evidence: [interpretation.current] }), /Tanita facts require/);
  const comparison = assessComparability({
    session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: ctx.tanitaPackage,
    value: "unknown", rationale: "Jawna porównywalność dokładnego pakietu."
  });
  applyTransition(ctx, comparison);
  assert.doesNotThrow(() => decision(ctx, { evidence: [interpretation.current, comparison.current] }));
});

  const ctx = context(8);
  const { originalHandoff } = applyMaterialChange(ctx);
  assert.throws(() => createWorkspace({
    fixture: ctx.fixture, handoff: originalHandoff, previousWorkspace: ctx.workspace, session: ctx.aggregate()
  }), /conflicts with canonical|active canonical lineage tip/);
});

check("handoff v2 without exact invalidated predecessor is rejected", () => {
  const ctx = context(8);
  applyMaterialChange(ctx);
  assert.equal(ctx.handoff.version, 2);
  assert.throws(() => createWorkspace({ fixture: ctx.fixture, handoff: ctx.handoff, session: ctx.aggregate() }), /requires the exact invalidated predecessor/);
});

check("workspace rebuilt from handoff v2 records exact predecessor and supersedes", () => {
  const ctx = context(8);
  applyMaterialChange(ctx);
  const invalidated = ctx.workspace;
  const next = createWorkspace({
    fixture: ctx.fixture, handoff: ctx.handoff, previousWorkspace: invalidated, session: ctx.aggregate()
  });
  assert.equal(next.currentHandoffRef, exactRef(ctx.handoff));
  assert.equal(next.supersedes, exactRef(invalidated));
});

check("Tanita package v1 is rejected in workspace based on handoff v2", () => {
  const ctx = context(8);
  const oldPackage = ctx.tanitaPackage;
  if (!oldPackage) return;
  applyMaterialChange(ctx);
  const rebuilt = createWorkspace({ fixture: ctx.fixture, handoff: ctx.handoff, previousWorkspace: ctx.workspace, session: ctx.aggregate() });
  put(ctx, rebuilt);
  ctx.workspace = rebuilt;
  assert.throws(() => assessComparability({
    session: ctx.aggregate(), workspace: ctx.workspace, tanitaPackage: oldPackage,
    value: "unknown", rationale: "Nie używaj."
  }), /canonical lineage tip|exact current handoff and workspace/);
});

check("changing interpretation invalidates dependent run, decision and follow-up transitively", () => {
  const ctx = context(2);
  const first = saveTrainerInterpretation({ session: ctx.aggregate(), workspace: ctx.workspace, evidence: [ctx.handoff], content: "v1", uncertainty: "u1" });
  applyTransition(ctx, first);
  prepare(ctx, "manual", [ctx.handoff, first.current]);
  const saved = decision(ctx, { evidence: [ctx.handoff, first.current] });
  applyTransition(ctx, saved);
  const followup = makeFollowupDraft({ session: ctx.aggregate(), decision: saved.current, content: "Szkic." });
  put(ctx, followup);
  const second = saveTrainerInterpretation({ session: ctx.aggregate(), workspace: ctx.workspace, evidence: [ctx.handoff], content: "v2", uncertainty: "u2", previous: first.current });
  const transitions = invalidateDependentRecords({ session: ctx.aggregate(), changedRecords: [first.current], invalidatedBy: exactRef(second.current) });
  assert.ok(["conversation_preparation_run", "pwd_outcome", "unsent_followup_draft"].every(role => transitions.some(item => item.previous.operationalRole === role)));
});

check("cross-case references fail closed before mutation", () => {
  const first = context(0); const second = context(1);
  assert.throws(() => assertCaseIsolation(first.fixture.id, [second.handoff]), /Cross-case/);
  assert.throws(() => recordObservation({
    session: first.aggregate(), workspace: first.workspace, handoff: second.handoff,
    candidateId: second.handoff.candidates[0].id, executionState: "performed",
    observationText: "Nie zapisuj", clientReaction: ""
  }), /Exact reference|Cross-case/);
});

check("prompt-injection-like source remains inert text", () => {
  const ctx = context(6);
  assert.match(ctx.handoff.sourceStatement, /Zignoruj zasady/);
  assert.doesNotMatch(runtime, /\beval\s*\(|new Function\s*\(/);
});

check("all fixtures remain pseudonymous fictional and identity-free", () => {
  assert.equal(fixtures.length, 9);
  for (const [index, fixture] of fixtures.entries()) {
    assert.equal(fixture.id, `fictional-${String(index + 1).padStart(2, "0")}`);
    assert.doesNotMatch(JSON.stringify(fixture), /@[a-z0-9]|\+48|telefon|e-mail|nazwisko/i);
    if (fixture.tanita) assert.equal(fixture.tanita.fictional, true);
  }
});

check("UI exposes explicit source review, four decisions and no generated conditions", () => {
  for (const value of DECISIONS) assert.match(html, new RegExp(`value=["']${value}["']`));
  assert.match(app, /reviewSourceFact/);
  assert.match(app, /Approve exact source_fact/);
  assert.doesNotMatch(fixtureSource, /conditionStatement|conditionVerification|expectedDecision/);
});

check("runtime remains offline session-only and detached from production", () => {
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(runtime, /https?:\/\//i);
  assert.doesNotMatch(runtime, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|serviceWorker\.register/i);
  assert.doesNotMatch(runtime, /createClient\s*\(|supabaseUrl|formspree|mailto:|sms:|type="file"|<form\b/i);
});

check("no send publication price payment or booking control exists", () => {
  assert.doesNotMatch(html, />(Wyślij|Opublikuj|Zapłać|Kup|Zarezerwuj)</i);
  assert.doesNotMatch(app, /window\.location|location\.assign|\.submit\s*\(/i);
});

check("keyboard focus and exact 360 px contracts remain", () => {
  assert.match(css, /:focus-visible\s*\{/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*480px\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(html, /<h2[^>]+tabindex="-1"/);
  assert.match(app, /focus\(\{ preventScroll: true \}\)/);
});

check("Registry keeps the general PRD rule and only the narrow PRD 004 exception", () => {
  const registry = readFileSync(join(here, "..", "docs", "governance", "00_SOURCE_OF_TRUTH_REGISTRY.md"), "utf8");
  assert.match(registry, /PRD may not begin until the following are resolved/);
  assert.match(registry, /Narrow Stage 4A fictional prototype exception/);
  assert.match(registry, /does not extend to a real runtime, later PRDs/);
});

for (const name of passes) console.log(`PASS — ${name}`);
console.log(`Stage 4A PWD decision conversation contract: ${passes.length}/${passes.length} PASS`);
