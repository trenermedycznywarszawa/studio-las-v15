import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  guidanceChannelLabel,
  guidanceDeliveryLabel,
  guidanceStatusLabel
} from "../assets/os/decision-state.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migration = await read("supabase/migrations/022_damian_guidance_release_workflow.sql");
const releaseVersionFix = await read("supabase/migrations/023_fix_guidance_release_version.sql");
const schema = await read("supabase/migrations/001_initial_schema.sql");
const audit = await read("supabase/migrations/013_access_lifecycle_and_audit.sql");
const repository = await read("assets/os/data.js");
const trainerGuidance = await read("assets/os/ui/trainer-guidance.js");
const trainerState = await read("assets/os/ui/trainer-state.js");
const forms = await read("assets/os/ui/forms.js");

for (const fragment of [
  "publish_home_plan_guidance",
  "withdraw_home_plan_guidance",
  "record_home_plan_guidance_delivery",
  "confirm_home_plan_paper_retirement",
  "for update",
  "trainer AAL2 required",
  "guidance_channel",
  "delivery_status",
  "supersedes_home_plan_id",
]) assert.match(migration, new RegExp(fragment));
assert.match(schema, /home_plans_one_active_per_client_idx/);
assert.match(migration, /set status = 'archived', superseded_by_home_plan_id/);
assert.match(releaseVersionFix, /create or replace function public\.publish_home_plan_guidance/);
assert.match(releaseVersionFix, /and published_at is not null/);
assert.match(releaseVersionFix, /coalesce\(max\(release_version\), 0\) \+ 1/);
assert.match(migration, /set status = 'active',[\s\S]*published_at = now\(\)/);
assert.match(migration, /set status = 'archived', withdrawn_at = now\(\)/);
assert.match(migration, /set delivery_status = p_delivery_status/);
assert.ok(migration.includes("nullif(trim(v_draft.focus), '') is null"));
assert.match(migration, /guidance purpose is required/);
assert.ok(migration.includes("guidance_channel in ('paper', 'hybrid')"));
assert.match(migration, /delivery_status is distinct from 'paper_retirement_confirmed'/);
assert.match(migration, /update public\.home_plan_items[\s\S]*set published_at = now\(\)/);
assert.match(audit, /security_audit_events/);
assert.doesNotMatch(audit, /guidance_content text/);

assert.match(repository, /publishHomePlanGuidance/);
assert.match(repository, /withdrawHomePlanGuidance/);
assert.match(repository, /recordHomePlanGuidanceDelivery/);
assert.match(repository, /confirmHomePlanPaperRetirement/);
assert.doesNotMatch(repository.slice(repository.indexOf("async saveHomePlan"), repository.indexOf("async saveHomePlanItem")), /status:\s*published \? "active"/);
assert.match(trainerGuidance, /Trener podejmuje decyzję/);
assert.doesNotMatch(trainerGuidance, /Damian podejmuje decyzję/);
assert.match(trainerGuidance, /Wycofaj wskazówkę/);
assert.match(trainerGuidance, /Potwierdź wycofanie poprzedniej kopii papierowej/);
assert.match(trainerGuidance, /paperChannel && hasDraftSuccessor && !retirementConfirmed/);
assert.match(trainerGuidance, /item\.home_plan_id === plan\.id/);
assert.match(trainerGuidance, /Szkic: \$\{plan\.title/);
assert.doesNotMatch(trainerGuidance, /text: `[^`]*\$\{plan\.status\}/);
assert.doesNotMatch(trainerState, /text: `[^`]*\$\{report\.(audience|status)\}/);
assert.equal(guidanceStatusLabel("active"), "Aktywna");
assert.equal(guidanceChannelLabel("hybrid"), "Papier + aplikacja");
assert.equal(guidanceDeliveryLabel("recorded"), "Dostarczona");
assert.match(forms, /Cel wskazówki — po co/);
assert.match(forms, /required: true/);
console.log("GUIDANCE_RELEASE_WORKFLOW_SUCCESS static contract invariants PASS (does not execute SQL)");
