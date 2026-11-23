import assert from "node:assert/strict";
import {
  PRE_PWD_V31_DEFINITION,
  PRE_PWD_V31_TRAINER_BRIEF,
  findPrePwdV31Question,
  evaluatePrePwdV31Visibility
} from "../assets/os/questionnaires/pre-pwd-v31-definition.js";
import { PRE_PWD_V3_DEFINITION } from "../assets/os/questionnaires/pre-pwd-v3-definition.js";

assert.equal(PRE_PWD_V3_DEFINITION.version, "3.0", "v3.0 must remain historically unchanged");
assert.equal(PRE_PWD_V31_DEFINITION.version, "3.1");
assert.equal(PRE_PWD_V31_DEFINITION.architecture.healthDraftServerPersistence, "requires_explicit_pre_health_consent_receipt");
assert.equal(PRE_PWD_V31_DEFINITION.architecture.productionRelease, "blocked_pending_health_data_consent_legal_review");
assert.deepEqual(PRE_PWD_V31_DEFINITION.unresolvedRules.map(rule => rule.id), ["health_data_consent_and_autosave"]);
assert.deepEqual(PRE_PWD_V31_DEFINITION.resolvedRules.map(rule => rule.id).sort(), ["pain_13i_visibility", "pregnancy_module_applicability"]);

const q13i = findPrePwdV31Question("q13i_neurological_sensation");
assert.ok(q13i);
assert.equal(evaluatePrePwdV31Visibility(q13i.visibleWhen, { q13_pain: "no" }), false);
assert.equal(evaluatePrePwdV31Visibility(q13i.visibleWhen, { q13_pain: "yes_not_limiting" }), true);
assert.equal(evaluatePrePwdV31Visibility(q13i.visibleWhen, { q13_pain: "yes_some_limitation" }), true);
assert.equal(evaluatePrePwdV31Visibility(q13i.visibleWhen, { q13_pain: "yes_clear_limitation" }), true);

const pregnancySection = PRE_PWD_V31_DEFINITION.sections.find(section => section.id === "pregnancy_postpartum");
assert.ok(pregnancySection);
assert.equal(pregnancySection.applicability.mode, "client_declared_gate");
assert.equal(pregnancySection.applicability.noInferenceFromProfile, true);
assert.equal(pregnancySection.questions[0].id, "q_pregnancy_applicability");
assert.deepEqual(pregnancySection.questions[0].options.map(option => option.value), ["applies", "not_applicable", "prefer_discuss"]);

const q16 = findPrePwdV31Question("q16_pregnancy");
assert.equal(evaluatePrePwdV31Visibility(q16.visibleWhen, { q_pregnancy_applicability: "not_applicable" }), false);
assert.equal(evaluatePrePwdV31Visibility(q16.visibleWhen, { q_pregnancy_applicability: "prefer_discuss" }), false);
assert.equal(evaluatePrePwdV31Visibility(q16.visibleWhen, { q_pregnancy_applicability: "applies" }), true);

const q16a = findPrePwdV31Question("q16a_week");
assert.equal(evaluatePrePwdV31Visibility(q16a.visibleWhen, { q_pregnancy_applicability: "applies", q16_pregnancy: "yes" }), true);
assert.equal(evaluatePrePwdV31Visibility(q16a.visibleWhen, { q_pregnancy_applicability: "not_applicable", q16_pregnancy: "yes" }), false);

assert.equal(PRE_PWD_V31_DEFINITION.preHealthGate.id, "health_data_processing_gate");
assert.equal(PRE_PWD_V31_DEFINITION.preHealthGate.sourceRef, "privacy.3");
assert.equal(PRE_PWD_V31_DEFINITION.preHealthGate.required, true);
assert.equal(PRE_PWD_V31_DEFINITION.preHealthGate.legalReviewRequired, true);
assert.equal(PRE_PWD_V31_DEFINITION.preHealthGate.blocksHealthDataServerPersistenceUntilReceipt, true);
assert.equal(PRE_PWD_V31_DEFINITION.persistenceContract.browserPersistence, "forbidden");
assert.equal(PRE_PWD_V31_DEFINITION.persistenceContract.serverDraft.trainerVisibilityBeforeSubmission, "forbidden");

const privacySection = PRE_PWD_V31_DEFINITION.sections.find(section => section.id === "confirmation_privacy");
assert.ok(privacySection);
assert.equal(privacySection.questions.some(question => question.id === "consent_health_data"), false,
  "Health-data consent must not remain duplicated at the end after moving to the pre-health gate");

const pregnancyBrief = PRE_PWD_V31_TRAINER_BRIEF.find(item => item.id === "pregnancy");
assert.ok(pregnancyBrief.sources.includes("product.3.1.pregnancy_applicability"));
const clarifyBrief = PRE_PWD_V31_TRAINER_BRIEF.find(item => item.id === "clarify");
assert.ok(clarifyBrief.sources.includes("product.3.1.pregnancy_applicability"));

const serialized = JSON.stringify(PRE_PWD_V31_DEFINITION);
assert.doesNotMatch(serialized, /localStorage|sessionStorage|indexedDB/i);
assert.equal(Object.isFrozen(PRE_PWD_V31_DEFINITION), true);
assert.equal(Object.isFrozen(PRE_PWD_V31_DEFINITION.preHealthGate), true);

console.log("pre-PWD v3.1 definition tests completed");
