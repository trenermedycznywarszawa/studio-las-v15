import assert from "node:assert/strict";
import { StudioLasRepository } from "../assets/os/data.js";

const calls = [];
const auth = { request: async (path, options) => {
  calls.push({path, options});
  if (path.includes("trainer_guidance_snapshot")) return {plans: [], items: []};
  return [{id: "fictional", approved_at: "2026-09-09T00:00:00Z"}];
}};
const repo = new StudioLasRepository({supabaseUrl: "https://example.invalid"}, auth);
await repo.publishHomePlanGuidance("plan-a");
assert.equal(calls.at(-1).path, "/rest/v1/rpc/publish_home_plan_guidance");
assert.deepEqual(calls.at(-1).options.body, {p_home_plan_id: "plan-a"});
await repo.approveHomePlanGuidance("plan-a", 7);
assert.equal(calls.at(-1).path, "/rest/v1/rpc/approve_home_plan_guidance");
assert.deepEqual(calls.at(-1).options.body, {p_home_plan_id: "plan-a", p_expected_revision: 7});
await repo.cloneHomePlanGuidance("plan-a");
assert.deepEqual(calls.at(-1).options.body, {p_home_plan_id: "plan-a"});
await repo.editGuidanceDraft("client-a", "plan-a", {title:"Draft",focus:"Purpose",instructions:"Instruction",frequency:"Agreed",duration:"5 min",guidance_channel:"app",approved_at:"forged"});
assert.ok(calls.at(-1).path.includes("approved_at=is.null"));
assert.equal(calls.at(-1).options.body.approved_at, undefined);
await repo.editGuidanceDraftItem("client-a", "item-a", {name:"Action",dosage:"3",frequency:"Agreed",client_cue:"Cue",stop_criteria:"Boundary",status:"active",published_at:"forged"});
assert.equal(calls.at(-1).options.body.published_at, undefined);
repo.getClient = async () => ({id:"client-a"});
const workspace = await repo.getClientWorkspace("client-a");
assert.deepEqual(workspace.homePlans, []);
assert.deepEqual(workspace.homePlanItems, []);
assert.equal(calls.filter(call => call.path.includes("trainer_guidance_snapshot")).length, 1);
assert.ok(!calls.some(call => call.options?.method === "GET" && /home_plans|home_plan_items/.test(call.path)));
await repo.addGuidanceObservationNote("observation-a", {kind:"correction",body:"Clarified",reason:"Client explained",created_by:"forged"});
assert.deepEqual(calls.at(-1).options.body, {p_observation_id:"observation-a",p_kind:"correction",p_body:"Clarified",p_reason:"Client explained"});
await repo.saveClientCheckin({homePlanItemId:"item-a",homePlanId:"plan-a",response:"Reduced as agreed",submissionId:"request-a",energyScore:1});
assert.deepEqual(calls.at(-1).options.body, {p_home_plan_item_id:"item-a",p_home_plan_id:"plan-a",p_response:"Reduced as agreed",p_submission_id:"request-a"});
auth.request = async () => [];
await assert.rejects(repo.editGuidanceDraft("client-a","plan-a",{}), /Szkic/);
console.log("GUIDANCE_TRANSPORT_PASS: exact RPC payloads, guarded edits, consistent review snapshot");

