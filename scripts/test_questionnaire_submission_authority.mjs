import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../supabase/migrations/20260912071932_questionnaire_submission_authority.sql", import.meta.url),
  "utf8"
);

assert.match(source, /create or replace function public\.submit_questionnaire_response/i);
assert.match(source, /security definer/i);
assert.match(source, /client authentication required/i);
assert.match(source, /private\.client_can_access_client\(v_assignment\.client_id\)/i);
assert.match(source, /conscious questionnaire transfer confirmation required/i,
  "Submission must be a separate conscious client action.");
assert.match(source, /for update/i,
  "Submission must lock assignment/response rows before sealing.");
assert.match(source, /v_response\.revision <> p_expected_revision/i);
assert.match(source, /'conflict', true/i);
assert.match(source, /private\.questionnaire_health_consent_active\(v_assignment\.id\)/i);
assert.match(source, /active health-data consent receipt required before questionnaire submission/i);
assert.match(source, /v_definition -> 'submissionContract'/i);
assert.match(source, /validatorVersion',''\) <> 'required_keys_v1'/i,
  "Server submission must fail closed without an immutable validation contract.");
assert.match(source, /requiredAnswerIds/i);
assert.match(source, /requiredTrueAnswerIds/i);
assert.match(source, /'validationFailed', true/i);
assert.match(source, /set submitted_at = v_now,[\s\S]*revision = revision \+ 1/i);
assert.match(source, /set status = 'submitted',[\s\S]*submitted_at = v_now/i);
assert.match(source, /'alreadySubmitted', true/i,
  "Network retry after successful submission must be idempotent.");
assert.match(source, /revoke all on function public\.submit_questionnaire_response\(uuid,integer,boolean\) from public, anon, authenticated/i);
assert.match(source, /grant execute on function public\.submit_questionnaire_response\(uuid,integer,boolean\) to authenticated/i);
assert.doesNotMatch(source, /home_plan|home_plans|guidance/i,
  "Questionnaire submission must not create or modify Guidance/Home Plan.");

const registration = readFileSync(
  new URL("../supabase/migrations/20260912065115_questionnaire_v31_register_pre_pwd_candidate.sql", import.meta.url),
  "utf8"
);
assert.doesNotMatch(registration, /submissionContract/i,
  "Current v3.1 candidate must remain non-submittable until a reviewed release version is registered.");

console.log("Questionnaire conscious submission authority contract PASS");
