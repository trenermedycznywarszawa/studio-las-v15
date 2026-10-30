import assert from "node:assert/strict";
import { ClientPortalController } from "../assets/os/client-portal-controller.js";
const original={id:"daily",eventDate:"2026-10-03",text:"Done"};
const snapshot=()=>({serverDate:"2026-10-03",homePlan:{id:"plan",items:[{id:"item",todayResponse:original}]},contactRequests:[]});
function setup(){let i=0;const writes=[];const repo={getClientPortalSnapshot:async()=>snapshot(),saveClientContactRequest:async input=>{writes.push({...input});return{id:input.submissionId,savedAt:"2026-10-03T10:00:00Z",homePlanItemId:input.homePlanItemId,text:input.question};}};const portal=new ClientPortalController(repo,()=>{},()=>`question-${++i}`);return{portal,repo,writes};}
{
 const x=setup();await x.portal.load();x.portal.contacts.start("item");await x.portal.contacts.submit("item","Question after check-in");
 assert.equal(x.writes.length,1);assert.equal(x.portal.snapshot.homePlan.items[0].todayResponse,original);
 x.portal.contacts.start("item");await x.portal.contacts.submit("item","Second question");assert.equal(x.writes.length,2);assert.notEqual(x.writes[0].submissionId,x.writes[1].submissionId);
}
{
 const x=setup();await x.portal.load();x.repo.saveClientContactRequest=async input=>{x.writes.push({...input});if(x.writes.length===1)throw Error("offline");return{id:input.submissionId,savedAt:"now"};};
 x.portal.contacts.start("item");await x.portal.contacts.submit("item","Keep my question");
 assert.equal(x.portal.contacts.states.item.question,"Keep my question");assert.equal(x.portal.contacts.states.item.status,"uncertain");
 await x.portal.contacts.retry("item");assert.equal(x.writes.length,2);assert.equal(x.writes[0].submissionId,x.writes[1].submissionId);assert.equal(x.writes[1].question,"Keep my question");
}
{
 const x=setup();await x.portal.load();x.repo.saveClientContactRequest=async input=>{x.writes.push({...input});throw Error("ack lost");};
 await x.portal.contacts.submit("item","Committed question");const id=x.writes[0].submissionId;
 x.repo.getClientPortalSnapshot=async()=>({...snapshot(),contactRequests:[{id,homePlanItemId:"item",text:"Committed question"}]});
 await x.portal.contacts.retry("item");assert.equal(x.writes.length,1);assert.equal(x.portal.contacts.states.item.status,"saved");
}
{
 const x=setup();await x.portal.load();x.portal.contacts.start("item");x.portal.contacts.draft("item","Unsent draft");await x.portal.load();assert.equal(x.portal.contacts.states.item.question,"Unsent draft");
 x.repo.saveClientContactRequest=async()=>{throw {status:400};};await x.portal.contacts.submit("item","Keep after rejection");assert.equal(x.portal.contacts.states.item.status,"failed");assert.equal(x.portal.contacts.states.item.question,"Keep after rejection");
 x.repo.getClientPortalSnapshot=async()=>{throw {status:403};};await x.portal.load();assert.deepEqual(x.portal.contacts.states,{});assert.equal(x.portal.snapshot,null);
}
{
 const x=setup();await x.portal.load();let finish;x.repo.saveClientContactRequest=()=>new Promise(resolve=>{finish=resolve;});const sending=x.portal.contacts.submit("item","Pending");await x.portal.contacts.submit("item","Duplicate");x.portal.reset();finish({id:"question-1",savedAt:"now"});await sending;assert.deepEqual(x.portal.contacts.states,{});
}
console.log("CLIENT_CONTACT_REQUESTS_STATE_PASS");

{
 const {StudioLasRepository}=await import("../assets/os/data.js");let called;
 const repo=new StudioLasRepository({}, {request:async(path,options)=>{called={path,options};return{id:"uuid"};}});
 await repo.saveClientContactRequest({homePlanItemId:"item",homePlanId:"plan",question:"Question",submissionId:"uuid"});
 assert.equal(called.path,"/rest/v1/rpc/save_client_contact_request");
 assert.deepEqual(called.options.body,{p_home_plan_item_id:"item",p_home_plan_id:"plan",p_question:"Question",p_submission_id:"uuid"});
}
