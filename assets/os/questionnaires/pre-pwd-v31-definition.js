import {
  PRE_PWD_V3_DEFINITION,
  PRE_PWD_V3_TRAINER_BRIEF
} from "./pre-pwd-v3-definition.js";

const deepClone = value => JSON.parse(JSON.stringify(value));
const deepFreeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

const answerIn = (questionId, values) => ({ mode: "answer_in", questionId, values });
const all = rules => ({ mode: "all", rules });
const painPositive = ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"];
const pregnancyApplies = answerIn("q_pregnancy_applicability", ["applies"]);

const definition = deepClone(PRE_PWD_V3_DEFINITION);
definition.version = "3.1";
definition.sourceLabel = `${PRE_PWD_V3_DEFINITION.sourceLabel} | Studio Las contract 3.1`;
definition.architecture.healthDraftServerPersistence = "requires_explicit_pre_health_consent_receipt";
definition.architecture.productionRelease = "blocked_pending_health_data_consent_legal_review";
definition.unresolvedRules = definition.unresolvedRules.filter(rule => rule.id === "health_data_consent_and_autosave");
definition.resolvedRules = [
  {
    id: "pain_13i_visibility",
    decision: "13I follows the same positive-answer gate as 13A-13H",
    decidedIn: "3.1"
  },
  {
    id: "pregnancy_module_applicability",
    decision: "Use a neutral client-declared applicability gate; never infer from sex, age or profile data",
    decidedIn: "3.1"
  }
];
definition.persistenceContract = {
  browserPersistence: "forbidden",
  serverDraft: {
    allowedOnlyAfter: "health_data_processing_gate_receipt",
    trainerVisibilityBeforeSubmission: "forbidden",
    healthSectionIds: ["health_safety", "pain_discomfort", "injury_surgery", "pregnancy_postpartum"]
  }
};
definition.preHealthGate = {
  id: "health_data_processing_gate",
  sourceRef: "privacy.3",
  placement: "before_section:health_safety",
  type: "explicit_confirmation",
  required: true,
  label: "Wyrażam zgodę na przetwarzanie podanych przeze mnie danych dotyczących zdrowia w celu przygotowania i prowadzenia usługi.",
  legalReviewRequired: true,
  privacyNoticeLinkRequired: true,
  blocksHealthDataServerPersistenceUntilReceipt: true,
  withdrawalMustBeSupported: true
};

const findSection = id => definition.sections.find(section => section.id === id);
const findQuestion = id => definition.sections.flatMap(section => section.questions || []).find(question => question.id === id);

const q13i = findQuestion("q13i_neurological_sensation");
q13i.visibleWhen = answerIn("q13_pain", painPositive);

const pregnancySection = findSection("pregnancy_postpartum");
pregnancySection.clientIntro = "Najpierw sam lub sama określasz, czy ta część dotyczy Twojej sytuacji.";
pregnancySection.applicability = {
  mode: "client_declared_gate",
  questionId: "q_pregnancy_applicability",
  noInferenceFromProfile: true
};
pregnancySection.questions.unshift({
  id: "q_pregnancy_applicability",
  sourceRef: "product.3.1.pregnancy_applicability",
  label: "Czy sekcja dotycząca ciąży lub okresu po porodzie dotyczy obecnie Twojej sytuacji?",
  type: "single_choice",
  required: true,
  options: [
    { value: "applies", label: "Tak" },
    { value: "not_applicable", label: "Nie" },
    { value: "prefer_discuss", label: "Wolę omówić to z trenerem" }
  ]
});
for (const question of pregnancySection.questions.slice(1)) {
  question.visibleWhen = question.visibleWhen
    ? all([pregnancyApplies, question.visibleWhen])
    : pregnancyApplies;
}

const privacySection = findSection("privacy_confirmations");
privacySection.questions = privacySection.questions.filter(question => question.id !== "consent_health_data");
privacySection.clientIntro = "Na końcu potwierdzasz poprawność informacji i rozumienie roli trenera. Zgoda dotycząca danych zdrowotnych jest pobierana wcześniej, przed ich pierwszym zapisem.";

export const PRE_PWD_V31_DEFINITION = deepFreeze(definition);

const trainerBrief = deepClone(PRE_PWD_V3_TRAINER_BRIEF);
const pregnancyBrief = trainerBrief.find(item => item.id === "pregnancy");
pregnancyBrief.sources = ["product.3.1.pregnancy_applicability", ...pregnancyBrief.sources];
const clarifyBrief = trainerBrief.find(item => item.id === "clarify");
clarifyBrief.sources = ["product.3.1.pregnancy_applicability"];
clarifyBrief.rule = "include when pregnancy applicability = prefer_discuss or another answer requires trainer clarification";
export const PRE_PWD_V31_TRAINER_BRIEF = deepFreeze(trainerBrief);

export function listPrePwdV31Questions() {
  return PRE_PWD_V31_DEFINITION.sections.flatMap(section => section.questions || []);
}

export function findPrePwdV31Question(questionId) {
  return listPrePwdV31Questions().find(question => question.id === questionId) || null;
}

function answerContains(answer, value) {
  return Array.isArray(answer) ? answer.includes(value) : answer === value;
}

export function evaluatePrePwdV31Visibility(rule, answers = {}) {
  if (!rule) return true;
  if (rule.mode === "answer_in") return rule.values.some(value => answerContains(answers[rule.questionId], value));
  if (rule.mode === "any") return rule.rules.some(child => evaluatePrePwdV31Visibility(child, answers));
  if (rule.mode === "all") return rule.rules.every(child => evaluatePrePwdV31Visibility(child, answers));
  if (rule.mode === "blocked_pending_rule") return false;
  throw new Error(`Unsupported pre-PWD v3.1 visibility rule: ${rule.mode}`);
}
