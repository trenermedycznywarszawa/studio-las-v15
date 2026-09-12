import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const gate = read("supabase/migrations/20260912064722_questionnaire_v31_health_consent_gate.sql");
const ordering = read("supabase/migrations/20260912064810_questionnaire_v31_consent_event_ordering.sql");
const performance = read("supabase/migrations/20260912064949_questionnaire_v31_consent_performance_hardening.sql");

assert.match(gate, /create table if not exists public\.questionnaire_privacy_events/i);
assert.match(gate, /health_data_consent_granted/);
assert.match(gate, /health_data_consent_withdrawn/);
assert.match(gate, /questionnaire_privacy_events_assignment_identity_fk/i);
assert.match(gate, /alter table public\.questionnaire_privacy_events enable row level security/i);
assert.match(gate, /revoke all on public\.questionnaire_privacy_events from anon, authenticated/i);
assert.match(gate, /questionnaire_privacy_events_client_select_own/i);
assert.doesNotMatch(gate, /grant\s+(?:insert|update|delete|all)\s+on\s+public\.questionnaire_privacy_events\s+to\s+authenticated/i);
assert.match(gate, /questionnaire privacy events are immutable/i);
assert.match(gate, /record_questionnaire_health_consent/i);
assert.match(gate, /withdraw_questionnaire_health_consent/i);
assert.match(gate, /client authentication required/i);
assert.match(gate, /private\.client_can_access_client\(qa\.client_id\)/i);
assert.match(gate, /requiresHealthConsentReceipt/i);
assert.match(gate, /active health-data consent receipt required before questionnaire response persistence/i);
assert.match(gate, /before insert or update of answers on public\.questionnaire_responses/i);
assert.match(gate, /grant execute on function public\.record_questionnaire_health_consent\(uuid,text,text\) to authenticated/i);
assert.match(gate, /grant execute on function public\.withdraw_questionnaire_health_consent\(uuid\) to authenticated/i);
assert.doesNotMatch(gate, /grant execute[\s\S]*to anon/i);

assert.match(ordering, /event_seq bigint generated always as identity/i);
assert.match(ordering, /order by qpe\.event_seq desc/i);
assert.match(ordering, /questionnaire_privacy_events_event_seq_uidx/i);
assert.doesNotMatch(ordering, /order by qpe\.occurred_at desc/i,
  "Consent authority must not depend on transaction-stable timestamps.");

assert.match(performance, /questionnaire_privacy_events_assignment_identity_idx/i);
assert.match(performance, /\(assignment_id, client_id, version_id\)/i);
assert.match(performance, /questionnaire_privacy_events_created_by_idx/i);
assert.match(performance, /\(created_by_profile_id\)/i);

console.log("Questionnaire v3.1 health-consent contract tests completed");
