import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTrainerSessionBrief } from "../assets/os/session-brief.js";

const workspace = {
  client: {
    goal: "Odzyskać zaufanie do kolana.",
    contraindications: "Bez skoków do czasu ponownej oceny.",
    red_flags_text: "Skonsultować każdy nowy obrzęk.",
    next_session_date: "2026-07-24",
    next_review_date: "2026-08-15",
    updated_at: "2026-07-20T09:00:00Z"
  },
  intakes: [{
    medical_flags: ["Po zabiegu kolana"],
    movement_limitations: ["Niepewność przy schodzeniu"],
    first_session_focus: "Spokojne obciążanie.",
    created_at: "2026-07-01T09:00:00Z"
  }],
  sessions: [
    { date: "2026-07-21", trainer_decision: "", created_at: "2026-07-21T12:00:00Z" },
    { date: "2026-07-18", trainer_decision: "Utrzymać spokojne tempo i obserwować schodzenie.", created_at: "2026-07-18T12:00:00Z" }
  ],
  homePlans: [
    { id: "draft", status: "draft", focus: "Nie pokazuj", created_at: "2026-07-22T10:00:00Z" },
    { id: "active", status: "active", title: "Kierunek tygodnia", focus: "Pewne wstawanie i spokojny spacer.", published_at: "2026-07-19T10:00:00Z" }
  ],
  homePlanItems: [
    { id: "hidden", home_plan_id: "active", name: "Nieopublikowane", status: "active", sort_order: 0 },
    { id: "walk", home_plan_id: "active", name: "Spokojny spacer", dosage: "10 minut", frequency: "3 razy", client_cue: "Zostaw zapas.", stop_criteria: "Przerwij przy nowym objawie.", status: "active", sort_order: 2, published_at: "2026-07-19T10:05:00Z" },
    { id: "chair", home_plan_id: "active", name: "Wstawanie z krzesła", dosage: "2 × 5", status: "active", sort_order: 1, published_at: "2026-07-19T10:04:00Z" }
  ],
  guidanceEvents: [
    { kind: "client_checkin", home_plan_item_id: "chair", event_date: "2026-07-20", completed: true, payload: { energyScore: 6, symptomScore: 2 } },
    { kind: "client_checkin", home_plan_item_id: "walk", event_date: "2026-07-21", completed: false, payload: { energyScore: 4, symptomScore: 3, note: "Zmęczenie po pracy." } }
  ]
};

const brief = buildTrainerSessionBrief(workspace);

assert.equal(brief.safety.length, 4);
assert.equal(brief.currentFocus.value, "Pewne wstawanie i spokojny spacer.");
assert.equal(brief.currentFocus.sourceType, "Aktywny plan domowy");
assert.equal(brief.lastDecision.value, "Utrzymać spokojne tempo i obserwować schodzenie.");
assert.equal(brief.lastDecision.sourceDate, "2026-07-18");
assert.match(brief.latestClientSignal.value, /Wykonane: nie/);
assert.match(brief.latestClientSignal.value, /Zmęczenie po pracy/);
assert.equal(brief.latestClientSignal.sourceType, "Check-in klienta — Spokojny spacer");
assert.deepEqual(brief.activeGuidance.map(item => item.label), ["Wstawanie z krzesła", "Spokojny spacer"]);
assert.equal(brief.nextSession.value, "2026-07-24");
assert.equal(brief.reviewPoint.value, "2026-08-15");
for (const item of [...brief.safety, brief.currentFocus, brief.lastDecision, brief.latestClientSignal, ...brief.activeGuidance, brief.nextSession, brief.reviewPoint]) {
  assert.ok(item.sourceType);
  assert.ok(item.sourceDate);
}

const empty = buildTrainerSessionBrief({ client: {} });
assert.deepEqual(empty.safety, []);
assert.equal(empty.currentFocus, null);
assert.equal(empty.lastDecision, null);
assert.equal(empty.latestClientSignal, null);
assert.deepEqual(empty.activeGuidance, []);

const dataSource = readFileSync(new URL("../assets/os/data.js", import.meta.url), "utf8");
assert.match(dataSource, /this\.rest\("guidance_events"[\s\S]*kind: "eq\.client_checkin"[\s\S]*limit: 1/);
assert.doesNotMatch(dataSource, /insert\("guidance_events"/);

console.log("Trainer Session Brief tests completed");
