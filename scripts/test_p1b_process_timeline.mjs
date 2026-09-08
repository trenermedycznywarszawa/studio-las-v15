import assert from "node:assert/strict";
import { buildProcessTimeline, PROCESS_TIMELINE_SEMANTICS } from "../assets/os/process-timeline.js";

const workspace = {
  client: {
    id: "client-1",
    start_date: "2026-08-01",
    updated_at: "2026-09-08T12:00:00Z",
    goal: "Wrócić do swobodnego chodzenia po schodach"
  },
  intakes: [{
    id: "intake-1",
    created_at: "2026-08-01T08:00:00Z",
    main_goal: "Schody bez obawy"
  }],
  sessions: [{
    id: "session-1",
    session_type: "session",
    date: "2026-09-05",
    client_summary: "Pierwsza seria wejść bez zatrzymania",
    trainer_observation: "Lepsza kontrola zejścia",
    trainer_decision: "Zwiększyć objętość stopniowo"
  }],
  preSessionChecks: [{
    id: "pre-1",
    check_date: "2026-09-05",
    poor_sleep: true,
    pain_increased: false,
    home_plan_done: true,
    new_symptoms: false,
    red_flag_concern: false,
    planned_decision: "zmniejsz obciążenie",
    trainer_note: "Sen gorszy niż zwykle"
  }],
  postSessionObservations: [{
    id: "post-1",
    date: "2026-09-05",
    client_response: "Bez nasilenia objawów",
    decision: "kontynuuj"
  }],
  measurements: [{
    id: "measurement-1",
    measured_at: "2026-09-02",
    source: "Tanita",
    weight_kg: 78.2,
    fat_percent: 21.1,
    trainer_interpretation: "Masa stabilna"
  }],
  trainingLoad: [{
    id: "load-1",
    observed_at: "2026-09-05",
    duration_min: 48,
    rpe: 6,
    hr_avg: 118,
    trainer_note: "Tolerancja dobra",
    load_decision: "progresja"
  }],
  assessments: [{
    id: "assessment-1",
    performed_at: "2026-09-03",
    test_name: "Siad-wstań",
    result_text: "10 powtórzeń",
    interpretation: "Ruch pewniejszy",
    trainer_decision: "utrzymaj kierunek"
  }],
  homePlans: [
    {
      id: "plan-published",
      title: "Schody",
      focus: "Pewne wejście na stopień",
      published_at: "2026-09-04T09:00:00Z",
      guidance_channel: "paper"
    },
    {
      id: "plan-draft",
      title: "Nie pokazuj szkicu",
      created_at: "2026-09-07T09:00:00Z",
      published_at: null
    }
  ],
  guidanceEvents: [{
    id: "checkin-1",
    event_date: "2026-09-07",
    payload: {
      protocol_done: true,
      energy_score: 4,
      symptom_score: 2,
      note: "Schody rano łatwiejsze"
    }
  }],
  reports: [{
    id: "report-1",
    status: "published",
    title: "Raport 12 tygodni",
    published_at: "2026-09-08T09:00:00Z",
    content: "Wzorzec poprawy stabilny"
  }],
  cycleDecisions: [{
    id: "cycle-1",
    decision: "CONTINUE",
    rationale: "Cel jeszcze nie jest utrwalony",
    decided_at: "2026-09-08T10:00:00Z"
  }],
  signalReviews: [{
    id: "review-1",
    signal_key: "sleep",
    outcome: "reviewed_continue",
    reviewed_at: "2026-09-06T10:00:00Z"
  }],
  tasks: [{ id: "task-1", created_at: "2026-09-08T11:00:00Z", text: "Nie jest częścią P1-B" }],
  documents: [{ id: "doc-1", created_at: "2026-09-08T11:30:00Z" }],
  homePlanItems: [{ id: "item-1", added_at: "2026-09-08" }]
};

const before = JSON.stringify(workspace);
const timeline = buildProcessTimeline(workspace);
assert.equal(JSON.stringify(workspace), before, "timeline projection must not mutate workspace");
assert.ok(timeline.length >= 15, "expected high-signal process events");

assert.deepEqual(Object.keys(PROCESS_TIMELINE_SEMANTICS).sort(), ["DECISION", "FACT", "INTERPRETATION"]);
for (const item of timeline) {
  assert.ok(["FACT", "INTERPRETATION", "DECISION"].includes(item.semantic));
  assert.ok(item.sourceType, "source type must be preserved");
  assert.ok(item.sourceId, "source row id must be preserved");
  assert.ok(item.sourceDate, "source date must be preserved");
  assert.ok(item.label, "human label is required");
}

const sessionEvents = timeline.filter(item => item.sourceType === "sessions" && item.sourceId === "session-1");
assert.deepEqual(new Set(sessionEvents.map(item => item.semantic)), new Set(["FACT", "INTERPRETATION", "DECISION"]));

const measurementEvents = timeline.filter(item => item.sourceId === "measurement-1");
assert.deepEqual(new Set(measurementEvents.map(item => item.semantic)), new Set(["FACT", "INTERPRETATION"]));

assert.ok(timeline.some(item => item.sourceId === "checkin-1" && item.semantic === "FACT" && item.value.includes("Schody rano łatwiejsze")));
assert.ok(timeline.some(item => item.sourceId === "plan-published" && item.semantic === "DECISION"));
assert.ok(!timeline.some(item => item.sourceId === "plan-draft"), "draft Guidance must not become a process event");
assert.ok(timeline.some(item => item.sourceId === "report-1" && item.semantic === "INTERPRETATION"));
assert.equal(timeline[0].sourceId, "cycle-1", "latest dated decision should lead the chronology");

assert.ok(!timeline.some(item => item.sourceId === "task-1"));
assert.ok(!timeline.some(item => item.sourceId === "doc-1"));
assert.ok(!timeline.some(item => item.sourceId === "item-1"));
assert.ok(!timeline.some(item => item.sourceDate === workspace.client.updated_at), "generic client updated_at must not be presented as goal-change evidence");

for (let index = 1; index < timeline.length; index += 1) {
  const previous = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(timeline[index - 1].sourceDate)
    ? `${timeline[index - 1].sourceDate}T12:00:00Z`
    : timeline[index - 1].sourceDate);
  const current = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(timeline[index].sourceDate)
    ? `${timeline[index].sourceDate}T12:00:00Z`
    : timeline[index].sourceDate);
  assert.ok(previous >= current, "timeline must be sorted newest to oldest");
}

console.log("P1-B read-only process timeline tests completed");
