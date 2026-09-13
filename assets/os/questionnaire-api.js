const QUESTIONNAIRE_RPCS = new Set([
  "client_questionnaire_response_snapshot",
  "record_questionnaire_health_consent",
  "withdraw_questionnaire_health_consent",
  "save_client_questionnaire_profile_context",
  "save_questionnaire_draft",
  "submit_questionnaire_response",
  "trainer_questionnaire_submissions",
  "assign_active_questionnaire"
]);

export class QuestionnaireApi {
  constructor(repository) {
    if (!repository?.auth?.request) throw new Error("Questionnaire API requires the canonical authenticated repository");
    this.auth = repository.auth;
  }

  async rpc(name, args = {}) {
    if (!QUESTIONNAIRE_RPCS.has(name)) throw new Error(`Questionnaire RPC is not allowed: ${name}`);
    return this.auth.request(`/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: args
    });
  }

  getClientResponseSnapshot(assignmentId) {
    return this.rpc("client_questionnaire_response_snapshot", { p_assignment_id: assignmentId });
  }

  recordHealthConsent(assignmentId, consentTextVersion, privacyNoticeVersion) {
    return this.rpc("record_questionnaire_health_consent", {
      p_assignment_id: assignmentId,
      p_consent_text_version: consentTextVersion,
      p_privacy_notice_version: privacyNoticeVersion
    });
  }

  withdrawHealthConsent(assignmentId) {
    return this.rpc("withdraw_questionnaire_health_consent", { p_assignment_id: assignmentId });
  }

  saveProfileContext(assignmentId, profileContext) {
    return this.rpc("save_client_questionnaire_profile_context", {
      p_assignment_id: assignmentId,
      p_age_observation: Number.parseInt(String(profileContext.age || ""), 10),
      p_emergency_contact_name: profileContext.emergency_contact_name,
      p_emergency_contact_phone: profileContext.emergency_contact_phone,
      p_emergency_contact_relation: profileContext.emergency_contact_relation
    });
  }

  saveDraft(assignmentId, answers, expectedRevision) {
    return this.rpc("save_questionnaire_draft", {
      p_assignment_id: assignmentId,
      p_answers: answers,
      p_expected_revision: expectedRevision
    });
  }

  submit(assignmentId, expectedRevision) {
    return this.rpc("submit_questionnaire_response", {
      p_assignment_id: assignmentId,
      p_expected_revision: expectedRevision,
      p_confirm_transfer: true
    });
  }

  trainerSubmissions(clientId) {
    return this.rpc("trainer_questionnaire_submissions", { p_client_id: clientId });
  }

  assignActive(clientId, templateKey = "pre_pwd_first_visit") {
    return this.rpc("assign_active_questionnaire", { p_client_id: clientId, p_template_key: templateKey });
  }
}
