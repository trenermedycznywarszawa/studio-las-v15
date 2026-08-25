import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migration = await read("supabase/migrations/022_damian_guidance_release_workflow.sql");
const schema = await read("supabase/migrations/001_initial_schema.sql");
const audit = await read("supabase/migrations/013_access_lifecycle_and_audit.sql");
const repository = await read("assets/os/data.js");
const trainer = await read("assets/os/ui/trainer.js");

for (const fragment of [
  "publish_home_plan_guidance",
  "withdraw_home_plan_guidance",
  "record_home_plan_guidance_delivery",
  "for update",
  "trainer AAL2 required",
  "guidance_channel",
  "delivery_status",
  "supersedes_home_plan_id",
]) assert.match(migration, new RegExp(fragment));
assert.match(schema, /home_plans_one_active_per_client_idx/);
assert.match(migration, /set status = 'archived', superseded_by_home_plan_id/);
assert.match(migration, /set status = 'active',[\s\S]*published_at = now\(\)/);
assert.match(migration, /set status = 'archived', withdrawn_at = now\(\)/);
assert.match(migration, /set delivery_status = p_delivery_status/);
assert.match(migration, /update public\.home_plan_items[\s\S]*set published_at = now\(\)/);
assert.match(audit, /security_audit_events/);
assert.doesNotMatch(audit, /guidance_content text/);

assert.match(repository, /publishHomePlanGuidance/);
assert.match(repository, /withdrawHomePlanGuidance/);
assert.match(repository, /recordHomePlanGuidanceDelivery/);
assert.doesNotMatch(repository.slice(repository.indexOf("async saveHomePlan"), repository.indexOf("async saveHomePlanItem")), /status:\s*published \? "active"/);
assert.match(trainer, /Damian podejmuje decyzję/);
assert.match(trainer, /Wycofaj wskazówkę/);
console.log("GUIDANCE_RELEASE_WORKFLOW_SUCCESS invariants PASS");
