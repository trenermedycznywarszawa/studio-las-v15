import assert from "node:assert/strict";
import {
  PRE_PWD_V3_DEFINITION,
  PRE_PWD_V3_TRAINER_BRIEF,
  evaluatePrePwdV3Visibility,
  findPrePwdV3Question,
  listPrePwdV3Questions
} from "../assets/os/questionnaires/pre-pwd-v3-definition.js";

assert.equal(PRE_PWD_V3_DEFINITION.version, "3.0");
assert.deepEqual(PRE_PWD_V3_DEFINITION.architecture.canonicalFlow, ["template", "version", "assignment", "response"]);
assert.equal(PRE_PWD_V3_DEFINITION.architecture.clientEntryPoint, "client_portal.questionnaires");
assert.equal(PRE_PWD_V3_DEFINITION.architecture.trainerWorkflowStatusVisibleToClient, false);
assert.equal(PRE_PWD_V3_DEFINITION.architecture.browserPersistence, "forbidden");
assert.equal(PRE_PWD_V3_DEFINITION.architecture.healthDraftServerPersistence, "blocked_pending_privacy_basis_review");
assert.equal(PRE_PWD_V3_DEFINITION.architecture.productionRelease, "blocked_pending_health_data_consent_review");

const unresolved = new Set(PRE_PWD_V3_DEFINITION.unresolvedRules.map(item => item.id));
assert.deepEqual(unresolved, new Set([
  "pain_13i_visibility",
  "pregnancy_module_applicability",
  "health_data_consent_and_autosave"
]));

const profileFields = new Map(PRE_PWD_V3_DEFINITION.profileFields.map(field => [field.id, field]));
assert.equal(profileFields.get("age").target, "client_profile.age_observation");
for (const id of ["emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation"]) {
  assert.equal(profileFields.get(id).target, "client_profile.emergency_contact");
}

const questions = listPrePwdV3Questions();
assert.ok(questions.length > 40, "Expected core and conditional v3 questions");
assert.equal(new Set(questions.map(question => question.id)).size, questions.length, "Question ids must be unique");
assert.equal(new Set(questions.map(question => question.sourceRef)).size, questions.length, "Source refs must be unique");

for (const sourceRef of [
  "2", "3", "4", "5", "6", "7", "8", "8A", "9", "10", "11", "12", "12A",
  "13", "13A", "13B", "13C", "13D", "13E", "13F", "13G", "13H", "13I",
  "14", "15", "15A", "15B", "15C", "15D", "15E", "15F", "15G",
  "16", "16A", "16B", "17", "17A", "17B", "17C",
  "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32"
]) {
  assert.ok(questions.some(question => question.sourceRef === sourceRef), `Missing v3 source ref ${sourceRef}`);
}

assert.equal(evaluatePrePwdV3Visibility(findPrePwdV3Question("q2_goal_detail").visibleWhen, { q2_goal_current: "yes" }), false);
assert.equal(evaluatePrePwdV3Visibility(findPrePwdV3Question("q2_goal_detail").visibleWhen, { q2_goal_current: "changed" }), true);
assert.equal(evaluatePrePwdV3Visibility(findPrePwdV3Question("q6_sitting_time").visibleWhen, { q5_work_day: "driving" }), true);
assert.equal(evaluatePrePwdV3Visibility(findPrePwdV3Question("q6_sitting_time").visibleWhen, { q5_work_day: "heavy_physical" }), false);
assert.equal(evaluatePrePwdV3Visibility(findPrePwdV3Question("q15a_body_part").visibleWhen, { q14_major_injury_surgery: "no", q15_hospital_12m: "yes" }), true);
assert.equal(evaluatePrePwdV3Visibility(findPrePwdV3Question("q15a_body_part").visibleWhen, { q14_major_injury_surgery: "no", q15_hospital_12m: "no" }), false);
assert.equal(evaluatePrePwdV3Visibility(findPrePwdV3Question("q13i_neurological_sensation").visibleWhen, { q13_pain: "yes_clear_limitation" }), false, "Unresolved 13I visibility must fail closed");

const pregnancySection = PRE_PWD_V3_DEFINITION.sections.find(section => section.id === "pregnancy_postpartum");
assert.equal(pregnancySection.applicability.mode, "blocked_pending_rule");
assert.equal(pregnancySection.applicability.ruleId, "pregnancy_module_applicability");

assert.deepEqual(findPrePwdV3Question("q7_exertion_symptoms").exclusiveValues, ["none"]);
assert.deepEqual(findPrePwdV3Question("q12_balance").exclusiveValues, ["none"]);
assert.deepEqual(findPrePwdV3Question("q13h_back_leg_red_flags").exclusiveValues, ["none"]);
assert.deepEqual(findPrePwdV3Question("q17c_current_symptoms").exclusiveValues, ["none"]);
assert.deepEqual(findPrePwdV3Question("q23_adherence_barriers").exclusiveValues, ["nothing_significant"]);
assert.equal(findPrePwdV3Question("q4_main_barriers").maxSelections, 2);
assert.equal(findPrePwdV3Question("q23_adherence_barriers").maxSelections, 2);

const consent = findPrePwdV3Question("consent_health_data");
assert.equal(consent.required, true);
assert.equal(consent.legalReviewRequired, true);
assert.equal(PRE_PWD_V3_DEFINITION.sections.find(section => section.id === "confirmation_privacy").productionBlocker, "health_data_consent_and_autosave");

const briefIds = PRE_PWD_V3_TRAINER_BRIEF.map(item => item.id);
assert.deepEqual(briefIds, ["goal", "barriers", "work", "safety", "pain", "injury", "pregnancy", "activity", "recovery", "nutrition", "clarify"]);
assert.ok(PRE_PWD_V3_TRAINER_BRIEF.find(item => item.id === "pain").sources.includes("13I"));
assert.equal(PRE_PWD_V3_TRAINER_BRIEF.find(item => item.id === "clarify").rule, "trainer_review_only");

const serialized = JSON.stringify(PRE_PWD_V3_DEFINITION);
assert.doesNotMatch(serialized, /risk_level/i);
assert.doesNotMatch(serialized, /localStorage|sessionStorage|indexedDB/i);
assert.ok(Object.isFrozen(PRE_PWD_V3_DEFINITION));
assert.ok(Object.isFrozen(findPrePwdV3Question("q7_exertion_symptoms").options));

console.log(`pre-PWD v3 definition tests completed (${questions.length} questionnaire fields)`);
