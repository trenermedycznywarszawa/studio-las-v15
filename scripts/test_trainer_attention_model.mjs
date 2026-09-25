import assert from "node:assert/strict";
import { signalInstanceKey } from "../assets/os/decision-support.js";
import { buildTrainerAttentionModel } from "../assets/os/trainer-attention-model.js";
import {
  assembleTrainerAttentionSnapshot,
  collectTrainerAttentionPages,
  getTrainerAttentionReadContract
} from "../assets/os/trainer-attention-snapshot.js";

function client(id, extras = {}) {
  return {
    id,
    name: id.toUpperCase(),
    status: "active",
    stage: null,
    next_session_date: null,
    next_review_date: null,
    stage_label: "Prowadzenie",
    ...extras
  };
}

function emptySnapshot(overrides = {}) {
  return {
    clients: [],
    sessions: [],
    trainingLoad: [],
    preSessionChecks: [],
    guidanceEvents: [],
    signalReviews: [],
    ...overrides
  };
}

function readResults(snapshot) {
  return Object.fromEntries(Object.entries(snapshot).map(([key, data]) => [key, { data, error: null }]));
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
  note: "Odpowiedź oczekuje na domknięcie rozmowy.",
  created_at: "2026-09-24T18:00:00Z"
};
const reviewedEvent = {
  id: "event-reviewed",
  client_id: "reviewed",
  event_date: "2026-09-24",
  note: "Ta odpowiedź została już przejrzana.",
  created_at: "2026-09-24T17:00:00Z"
};

const primarySnapshot = emptySnapshot({
  clients: [
    client("contact"),
    client("new"),
    client("due", { next_review_date: "2026-09-25" }),
    client("soon", { next_review_date: "2026-09-28" }),
    client("quiet"),
    client("reviewed")
  ],
  guidanceEvents: [
    contactEvent,
    {
      id: "event-new",
      client_id: "new",
      event_date: "2026-09-25",
      note: "Nowa odpowiedź klienta.",
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
      contact_resolved_at: null
    },
    {
      id: "review-reviewed",
      client_id: "reviewed",
      signal_key: clientObservationKey(reviewedEvent),
      outcome: "noted_no_change",
      contact_resolved_at: null
    }
  ]
});

const model = buildTrainerAttentionModel(primarySnapshot, { today: "2026-09-25", reviewSoonDays: 7 });

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

const historicalSignalKey = signalInstanceKey({
  id: "client-observation",
  source: "client-response",
  sourceDate: "2026-08-12",
  sourceId: "historical-event",
  sourceRevision: "2026-08-12T08:00:00Z"
});
const historicalContact = buildTrainerAttentionModel(emptySnapshot({
  clients: [client("historical")],
  signalReviews: [{
    id: "review-historical",
    client_id: "historical",
    signal_key: historicalSignalKey,
    outcome: "contact_required",
    contact_resolved_at: null
  }]
}), { today: "2026-09-25" });
assert.equal(historicalContact.attention.length, 1, "open contact must survive even when the original source row is absent");
assert.equal(historicalContact.attention[0].kind, "contact");
assert(!historicalContact.quiet.some(item => item.clientId === "historical"), "open historical contact must never become quiet");

const oldRevisionKey = signalInstanceKey({
  id: "symptom-increase-after-session",
  source: "session",
  sourceDate: "2026-09-24",
  sourceId: "session-revision",
  sourceRevision: "2026-09-24T10:00:00Z"
});
const revisedSession = {
  id: "session-revision",
  client_id: "revision",
  date: "2026-09-24",
  vas_before: 2,
  vas_after: 5,
  readiness: 7,
  sleep_quality: "dobry",
  updated_at: "2026-09-24T11:00:00Z"
};
const revisedSource = buildTrainerAttentionModel(emptySnapshot({
  clients: [client("revision")],
  sessions: [revisedSession],
  signalReviews: [{
    id: "review-old-revision",
    client_id: "revision",
    signal_key: oldRevisionKey,
    outcome: "contact_required",
    contact_resolved_at: null
  }]
}), { today: "2026-09-25" });
assert.equal(revisedSource.attention.length, 1, "one source/signal situation with an open contact should render once across revisions");
assert.equal(revisedSource.attention[0].kind, "contact");
assert.equal(revisedSource.attention[0].sourceChangedSinceContact, true, "revision drift must be explicit rather than silently duplicated");
assert.equal(revisedSource.attention[0].relatedSignalKeys.length, 1);

const currentRevisionKey = signalInstanceKey({
  id: "symptom-increase-after-session",
  source: "session",
  sourceDate: revisedSession.date,
  sourceId: revisedSession.id,
  sourceRevision: revisedSession.updated_at
});
const reviewedCurrentRevision = buildTrainerAttentionModel(emptySnapshot({
  clients: [client("revision-reviewed")],
  sessions: [{ ...revisedSession, client_id: "revision-reviewed" }],
  signalReviews: [
    {
      id: "review-old-contact",
      client_id: "revision-reviewed",
      signal_key: oldRevisionKey,
      outcome: "contact_required",
      contact_resolved_at: null
    },
    {
      id: "review-current-no-change",
      client_id: "revision-reviewed",
      signal_key: currentRevisionKey,
      outcome: "noted_no_change",
      contact_resolved_at: null
    }
  ]
}), { today: "2026-09-25" });
assert.equal(reviewedCurrentRevision.attention.length, 1, "reviewed current revision must not become its own attention item");
assert.equal(reviewedCurrentRevision.attention[0].kind, "contact", "older unresolved contact must remain open");
assert.equal(reviewedCurrentRevision.attention[0].sourceChangedSinceContact, true, "review filtering must not hide revision drift from an unresolved contact");
assert(reviewedCurrentRevision.attention[0].relatedSignalKeys.includes(currentRevisionKey), "current reviewed revision key must remain attached as revision context");

const informationContactKey = signalInstanceKey({
  id: "high-zone-present",
  source: "training-load",
  sourceDate: "2026-09-24",
  sourceId: "load-info",
  sourceRevision: "2026-09-24T18:00:00Z"
});
const informationContact = buildTrainerAttentionModel(emptySnapshot({
  clients: [client("information-contact")],
  trainingLoad: [{
    id: "load-info",
    client_id: "information-contact",
    observed_at: "2026-09-24",
    rpe: 6,
    zone_high_min: 3,
    updated_at: "2026-09-24T18:00:00Z"
  }],
  signalReviews: [{
    id: "review-info-contact",
    client_id: "information-contact",
    signal_key: informationContactKey,
    outcome: "contact_required",
    contact_resolved_at: null
  }]
}), { today: "2026-09-25" });
assert.equal(informationContact.attention.length, 1, "information-level signal with unresolved contact must remain in Attention");
assert.equal(informationContact.attention[0].kind, "contact");

assert.throws(
  () => buildTrainerAttentionModel(emptySnapshot()),
  /explicit Studio-local today date is required/,
  "business date must be explicit so UTC midnight cannot move Review between sections"
);

assert.throws(
  () => buildTrainerAttentionModel({
    clients: [], sessions: [], trainingLoad: [], preSessionChecks: [], guidanceEvents: []
  }, { today: "2026-09-25" }),
  /missing required source signalReviews/,
  "incomplete snapshot must fail closed"
);

assert.throws(
  () => buildTrainerAttentionModel(emptySnapshot({
    clients: [client("invalid-review")],
    signalReviews: [{
      id: "review-invalid",
      client_id: "invalid-review",
      signal_key: historicalSignalKey,
      outcome: "contact_required"
    }]
  }), { today: "2026-09-25" }),
  /contact_resolved_at/,
  "missing review mapping fields must fail closed"
);

assert.throws(
  () => buildTrainerAttentionModel(emptySnapshot({
    clients: [client("missing-signal-field")],
    sessions: [{
      id: "session-missing-vas",
      client_id: "missing-signal-field",
      date: "2026-09-25",
      vas_after: 5,
      readiness: 7,
      sleep_quality: "dobry",
      updated_at: "2026-09-25T10:00:00Z"
    }]
  }), { today: "2026-09-25" }),
  /missing vas_before/,
  "a missing signal-bearing projection field must fail closed instead of making the client look quiet"
);

const nullableSignalFields = buildTrainerAttentionModel(emptySnapshot({
  clients: [client("nullable-signal-fields")],
  sessions: [{
    id: "session-nullable",
    client_id: "nullable-signal-fields",
    date: "2026-09-25",
    vas_before: null,
    vas_after: null,
    readiness: null,
    sleep_quality: null,
    updated_at: "2026-09-25T10:00:00Z"
  }]
}), { today: "2026-09-25" });
assert.equal(nullableSignalFields.attention.length, 0, "legitimate nullable signal fields must remain valid snapshot values");

const assembled = assembleTrainerAttentionSnapshot(readResults(primarySnapshot));
assert.equal(assembled.clients.length, primarySnapshot.clients.length, "complete read results should assemble");
const failedReads = readResults(primarySnapshot);
failedReads.signalReviews = { data: null, error: new Error("simulated RLS/read failure") };
assert.throws(
  () => assembleTrainerAttentionSnapshot(failedReads),
  /signalReviews read failed/,
  "one failed source read must block the whole attention snapshot"
);

const paginationFixture = Array.from({ length: 511 }, (_, index) => ({ id: index + 1 }));
const paged = await collectTrainerAttentionPages(({ offset, limit }) => {
  const simulatedServerCap = 73;
  return Promise.resolve(paginationFixture.slice(offset, offset + Math.min(limit, simulatedServerCap)));
}, { pageSize: 200 });
assert.equal(paged.length, paginationFixture.length, "pagination must continue past a short server-capped page until an empty page");
assert.equal(paged.at(-1).id, 511);

const readContract = getTrainerAttentionReadContract();
for (const source of ["clients", "sessions", "trainingLoad", "preSessionChecks", "guidanceEvents"]) {
  assert.equal(readContract[source].predicates.deleted_at, "is.null", `${source} must exclude soft-deleted rows at the query boundary`);
  assert(!readContract[source].transfer.includes("deleted_at"), `${source} must filter on deleted_at without transferring it`);
  assert(!readContract[source].select.includes("deleted_at"), `${source} select must not transfer deleted_at`);
}
assert.equal(readContract.guidanceEvents.predicates.kind, "eq.client_checkin", "guidance events must be restricted to client_checkin");
assert(readContract.guidanceEvents.select.includes("note:payload->>note"), "guidance event select must encode JSON note extraction as an alias");
assert(!readContract.guidanceEvents.select.includes(",payload,"), "guidance event select must not transfer the full payload JSON");
assert(!readContract.signalReviews.transfer.includes("deleted_at"), "signal review contract must not invent a deleted_at field");

console.log("TRAINER_ATTENTION_MODEL_PASS");
