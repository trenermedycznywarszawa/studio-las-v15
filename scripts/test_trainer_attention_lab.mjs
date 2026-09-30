import assert from "node:assert/strict";
import {
  trainerAttentionLabModel,
  trainerAttentionLabSnapshot
} from "../tools/trainer-attention-lab.js";
import { buildLabModel, createLabState, reviewLabSignal } from "../tools/trainer-attention-lab-state.js";

assert.equal(trainerAttentionLabSnapshot.clients.length, 6, "lab fixture should load all synthetic clients");
assert.equal(trainerAttentionLabModel.today, "2026-09-30", "lab uses an explicit fictional business date");
assert.equal(trainerAttentionLabModel.counts.situations, 0, "normal session, information-only load and missing data must not manufacture attention");

const question = createLabState("question");
const questionItem = buildLabModel(question).attention[0];
assert.equal(buildLabModel(question).counts.situations, 1, "one submitted question yields one situation");
assert.match(questionItem.context, /Nie jestem pewna/, "the client's actual question is retained");
const reviewed = reviewLabSignal(question, questionItem.signalKey, "noted_no_change");
assert.equal(buildLabModel(reviewed).counts.situations, 0, "a reviewed event leaves the queue");
assert.equal(reviewed.history.length, 1, "the decision stays in history");
assert.equal(question.history.length, 0, "a preview transition must not mutate its input");
assert.throws(() => reviewLabSignal(reviewed, questionItem.signalKey, "noted_no_change"), /open attention signal/, "an already closed event cannot be reviewed twice");
assert.throws(() => reviewLabSignal(question, questionItem.signalKey, "contact_resolved"), /open contact/, "a contact cannot be closed before it is opened");

const contact = reviewLabSignal(question, questionItem.signalKey, "contact_required");
assert.equal(buildLabModel(contact).counts.situations, 1, "opening contact must not duplicate the original situation");
assert.equal(buildLabModel(contact).counts.contacts, 1, "contact remains open");
assert.throws(() => reviewLabSignal(contact, questionItem.signalKey, "noted_no_change"), /explicitly resolved/, "an unresolved contact cannot be silently cleared");
const resolved = reviewLabSignal(contact, questionItem.signalKey, "contact_resolved");
assert.equal(buildLabModel(resolved).counts.situations, 0, "explicitly resolved contact leaves the queue");
assert.deepEqual(resolved.history.map(row => row.outcome), ["contact_required", "contact_resolved"]);

const revised = structuredClone(reviewed);
revised.snapshot.guidanceEvents[0].created_at = "2026-09-30T12:00:00Z";
assert.equal(buildLabModel(revised).counts.situations, 1, "a newer source revision is not hidden by an older review");
assert.equal(buildLabModel(createLabState("session")).attention[0].signalId, "symptom-increase-after-session", "session scenario reuses the existing rule");
assert.equal(buildLabModel(createLabState("contact")).counts.contacts, 1);
assert.equal(buildLabModel(createLabState()).counts.situations, 0, "reset restores the neutral empty state");

console.log("TRAINER_ATTENTION_LAB_PASS");
