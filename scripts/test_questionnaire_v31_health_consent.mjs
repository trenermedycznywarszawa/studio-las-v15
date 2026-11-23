import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const gate = read("supabase/migrations/20260912064722_questionnaire_v31_health_consent_gate.sql");
const ordering = read("supabase/migrations/20260912064810_questionnaire_v31_consent_event_ordering.sql");
const performance = read("supabase/migrations/20260912064949_questionnaire_v31_consent_performance_hardening.sql");
const v33 = read("supabase/migrations/20260914100000_questionnaire_v33_unified_health_consent.sql");
const questionnaireUi = read("assets/os/ui/client-questionnaires.js");
const renderer = read("assets/os/ui/pre-pwd-v31-form.js");

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

const approvedConsentText = "Wyrażam zgodę na przetwarzanie przez Studio Las danych dotyczących mojego zdrowia, które podaję w tej ankiecie, w celu przygotowania i prowadzenia indywidualnej współpracy treningowej z uwzględnieniem informacji istotnych dla doboru zakresu i obciążeń treningowych. Wiem, że dane są zapisywane podczas wypełniania ankiety, a trener zobaczy je dopiero, gdy wybiorę „Przekaż ankietę trenerowi”. Zgodę mogę w dowolnym momencie wycofać ze skutkiem na przyszłość.";
const unifiedConsentVersion = "pre-pwd-final-health-consent-2026-09-13-v1";

assert.match(v33, /version_code,\s*definition,\s*definition_sha256,\s*released_at,\s*retired_at/i);
assert.match(v33, /'3\.3'/);
assert.match(v33, /pre-PWD template must remain inactive while the qualified legal\/privacy gate is open/i);
assert.match(v33, /pre-PWD v3\.2 has assignments; explicit migration decision required before retirement/i);
assert.match(v33, /set retired_at = coalesce\(retired_at, clock_timestamp\(\)\)/i);
assert.match(v33, /'expectedConsentText', qv\.definition -> 'healthConsentContract' ->> 'consentText'/i);
assert.match(v33, /revoke all on function public\.client_questionnaire_response_snapshot\(uuid\) from public, anon/i);
assert.match(v33, /grant execute on function public\.client_questionnaire_response_snapshot\(uuid\) to authenticated/i);
assert.equal((v33.match(new RegExp(unifiedConsentVersion, "g")) || []).length >= 1, true,
  "v3.3 must bind the approved consent version into the release contract.");
assert.equal(v33.includes(approvedConsentText), true,
  "v3.3 must bind the exact owner-approved health-consent text.");

assert.doesNotMatch(questionnaireUi, /FINAL_HEALTH_CONSENT_TEXT/,
  "Client UI must not keep a competing hard-coded final health-consent source.");
assert.match(questionnaireUi, /questionnaire\.snapshot\?\.expectedConsentText/);
assert.match(questionnaireUi, /healthConsentText:\s*expectedConsentText \|\| undefined/);
assert.match(questionnaireUi, /healthConsentEnabled:\s*consentContractReady/);
assert.match(questionnaireUi, /disabled:[\s\S]*!consentContractReady/,
  "Submission must fail closed if the version-bound consent text is missing.");
assert.match(renderer, /create\("p", \{ text: consentText \}\)/,
  "The checkbox must display the version-bound consent text supplied by the response snapshot.");
assert.match(renderer, /healthConsentEnabled = true/);
assert.match(renderer, /disabled:\s*!enabled/);

console.log("Questionnaire v3.1/v3.3 health-consent contract tests completed");
