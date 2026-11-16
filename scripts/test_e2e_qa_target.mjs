import assert from "node:assert/strict";
import { isolatedQaTarget } from "./e2e_qa_target.mjs";

const ref = "isolatedqa0000000001";
const valid = {
  STUDIO_LAS_E2E_PROJECT_REF: ref,
  STUDIO_LAS_E2E_SUPABASE_URL: `https://${ref}.supabase.co`,
  STUDIO_LAS_E2E_PUBLISHABLE_KEY: "sb_publishable_" + "a".repeat(40)
};
assert.deepEqual(Object.keys(isolatedQaTarget(valid)).sort(), ["key", "origin", "ref"]);
assert(Object.isFrozen(isolatedQaTarget(valid)));

for (const projectRef of ["ufcumhbnuyernuwepcij", "ulauyoqjoetjqktegeuq", "", "unknown!"]) {
  assert.throws(() => isolatedQaTarget({ ...valid, STUDIO_LAS_E2E_PROJECT_REF: projectRef }), /BLOCKED/);
}
for (const url of ["", "http://isolatedqa0000000001.supabase.co",
  "https://ulauyoqjoetjqktegeuq.supabase.co",
  "https://isolatedqa0000000001.supabase.co.attacker.test",
  "https://isolatedqa0000000001.supabase.co/path",
  "https://isolatedqa0000000001.supabase.co?redirect=prod",
  "https://isolatedqa0000000001.supabase.co/"]) {
  assert.throws(() => isolatedQaTarget({ ...valid, STUDIO_LAS_E2E_SUPABASE_URL: url }), /BLOCKED/);
}
for (const key of ["", "sb_publishable_bad", "sb_secret_" + "a".repeat(40)]) {
  assert.throws(() => isolatedQaTarget({ ...valid, STUDIO_LAS_E2E_PUBLISHABLE_KEY: key }), /BLOCKED/);
}
assert.throws(() => isolatedQaTarget({}), /BLOCKED/);
console.log("PASS: isolated QA target strict resolver and canonical production/staging negative matrix");
