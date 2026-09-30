import { buildTrainerAttentionModel } from "../assets/os/trainer-attention-model.js";

export const LAB_DATE = "2026-09-30";
export const LAB_SCENARIOS = Object.freeze([
  { id: "quiet", label: "Bez nowych zdarzeń" },
  { id: "question", label: "Pytanie klienta" },
  { id: "session", label: "Sygnał po sesji" },
  { id: "contact", label: "Otwarty kontakt" }
]);

export function buildLabModel(state) {
  return buildTrainerAttentionModel(state.snapshot, { today: LAB_DATE });
}

export function createLabState(scenario = "quiet") {
  if (!LAB_SCENARIOS.some(item => item.id === scenario)) throw new TypeError("Unknown lab scenario");
  const names = ["Anna K.", "Marek P.", "Ewa S.", "Piotr R.", "Kasia W.", "Tomasz L."];
  const ids = ["anna", "marek", "ewa", "piotr", "kasia", "tomasz"];
  const snapshot = {
    clients: names.map((name, index) => ({
      id: ids[index], name, status: "active", stage: 6,
      stage_label: "Prowadzenie", next_session_date: null, next_review_date: null
    })),
    // Normal sessions, information-only load and absent records remain quiet.
    // No reminder is manufactured from silence or missing measurements.
    sessions: [{
      id: "session-marek", client_id: "marek", date: "2026-09-21",
      vas_before: 2, vas_after: 2, readiness: 7, sleep_quality: "dobry",
      updated_at: "2026-09-21T10:00:00Z"
    }],
    trainingLoad: [{
      id: "load-marek", client_id: "marek", observed_at: "2026-09-21",
      rpe: 6, zone_high_min: 3, updated_at: "2026-09-21T10:00:00Z"
    }],
    preSessionChecks: [], guidanceEvents: [], signalReviews: []
  };
  const state = { scenario, snapshot, history: [] };
  if (scenario === "question" || scenario === "contact") {
    snapshot.guidanceEvents.push({
      id: "event-anna", client_id: "anna", event_date: LAB_DATE,
      created_at: `${LAB_DATE}T08:15:00Z`,
      note: "Nie jestem pewna, czy dobrze robię ćwiczenie z gumą. Czy możemy je sprawdzić na najbliższej sesji?"
    });
  }
  if (scenario === "session") {
    snapshot.sessions.push({
      id: "session-piotr", client_id: "piotr", date: LAB_DATE,
      vas_before: 2, vas_after: 4, readiness: 7, sleep_quality: "dobry",
      updated_at: `${LAB_DATE}T10:00:00Z`
    });
  }
  return scenario === "contact"
    ? reviewLabSignal(state, buildLabModel(state).attention[0].signalKey, "contact_required")
    : state;
}

// Existing review outcomes/identities, in memory only. No repository or API.
export function reviewLabSignal(state, signalKey, outcome) {
  if (!["noted_no_change", "contact_required", "contact_resolved"].includes(outcome)) {
    throw new TypeError("Unsupported lab review outcome");
  }
  const item = buildLabModel(state).attention.find(row => row.signalKey === signalKey);
  if (!item) throw new TypeError("Only an open attention signal can be reviewed");
  if (outcome === "contact_resolved" && item.kind !== "contact") {
    throw new TypeError("An open contact is required");
  }
  if (item.kind === "contact" && outcome !== "contact_resolved") {
    throw new TypeError("An open contact must be explicitly resolved");
  }
  const next = structuredClone(state);
  const review = next.snapshot.signalReviews.find(row => row.signal_key === signalKey);
  const values = {
    id: review?.id || `lab-review-${next.history.length + 1}`,
    client_id: item.clientId, signal_key: signalKey,
    outcome: outcome === "contact_resolved" ? "contact_required" : outcome,
    contact_resolved_at: outcome === "contact_resolved" ? `${LAB_DATE}T11:00:00Z` : null
  };
  if (review) Object.assign(review, values);
  else next.snapshot.signalReviews.push(values);
  next.history.push({
    clientId: item.clientId, client: item.client, source: item.source,
    context: item.context, outcome, date: LAB_DATE
  });
  return next;
}
