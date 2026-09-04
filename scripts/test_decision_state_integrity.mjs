import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { StudioLasRepository } from "../assets/os/data.js";
import {
  collectAttentionSignals,
  signalIdentity,
  signalInstanceKey,
  withoutReviewedSignals
} from "../assets/os/decision-support.js";
import {
  CYCLE_DECISION_OPTIONS,
  cycleDecisionLabel,
  latestCycleDecision,
  reportAudienceLabel,
  reportStatusLabel,
  signalReviewOutcomeLabel
} from "../assets/os/decision-state.js";
import { buildTrainerSessionBrief } from "../assets/os/session-brief.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migration = await read("supabase/migrations/20260904150825_decision_state_integrity_v1.sql");
const data = await read("assets/os/data.js");
const app = await read("assets/os/app.js");
const trainer = await read("assets/os/ui/trainer.js");
const trainerState = await read("assets/os/ui/trainer-state.js");
const trainerGuidance = await read("assets/os/ui/trainer-guidance.js");
const pwdSection = await read("assets/os/ui/pwd-section.js");
const clientUi = await read("assets/os/ui/client.js");
const styles = await read("assets/os/styles.css");

assert.deepEqual(CYCLE_DECISION_OPTIONS.map(option => option.label), [
  "Samodzielność", "Dalsze 1:1", "Kolejny cykl", "Model mieszany"
]);
assert.equal(cycleDecisionLabel("next_cycle"), "Kolejny cykl");
assert.equal(signalReviewOutcomeLabel("contact_required"), "Wymaga kontaktu");
assert.equal(reportAudienceLabel("trainer"), "Tylko trener");
assert.equal(reportStatusLabel("published"), "Opublikowany");
assert.equal(latestCycleDecision([
  { id: "old", decided_at: "2026-07-01T10:00:00Z" },
  { id: "new", decided_at: "2026-08-01T10:00:00Z" }
]).id, "new");

const dayOneKey = signalInstanceKey({ id: "low-readiness", source: "session", sourceDate: "2026-09-01" });
const dayTwoKey = signalInstanceKey({ id: "low-readiness", source: "session", sourceDate: "2026-09-02" });
assert.notEqual(dayOneKey, dayTwoKey, "a new source date must create a new signal instance");
assert.deepEqual(signalIdentity(dayOneKey), {
  id: "low-readiness", source: "session", sourceDate: "2026-09-01"
});

const firstSignals = collectAttentionSignals({
  session: { date: "2026-09-01", readiness: 2, vas_before: 1, vas_after: 4 }
});
assert.equal(firstSignals.signals.length, 2);
assert.ok(firstSignals.signals.every(signal => signal.signalKey && signal.sourceDate === "2026-09-01"));
const reviewedKey = firstSignals.signals[0].signalKey;
const filtered = withoutReviewedSignals(firstSignals, [{ signal_key: reviewedKey }]);
assert.equal(filtered.signals.length, 1, "reviewed instance must leave the open view");
assert.ok(!filtered.signals.some(signal => signal.signalKey === reviewedKey));

const laterSignals = collectAttentionSignals({ session: { date: "2026-09-02", readiness: 2 } });
const laterFiltered = withoutReviewedSignals(laterSignals, [{ signal_key: dayOneKey }]);
assert.equal(laterFiltered.signals.length, 1, "same signal type on a new date must reopen");
assert.equal(laterFiltered.signals[0].signalKey, dayTwoKey);

const briefWithSession = buildTrainerSessionBrief({
  client: { stage: 4, next_session_date: "2026-09-10", next_review_date: "2026-09-20" },
  sessions: [{ date: "2026-09-01", trainer_decision: "Utrzymać kierunek", client_next_step: "Powtórzyć ustalenie" }],
  cycleDecisions: []
});
assert.equal(briefWithSession.nextStep.label, "Przed następną sesją");
assert.equal(briefWithSession.nextStep.date, "2026-09-10");
assert.equal(briefWithSession.requiresCycleDecision, true);

const briefWithReview = buildTrainerSessionBrief({
  client: { stage: 3, next_review_date: "2026-09-20" }, sessions: [], cycleDecisions: []
});
assert.equal(briefWithReview.nextStep.label, "Do kolejnego przeglądu");
const briefWithoutDates = buildTrainerSessionBrief({ client: { stage: 3 }, sessions: [], cycleDecisions: [] });
assert.equal(briefWithoutDates.nextStep.label, "Aktualny kontekst");

for (const fragment of [
  "create table public.client_cycle_decisions",
  "create table public.trainer_signal_reviews",
  "alter table public.client_cycle_decisions force row level security",
  "alter table public.trainer_signal_reviews force row level security",
  "private.trainer_owns_client(client_id)",
  "actor_profile_id = private.current_profile_id()",
  "private.trainer_mfa_satisfied()",
  "grant select, insert on table public.client_cycle_decisions to authenticated",
  "grant select, insert on table public.trainer_signal_reviews to authenticated",
  "for each row execute function public.audit_sensitive_row_change()"
]) assert.ok(migration.includes(fragment), `missing migration contract: ${fragment}`);
assert.doesNotMatch(migration, /grant .* on table public\.(client_cycle_decisions|trainer_signal_reviews) to anon/i);
assert.doesNotMatch(migration, /grant (update|delete).*client_cycle_decisions/i);
assert.doesNotMatch(migration, /grant (update|delete).*trainer_signal_reviews/i);
assert.doesNotMatch(migration, /unique\s*\(client_id\).*client_cycle_decisions/i);

const requests = [];
const repository = new StudioLasRepository(
  { supabaseUrl: "https://synthetic.invalid" },
  { request: async (path, options) => { requests.push([path, options]); return [{}]; } }
);
await repository.saveCycleDecision("trainer-1", "client-1", {
  decision: "independent", rationale: "Cel procesu został osiągnięty."
});
await repository.saveSignalReview("trainer-1", "client-1", dayOneKey, "noted_no_change");
assert.equal(requests[0][0], "/rest/v1/client_cycle_decisions?select=*");
assert.equal(requests[0][1].body.actor_profile_id, "trainer-1");
assert.equal(requests[1][0], "/rest/v1/trainer_signal_reviews?select=*");
assert.equal(requests[1][1].body.signal_key, dayOneKey);

for (const fragment of ["cycleDecisions", "signalReviews", "saveCycleDecision", "saveSignalReview"]) {
  assert.ok(data.includes(fragment), `repository workspace missing ${fragment}`);
}
assert.match(app, /withoutReviewedSignals/);
assert.match(app, /onSaveCycleDecision/);
assert.match(app, /onReviewSignal/);
assert.match(trainerState, /panel\("Teraz"/);
assert.match(trainerState, /Wymaga decyzji co dalej/);
assert.match(trainerState, /openSignal = attentionSignals\?\.signals\?\.\[0\]/);
assert.match(trainerState, /Pokaż historię przejrzanych sygnałów/);
assert.match(trainerState, /Raport pokazuje wzorzec; nie tworzy decyzji automatycznie/);
assert.match(trainerState, /report\.type === "twelveWeeks"/);
assert.match(trainer, /Pokaż pełną historię sesji/);
assert.match(trainer, /previousSessions = sessions\.slice\(1\)/);
assert.match(pwdSection, /Dodaj korektę \/ nową iterację PWD/);
assert.match(pwdSection, /Poprzednia PWD pozostanie w historii/);
assert.match(pwdSection, /previousSessions = pwdSessions\.slice\(1\)/);
assert.match(trainerGuidance, /item\.home_plan_id === plan\.id/);
assert.match(trainerGuidance, /paperChannel && hasDraftSuccessor && !retirementConfirmed/);
assert.match(trainerGuidance, /drafts\.length\s*\? detailsForm\("Dodaj działanie do szkicu"/);
assert.doesNotMatch(trainerGuidance, /Damian podejmuje decyzję/);
assert.doesNotMatch(clientUi, /client_cycle_decisions|trainer_signal_reviews|rationale|signalReviews/);
assert.match(styles, /\.now-grid/);
assert.match(styles, /\.now-grid \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /html \{ max-width: 100%; overflow-x: hidden; \}/);

console.log("DECISION_STATE_INTEGRITY_SUCCESS persistence/domain/UI static contract PASS");
