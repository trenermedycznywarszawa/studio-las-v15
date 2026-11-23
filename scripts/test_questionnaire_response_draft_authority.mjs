import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../supabase/migrations/20260912071444_questionnaire_response_draft_authority.sql", import.meta.url),
  "utf8"
);

assert.match(source, /qv\.definition\s*->>\s*'releaseState'\s*=\s*'released'/i,
  "Assignment release must require an immutable released manifest, not released_at alone.");

assert.match(source, /create or replace function public\.client_questionnaire_response_snapshot/i);
assert.match(source, /security invoker/i);
assert.match(source, /private\.is_client\(\)/i);
assert.match(source, /private\.client_can_access_client\(qa\.client_id\)/i);
assert.match(source, /order by qpe\.event_seq desc/i,
  "Consent state must use deterministic event ordering.");
assert.match(source, /grant execute on function public\.client_questionnaire_response_snapshot\(uuid\) to authenticated/i);
assert.doesNotMatch(source, /grant execute on function public\.client_questionnaire_response_snapshot\(uuid\) to anon/i);

assert.match(source, /create or replace function public\.save_questionnaire_draft/i);
assert.match(source, /security definer/i);
assert.match(source, /client authentication required/i);
assert.match(source, /private\.client_can_access_client\(v_assignment\.client_id\)/i);
assert.match(source, /v_assignment\.status not in \('assigned','in_progress'\)/i);
assert.match(source, /jsonb_typeof\(p_answers\) <> 'object'/i);
assert.match(source, /octet_length\(p_answers::text\) > 131072/i);
assert.match(source, /private\.questionnaire_health_consent_active\(v_assignment\.id\)/i);
assert.match(source, /active health-data consent receipt required before questionnaire draft persistence/i);
assert.match(source, /for update/i,
  "Draft mutation must lock assignment/response rows before revision checks.");
assert.match(source, /v_response\.revision <> p_expected_revision/i);
assert.match(source, /'conflict', true/i);
assert.match(source, /set answers = p_answers,[\s\S]*revision = revision \+ 1/i);
assert.match(source, /submitted questionnaire response is immutable/i);
assert.match(source, /set status = 'in_progress',[\s\S]*started_at = coalesce\(started_at, now\(\)\)/i);
assert.match(source, /revoke all on function public\.save_questionnaire_draft\(uuid,jsonb,integer\) from public, anon, authenticated/i);
assert.match(source, /grant execute on function public\.save_questionnaire_draft\(uuid,jsonb,integer\) to authenticated/i);

assert.doesNotMatch(source, /grant\s+(?:insert|update|delete|all)\s+on\s+public\.questionnaire_responses\s+to\s+authenticated/i,
  "Questionnaire responses must stay behind controlled RPCs.");
assert.doesNotMatch(source, /create or replace function public\.submit_questionnaire_response/i,
  "Conscious submission must remain a separate next-stage authority, not be smuggled into autosave.");

console.log("Questionnaire response draft authority contract PASS");
