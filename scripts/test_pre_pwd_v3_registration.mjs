import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRE_PWD_V3_DEFINITION } from "../assets/os/questionnaires/pre-pwd-v3-definition.js";
import { questionnaireDefinitionSha256 } from "./questionnaire_definition_hash.mjs";

const source = readFileSync(
  new URL("../supabase/migrations/20260911133421_questionnaire_v3_register_pre_pwd_draft.sql", import.meta.url),
  "utf8"
);
const hash = questionnaireDefinitionSha256(PRE_PWD_V3_DEFINITION);

assert.equal(hash, "b24aece381479b7f71b0ddc4142c79e41d1b7d87df4bca7ce61f737027cbb63f");
assert.match(source, new RegExp(hash));
assert.match(source, /'pre_pwd_first_visit'/);
assert.match(source, /'3\.0'/);
assert.match(source, /assets\/os\/questionnaires\/pre-pwd-v3-definition\.js/);
assert.match(source, /'recursive_sorted_keys_json_v1'/);
assert.match(source, /'blocked_pending_contract_resolution'/);
assert.match(source, /released_at,[\s\S]*retired_at[\s\S]*v_expected_hash,[\s\S]*null,[\s\S]*null/i);
assert.match(source, /pre-PWD v3 must remain unreleased until blockers are resolved/i);
assert.doesNotMatch(source, /update\s+public\.questionnaire_versions\s+set\s+released_at/i,
  "Registration must not release v3 implicitly.");

console.log(`Pre-PWD v3 registration contract PASS ${hash}`);
