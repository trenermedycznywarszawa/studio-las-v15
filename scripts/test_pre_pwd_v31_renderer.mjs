import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRE_PWD_V31_DEFINITION } from "../assets/os/questionnaires/pre-pwd-v31-definition.js";
import {
  PRE_PWD_V31_SUPPORTED_TYPES,
  normalizePrePwdV31Answers,
  validatePrePwdV31VisibleAnswers,
  visiblePrePwdV31Questions
} from "../assets/os/ui/pre-pwd-v31-form.js";

const rendererSource = readFileSync(new URL("../assets/os/ui/pre-pwd-v31-form.js", import.meta.url), "utf8");
const types = new Set([
  ...PRE_PWD_V31_DEFINITION.profileFields,
  ...PRE_PWD_V31_DEFINITION.sections.flatMap(section => section.questions || [])
].map(question => question.type));
for (const type of types) {
  assert(PRE_PWD_V31_SUPPORTED_TYPES.includes(type), `Renderer does not explicitly support field type ${type}`);
}

assert.doesNotMatch(rendererSource, /localStorage|sessionStorage|indexedDB/i,
  "Questionnaire renderer must not persist answers in browser storage");
assert.doesNotMatch(rendererSource, /supabase|\/rest\/v1|rpc\(|fetch\(/i,
  "Questionnaire renderer must not own backend persistence");
assert.doesNotMatch(rendererSource, /Przekaż ankietę trenerowi|type:\s*["']submit["']/i,
  "Renderer phase must not expose a submit path before persistence/legal gate is ready");

const noPain = normalizePrePwdV31Answers({
  q13_pain: "no",
  q13i_neurological_sensation: "often"
});
assert.equal(noPain.q13i_neurological_sensation, undefined,
  "Hidden 13I answer must be removed when pain gate closes");

const painQuestions = visiblePrePwdV31Questions({ q13_pain: "yes_some_limitation" }, { consentAccepted: true });
assert(painQuestions.some(question => question.id === "q13i_neurological_sensation"),
  "13I must be visible after a positive pain answer in v3.1");

const noConsent = visiblePrePwdV31Questions({}, { consentAccepted: false });
for (const sectionId of PRE_PWD_V31_DEFINITION.persistenceContract.serverDraft.healthSectionIds) {
  const healthIds = PRE_PWD_V31_DEFINITION.sections.find(section => section.id === sectionId)?.questions?.map(question => question.id) || [];
  assert(!noConsent.some(question => healthIds.includes(question.id)),
    `Health section ${sectionId} must stay hidden before consent`);
}

const pregnancyHidden = visiblePrePwdV31Questions({
  q_pregnancy_applicability: "not_applicable"
}, { consentAccepted: true });
const pregnancySection = PRE_PWD_V31_DEFINITION.sections.find(section => section.id === "pregnancy_postpartum");
const pregnancyDetailIds = (pregnancySection?.questions || []).slice(1).map(question => question.id);
assert(!pregnancyHidden.some(question => pregnancyDetailIds.includes(question.id)),
  "Pregnancy detail questions must stay hidden when client declares not applicable");

const pregnancyVisible = visiblePrePwdV31Questions({
  q_pregnancy_applicability: "applies"
}, { consentAccepted: true });
assert(pregnancyVisible.some(question => pregnancyDetailIds.includes(question.id)),
  "Pregnancy detail questions must appear only after client-declared applicability");

const exclusive = normalizePrePwdV31Answers({
  q7_exertion_symptoms: ["chest_pain_pressure", "none"]
});
assert.deepEqual(exclusive.q7_exertion_symptoms, ["none"],
  "Exclusive none value must remove competing multi-choice values");

const capped = normalizePrePwdV31Answers({
  q4_main_barriers: ["pain", "stiffness", "strength"]
});
assert.deepEqual(capped.q4_main_barriers, ["pain", "stiffness"],
  "Max selection limit must be deterministic");

const validation = validatePrePwdV31VisibleAnswers({}, { consentAccepted: false });
assert.equal(validation.valid, false);
assert(validation.missing.includes("age"));
assert(validation.missing.includes("q2_goal_current"));
assert(!validation.missing.includes("q7_exertion_symptoms"),
  "Health answer cannot be required before the consent gate is accepted");

const confirmationFalse = validatePrePwdV31VisibleAnswers({
  confirm_best_knowledge: false,
  confirm_trainer_not_doctor: false
}, { consentAccepted: false });
assert(confirmationFalse.missing.includes("confirm_best_knowledge"));
assert(confirmationFalse.missing.includes("confirm_trainer_not_doctor"));

const confirmationTrue = validatePrePwdV31VisibleAnswers({
  confirm_best_knowledge: true,
  confirm_trainer_not_doctor: true
}, { consentAccepted: false });
assert(!confirmationTrue.missing.includes("confirm_best_knowledge"));
assert(!confirmationTrue.missing.includes("confirm_trainer_not_doctor"));

assert.equal(PRE_PWD_V31_DEFINITION.preHealthGate.legalReviewRequired, true,
  "Renderer work must not silently clear the legal-review blocker");
assert.equal(PRE_PWD_V31_DEFINITION.architecture.productionRelease, "blocked_pending_health_data_consent_legal_review");

console.log(`pre-PWD v3.1 renderer contract PASS (${[...types].sort().join(", ")})`);
