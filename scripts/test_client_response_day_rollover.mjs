import assert from "node:assert/strict";
import { ClientPortalController } from "../assets/os/client-portal-controller.js";

const snapshot = serverDate => ({
  serverDate,
  client:{firstName:"Fictional"},
  homePlan:{id:"plan",items:[{id:"item",todayResponse:null}]}
});

let currentDate = "2026-09-10";
let writes = [];
let view;
let nextId = 0;
const repo = {
  getClientPortalSnapshot: async () => snapshot(currentDate),
  saveClientCheckin: async input => {
    writes.push({...input});
    throw Error("request outcome unknown");
  }
};
const controller = new ClientPortalController(repo, state => { view = state; }, () => `request-${++nextId}`);

await controller.load();
await controller.submit("item", "Yesterday's uncertain statement");
assert.equal(view.responseStates.item.status, "uncertain");
assert.equal(writes.length, 1);
assert.equal(writes[0].serverDate, "2026-09-10");

currentDate = "2026-09-11";
await controller.retry("item");
assert.equal(writes.length, 1, "old uncertain response must not be written on a new server day");
assert.equal(view.responseStates.item.status, "failed");
assert.match(view.responseStates.item.message, /poprzedniego dnia/);

repo.saveClientCheckin = async input => {
  writes.push({...input});
  return {id:"saved-today",eventDate:"2026-09-11",savedAt:"2026-09-11T08:00:00Z",text:input.response};
};
await controller.submit("item", "Today's deliberate statement");
assert.equal(writes.length, 2);
assert.notEqual(writes[0].submissionId, writes[1].submissionId);
assert.equal(writes[1].serverDate, "2026-09-11");
assert.equal(view.responseStates.item.status, "saved");

console.log("CLIENT_RESPONSE_DAY_ROLLOVER_PASS: uncertain prior-day text is never retried as today's response");
