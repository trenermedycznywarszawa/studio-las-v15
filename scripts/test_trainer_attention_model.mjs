import assert from "node:assert/strict";
import { signalInstanceKey } from "../assets/os/decision-support.js";
import { buildTrainerAttentionModel } from "../assets/os/trainer-attention-model.js";

function client(id, extras = {}) {
  return { id, name: id.toUpperCase(), status: "active", stage_label: "Prowadzenie", ...extras };
}

function clientObservationKey(event) {
  return signalInstanceKey({
    id: "client-observation",
    source: "client-response",
    sourceDate: event.event_date,
    sourceId: event.id,
    sourceRevision: event.created_at
  });
}

const contactEvent = {
  id: "event-contact",
  client_id: "contact",
  event_date: "2026-09-24",
  kind: "client_checkin",
  payload: { note: "Odpowiedź oczekuje na domknięcie rozmowy." },
  created_at: "2026-09-24T18:00:00Z"
};
const reviewedEvent = {
  id: "event-reviewed",
  client_id: "reviewed",
  event_date: "2026-09-24",
  kind: "client_checkin",
  payload: { note: "Ta odpowiedź została już przejrzana." },
  created_at: "2026-09-24T17:00:00Z"
};

const model = buildTrainerAttentionModel({
  clients: [
    client("contact"),
    client("new"),
    client("due", { next_review_date: "2026-09-25" }),
    client("soon", { next_review_date: "2026-09-28" }),
    client("quiet"),
    client("reviewed")
  ],
  sessions: [],
  trainingLoad: [],
  preSessionChecks: [],
  guidanceEvents: [
    contactEvent,
    {
      id: "event-new",
      client_id: "new",
      event_date: "2026-09-25",
      kind: "client_checkin",
      payload: { note: "Nowa odpowiedź klienta." },
      created_at: "2026-09-25T07:40:00Z"
    },
    reviewedEvent
  ],
  signalReviews: [
    {
      id: "review-contact",
      client_id: "contact",
      signal_key: clientObservationKey(contactEvent),
      outcome: "contact_required",
      reviewed_at: "2026-09-24T18:15:00Z",
      contact_resolved_at: null
    },
    {
      id: "review-reviewed",
      client_id: "reviewed",
      signal_key: clientObservationKey(reviewedEvent),
      outcome: "no_change",
      reviewed_at: "2026-09-24T18:10:00Z",
      contact_resolved_at: null
    }
  ]
}, { today: "2026-09-25", reviewSoonDays: 7 });

assert.equal(model.counts.situations, 3, "contact, new response and due Review should be open");
assert.equal(model.counts.clients, 3, "three clients should have open attention facts");
assert.equal(model.attention[0].clientId, "contact", "unresolved contact should come before ordinary review facts");
assert.equal(model.attention[0].kind, "contact");
assert(model.attention.some(item => item.clientId === "new" && item.kind === "signal"), "new client response should remain open");
assert(model.attention.some(item => item.clientId === "due" && item.kind === "review"), "Review due today should be open");
assert(!model.attention.some(item => item.clientId === "reviewed"), "reviewed signal must disappear from open attention");
assert.deepEqual(model.reviewSoon.map(item => item.clientId), ["soon"], "upcoming Review should be separate from open attention");
assert(!model.quiet.some(item => item.clientId === "soon"), "upcoming Review should not also appear in quiet clients");
assert(model.quiet.some(item => item.clientId === "quiet"), "quiet client should remain outside the main attention list");
assert(model.quiet.some(item => item.clientId === "reviewed"), "client with reviewed signal should be outside the main attention list");
assert.match(model.disclaimer, /automatyczna decyzja/i);

console.log("TRAINER_ATTENTION_MODEL_PASS");
