import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  orderTrainerSections,
  trainerSectionOrder
} from "../assets/os/ui/trainer-order.js";

const expected = {
  1: [
    "identity", "now", "questionnaireBrief", "pwd", "sessionBrief", "signals", "sessions",
    "assessments", "measurements", "guidance", "reports", "cycleDecision"
  ],
  2: [
    "identity", "now", "sessionBrief", "questionnaireBrief", "guidance", "signals", "pwd",
    "sessions", "assessments", "measurements", "reports", "cycleDecision"
  ],
  3: [
    "identity", "now", "sessionBrief", "questionnaireBrief", "signals", "sessions", "guidance",
    "assessments", "measurements", "pwd", "reports", "cycleDecision"
  ],
  4: [
    "identity", "now", "cycleDecision", "reports", "sessionBrief", "questionnaireBrief", "signals",
    "sessions", "guidance", "assessments", "measurements", "pwd"
  ]
};

for (const [stage, order] of Object.entries(expected)) {
  assert.deepEqual(trainerSectionOrder(stage), order);
}

assert.deepEqual(trainerSectionOrder("unknown"), expected[1]);

const keyedSections = Object.fromEntries(
  Object.keys({
    identity: true,
    now: true,
    cycleDecision: true,
    questionnaireBrief: true,
    pwd: true,
    signals: true,
    sessionBrief: true,
    sessions: true,
    measurements: true,
    assessments: true,
    guidance: true,
    reports: true
  }).map(key => [key, key])
);

for (const [stage, order] of Object.entries(expected)) {
  assert.deepEqual(orderTrainerSections(stage, keyedSections), order);
}

// Stage 1 is the PWD preparation phase: a consciously submitted questionnaire
// brief must be read before the trainer enters the PWD workflow.
assert.ok(expected[1].indexOf("questionnaireBrief") < expected[1].indexOf("pwd"));
assert.ok(expected[1].indexOf("pwd") < expected[1].indexOf("sessionBrief"));
assert.ok(expected[2].indexOf("sessionBrief") < expected[2].indexOf("pwd"));
assert.ok(expected[2].indexOf("questionnaireBrief") < expected[2].indexOf("pwd"));
assert.ok(expected[2].indexOf("guidance") < expected[2].indexOf("pwd"));
assert.ok(expected[3].indexOf("sessions") < expected[3].indexOf("pwd"));
assert.ok(expected[3].indexOf("guidance") < expected[3].indexOf("pwd"));
assert.ok(expected[4].indexOf("reports") < expected[4].indexOf("pwd"));
assert.ok(expected[4].indexOf("cycleDecision") < expected[4].indexOf("reports"));

const missingOptional = { ...keyedSections, cycleDecision: null };
assert.deepEqual(
  orderTrainerSections(4, missingOptional),
  expected[4].filter(key => key !== "cycleDecision")
);

const missingQuestionnaire = { ...keyedSections, questionnaireBrief: null };
assert.deepEqual(
  orderTrainerSections(1, missingQuestionnaire),
  expected[1].filter(key => key !== "questionnaireBrief")
);

const trainerStateSource = readFileSync(
  new URL("../assets/os/ui/trainer-state.js", import.meta.url),
  "utf8"
);
const trainerSource = readFileSync(
  new URL("../assets/os/ui/trainer.js", import.meta.url),
  "utf8"
);
const dataSource = readFileSync(
  new URL("../assets/os/data.js", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../assets/os/app.js", import.meta.url),
  "utf8"
);
const inquiryControllerSource = readFileSync(
  new URL("../assets/os/inquiries-controller.js", import.meta.url),
  "utf8"
);

assert.match(trainerStateSource, /const goal = String\(client\.goal \|\| ""\)\.trim\(\)/);
assert.match(trainerStateSource, /"Cel klienta"[\s\S]*goal \|\| "Cel nie został jeszcze zapisany\."/);
assert.doesNotMatch(trainerStateSource, /life_goal|north_star/);
assert.match(trainerSource, /questionnaireBrief:\s*questionnaireBriefPanel\(workspace\)/,
  "Trainer workspace must expose the submitted pre-PWD brief as a phase-aware section.");
assert.match(trainerSource, /orderTrainerSections\(workspace\.client\.stage, sections\)/);
assert.match(
  dataSource,
  /select: "id,name,email,phone,engagement_type,stage,start_date,next_session_date,next_review_date,goal,next_milestone,status,created_at,updated_at"/
);
assert.match(
  appSource,
  /state\.inquiryController\.render\([\s\S]*activeClientId: state\.activeClientId/
);
assert.match(inquiryControllerSource, /render\(workspace, \{ activeClientId = ""/);
assert.doesNotMatch(inquiryControllerSource, /document\.querySelector\("\.client-select"\)/);

console.log("P1-A phase-aware information architecture tests completed");
