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
  if (snapshot.rendererKey && snapshot.rendererKey !== "pre_pwd_v31") {
    throw new Error(`Nieobsługiwany sposób wyświetlania podsumowania ankiety: ${snapshot.rendererKey}`);
  }
  // Legacy/unit callers may not provide rendererKey. Keep their historical
  // 3.1 guard, while runtime overlays (3.2, 3.3, …) are versioned by the
  // explicit renderer contract rather than by an arbitrary release number.
  if (!snapshot.rendererKey && snapshot.versionCode && snapshot.versionCode !== "3.1") {
    throw new Error(`Nieobsługiwana wersja podsumowania ankiety: ${snapshot.versionCode}`);
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
    guardrail: "To są informacje przekazane przez klienta do przygotowania rozmowy. Znaczenie nadaje trener; podsumowanie nie stawia rozpoznań, nie kwalifikuje medycznie i nie zmienia planu automatycznie."
  };
}


// Full, read-only presentation of a consciously submitted answer set.
// The brief remains selective; this view must never silently omit source answers.
export function buildPrePwdV31FullAnswers(snapshot = {}) {
  // Reuse the existing strict renderer/version guard.
  buildPrePwdV31TrainerBrief(snapshot);
  const answers = snapshot.answers && typeof snapshot.answers === "object" && !Array.isArray(snapshot.answers)
    ? snapshot.answers
    : {};
  const visited = new Set();
  const sections = PRE_PWD_V31_DEFINITION.sections.map(section => {
    const lines = (section.questions || []).flatMap(field => {
      if (!Object.prototype.hasOwnProperty.call(answers, field.id)) return [];
      visited.add(field.id);
      const value = answers[field.id];
      const displayedValue = value === null || value === "" || (Array.isArray(value) && !value.length)
        ? "(nie podano)"
        : value !== null && typeof value === "object" && !Array.isArray(value)
          ? JSON.stringify(value)
          : formatAnswer(field, value);
      return [{
        questionId: field.id,
        label: field.label,
        value: displayedValue,
        sourceRef: field.sourceRef || field.id
      }];
    });
    return lines.length ? { id: section.id, label: section.title, lines } : null;
  }).filter(Boolean);

  const unexpected = Object.keys(answers).filter(id => !visited.has(id)).sort();
  if (unexpected.length) {
    sections.push({
      id: "unmapped_source_answers",
      label: "Odpowiedzi spoza znanej definicji — sprawdź źródło",
      lines: unexpected.map(id => ({
        questionId: id,
        label: "Nieznane pole: " + id,
        value: typeof answers[id] === "object" ? JSON.stringify(answers[id]) : String(answers[id]),
        sourceRef: id
      }))
    });
  }
  return {
    assignmentId: snapshot.assignmentId || null,
    versionCode: snapshot.versionCode || null,
    submittedAt: snapshot.submittedAt || null,
    sections,
    answerCount: Object.keys(answers).length,
    displayedCount: sections.reduce((total, section) => total + section.lines.length, 0)
  };
}
