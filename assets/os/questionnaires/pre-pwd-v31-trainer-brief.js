import {
  PRE_PWD_V31_DEFINITION,
  PRE_PWD_V31_TRAINER_BRIEF
} from "./pre-pwd-v31-definition.js";

const allFields = [
  ...PRE_PWD_V31_DEFINITION.profileFields,
  ...PRE_PWD_V31_DEFINITION.sections.flatMap(section => section.questions || [])
];

const fieldBySourceRef = new Map(
  allFields
    .filter(field => field.sourceRef)
    .map(field => [field.sourceRef, field])
);

function hasAnswer(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

function optionLabel(field, value) {
  return field?.options?.find(option => option.value === value)?.label || String(value);
}

function formatAnswer(field, value) {
  if (Array.isArray(value)) return value.map(item => optionLabel(field, item)).join(", ");
  if (field?.options?.length) return optionLabel(field, value);
  if (typeof value === "boolean") return value ? "Tak" : "Nie";
  return String(value);
}

function sourceLine(sourceRef, answers, snapshot) {
  if (sourceRef === "client_profile.goal_snapshot") {
    if (!hasAnswer(snapshot.goalSnapshot)) return null;
    return {
      sourceRef,
      sourceType: "assignment_goal_snapshot",
      sourceDate: snapshot.submittedAt || null,
      label: "Cel ustalony przed ankietą",
      value: String(snapshot.goalSnapshot)
    };
  }

  const field = fieldBySourceRef.get(sourceRef);
  if (!field) return null;
  const value = answers[field.id];
  if (!hasAnswer(value)) return null;
  return {
    sourceRef,
    sourceType: "questionnaire_response",
    sourceDate: snapshot.submittedAt || null,
    label: field.label,
    value: formatAnswer(field, value)
  };
}

export function buildPrePwdV31TrainerBrief(snapshot = {}) {
  if (snapshot.versionCode && snapshot.versionCode !== "3.1") {
    throw new Error(`Unsupported pre-PWD trainer brief version: ${snapshot.versionCode}`);
  }
  const answers = snapshot.answers && typeof snapshot.answers === "object" && !Array.isArray(snapshot.answers)
    ? snapshot.answers
    : {};

  const items = PRE_PWD_V31_TRAINER_BRIEF.map(spec => {
    const lines = spec.sources
      .map(sourceRef => sourceLine(sourceRef, answers, snapshot))
      .filter(Boolean);
    return lines.length ? { id: spec.id, label: spec.label, lines } : null;
  }).filter(Boolean);

  return {
    title: "PRZED WIZYTĄ — 60 SEKUND",
    assignmentId: snapshot.assignmentId || null,
    clientId: snapshot.clientId || null,
    submittedAt: snapshot.submittedAt || null,
    items,
    guardrail: "To są informacje przekazane przez klienta do przygotowania rozmowy. Znaczenie nadaje trener; brief nie diagnozuje, nie kwalifikuje medycznie i nie zmienia planu automatycznie."
  };
}
