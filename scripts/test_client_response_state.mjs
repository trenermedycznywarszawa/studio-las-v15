import assert from "node:assert/strict";
import { ClientPortalController } from "../assets/os/client-portal-controller.js";
const snapshot = () => ({serverDate:"2026-09-09",client:{firstName:"Fictional"},homePlan:{id:"plan",items:[{id:"item",todayResponse:null}]}});
const receipt = {id:"request-1",eventDate:"2026-09-09",savedAt:"2026-09-09T12:00:00Z",text:"Reduced as agreed"};
function setup() {
 let writes=[]; let view; let nextId=0;
 const repo={getClientPortalSnapshot:async()=>snapshot(),saveClientCheckin:async input=>{writes.push({...input});return receipt;}};
 const controller=new ClientPortalController(repo, state=>{view=state;},()=>`request-${++nextId}`);
 return {repo,controller,writes,get view(){return view;}};
}
{
 const x=setup(); x.repo.getClientPortalSnapshot=async()=>{throw Error("offline");};
 await x.controller.load(); assert.equal(x.view.snapshot,null); assert.match(x.view.error,/Nie udało/);
 x.repo.getClientPortalSnapshot=async()=>snapshot(); await x.controller.load(); assert.ok(x.view.snapshot); assert.equal(x.view.error,"");
}
{
 const x=setup(); await x.controller.load(); await x.controller.submit("item","Reduced as agreed");
 assert.equal(x.view.responseStates.item.status,"saved"); assert.equal(x.writes.length,1);
 await x.controller.submit("item","Duplicate"); assert.equal(x.writes.length,1);
}
{
 const x=setup(); await x.controller.load(); x.repo.getClientPortalSnapshot=async()=>{throw Error("refresh failed");};
 await x.controller.submit("item","Reduced as agreed"); assert.equal(x.view.responseStates.item.status,"saved_refresh_failed");
 assert.equal(x.view.responseStates.item.receipt.id,receipt.id); assert.ok(x.view.snapshot); assert.match(x.view.error,/została zapisana/);
 await x.controller.submit("item","Duplicate"); assert.equal(x.writes.length,1);
}
{
 const x=setup(); await x.controller.load(); x.repo.saveClientCheckin=async()=>{throw {status:400};};
 await x.controller.submit("item","Keep this text"); assert.equal(x.view.responseStates.item.status,"failed"); assert.equal(x.view.responseStates.item.response,"Keep this text");
}
{
 const x=setup(); await x.controller.load();
 x.repo.saveClientCheckin=async input=>{x.writes.push({...input});throw Error("response lost after commit");};
 await x.controller.submit("item","Reduced as agreed"); assert.equal(x.view.responseStates.item.status,"uncertain");
 x.repo.getClientPortalSnapshot=async()=>{const s=snapshot();s.homePlan.items[0].todayResponse=receipt;return s;};
 await x.controller.retry("item"); assert.equal(x.writes.length,1); assert.equal(x.view.responseStates.item.status,"saved");
}
{
 const x=setup(); await x.controller.load();
 x.repo.saveClientCheckin=async input=>{x.writes.push({...input});if(x.writes.length===1)throw Error("request lost");return receipt;};
 await x.controller.submit("item","Reduced as agreed"); await x.controller.retry("item");
 assert.equal(x.writes.length,2); assert.equal(x.writes[0].submissionId,x.writes[1].submissionId); assert.equal(x.writes[0].response,x.writes[1].response);
 assert.equal(x.view.responseStates.item.status,"saved");
}
{
 const x=setup(); await x.controller.load(); x.repo.getClientPortalSnapshot=async()=>{throw {status:403};};
 await x.controller.load(); assert.equal(x.view.snapshot,null); assert.deepEqual(x.view.responseStates,{});
}
{
 const x=setup(); let resolveOld; x.repo.getClientPortalSnapshot=()=>new Promise(resolve=>{resolveOld=resolve;});
 const old=x.controller.load(); x.repo.getClientPortalSnapshot=async()=>({...snapshot(),serverDate:"2026-09-10"});
 await x.controller.load(); resolveOld(snapshot()); await old; assert.equal(x.view.snapshot.serverDate,"2026-09-10");
}
console.log("CLIENT_RESPONSE_STATE_PASS: saved, failed, refresh failed, uncertain retries, revocation, read ordering");
