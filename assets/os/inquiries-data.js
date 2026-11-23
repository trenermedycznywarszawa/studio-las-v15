import { buildUrl } from "./data-utils.js";

export class InquiryRepository {
  constructor(config, auth) {
    this.config = config;
    this.auth = auth;
  }

  async request(path, options = {}) {
    return this.auth.request(path, options);
  }

  async listInquiries(limit = 50) {
    const path = buildUrl(this.config.supabaseUrl, "/rest/v1/inquiries", {
      select: "id,owner_trainer_id,source_channel,source_version,form_version,submitted_name,submitted_phone,submitted_email,preferred_contact_window,broad_goal,person_words,inquiry_status,contact_status,next_action_type,next_action_at,converted_client_id,created_at,updated_at",
      order: "created_at.desc",
      limit: String(Math.max(1, Math.min(Number(limit) || 50, 100)))
    }).replace(this.config.supabaseUrl, "");
    const rows = await this.request(path, { method: "GET" });
    return Array.isArray(rows) ? rows : [];
  }

  async listDecisions(inquiryId) {
    const path = buildUrl(this.config.supabaseUrl, "/rest/v1/inquiry_decisions", {
      inquiry_id: `eq.${inquiryId}`,
      select: "id,inquiry_id,decision_version,decision,goal_in_person_words,why_now,current_barrier,rationale,boundary_note,next_action_type,next_action_at,decision_status,supersedes_decision_id,created_at",
      order: "decision_version.desc"
    }).replace(this.config.supabaseUrl, "");
    const rows = await this.request(path, { method: "GET" });
    return Array.isArray(rows) ? rows : [];
  }

  async rpc(name, args = {}) {
    const allowed = new Set([
      "set_inquiry_contact_state",
      "save_inquiry_decision",
      "convert_inquiry_to_pwd_client"
    ]);
    if (!allowed.has(name)) throw new Error(`Inquiry RPC is not allowed: ${name}`);
    return this.request(`/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: args
    });
  }

  async setContactState(inquiryId, values) {
    return this.rpc("set_inquiry_contact_state", {
      p_inquiry_id: inquiryId,
      p_contact_status: values.contactStatus,
      p_next_action_type: values.nextActionType || null,
      p_next_action_at: values.nextActionAt || null,
      p_close_inquiry: Boolean(values.closeInquiry)
    });
  }

  async saveDecision(inquiryId, values) {
    return this.rpc("save_inquiry_decision", {
      p_inquiry_id: inquiryId,
      p_decision: values.decision,
      p_goal_in_person_words: values.goalInPersonWords,
      p_why_now: values.whyNow || null,
      p_current_barrier: values.currentBarrier,
      p_rationale: values.rationale,
      p_boundary_note: values.boundaryNote || null,
      p_next_action_type: values.nextActionType || null,
      p_next_action_at: values.nextActionAt || null
    });
  }

  async convertToPwdClient(inquiryId) {
    return this.rpc("convert_inquiry_to_pwd_client", { p_inquiry_id: inquiryId });
  }
}
