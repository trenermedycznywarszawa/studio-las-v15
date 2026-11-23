import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../supabase/migrations/20260911133100_questionnaire_v3_assignment_authority.sql", import.meta.url),
  "utf8"
);

assert.match(source, /questionnaire_versions_one_active_release_idx/i);
assert.match(source, /where released_at is not null and retired_at is null/i);
assert.match(source, /create or replace function public\.assign_active_questionnaire/i);
assert.match(source, /security definer/i);
assert.match(source, /private\.is_trainer\(\)/i);
assert.match(source, /private\.trainer_mfa_satisfied\(\)/i);
assert.match(source, /private\.trainer_owns_client\(p_client_id\)/i);
assert.match(source, /qt\.active = true/i);
assert.match(source, /qv\.released_at is not null/i);
assert.match(source, /qv\.retired_at is null/i);
assert.match(source, /c\.goal into v_goal_snapshot/i);
assert.match(source, /qa\.status in \('assigned','in_progress'\)/i,
  "Repeated assignment must reuse an existing open assignment.");
assert.match(source, /revoke all on function public\.assign_active_questionnaire\(uuid,text\) from public, anon, authenticated/i);
assert.match(source, /grant execute on function public\.assign_active_questionnaire\(uuid,text\) to authenticated/i);
assert.doesNotMatch(source, /grant\s+(?:insert|update|delete|all)\s+on\s+public\.questionnaire_assignments\s+to\s+authenticated/i,
  "Assignment must stay behind the controlled RPC instead of direct table writes.");

console.log("Questionnaire assignment authority tests completed");
