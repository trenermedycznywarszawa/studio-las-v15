const STAGE_SECTION_ORDER = Object.freeze({
  1: Object.freeze([
    "identity",
    "now",
    "pwd",
    "sessionBrief",
    "signals",
    "timeline",
    "sessions",
    "assessments",
    "measurements",
    "guidance",
    "reports",
    "cycleDecision"
  ]),
  2: Object.freeze([
    "identity",
    "now",
    "sessionBrief",
    "guidance",
    "signals",
    "timeline",
    "pwd",
    "sessions",
    "assessments",
    "measurements",
    "reports",
    "cycleDecision"
  ]),
  3: Object.freeze([
    "identity",
    "now",
    "sessionBrief",
    "signals",
    "sessions",
    "guidance",
    "timeline",
    "assessments",
    "measurements",
    "pwd",
    "reports",
    "cycleDecision"
  ]),
  4: Object.freeze([
    "identity",
    "now",
    "cycleDecision",
    "reports",
    "sessionBrief",
    "signals",
    "timeline",
    "sessions",
    "guidance",
    "assessments",
    "measurements",
    "pwd"
  ])
});

function normalizedStage(stage) {
  const value = Number(stage);
  return Object.prototype.hasOwnProperty.call(STAGE_SECTION_ORDER, value) ? value : 1;
}

export function trainerSectionOrder(stage) {
  return [...STAGE_SECTION_ORDER[normalizedStage(stage)]];
}

export function orderTrainerSections(stage, sections = {}) {
  const ordered = [];
  const seen = new Set();

  trainerSectionOrder(stage).forEach(key => {
    seen.add(key);
    if (sections[key]) ordered.push(sections[key]);
  });

  Object.entries(sections).forEach(([key, section]) => {
    if (!seen.has(key) && section) ordered.push(section);
  });

  return ordered;
}
