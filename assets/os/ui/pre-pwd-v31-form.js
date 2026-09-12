import { create, statusBox } from "./common.js";
import {
  PRE_PWD_V31_DEFINITION,
  evaluatePrePwdV31Visibility
} from "../questionnaires/pre-pwd-v31-definition.js";

export const PRE_PWD_V31_SUPPORTED_TYPES = Object.freeze([
  "short_text",
  "long_text",
  "tel",
  "single_choice",
  "multi_choice",
  "scale_0_10",
  "confirmation"
]);

const HEALTH_SECTION_IDS = new Set(
  PRE_PWD_V31_DEFINITION.persistenceContract.serverDraft.healthSectionIds
);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function answerPresent(question, value) {
  if (question.type === "multi_choice") return asArray(value).length > 0;
  if (question.type === "confirmation") return value === true;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function allQuestions() {
  return [
    ...PRE_PWD_V31_DEFINITION.profileFields,
    ...PRE_PWD_V31_DEFINITION.sections.flatMap(section => section.questions || [])
  ];
}

export function normalizePrePwdV31Answers(input = {}) {
  const next = { ...input };
  let changed = true;

  while (changed) {
    changed = false;
    for (const question of allQuestions()) {
      if (question.visibleWhen && !evaluatePrePwdV31Visibility(question.visibleWhen, next)) {
        if (Object.prototype.hasOwnProperty.call(next, question.id)) {
          delete next[question.id];
          changed = true;
        }
        continue;
      }

      if (question.type !== "multi_choice" || !Array.isArray(next[question.id])) continue;
      let values = [...new Set(next[question.id])];
      const exclusive = new Set(question.exclusiveValues || []);
      const selectedExclusive = values.find(value => exclusive.has(value));
      if (selectedExclusive) values = [selectedExclusive];
      if (question.maxSelections && values.length > question.maxSelections) {
        values = values.slice(0, question.maxSelections);
      }
      if (values.length !== next[question.id].length || values.some((value, index) => value !== next[question.id][index])) {
        next[question.id] = values;
        changed = true;
      }
    }
  }

  return next;
}

export function visiblePrePwdV31Questions(answers = {}, { consentAccepted = false } = {}) {
  const normalized = normalizePrePwdV31Answers(answers);
  const rows = [];
  for (const section of PRE_PWD_V31_DEFINITION.sections) {
    if (HEALTH_SECTION_IDS.has(section.id) && !consentAccepted) continue;
    for (const question of section.questions || []) {
      if (!question.visibleWhen || evaluatePrePwdV31Visibility(question.visibleWhen, normalized)) {
        rows.push(question);
      }
    }
  }
  return rows;
}

export function validatePrePwdV31VisibleAnswers(answers = {}, { consentAccepted = false } = {}) {
  const normalized = normalizePrePwdV31Answers(answers);
  const missing = [];
  for (const question of [...PRE_PWD_V31_DEFINITION.profileFields, ...visiblePrePwdV31Questions(normalized, { consentAccepted })]) {
    if (question.required && !answerPresent(question, normalized[question.id])) missing.push(question.id);
  }
  return { valid: missing.length === 0, missing, answers: normalized };
}

function choiceInput(question, option, answers, onAnswerChange, multi = false) {
  const selected = multi
    ? asArray(answers[question.id]).includes(option.value)
    : answers[question.id] === option.value;
  const input = create("input", {
    type: multi ? "checkbox" : "radio",
    name: question.id,
    value: option.value,
    checked: selected,
    disabled: false
  });
  input.checked = selected;
  input.addEventListener("change", () => {
    if (!multi) {
      onAnswerChange(question.id, option.value);
      return;
    }
    const current = new Set(asArray(answers[question.id]));
    if (input.checked) current.add(option.value); else current.delete(option.value);
    const exclusive = new Set(question.exclusiveValues || []);
    if (input.checked && exclusive.has(option.value)) {
      onAnswerChange(question.id, [option.value]);
      return;
    }
    if (input.checked && [...current].some(value => exclusive.has(value))) {
      for (const value of exclusive) current.delete(value);
    }
    const values = [...current];
    if (question.maxSelections && values.length > question.maxSelections) {
      input.checked = false;
      return;
    }
    onAnswerChange(question.id, values);
  });
  return create("label", { className: "check-field" }, [input, create("span", { text: option.label })]);
}

function textQuestion(question, answers, onAnswerChange, textarea = false) {
  const input = create(textarea ? "textarea" : "input", {
    name: question.id,
    type: textarea ? null : question.type === "tel" ? "tel" : "text",
    rows: textarea ? 4 : null,
    required: question.required,
    value: answers[question.id] ?? ""
  });
  input.value = answers[question.id] ?? "";
  input.addEventListener("input", () => onAnswerChange(question.id, input.value));
  return input;
}

function confirmationQuestion(question, answers, onAnswerChange) {
  const input = create("input", {
    type: "checkbox",
    name: question.id,
    required: question.required
  });
  input.checked = answers[question.id] === true;
  input.addEventListener("change", () => onAnswerChange(question.id, Boolean(input.checked)));
  return create("label", { className: "check-field" }, [
    input,
    create("span", { text: question.label })
  ]);
}

function renderQuestion(question, answers, onAnswerChange) {
  if (!PRE_PWD_V31_SUPPORTED_TYPES.includes(question.type)) {
    throw new Error(`Unsupported pre-PWD v3.1 field type: ${question.type}`);
  }

  if (question.type === "confirmation") {
    return create("fieldset", { className: "record client-record" }, [
      confirmationQuestion(question, answers, onAnswerChange),
      question.help ? create("p", { className: "muted", text: question.help }) : null
    ]);
  }

  const content = [
    create("legend", { text: question.label }),
    question.help ? create("p", { className: "muted", text: question.help }) : null
  ];

  if (question.type === "short_text" || question.type === "tel") {
    content.push(textQuestion(question, answers, onAnswerChange));
  } else if (question.type === "long_text") {
    content.push(textQuestion(question, answers, onAnswerChange, true));
  } else if (question.type === "single_choice") {
    content.push(create("div", { className: "record-list" }, (question.options || []).map(option =>
      choiceInput(question, option, answers, onAnswerChange)
    )));
  } else if (question.type === "multi_choice") {
    content.push(create("div", { className: "record-list" }, (question.options || []).map(option =>
      choiceInput(question, option, answers, onAnswerChange, true)
    )));
  } else if (question.type === "scale_0_10") {
    const options = Array.from({ length: 11 }, (_, value) => ({ value: String(value), label: String(value) }));
    content.push(create("div", { className: "record-list" }, options.map(option =>
      choiceInput(question, option, answers, onAnswerChange)
    )));
    if (question.endpoints) {
      content.push(create("p", { className: "muted", text: `0 — ${question.endpoints.min} · 10 — ${question.endpoints.max}` }));
    }
  }

  return create("fieldset", { className: "record client-record" }, content);
}

function healthGate(consentAccepted, onConsentChange) {
  const input = create("input", { type: "checkbox", name: PRE_PWD_V31_DEFINITION.preHealthGate.id });
  input.checked = Boolean(consentAccepted);
  input.addEventListener("change", () => onConsentChange(Boolean(input.checked)));
  return create("section", { className: "record client-record" }, [
    create("h3", { text: "Dane dotyczące zdrowia" }),
    create("p", { text: PRE_PWD_V31_DEFINITION.preHealthGate.label }),
    create("label", { className: "check-field" }, [input, create("span", { text: "Potwierdzam" })]),
    create("p", { className: "muted", text: "Ta treść wymaga finalnej weryfikacji prawnej przed uruchomieniem zapisu danych zdrowotnych." })
  ]);
}

export function prePwdV31Form({
  answers = {},
  consentAccepted = false,
  onAnswerChange = () => {},
  onConsentChange = () => {}
} = {}) {
  const normalized = normalizePrePwdV31Answers(answers);
  const root = create("div", { className: "questionnaire-form" }, [
    create("div", { className: "section-heading" }, [
      create("h2", { text: "Ankieta przed pierwszą wizytą" }),
      create("p", { text: `Około ${PRE_PWD_V31_DEFINITION.estimatedMinutes} min · odpowiedzi służą przygotowaniu rozmowy z trenerem.` })
    ]),
    statusBox("Formularz nie diagnozuje i nie podejmuje decyzji za trenera.", "info")
  ]);

  const profile = create("section", {}, [
    create("h3", { text: "Dane potrzebne do przygotowania wizyty" }),
    ...PRE_PWD_V31_DEFINITION.profileFields.map(question => renderQuestion(question, normalized, onAnswerChange))
  ]);
  root.append(profile);

  for (const section of PRE_PWD_V31_DEFINITION.sections) {
    if (section.id === "health_safety") root.append(healthGate(consentAccepted, onConsentChange));
    if (HEALTH_SECTION_IDS.has(section.id) && !consentAccepted) {
      if (section.id === "health_safety") {
        root.append(statusBox("Pytania dotyczące zdrowia pozostają ukryte do czasu świadomego potwierdzenia powyżej.", "info"));
      }
      continue;
    }
    const questions = (section.questions || []).filter(question =>
      !question.visibleWhen || evaluatePrePwdV31Visibility(question.visibleWhen, normalized)
    );
    const sectionNode = create("section", { className: "questionnaire-section" }, [
      create("h3", { text: section.title }),
      section.clientIntro ? create("p", { className: "muted", text: section.clientIntro }) : null,
      ...questions.map(question => renderQuestion(question, normalized, onAnswerChange))
    ]);
    root.append(sectionNode);
  }

  return root;
}
