import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPrePwdV31TrainerBrief } from "../assets/os/questionnaires/pre-pwd-v31-trainer-brief.js";
import { latestPrePwdV31Submission } from "../assets/os/ui/questionnaire-brief.js";

const migration = readFileSync(
  new URL("../supabase/migrations/20260912072120_questionnaire_trainer_submission_snapshot.sql", import.meta.url),
  "utf8"
);
const mapperSource = readFileSync(
  new URL("../assets/os/questionnaires/pre-pwd-v31-trainer-brief.js", import.meta.url),
  "utf8"
);

assert.match(migration, /trainer_questionnaire_submission_snapshot/i);
assert.match(migration, /security invoker/i);
assert.match(migration, /qa\.status = 'submitted'/i);
assert.match(migration, /qr\.submitted_at is not null/i);
assert.match(migration, /private\.is_trainer\(\)/i);
assert.match(migration, /private\.trainer_mfa_satisfied\(\)/i);
assert.match(migration, /private\.trainer_can_access_client\(qa\.client_id\)/i);
assert.match(migration, /revoke all on function public\.trainer_questionnaire_submission_snapshot\(uuid\) from public, anon, authenticated/i);
assert.match(migration, /grant execute on function public\.trainer_questionnaire_submission_snapshot\(uuid\) to authenticated/i);

const brief = buildPrePwdV31TrainerBrief({
  assignmentId: "assignment-1",
  clientId: "client-1",
  versionCode: "3.1",
  goalSnapshot: "Wrócić do biegania 5 km bez obawy.",
  submittedAt: "2026-09-12T07:00:00Z",
  answers: {
    q2_goal_current: "yes",
    q3_goal_ability: "4",
    q4_main_barriers: ["pain", "fear"],
    q13_pain: "yes_some_limitation",
    q13a_location: ["knee"],
    q13i_neurological_sensation: "no",
    q_pregnancy_applicability: "prefer_discuss"
  }
});

assert.equal(brief.title, "PRZED WIZYTĄ — 60 SEKUND");
assert(brief.items.some(item => item.id === "goal"));
assert(brief.items.some(item => item.id === "barriers"));
assert(brief.items.some(item => item.id === "pain"));
assert(brief.items.some(item => item.id === "clarify"));

const barrierValue = brief.items.find(item => item.id === "barriers").lines[0].value;
assert.match(barrierValue, /Ból lub inne dolegliwości/);
assert.match(barrierValue, /Obawa przed urazem lub pogorszeniem/);

const clarify = brief.items.find(item => item.id === "clarify");
assert.match(clarify.lines[0].value, /Wolę omówić to z trenerem/);
for (const item of brief.items) {
  for (const line of item.lines) {
    assert(line.sourceRef);
    assert(line.sourceType);
    assert.equal(line.sourceDate, "2026-09-12T07:00:00Z");
  }
}

const newest = latestPrePwdV31Submission([
  { assignmentId: "b", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T07:00:00Z", answers: { q2_goal_current: "yes" } },
  { assignmentId: "z", rendererKey: "other", submittedAt: "2026-09-12T10:00:00Z", answers: { q2_goal_current: "yes" } },
  { assignmentId: "c", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T09:00:00Z", answers: { q2_goal_current: "yes" } },
  { assignmentId: "a", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T08:00:00Z", answers: { q2_goal_current: "yes" } }
]);
assert.equal(newest?.assignmentId, "c", "Trainer brief must choose the latest submitted pre-PWD independently of input order");

const tied = latestPrePwdV31Submission([
  { assignmentId: "a", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T09:00:00Z", answers: { q2_goal_current: "yes" } },
  { assignmentId: "b", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T09:00:00Z", answers: { q2_goal_current: "yes" } }
]);
assert.equal(tied?.assignmentId, "b", "Equal timestamps must have a deterministic assignment-id tie breaker");

assert.match(brief.guardrail, /Znaczenie nadaje trener/);
assert.doesNotMatch(mapperSource, /GREEN|YELLOW|RED|score|risk_score|diagnos/i,
  "Trainer brief must not become a scoring or diagnostic engine.");
assert.doesNotMatch(mapperSource, /home_plan|publish|guidance/i,
  "Trainer brief must not modify Guidance/Home Plan.");

console.log("pre-PWD v3.1 deterministic trainer brief contract PASS");
