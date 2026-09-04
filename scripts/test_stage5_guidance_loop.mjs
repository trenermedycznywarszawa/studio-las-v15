import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures, fixtureById } from "../prototypes/stage-5-guidance-loop/fixtures.js";
import {
  CHANNELS, EXECUTION_RESPONSES, GuidanceLoop, INFORMATION_TYPES, TRAINER_DECISIONS,
  createEntryLedger, exactRef, makeEntryDecision
} from "../prototypes/stage-5-guidance-loop/workflow-state.js";

const here = dirname(fileURLToPath(import.meta.url));
const prototypeDir = join(here, "..", "prototypes", "stage-5-guidance-loop");
const read = name => readFileSync(join(prototypeDir, name), "utf8");
const passes = [];
const check = (name, assertion) => { assertion(); passes.push(name); };

const ledger = (caseId, options = {}) => createEntryLedger({
  caseId,
  decisions: [makeEntryDecision({ caseId, ...options })]
});

function setup(id = "app-primary", options = {}) {
  const fixture = fixtureById(id);
  const loop = new GuidanceLoop({ caseId: fixture.id });
  const entry = makeEntryDecision({ caseId: fixture.id, value: options.entryValue ?? fixture.entryValue ?? "START" });
  loop.start(createEntryLedger({ caseId: fixture.id, decisions: [entry] }));
  const focus = loop.setFocus(fixture.focus);
  const draft = loop.draftRelease({
    items: fixture.items,
    channel: fixture.channel,
    authoritativeChannel: fixture.authoritativeChannel,
    secondaryRole: fixture.secondaryRole,
    reviewAt: fixture.reviewAt,
    validUntil: fixture.validUntil,
    responseRequest: fixture.responseRequest
  });
  const ready = loop.approveAndPublish(draft);
  const release = loop.activate(ready);
  return { fixture, loop, entry, focus, release };
}

function successor(ctx, { channel = ctx.fixture.channel, map = { "walk-reset": "replace" }, items = [{
  key: "walk-reset",
  instruction: "Wybierz krótszy spokojny spacer w znanym otoczeniu.",
  purpose: "Uprościć aktualny kierunek po jawnej decyzji Damiana.",
  dose: "5 minut, raz przed następnym spotkaniem.",
  stopCriteria: "Przerwij lub skróć przy niepokojącej reakcji albo jeśli chcesz zakończyć."
}], paperRetirement = null } = {}) {
  const draft = ctx.loop.draftRelease({
    items,
    channel,
    authoritativeChannel: channel === "deliberate_hybrid" ? "app" : undefined,
    secondaryRole: channel === "deliberate_hybrid" ? "Papier wskazuje tylko, że aktualna instrukcja jest w aplikacji." : undefined,
    reviewAt: "2026-09-07T09:00:00.000Z",
    validUntil: "2026-09-14T09:00:00.000Z",
    responseRequest: ctx.fixture.responseRequest,
    predecessorRef: exactRef(ctx.release),
    predecessorMap: map
  });
  const ready = ctx.loop.approveAndPublish(draft);
  const release = ctx.loop.activate(ready, { paperRetirement });
  return { draft, ready, release };
}

check("closed information vocabulary remains unchanged", () => {
  assert.deepEqual(INFORMATION_TYPES, [
    "source_artifact", "source_fact", "extracted_fact", "trainer_observation",
    "ai_hypothesis", "ai_suggestion", "trainer_interpretation", "trainer_decision", "client_material"
  ]);
});

check("closed channel, response and trainer-decision vocabularies are explicit", () => {
  assert.deepEqual(CHANNELS, ["paper", "app", "deliberate_hybrid"]);
  assert.deepEqual(EXECUTION_RESPONSES, ["done_as_planned", "changed_or_partial", "stopped", "not_done"]);
  assert.equal(TRAINER_DECISIONS.includes("continue"), true);
  assert.equal(TRAINER_DECISIONS.includes("automatic_progress"), false);
});

check("all eighteen required fictional cases exist once", () => {
  assert.equal(fixtures.length, 18);
  assert.equal(new Set(fixtures.map(item => item.id)).size, 18);
});

check("eligible exact current same-client Damian START opens Stage 5", () => {
  const loop = new GuidanceLoop({ caseId: "entry-pass" });
  const cycle = loop.start(ledger("entry-pass"));
  assert.equal(cycle.entryDecisionRef, "entry-pass-stage4-decision@v1");
});

check("every ineligible Stage 4 decision fails closed", () => {
  for (const value of ["START_CONDITIONAL", "DEFER_CONSULT", "NOT_THIS_PRODUCT"]) {
    const loop = new GuidanceLoop({ caseId: `entry-${value}` });
    assert.throws(() => loop.start(ledger(`entry-${value}`, { value })), /requires exact current/i);
  }
  for (const variant of [
    { status: "superseded" }, { current: false }, { author: "system" }
  ]) {
    const loop = new GuidanceLoop({ caseId: `entry-${JSON.stringify(variant)}` });
    assert.throws(() => loop.start(ledger(loop.caseId, variant)), /exact current|requires exact current/i);
  }
});

check("payment, time or UI state cannot substitute for START", () => {
  const loop = new GuidanceLoop({ caseId: "entry-missing" });
  assert.throws(() => loop.start({ caseId: loop.caseId, paid: true, week: 1, currentScreen: "stage5" }), /canonical same-client/i);
});

check("caller flags and stale exact versions cannot forge canonical entry", () => {
  const caseId = "entry-lineage";
  const v1 = makeEntryDecision({ caseId, status: "superseded", current: false });
  const v2 = makeEntryDecision({ caseId, version: 2, supersedes: exactRef(v1) });
  const canonical = createEntryLedger({ caseId, decisions: [v1, v2] });
  const loop = new GuidanceLoop({ caseId });
  assert.throws(() => loop.start(canonical, exactRef(v1)), /exact current/i);
  assert.throws(() => loop.start({ kind: "stage4_decision_ledger", caseId, currentRef: exactRef(v2), byRef: { [exactRef(v2)]: v2 } }), /canonical same-client/i);
  assert.equal(loop.start(canonical, exactRef(v2)).entryDecisionRef, exactRef(v2));
});

check("exact current focus is singular and material change needs predecessor", () => {
  const ctx = setup();
  assert.equal(ctx.loop.currentFocusRef, exactRef(ctx.focus));
  assert.throws(() => ctx.loop.setFocus("Inny cel"), /previous focus required/i);
  const next = ctx.loop.setFocus("Spokojne zwiększenie samodzielności.", exactRef(ctx.focus));
  assert.equal(next.version, 2);
  assert.equal(ctx.loop.resolve(exactRef(ctx.focus)).status, "superseded");
});

check("minimum-effective guidance rejects missing dose, purpose and stop criteria", () => {
  const loop = new GuidanceLoop({ caseId: "minimum" });
  loop.start(ledger("minimum"));
  loop.setFocus("Jeden cel");
  const base = { key: "x", instruction: "Zrób spokojny krok.", purpose: "Sprawdź reakcję.", dose: "Raz.", stopCriteria: "Przerwij na prośbę." };
  for (const field of ["instruction", "purpose", "dose", "stopCriteria"]) {
    assert.throws(() => loop.draftRelease({ items: [{ ...base, [field]: "" }], channel: "app", reviewAt: "2026-08-31T09:00:00Z" }), /required/i);
  }
});

check("a requested signal must name the decision it may change", () => {
  const loop = new GuidanceLoop({ caseId: "signal" });
  loop.start(ledger("signal"));
  loop.setFocus("Jeden cel");
  assert.throws(() => loop.draftRelease({
    items: fixtureById("app-primary").items, channel: "app", reviewAt: "2026-08-31T09:00:00Z",
    responseRequest: { prompt: "Jak poszło?" }
  }), /decision impact/i);
});

check("no-signal-required remains a complete active release", () => {
  const ctx = setup("no-signal-required");
  assert.equal(ctx.release.responseRequest, null);
  assert.equal(ctx.loop.clientProjection().items.length, 1);
});

check("hybrid requires one authority and one bounded secondary role", () => {
  const fixture = fixtureById("deliberate-hybrid");
  const loop = new GuidanceLoop({ caseId: fixture.id });
  loop.start(ledger(fixture.id));
  loop.setFocus(fixture.focus);
  assert.throws(() => loop.draftRelease({ items: fixture.items, channel: "deliberate_hybrid", reviewAt: fixture.reviewAt }), /authoritative channel/i);
  assert.throws(() => loop.draftRelease({ items: fixture.items, channel: "deliberate_hybrid", authoritativeChannel: "paper", reviewAt: fixture.reviewAt }), /secondary role/i);
});

check("unapproved and unpublished release cannot activate", () => {
  const fixture = fixtureById("app-primary");
  const loop = new GuidanceLoop({ caseId: fixture.id });
  loop.start(ledger(fixture.id));
  loop.setFocus(fixture.focus);
  const draft = loop.draftRelease({ ...fixture });
  assert.throws(() => loop.activate(draft), /approved and published/i);
});

check("app-primary exposes one exact current approved release", () => {
  const ctx = setup("app-primary");
  const projection = ctx.loop.clientProjection();
  assert.equal(projection.currentReleaseRef, exactRef(ctx.release));
  assert.equal(projection.authoritativeChannel, "app");
  assert.equal(projection.priorReleasesExposed, false);
  assert.equal(projection.trainerOnlyRecordsExposed, false);
});

check("ordinary completion and silence create no review queue", () => {
  const ctx = setup();
  const interaction = ctx.loop.recordClientInteraction({ releaseRef: exactRef(ctx.release), itemKey: "walk-reset", executionResponse: "done_as_planned" });
  assert.equal(interaction.reviewState, "needs_review");
  assert.deepEqual(ctx.loop.reviewEvents(), []);
});

check("stopped response and contextual question remain separate non-judgmental axes", () => {
  const ctx = setup("stopped-or-uncertain");
  const interaction = ctx.loop.recordClientInteraction({ releaseRef: exactRef(ctx.release), itemKey: "walk-reset", ...ctx.fixture.interaction });
  assert.equal(interaction.executionResponse, "stopped");
  assert.ok(interaction.question);
  assert.equal(interaction.questionState, "unresolved");
  assert.equal(interaction.guidanceItemRef, exactRef(ctx.release.items[0]));
  assert.equal(interaction.responseRequestRef, exactRef(ctx.release.responseRequest));
  assert.equal(ctx.loop.reviewEvents()[0].kind, "question");
  const reviewed = ctx.loop.reviewInteraction(exactRef(interaction), { resolution: "unresolved" });
  assert.equal(reviewed.reviewState, "approved");
  assert.equal(reviewed.questionState, "unresolved");
});

check("responses reject when no response was requested", () => {
  const ctx = setup("no-signal-required");
  assert.throws(() => ctx.loop.recordClientInteraction({ releaseRef: exactRef(ctx.release), itemKey: "walk-reset", executionResponse: "done_as_planned" }), /not requested/i);
  assert.doesNotThrow(() => ctx.loop.recordClientInteraction({ releaseRef: exactRef(ctx.release), itemKey: "walk-reset", question: "Czy możemy omówić kontekst?" }));
});

check("adaptation requires explicit Damian decision and rationale", () => {
  const ctx = setup();
  assert.throws(() => ctx.loop.decide({ value: undefined, rationale: "x" }), /explicit trainer decision/i);
  assert.throws(() => ctx.loop.decide({ value: "continue", rationale: "" }), /rationale required/i);
  const decision = ctx.loop.decide({ value: "continue", rationale: "Nic materialnego się nie zmieniło.", evidenceRefs: [exactRef(ctx.release)] });
  assert.equal(decision.author, "damian");
});

check("partial revision rejects an incomplete predecessor map", () => {
  const ctx = setup("partial-release-revision");
  assert.throws(() => ctx.loop.draftRelease({
    items: ctx.fixture.items,
    channel: "app",
    reviewAt: "2026-09-07T09:00:00Z",
    predecessorRef: exactRef(ctx.release),
    predecessorMap: { "walk-reset": "retain" }
  }), /every predecessor item/i);
});

check("app successor activates atomically and retires v1", () => {
  const ctx = setup("version-change");
  const next = successor(ctx).release;
  assert.equal(next.version, 2);
  assert.equal(ctx.loop.currentReleaseRef, exactRef(next));
  assert.equal(ctx.loop.resolve(exactRef(ctx.release)).status, "withdrawn");
  assert.equal(ctx.loop.resolve(exactRef(ctx.release)).items[0].publicationState, "withdrawn");
  assert.equal(next.items[0].version, 2);
  assert.equal(next.items[0].supersedes, exactRef(ctx.release.items[0]));
  assert.equal(ctx.loop.clientProjection().currentReleaseRef, exactRef(next));
});

check("retained guidance reuses the same exact approved item without cloning", () => {
  const ctx = setup("app-primary");
  const originalItem = ctx.release.items[0];
  const next = successor(ctx, {
    map: { "walk-reset": "retain" },
    items: [originalItem]
  }).release;
  assert.equal(exactRef(next.items[0]), exactRef(originalItem));
  assert.equal(next.items[0].approvedAt, originalItem.approvedAt);
  assert.equal(ctx.loop.resolve(exactRef(ctx.release)).items[0].publicationState, "published");
});

check("retained guidance rejects materially changed content under the same identity", () => {
  const ctx = setup("app-primary");
  assert.throws(() => ctx.loop.draftRelease({
    items: [{ ...ctx.release.items[0], dose: "Inna dawka." }],
    channel: "app",
    reviewAt: "2026-09-07T09:00:00Z",
    predecessorRef: exactRef(ctx.release),
    predecessorMap: { "walk-reset": "retain" }
  }), /retained item.*same exact/i);
});

check("paper successor cannot activate before real retirement confirmation", () => {
  const ctx = setup("paper-retirement-failure");
  const draft = ctx.loop.draftRelease({
    items: ctx.fixture.items,
    channel: "paper",
    reviewAt: "2026-09-07T09:00:00Z",
    predecessorRef: exactRef(ctx.release),
    predecessorMap: { "walk-reset": "replace" }
  });
  const ready = ctx.loop.approveAndPublish(draft);
  assert.throws(() => ctx.loop.activate(ready, { paperRetirement: "unresolved_risk" }), /approved human contact path/i);
  assert.equal(ctx.loop.currentReleaseRef, null);
  assert.equal(ctx.loop.resolve(exactRef(ctx.release)).status, "non_actionable");
  assert.equal(ctx.loop.all("paper_retirement_issue")[0].status, "requires_human_contact");
  assert.equal(ctx.loop.all("paper_retirement_issue")[0].successorReleaseRef, exactRef(ready));
});

check("confirmed paper retirement permits one complete replacement", () => {
  const ctx = setup("paper-primary");
  const next = successor(ctx, { paperRetirement: "confirmed" }).release;
  assert.equal(next.status, "active");
  assert.equal(ctx.loop.resolve(exactRef(ctx.release)).publicationState, "withdrawn");
});

check("soft review due neither pauses nor progresses valid guidance", () => {
  const ctx = setup("week-4-adjustment");
  const events = ctx.loop.advanceTime("2026-08-31T09:00:01.000Z");
  assert.equal(events.some(event => event.kind === "review_due"), true);
  assert.equal(ctx.loop.currentRelease().status, "active");
  assert.equal(ctx.loop.all("adaptation_decision").length, 0);
});

check("hard validity expiry makes guidance non-actionable without inferring a decision", () => {
  const ctx = setup("focus-validity-boundary");
  const events = ctx.loop.advanceTime("2026-09-07T09:00:01.000Z");
  assert.equal(events.some(event => event.kind === "hard_expired"), true);
  assert.throws(() => ctx.loop.currentRelease(), /hard validity expired/i);
  assert.equal(ctx.loop.all("adaptation_decision").length, 0);
});

check("week 8 channel change remains an explicit Damian decision", () => {
  const ctx = setup("week-8-independence");
  assert.equal(ctx.release.authoritativeChannel, "app");
  const decision = ctx.loop.decide({ value: "change_channel", rationale: "Damian wybiera mniej ekranów po rozmowie.", evidenceRefs: [exactRef(ctx.release)] });
  assert.equal(decision.value, "change_channel");
});

check("week 12 selects exact evidence without generating a report", () => {
  const ctx = setup("week-12-handoff");
  const selection = ctx.loop.selectReportEvidence([exactRef(ctx.release)], "Późniejsza rozmowa kończąca proces.");
  assert.equal(selection.reportGenerated, false);
  assert.equal(selection.visibility, "trainer_only");
});

check("loss of bound START fails actionable guidance closed", () => {
  const ctx = setup("entry-invalidated-mid-cycle");
  ctx.loop.invalidateEntry("Stage 4 decision corrected.");
  assert.equal(ctx.loop.currentReleaseRef, null);
  assert.throws(() => ctx.loop.currentCycle(), /no longer eligible/i);
});

check("manual-no-portal path completes without a response, AI or integration", () => {
  const ctx = setup("manual-no-portal");
  const decision = ctx.loop.decide({ value: "continue", rationale: "Damian kończy ręczny przegląd.", evidenceRefs: [exactRef(ctx.release)] });
  assert.equal(decision.author, "damian");
  assert.equal(ctx.loop.snapshot().records.some(record => record.informationType === "ai_suggestion"), false);
});

check("late response remains bound to retired exact release", () => {
  const ctx = setup("late-response");
  const oldRef = exactRef(ctx.release);
  const next = successor(ctx).release;
  const late = ctx.loop.recordClientInteraction({ releaseRef: oldRef, itemKey: "walk-reset", executionResponse: "changed_or_partial" });
  assert.equal(late.releaseRef, oldRef);
  assert.notEqual(late.releaseRef, exactRef(next));
});

check("wrong-client references reject before mutation", () => {
  const ctx = setup("wrong-client-reference");
  const foreign = makeEntryDecision({ caseId: "foreign-client" });
  const before = ctx.loop.snapshot().records.length;
  assert.throws(() => ctx.loop.add(foreign, "forbidden"), /wrong-client/i);
  assert.equal(ctx.loop.snapshot().records.length, before);
  assert.throws(() => ctx.loop.decide({ value: "continue", rationale: "x", evidenceRefs: [exactRef(foreign)] }), /not canonical/i);
});

check("audit records contain actor, time, scope, exact refs, outcome and correlation", () => {
  const ctx = setup();
  assert.ok(ctx.loop.snapshot().audit.every(event =>
    event.actorId && event.actorType && event.eventTime && event.caseId && event.sourceChannel && event.authority &&
    event.primaryRef && event.outcome && event.correlationId
  ));
});

const html = read("index.html");
const css = read("styles.css");
const app = read("app.js");
const model = read("workflow-state.js");
const fixtureSource = read("fixtures.js");
const runtime = [html, css, app, model, fixtureSource].join("\n");
check("cold start initializes the visible default scenario without interaction", () => {
  const defaultFixture = fixtures[0];
  assert.equal(defaultFixture.id, "app-primary");
  assert.match(app, /scenario\.innerHTML\s*=\s*fixtures\.map[\s\S]*?startScenario\(\{ announce: false \}\);/);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const fresh = setup(defaultFixture.id);
    assert.equal(fresh.fixture.id, defaultFixture.id);
    assert.equal(fresh.loop.clientProjection().currentReleaseRef, exactRef(fresh.release));
    assert.equal(fresh.release.status, "active");
  }
});

check("prototype is deterministic, offline and persistence-free", () => {
  assert.doesNotMatch(runtime, /fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker/i);
  assert.doesNotMatch(runtime, /supabase|createClient\s*\(|auth\.|mfa|rls|edge function/i);
});

check("prototype contains no AI execution or automatic trainer decision", () => {
  assert.doesNotMatch(runtime, /openai|anthropic|gemini|prompt\s*=|auto(?:matic)?(?:Decision|Progress|Recommend)/i);
  assert.match(html, /Damian podejmuje decyzję/i);
});

check("prototype carries explicit fictional-data and non-emergency boundaries", () => {
  assert.match(html, /wyłącznie dane fikcyjne/i);
  assert.match(runtime, /pilnej sytuacji.+pomocy poza Studio Las/is);
});

check("prototype exposes semantic landmarks, live status and no decision default", () => {
  assert.match(html, /<main/);
  assert.match(html, /<fieldset/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /name="trainer-decision"[^>]*checked/i);
});

check("responsive CSS protects 360px flow, focus visibility and 44px targets", () => {
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.doesNotMatch(css, /min-width:\s*[4-9][0-9]{2}px/);
});

console.log(`STAGE5_GUIDANCE_LOOP_SUCCESS ${passes.length}/${passes.length} PASS`);
for (const pass of passes) console.log(`PASS ${pass}`);
