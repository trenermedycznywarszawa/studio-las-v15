import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRE_PWD_V31_DEFINITION } from "../assets/os/questionnaires/pre-pwd-v31-definition.js";
import { questionnaireDefinitionSha256 } from "./questionnaire_definition_hash.mjs";

const sql = readFileSync(new URL("../supabase/migrations/20260912065115_questionnaire_v31_register_pre_pwd_candidate.sql", import.meta.url), "utf8");
const hash = questionnaireDefinitionSha256(PRE_PWD_V31_DEFINITION);

assert.equal(hash, "1816ef8dc6b4bced1f5c753a350f28d2e43cb361bab56691c378245c198233a6");
assert.match(sql, new RegExp(hash));
assert.match(sql, /version_code[\s\S]*'3\.1'/i);
assert.match(sql, /pre-pwd-v31-definition\.js/i);
assert.match(sql, /requiresHealthConsentReceipt', true/i);
assert.match(sql, /blocked_pending_health_data_consent_legal_review/i);
assert.match(sql, /released_at[\s\S]*null/i);
assert.match(sql, /must remain unreleased pending legal consent review/i);
assert.doesNotMatch(sql, /now\(\)[\s\S]*released_at/i,
  "v3.1 candidate must not be released by its registration migration");

console.log(`Pre-PWD v3.1 registration contract PASS ${hash}`);
