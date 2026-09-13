import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const foundation = read("supabase/migrations/20260911131346_questionnaire_v3_data_foundation.sql");
const hardening = read("supabase/migrations/20260911131500_questionnaire_v3_data_foundation_hardening.sql");
const submission = read("supabase/migrations/20260911131610_questionnaire_v3_submission_authority.sql");
const performance = read("supabase/migrations/20260911132115_questionnaire_v3_rls_performance_hardening.sql");

for (const table of [
  "questionnaire_templates",
  "questionnaire_versions",
  "questionnaire_assignments",
  "questionnaire_responses"
]) {
  assert.match(foundation, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
  assert.match(foundation, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  assert.match(foundation, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, "i"));
  assert.match(foundation, new RegExp(`grant select on public\\.${table} to authenticated`, "i"));
}

assert.doesNotMatch(foundation, /grant\s+(?:insert|update|delete|all)[\s\S]*questionnaire_/i,
  "Foundation must not enable questionnaire writes for authenticated users.");
assert.match(foundation, /goal_snapshot text/i);
assert.match(foundation, /revision integer not null default 0/i);
assert.match(foundation, /questionnaire_responses_trainer_select_submitted_only/i);
assert.match(foundation, /questionnaire_responses_client_select_own/i);
assert.match(foundation, /private\.trainer_mfa_satisfied\(\)/i);
assert.match(foundation, /private\.client_can_access_client\(client_id\)/i);

assert.match(hardening, /questionnaire_responses_assignment_identity_fk/i);
assert.match(hardening, /foreign key \(assignment_id, client_id, version_id\)/i);
assert.match(hardening, /questionnaire_versions_client_select_assigned/i);
assert.match(hardening, /questionnaire_templates_client_select_assigned/i);
assert.match(hardening, /questionnaire_versions_contract_immutable/i);
assert.match(hardening, /questionnaire_responses_history_guard/i);
assert.match(hardening, /submitted questionnaire response is immutable/i);
assert.match(hardening, /terminal questionnaire assignment state cannot be changed/i);
assert.doesNotMatch(hardening, /security definer/i,
  "Questionnaire integrity triggers do not need SECURITY DEFINER.");

assert.match(submission, /qa\.status = 'submitted'/i,
  "Trainer visibility must use conscious assignment submission as the authority.");
assert.match(submission, /questionnaire assignment cannot be submitted before its response is sealed/i);
assert.match(submission, /private\.trainer_mfa_satisfied\(\)/i);
assert.doesNotMatch(submission, /security definer/i);

for (const indexName of [
  "questionnaire_responses_assignment_identity_idx",
  "questionnaire_templates_created_by_idx",
  "questionnaire_versions_created_by_idx"
]) {
  assert.match(performance, new RegExp(`create index if not exists ${indexName}`, "i"));
}
for (const policyName of [
  "questionnaire_templates_select_related",
  "questionnaire_versions_select_related",
  "questionnaire_assignments_select_related",
  "questionnaire_responses_select_related"
]) {
  assert.match(performance, new RegExp(`create policy ${policyName}`, "i"));
}
assert.match(performance, /qa\.status = 'submitted'/i);
assert.match(performance, /private\.trainer_mfa_satisfied\(\)/i);
assert.match(performance, /private\.client_can_access_client\(client_id\)/i);
assert.doesNotMatch(performance, /security definer/i);

console.log("Questionnaire v3 data foundation contract tests completed");
