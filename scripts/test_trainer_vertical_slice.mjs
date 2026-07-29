import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildTrainerWorkspace,
  composeTrainerObservation,
  prepareSessionInput
} from "../assets/os/trainer-workspace.js";

const workspace = {
  client: {
    stage: 3,
    next_session_date: "2026-07-29",
    goal: "Spokojnie wrócić do schodów.",
    contraindications: "Bez skoków do ponownej oceny.",
    updated_at: "2026-07-24T09:00:00Z"
  },
  sessions: [{
    date: "2026-07-25",
    trainer_decision: "Sprawdzić tolerancję spokojnego zejścia.",
    client_next_step: "Powtórzyć krótki spacer i zapisać sygnał.",
    created_at: "2026-07-25T12:00:00Z"
  }],
  preSessionChecks: [{
    check_date: "2026-07-25",
    trainer_note: "Najpierw zapytać o nowy obrzęk.",
    created_at: "2026-07-25T08:00:00Z"
  }],
  intakes: [],
  homePlans: [],
  homePlanItems: [],
  guidanceEvents: [{
    kind: "client_checkin",
    event_date: "2026-07-26",
    completed: true,
    payload: { note: "Schody spokojniejsze niż tydzień temu." },
    created_at: "2026-07-26T08:00:00Z"
  }]
};

const model = buildTrainerWorkspace(workspace);
assert.equal(model.today.phase.value, "3");
assert.equal(model.today.nextSession.value, "2026-07-29");
assert.equal(model.today.lastDecision.value, "Sprawdzić tolerancję spokojnego zejścia.");
assert.match(model.today.latestClientSignal.value, /Schody spokojniejsze/);
assert.equal(model.today.nextStep.value, "Powtórzyć krótki spacer i zapisać sygnał.");
assert.equal(model.brief.changedSinceSession.label, "Nowy sygnał od poprzedniej sesji");
assert.equal(model.brief.thingToCheck.value, "Najpierw zapytać o nowy obrzęk.");
assert.equal(model.previousSignal, model.today.latestClientSignal);

const composed = composeTrainerObservation(
  "Klient schodził bez zatrzymania.",
  "Więcej pewności przy mniejszym tempie."
);
assert.equal(
  composed,
  "Obserwacja:\nKlient schodził bez zatrzymania.\n\nInterpretacja trenera:\nWięcej pewności przy mniejszym tempie."
);

const sessionInput = prepareSessionInput({
  date: "2026-07-28",
  observation: "Fakt.",
  interpretation: "Moja interpretacja.",
  trainerDecision: "Moja decyzja.",
  clientNextStep: "Następny krok.",
  previousSignal: "Nie kopiuj mnie.",
  readiness: "10"
});
assert.deepEqual(Object.keys(sessionInput), [
  "date",
  "trainerObservation",
  "trainerDecision",
  "clientNextStep"
]);
assert.doesNotMatch(JSON.stringify(sessionInput), /Nie kopiuj mnie|readiness/i);

const empty = buildTrainerWorkspace({
  client: { stage: 1 },
  sessions: [],
  preSessionChecks: [],
  intakes: [],
  homePlans: [],
  homePlanItems: [],
  guidanceEvents: []
});
assert.equal(empty.brief.changedSinceSession, null);
assert.equal(empty.brief.thingToCheck, null);
assert.equal(empty.today.missing.length, 4);

const appSource = readFileSync(new URL("../assets/os/app.js", import.meta.url), "utf8");
assert.match(appSource, /workspaceRequestId/);
assert.match(appSource, /clientId !== state\.activeClientId/);
assert.match(appSource, /prepareSessionInput\(values\)/);
assert.doesNotMatch(appSource, /collectAttentionSignals/);

const formsSource = readFileSync(new URL("../assets/os/ui/forms.js", import.meta.url), "utf8");
const sessionFormSource = formsSource.split("export function sessionForm", 2)[1]
  .split("export function measurementForm", 1)[0];
assert.match(sessionFormSource, /observation/);
assert.match(sessionFormSource, /interpretation/);
assert.match(sessionFormSource, /trainerDecision/);
assert.doesNotMatch(sessionFormSource, /readiness|vasBefore|sleepQuality|clientVisible/);

console.log("Trainer vertical slice unit tests completed");
