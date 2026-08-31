import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession
} from "./runtime.js";
import {
  asIsoDate,
  asNullableNumber,
  asTextArray,
  buildUrl,
  compactObject,
  decodeJwtClaims,
  parseResponse
} from "./data-utils.js";

const MFA_FACTOR_ID_PATTERN = /^[0-9a-f-]{20,64}$/i;

function assertMfaFactorId(value) {
  const factorId = String(value || "");
  if (!MFA_FACTOR_ID_PATTERN.test(factorId)) {
    throw new SupabaseHttpError("Invalid MFA factor", 400);
  }
  return factorId;
}

export class SupabaseHttpError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "SupabaseHttpError";
    this.status = status;
    this.details = details;
  }
}

export class SupabaseAuth {
  constructor(config) {
    this.config = config;
    this.session = null;
    this.refreshPromise = null;
    this.persistSession = true;
  }

  async request(path, options = {}, allowRefresh = true) {
    const headers = new Headers(options.headers || {});
    headers.set("apikey", this.config.publishableKey);
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (this.session?.access_token) {
      headers.set("Authorization", `Bearer ${this.session.access_token}`);
    }

    const response = await fetch(buildUrl(this.config.supabaseUrl, path), {
      ...options,
      headers,
      body: options.body && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body
    });

    if (response.status === 401 && allowRefresh && this.session?.refresh_token) {
      await this.refresh();
      return this.request(path, options, false);
    }

    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new SupabaseHttpError(
        payload?.msg || payload?.message || payload?.error_description || "Supabase request failed",
        response.status,
        payload
      );
    }

    return payload;
  }

  normalizeSession(payload) {
    const expiresIn = Number(payload?.expires_in || 3600);
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      token_type: payload.token_type || "bearer",
      expires_at: Number(payload?.expires_at) || Math.floor(Date.now() / 1000) + expiresIn
    };
  }

  async signInWithPassword(email, password, { persist = true } = {}) {
    const payload = await this.request(
      "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        body: {
          email: String(email || "").trim().toLowerCase(),
          password: String(password || "")
        }
      },
      false
    );

    this.session = this.normalizeSession(payload);
    this.persistSession = Boolean(persist);
    if (this.persistSession) saveAuthSession(this.session);
    else clearAuthSession();
    return this.session;
  }

  async restore() {
    const stored = loadAuthSession();
    if (!stored) return null;

    this.session = stored;
    this.persistSession = true;
    const now = Math.floor(Date.now() / 1000);
    if (stored.expires_at <= now + 60) {
      await this.refresh();
    }

    try {
      await this.getUser();
      return this.session;
    } catch (error) {
      clearAuthSession();
      this.session = null;
      throw error;
    }
  }

  async refresh() {
    if (this.refreshPromise) return this.refreshPromise;
    if (!this.session?.refresh_token) {
      throw new SupabaseHttpError("Missing refresh token", 401);
    }

    this.refreshPromise = (async () => {
      const payload = await this.request(
        "/auth/v1/token?grant_type=refresh_token",
        {
          method: "POST",
          body: { refresh_token: this.session.refresh_token }
        },
        false
      );
      this.session = this.normalizeSession(payload);
      if (this.persistSession) saveAuthSession(this.session);
      return this.session;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  async getUser() {
    if (!this.session?.access_token) {
      throw new SupabaseHttpError("Not authenticated", 401);
    }
    return this.request("/auth/v1/user", { method: "GET" });
  }

  getAuthenticatorAssuranceLevel() {
    return String(decodeJwtClaims(this.session?.access_token)?.aal || "aal1");
  }

  persistCurrentSession() {
    if (!this.session?.access_token || !this.session?.refresh_token) {
      throw new SupabaseHttpError("Not authenticated", 401);
    }
    this.persistSession = true;
    saveAuthSession(this.session);
  }

  suspendSessionPersistence() {
    this.persistSession = false;
    clearAuthSession();
  }

  async listTotpFactors() {
    const user = await this.getUser();
    return (Array.isArray(user?.factors) ? user.factors : [])
      .filter(factor => factor?.factor_type === "totp")
      .map(factor => ({
        id: String(factor.id || ""),
        status: String(factor.status || ""),
        friendlyName: String(factor.friendly_name || "Aplikacja uwierzytelniaj\u0105ca"),
        createdAt: String(factor.created_at || "")
      }))
      .filter(factor => MFA_FACTOR_ID_PATTERN.test(factor.id));
  }

  async enrollTotp(friendlyName = "Studio Las \u00b7 trener") {
    const payload = await this.request("/auth/v1/factors", {
      method: "POST",
      body: {
        factor_type: "totp",
        friendly_name: String(friendlyName).slice(0, 64),
        issuer: "Studio Las"
      }
    });
    assertMfaFactorId(payload?.id);
    return payload;
  }

  async challengeTotp(factorId) {
    const safeFactorId = assertMfaFactorId(factorId);
    const payload = await this.request(`/auth/v1/factors/${encodeURIComponent(safeFactorId)}/challenge`, {
      method: "POST",
      body: { factorId: safeFactorId }
    });
    if (!payload?.id) throw new SupabaseHttpError("MFA challenge was not created", 502);
    return { id: String(payload.id) };
  }

  async verifyTotp(factorId, challengeId, code) {
    const safeFactorId = assertMfaFactorId(factorId);
    const safeChallengeId = String(challengeId || "");
    const safeCode = String(code || "").trim();
    if (!MFA_FACTOR_ID_PATTERN.test(safeChallengeId) || !/^\d{6}$/.test(safeCode)) {
      throw new SupabaseHttpError("Invalid MFA verification", 400);
    }

    const payload = await this.request(
      `/auth/v1/factors/${encodeURIComponent(safeFactorId)}/verify`,
      {
        method: "POST",
        body: { challenge_id: safeChallengeId, code: safeCode }
      }
    );
    const sessionPayload = payload?.session || payload;
    const nextSession = this.normalizeSession(sessionPayload);
    if (String(decodeJwtClaims(nextSession.access_token)?.aal || "") !== "aal2") {
      throw new SupabaseHttpError("MFA did not produce an AAL2 session", 403);
    }

    // The trainer's password-only AAL1 session stays memory-only. The existing
    // sessionStorage boundary receives a session only after successful TOTP.
    this.session = nextSession;
    this.persistSession = true;
    saveAuthSession(this.session);
    return this.session;
  }

  async unenrollTotp(factorId) {
    const safeFactorId = assertMfaFactorId(factorId);
    await this.request(`/auth/v1/factors/${encodeURIComponent(safeFactorId)}`, {
      method: "DELETE"
    });
  }

  async getProfile() {
    const user = await this.getUser();
    const rows = await this.request(
      buildUrl(this.config.supabaseUrl, "/rest/v1/profiles", {
        auth_user_id: `eq.${user.id}`,
        select: "id,auth_user_id,role,display_name,email"
      }).replace(this.config.supabaseUrl, ""),
      { method: "GET" }
    );

    const profile = Array.isArray(rows) ? rows[0] : null;
    if (!profile || !["trainer", "client"].includes(profile.role)) {
      throw new SupabaseHttpError("Authenticated user has no active Studio Las profile", 403);
    }
    return profile;
  }

  async logout() {
    try {
      if (this.session?.access_token) {
        await this.request("/auth/v1/logout", { method: "POST" }, false);
      }
    } finally {
      this.session = null;
      this.persistSession = true;
      clearAuthSession();
    }
  }
}

const WRITE_TABLES = new Set([
  "clients",
  "client_trainers",
  "client_users",
  "client_intakes",
  "sessions",
  "pre_session_checks",
  "post_session_observations",
  "client_tasks",
  "client_documents",
  "body_measurements",
  "training_load_observations",
  "assessment_results",
  "exercises",
  "home_plans",
  "home_plan_items",
  "guidance_events",
  "guidance_pilots",
  "guidance_pilot_feedback",
  "reports",
  "legacy_import_batches",
  "legacy_import_records"
]);

export class StudioLasRepository {
  constructor(config, auth) {
    this.config = config;
    this.auth = auth;
  }

  async rest(table, { method = "GET", query = {}, body, prefer } = {}) {
    if (!WRITE_TABLES.has(table) && table !== "profiles") {
      throw new Error(`Table is not available through the Studio Las repository: ${table}`);
    }

    const headers = {};
    if (prefer) headers.Prefer = prefer;

    return this.auth.request(
      buildUrl(this.config.supabaseUrl, `/rest/v1/${table}`, query).replace(this.config.supabaseUrl, ""),
      { method, headers, body }
    );
  }

  async rpc(name, args = {}) {
    const allowed = new Set([
      "client_portal_snapshot",
      "save_client_checkin",
      "publish_home_plan_guidance",
      "withdraw_home_plan_guidance",
      "record_home_plan_guidance_delivery",
      "confirm_home_plan_paper_retirement",
      "save_pwd_workflow"
    ]);
    if (!allowed.has(name)) throw new Error(`RPC is not allowed: ${name}`);
    return this.auth.request(`/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: args
    });
  }

  async insert(table, payload, select = "*") {
    const rows = await this.rest(table, {
      method: "POST",
      query: { select },
      body: compactObject(payload),
      prefer: "return=representation"
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async update(table, filters, patch, select = "*") {
    const rows = await this.rest(table, {
      method: "PATCH",
      query: { ...filters, select },
      body: compactObject(patch),
      prefer: "return=representation"
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async listClients() {
    return this.rest("clients", {
      query: {
        select: "id,name,email,phone,engagement_type,stage,start_date,next_session_date,next_review_date,goal,next_milestone,status,created_at,updated_at",
        deleted_at: "is.null",
        order: "name.asc"
      }
    });
  }

  async getClient(clientId) {
    const rows = await this.rest("clients", {
      query: {
        id: `eq.${clientId}`,
        deleted_at: "is.null",
        select: "*",
        limit: 1
      }
    });
    return Array.isArray(rows) ? rows[0] || null : null;
  }

  async getClientWorkspace(clientId) {
    const byClient = {
      client_id: `eq.${clientId}`,
      deleted_at: "is.null"
    };

    const [
      client,
      intakes,
      sessions,
      preSessionChecks,
      postSessionObservations,
      tasks,
      documents,
      measurements,
      trainingLoad,
      assessments,
      homePlans,
      homePlanItems,
      guidanceEvents,
      reports
    ] = await Promise.all([
      this.getClient(clientId),
      this.rest("client_intakes", { query: { ...byClient, select: "*", order: "created_at.desc" } }),
      this.rest("sessions", { query: { ...byClient, select: "*", order: "date.desc" } }),
      this.rest("pre_session_checks", { query: { ...byClient, select: "*", order: "check_date.desc" } }),
      this.rest("post_session_observations", { query: { ...byClient, select: "*", order: "date.desc" } }),
      this.rest("client_tasks", { query: { ...byClient, select: "*", order: "created_at.desc" } }),
      this.rest("client_documents", { query: { ...byClient, select: "*", order: "created_at.desc" } }),
      this.rest("body_measurements", { query: { ...byClient, select: "*", order: "measured_at.desc" } }),
      this.rest("training_load_observations", { query: { ...byClient, select: "*", order: "observed_at.desc" } }),
      this.rest("assessment_results", { query: { ...byClient, select: "*", order: "performed_at.desc" } }),
      this.rest("home_plans", { query: { ...byClient, select: "*", order: "created_at.desc" } }),
      this.rest("home_plan_items", { query: { ...byClient, select: "*", order: "sort_order.asc" } }),
      this.rest("guidance_events", { query: { ...byClient, kind: "eq.client_checkin", select: "id,client_id,home_plan_item_id,event_date,kind,completed,payload,created_at,updated_at", order: "event_date.desc,created_at.desc", limit: 1 } }),
      this.rest("reports", { query: { ...byClient, select: "*", order: "created_at.desc" } })
    ]);

    if (!client) throw new SupabaseHttpError("Client not found or access denied", 404);

    return {
      client,
      intakes,
      sessions,
      preSessionChecks,
      postSessionObservations,
      tasks,
      documents,
      measurements,
      trainingLoad,
      assessments,
      homePlans,
      homePlanItems,
      guidanceEvents,
      reports
    };
  }

  async savePwdWorkflow(clientId, input) {
    return this.rpc("save_pwd_workflow", {
      p_client_id: clientId,
      p_date: input.date,
      p_real_life_goal: input.realLifeGoal,
      p_why_important: input.whyImportant,
      p_context_boundaries: input.contextBoundaries,
      p_trainer_interpretation: input.trainerInterpretation,
      p_trainer_decision: input.trainerDecision,
      p_next_step: input.nextStep,
      p_observations: input.observations
    });
  }
  async createClient(profileId, input) {
    return this.insert("clients", {
      owner_trainer_id: profileId,
      name: String(input.name || "").trim(),
      email: String(input.email || "").trim().toLowerCase() || null,
      phone: String(input.phone || "").trim() || null,
      contact: String(input.contact || "").trim() || null,
      engagement_type: input.engagementType || "twelve_week_process",
      package: null,
      stage: Number(input.stage || 1),
      start_date: asIsoDate(input.startDate),
      next_session_date: asIsoDate(input.nextSessionDate),
      next_review_date: asIsoDate(input.nextReviewDate),
      goal: String(input.goal || "").trim() || null,
      motivation: String(input.motivation || "").trim() || null,
      fears: String(input.fears || "").trim() || null,
      health_status: String(input.healthStatus || "").trim() || null,
      contraindications: String(input.contraindications || "").trim() || null,
      red_flags_text: String(input.redFlagsText || "").trim() || null,
      communication_profile: String(input.communicationProfile || "").trim() || null,
      next_milestone: String(input.nextMilestone || "").trim() || null,
      working_hypothesis: String(input.workingHypothesis || "").trim() || null,
      status: "active"
    });
  }

  async updateClient(clientId, input) {
    return this.update("clients", { id: `eq.${clientId}` }, {
      name: input.name === undefined ? undefined : String(input.name).trim(),
      email: input.email === undefined ? undefined : String(input.email).trim().toLowerCase() || null,
      phone: input.phone === undefined ? undefined : String(input.phone).trim() || null,
      contact: input.contact === undefined ? undefined : String(input.contact).trim() || null,
      engagement_type: input.engagementType,
      stage: input.stage === undefined ? undefined : Number(input.stage),
      start_date: input.startDate === undefined ? undefined : asIsoDate(input.startDate),
      next_session_date: input.nextSessionDate === undefined ? undefined : asIsoDate(input.nextSessionDate),
      next_review_date: input.nextReviewDate === undefined ? undefined : asIsoDate(input.nextReviewDate),
      goal: input.goal === undefined ? undefined : String(input.goal).trim() || null,
      motivation: input.motivation === undefined ? undefined : String(input.motivation).trim() || null,
      fears: input.fears === undefined ? undefined : String(input.fears).trim() || null,
      health_status: input.healthStatus === undefined ? undefined : String(input.healthStatus).trim() || null,
      contraindications: input.contraindications === undefined ? undefined : String(input.contraindications).trim() || null,
      red_flags_text: input.redFlagsText === undefined ? undefined : String(input.redFlagsText).trim() || null,
      communication_profile: input.communicationProfile === undefined ? undefined : String(input.communicationProfile).trim() || null,
      next_milestone: input.nextMilestone === undefined ? undefined : String(input.nextMilestone).trim() || null,
      working_hypothesis: input.workingHypothesis === undefined ? undefined : String(input.workingHypothesis).trim() || null
    });
  }

  async archiveClient(clientId) {
    return this.update("clients", { id: `eq.${clientId}` }, {
      status: "archived",
      deleted_at: new Date().toISOString()
    });
  }

  async saveIntake(clientId, input) {
    return this.insert("client_intakes", {
      client_id: clientId,
      source: input.source || "manual",
      raw_payload: input.rawPayload || {},
      summary: input.summary || null,
      goals: asTextArray(input.goals),
      main_goal: input.mainGoal || null,
      motivation: input.motivation || null,
      expectations: input.expectations || null,
      readiness_text: input.readinessText || null,
      pain_areas: input.painAreas || null,
      medical_flags: asTextArray(input.medicalFlags),
      movement_limitations: asTextArray(input.movementLimitations),
      lifestyle_flags: asTextArray(input.lifestyleFlags),
      training_preferences: asTextArray(input.trainingPreferences),
      flags: asTextArray(input.flags),
      communication_style: input.communicationStyle || null,
      compliance_forecast: input.complianceForecast || null,
      first_session_focus: input.firstSessionFocus || null,
      risk_level: input.riskLevel || "low",
      trainer_notes: input.trainerNotes || null
    });
  }

  async saveSession(clientId, input) {
    return this.insert("sessions", {
      client_id: clientId,
      session_type: input.sessionType === "pwd" ? "pwd" : "session",
      date: asIsoDate(input.date) || new Date().toISOString().slice(0, 10),
      readiness: asNullableNumber(input.readiness),
      vas_before: asNullableNumber(input.vasBefore),
      vas_after: asNullableNumber(input.vasAfter),
      mobility_index: asNullableNumber(input.mobilityIndex),
      sleep_quality: input.sleepQuality || null,
      exercises_text: asTextArray(input.exercises),
      trainer_observation: input.trainerObservation || null,
      trainer_decision: input.trainerDecision || null,
      milestone: input.milestone || null,
      client_summary: input.clientSummary || null,
      client_next_step: input.clientNextStep || null,
      client_visible: Boolean(input.clientVisible),
      published_at: input.clientVisible ? new Date().toISOString() : null
    });
  }

  async savePreSessionCheck(clientId, input) {
    return this.insert("pre_session_checks", {
      client_id: clientId,
      check_date: asIsoDate(input.date) || new Date().toISOString().slice(0, 10),
      pain_increased: Boolean(input.painIncreased),
      poor_sleep: Boolean(input.poorSleep),
      home_plan_done: Boolean(input.homePlanDone),
      new_symptoms: Boolean(input.newSymptoms),
      red_flag_concern: Boolean(input.redFlagConcern),
      planned_decision: input.plannedDecision || "obserwuj",
      trainer_note: input.trainerNote || null
    });
  }

  async savePostSessionObservation(clientId, input) {
    return this.insert("post_session_observations", {
      client_id: clientId,
      session_id: input.sessionId || null,
      date: asIsoDate(input.date) || new Date().toISOString().slice(0, 10),
      what_we_did: input.whatWeDid || null,
      client_response: input.clientResponse || null,
      decision: input.decision || "obserwuj",
      home_task_text: input.homeTaskText || null,
      client_message: input.clientMessage || null,
      client_visible: Boolean(input.clientVisible),
      published_at: input.clientVisible ? new Date().toISOString() : null
    });
  }

  async saveTask(clientId, input) {
    return this.insert("client_tasks", {
      client_id: clientId,
      text: String(input.text || "").trim(),
      completed: Boolean(input.completed),
      source: input.source || "trainer",
      due_date: asIsoDate(input.dueDate),
      completed_at: input.completed ? new Date().toISOString() : null
    });
  }

  async saveMeasurement(clientId, input) {
    return this.insert("body_measurements", {
      client_id: clientId,
      measured_at: asIsoDate(input.date) || new Date().toISOString().slice(0, 10),
      source: input.source || "Tanita",
      input_method: "manual",
      parse_status: "not_attempted",
      weight_kg: asNullableNumber(input.weightKg),
      fat_percent: asNullableNumber(input.fatPercent),
      fat_mass_kg: asNullableNumber(input.fatMassKg),
      fat_free_mass_kg: asNullableNumber(input.fatFreeMassKg),
      muscle_mass_kg: asNullableNumber(input.muscleMassKg),
      body_water_percent: asNullableNumber(input.bodyWaterPercent),
      body_water_kg: asNullableNumber(input.bodyWaterKg),
      visceral_fat_rating: asNullableNumber(input.visceralFatRating),
      bmr_kcal: asNullableNumber(input.bmrKcal),
      metabolic_age: asNullableNumber(input.metabolicAge),
      bmi: asNullableNumber(input.bmi),
      bone_mass_kg: asNullableNumber(input.boneMassKg),
      protein_kg: asNullableNumber(input.proteinKg),
      trainer_interpretation: input.trainerInterpretation || null,
      client_summary: input.clientSummary || null,
      client_visible: Boolean(input.clientVisible),
      published_at: input.clientVisible ? new Date().toISOString() : null
    });
  }

  async saveTrainingLoad(clientId, input) {
    return this.insert("training_load_observations", {
      client_id: clientId,
      session_id: input.sessionId || null,
      observed_at: asIsoDate(input.date) || new Date().toISOString().slice(0, 10),
      source: input.source || "Polar",
      session_type: input.sessionType || null,
      duration_min: asNullableNumber(input.durationMin),
      hr_avg: asNullableNumber(input.hrAvg),
      hr_max: asNullableNumber(input.hrMax),
      zone_light_min: asNullableNumber(input.zoneLightMin),
      zone_moderate_min: asNullableNumber(input.zoneModerateMin),
      zone_high_min: asNullableNumber(input.zoneHighMin),
      rpe: asNullableNumber(input.rpe),
      trainer_note: input.trainerNote || null,
      client_summary: input.clientSummary || null,
      load_decision: input.loadDecision || "obserwuj",
      client_visible: Boolean(input.clientVisible),
      published_at: input.clientVisible ? new Date().toISOString() : null
    });
  }

  async saveAssessment(clientId, input) {
    return this.insert("assessment_results", {
      client_id: clientId,
      test_id: input.testId || null,
      test_name: input.testName || null,
      performed_at: asIsoDate(input.date) || new Date().toISOString().slice(0, 10),
      side: input.side || null,
      result_text: input.resultText || null,
      pain_before: asNullableNumber(input.painBefore),
      pain_after: asNullableNumber(input.painAfter),
      quality: input.quality || "do obserwacji",
      interpretation: input.interpretation || null,
      trainer_decision: input.trainerDecision || "obserwuj",
      next_step: input.nextStep || null,
      trainer_note: input.trainerNote || null,
      client_summary: input.clientSummary || null,
      client_visible: Boolean(input.clientVisible),
      published_at: input.clientVisible ? new Date().toISOString() : null
    });
  }

  async saveExercise(profileId, input) {
    return this.insert("exercises", {
      owner_trainer_id: profileId,
      name: String(input.name || "").trim(),
      client_name: input.clientName || null,
      category: input.category || null,
      training_block: input.trainingBlock || null,
      subcategory: input.subcategory || null,
      region: input.region || null,
      pattern: input.pattern || null,
      stage: input.stage || null,
      level: input.level || null,
      equipment: input.equipment || null,
      goal: input.goal || null,
      dosage_default: input.dosageDefault || null,
      tempo: input.tempo || null,
      breathing: input.breathing || null,
      client_instruction: input.clientInstruction || null,
      coach_notes: input.coachNotes || null,
      common_mistakes: input.commonMistakes || null,
      stop_criteria: input.stopCriteria || null,
      regressions: input.regressions || null,
      progressions: input.progressions || null,
      contraindications: input.contraindications || null,
      video_url: input.videoUrl || null,
      tags: asTextArray(input.tags),
      linked_tests: asTextArray(input.linkedTests),
      beginner_friendly: input.beginnerFriendly !== false,
      source: input.source || "trainer",
      quality_status: input.qualityStatus || "draft",
      muscle_map: input.muscleMap || {},
      primary_muscles: asTextArray(input.primaryMuscles),
      secondary_muscles: asTextArray(input.secondaryMuscles),
      support_muscles: asTextArray(input.supportMuscles),
      strength_set: Boolean(input.strengthSet)
    });
  }

  async saveHomePlan(clientId, input) {
    return this.insert("home_plans", {
      client_id: clientId,
      title: input.title || null,
      focus: input.focus || null,
      frequency: input.frequency || null,
      duration: input.duration || null,
      instructions: input.instructions || null,
      guidance_channel: input.guidanceChannel || null,
      status: "draft",
      published_at: null
    });
  }

  async saveHomePlanItem(clientId, homePlanId, input) {
    return this.insert("home_plan_items", {
      home_plan_id: homePlanId,
      client_id: clientId,
      exercise_id: input.exerciseId || null,
      name: String(input.name || "").trim(),
      category: input.category || null,
      region: input.region || null,
      dosage: input.dosage || null,
      frequency: input.frequency || null,
      client_cue: input.clientCue || null,
      stop_criteria: input.stopCriteria || null,
      video_url: input.videoUrl || null,
      status: "active",
      sort_order: Number(input.sortOrder || 0),
      added_at: asIsoDate(input.addedAt) || new Date().toISOString().slice(0, 10),
      trainer_note: input.trainerNote || null,
      published_at: null
    });
  }


  async publishHomePlanGuidance(homePlanId) {
    const rows = await this.rpc("publish_home_plan_guidance", { p_home_plan_id: homePlanId });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async withdrawHomePlanGuidance(homePlanId) {
    const rows = await this.rpc("withdraw_home_plan_guidance", { p_home_plan_id: homePlanId });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async confirmHomePlanPaperRetirement(homePlanId) {
    const rows = await this.rpc("confirm_home_plan_paper_retirement", { p_home_plan_id: homePlanId });
    return Array.isArray(rows) ? rows[0] : rows;
  }
  async recordHomePlanGuidanceDelivery(homePlanId, deliveryStatus) {
    const rows = await this.rpc("record_home_plan_guidance_delivery", {
      p_home_plan_id: homePlanId,
      p_delivery_status: deliveryStatus
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }
  async saveReport(profileId, clientId, input) {
    const published = Boolean(input.published);
    return this.insert("reports", {
      client_id: clientId,
      type: input.type || "twelveWeeks",
      audience: input.audience || "trainer",
      status: published ? "published" : "draft",
      title: input.title || null,
      content: String(input.content || "").trim(),
      published_at: published ? new Date().toISOString() : null,
      created_by: profileId
    });
  }

  async saveDocumentMetadata(clientId, input) {
    return this.insert("client_documents", {
      client_id: clientId,
      related_table: input.relatedTable || null,
      related_id: input.relatedId || null,
      kind: input.kind || null,
      original_name: input.originalName || null,
      storage_bucket: input.storageBucket || null,
      storage_path: input.storagePath || null,
      mime_type: input.mimeType || null,
      size_bytes: asNullableNumber(input.sizeBytes),
      audience: input.audience || "trainer",
      status: input.status || "draft",
      published_at: input.status === "published" ? new Date().toISOString() : null
    });
  }

  async saveGuidancePilot(clientId, input) {
    return this.insert("guidance_pilots", {
      client_id: clientId,
      status: input.status || "not_started",
      start_date: asIsoDate(input.startDate),
      duration_weeks: asNullableNumber(input.durationWeeks),
      current_week: asNullableNumber(input.currentWeek),
      objective: input.objective || null,
      trainer_note: input.trainerNote || null
    });
  }

  async saveGuidancePilotFeedback(pilotId, input) {
    return this.insert("guidance_pilot_feedback", {
      pilot_id: pilotId,
      week: Number(input.week),
      understood_next_step: input.understoodNextStep || null,
      reduced_chaos: input.reducedChaos || null,
      friction: input.friction || null,
      simplify_next: input.simplifyNext || null
    });
  }

  async getClientPortalSnapshot() {
    return this.rpc("client_portal_snapshot");
  }

  async saveClientCheckin(input) {
    const rows = await this.rpc("save_client_checkin", {
      p_client_id: input.clientId,
      p_home_plan_item_id: input.homePlanItemId,
      p_protocol_done: Boolean(input.protocolDone),
      p_energy_score: Number(input.energyScore),
      p_symptom_score: Number(input.symptomScore),
      p_note: String(input.note || "").trim() || null
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }
}
