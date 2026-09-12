import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sql = read("supabase/dev/staging_questionnaire_e2e.sql");
const edge = read("supabase/dev/questionnaire-e2e-fixture/index.ts");
const e2e = read("scripts/e2e_questionnaire_staging.mjs");

assert.match(sql, /STAGING \/ QA ONLY/i);
assert.match(sql, /prepare_questionnaire_e2e_db/);
assert.match(sql, /cleanup_questionnaire_e2e_db/);
assert.match(sql, /security definer/i);
assert.match(sql, /v_aal\s*<>\s*'aal2'/i);
assert.match(sql, /QA PWD Client \(synthetic\)/);
assert.match(sql, /qaOnly',true/);
assert.match(sql, /status='cancelled'/);
assert.doesNotMatch(sql, /session_replication_role/i,
  "QA fixture must never disable product triggers or replication semantics");
assert.doesNotMatch(sql, /auth\.users|encrypted_password|crypt\(/i,
  "QA fixture SQL must never mutate Auth credentials directly");
assert.doesNotMatch(sql, /delete\s+from\s+public\.questionnaire_(responses|privacy_events)/i,
  "QA fixture must preserve submitted/privacy history and respect immutability");

assert.match(edge, /withSupabase\(\{ auth: "user" \}/);
assert.match(edge, /actorAal !== "aal2"/);
assert.match(edge, /QA_TRAINER_AUTH_USER_ID/);
assert.match(edge, /QA_TRAINER_PROFILE_ID/);
assert.match(edge, /QA_CLIENT_AUTH_USER_ID/);
assert.match(edge, /auth\.admin\.updateUserById/,
  "Temporary QA password must use the supported Auth Admin API boundary");
assert.match(edge, /prepare_questionnaire_e2e_db/);
assert.match(edge, /cleanup_questionnaire_e2e_db/);
assert.doesNotMatch(edge, /session_replication_role|auth\.users|encrypted_password/i);

assert.match(e2e, /\/functions\/v1\/questionnaire-e2e-fixture/);
assert.doesNotMatch(e2e, /rpc\(trainerToken,\s*"prepare_questionnaire_e2e"/);
assert.match(e2e, /draftHiddenFromTrainer:\s*true/);
assert.match(e2e, /guidanceUnchanged:\s*true/);

console.log("Questionnaire staging E2E fixture boundary tests completed");
