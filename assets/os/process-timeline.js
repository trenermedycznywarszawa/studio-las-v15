const SEMANTIC_PRIORITY = Object.freeze({ FACT: 1, INTERPRETATION: 2, DECISION: 3 });

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanText(Array.isArray(value) ? value.join(", ") : value);
    if (text) return text;
  }
  return "";
}

function excerpt(value, limit = 220) {
  const text = cleanText(value);
  if (!text || text.length <= limit) return text;
  return `${text.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

function dateFrom(row, fields) {
  for (const field of fields) {
    if (row?.[field]) return String(row[field]);
  }
  return "";
}

function event({ sourceType, row, sourceDate, semantic, label, value, meta = "" }) {
  if (!row || !sourceDate || !semantic || !label) return null;
  const sourceId = cleanText(row.id);
  return {
    key: `${sourceType}:${sourceId || sourceDate}:${semantic}:${label}`,
    sourceType,
    sourceId,
    sourceDate: String(sourceDate),
    semantic,
    label,
    value: excerpt(value || "Zapisano zdarzenie procesu."),
    meta: excerpt(meta, 140)
  };
}

function push(events, candidate) {
  if (candidate) events.push(candidate);
}

function metricSummary(row) {
  const values = [];
  if (row.weight_kg !== null && row.weight_kg !== undefined) values.push(`masa ${row.weight_kg} kg`);
  if (row.fat_percent !== null && row.fat_percent !== undefined) values.push(`tkanka tłuszczowa ${row.fat_percent}%`);
  if (row.muscle_mass_kg !== null && row.muscle_mass_kg !== undefined) values.push(`mięśnie ${row.muscle_mass_kg} kg`);
  if (row.bmi !== null && row.bmi !== undefined) values.push(`BMI ${row.bmi}`);
  return values.join(" · ");
}

function loadSummary(row) {
  const values = [];
  if (row.duration_min !== null && row.duration_min !== undefined) values.push(`${row.duration_min} min`);
  if (row.rpe !== null && row.rpe !== undefined) values.push(`RPE ${row.rpe}`);
  if (row.hr_avg !== null && row.hr_avg !== undefined) values.push(`HR śr. ${row.hr_avg}`);
  if (row.hr_max !== null && row.hr_max !== undefined) values.push(`HR max ${row.hr_max}`);
  return values.join(" · ");
}

function preSessionSummary(row) {
  const flags = [];
  if (row.pain_increased) flags.push("większy ból");
  if (row.poor_sleep) flags.push("gorszy sen");
  if (row.home_plan_done) flags.push("plan domowy wykonany");
  if (row.new_symptoms) flags.push("nowe objawy");
  if (row.red_flag_concern) flags.push("sygnał wymagający uwagi");
  return flags.length ? flags.join(" · ") : "Zapisano check przed sesją; bez zaznaczonych sygnałów w formularzu.";
}

function clientCheckinSummary(row) {
  const payload = row?.payload && typeof row.payload === "object" ? row.payload : {};
  const values = [];
  if (typeof payload.protocol_done === "boolean") values.push(payload.protocol_done ? "plan wykonany" : "plan niewykonany");
  if (Number.isFinite(Number(payload.energy_score))) values.push(`energia ${payload.energy_score}`);
  if (Number.isFinite(Number(payload.symptom_score))) values.push(`objawy ${payload.symptom_score}`);
  if (cleanText(payload.note)) values.push(cleanText(payload.note));
  return values.length ? values.join(" · ") : "Klient zapisał sygnał w aplikacji.";
}

function sortableTime(value) {
  const raw = String(value || "");
  if (!raw) return 0;
  const parsed = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00Z` : raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildProcessTimeline(workspace = {}) {
  const events = [];
  const client = workspace.client || null;

  if (client?.start_date) {
    push(events, event({
      sourceType: "clients",
      row: client,
      sourceDate: client.start_date,
      semantic: "FACT",
      label: "Start procesu",
      value: "Data startu zapisana w profilu klienta."
    }));
  }

  for (const row of workspace.intakes || []) {
    const date = dateFrom(row, ["created_at", "updated_at"]);
    push(events, event({
      sourceType: "client_intakes",
      row,
      sourceDate: date,
      semantic: "FACT",
      label: "Wywiad / punkt startowy",
      value: firstText(row.main_goal, row.summary, row.first_session_focus, row.goals, "Zapisano wywiad klienta.")
    }));
  }

  for (const row of workspace.sessions || []) {
    const date = dateFrom(row, ["date", "created_at"]);
    push(events, event({
      sourceType: "sessions",
      row,
      sourceDate: date,
      semantic: "FACT",
      label: row.session_type === "pwd" ? "PWD" : "Sesja 1:1",
      value: firstText(row.client_summary, row.milestone, "Zapisano odbytą sesję.")
    }));
    if (cleanText(row.trainer_observation)) {
      push(events, event({
        sourceType: "sessions",
        row,
        sourceDate: date,
        semantic: "INTERPRETATION",
        label: "Obserwacja trenera po sesji",
        value: row.trainer_observation
      }));
    }
    if (cleanText(row.trainer_decision)) {
      push(events, event({
        sourceType: "sessions",
        row,
        sourceDate: date,
        semantic: "DECISION",
        label: "Decyzja po sesji",
        value: row.trainer_decision
      }));
    }
  }

  for (const row of workspace.preSessionChecks || []) {
    const date = dateFrom(row, ["check_date", "created_at"]);
    push(events, event({
      sourceType: "pre_session_checks",
      row,
      sourceDate: date,
      semantic: "FACT",
      label: "Check przed sesją",
      value: preSessionSummary(row)
    }));
    if (cleanText(row.trainer_note)) {
      push(events, event({
        sourceType: "pre_session_checks",
        row,
        sourceDate: date,
        semantic: "INTERPRETATION",
        label: "Notatka trenera przed sesją",
        value: row.trainer_note
      }));
    }
    if (cleanText(row.planned_decision) && cleanText(row.planned_decision).toLowerCase() !== "obserwuj") {
      push(events, event({
        sourceType: "pre_session_checks",
        row,
        sourceDate: date,
        semantic: "DECISION",
        label: "Plan przed sesją",
        value: row.planned_decision
      }));
    }
  }

  for (const row of workspace.postSessionObservations || []) {
    const date = dateFrom(row, ["date", "created_at"]);
    push(events, event({
      sourceType: "post_session_observations",
      row,
      sourceDate: date,
      semantic: "FACT",
      label: "Reakcja po sesji",
      value: firstText(row.client_response, row.what_we_did, "Zapisano obserwację po sesji.")
    }));
    if (cleanText(row.decision) && cleanText(row.decision).toLowerCase() !== "obserwuj") {
      push(events, event({
        sourceType: "post_session_observations",
        row,
        sourceDate: date,
        semantic: "DECISION",
        label: "Decyzja po obserwacji",
        value: row.decision
      }));
    }
  }

  for (const row of workspace.measurements || []) {
    const date = dateFrom(row, ["measured_at", "created_at"]);
    push(events, event({
      sourceType: "body_measurements",
      row,
      sourceDate: date,
      semantic: "FACT",
      label: `Pomiar${cleanText(row.source) ? ` · ${cleanText(row.source)}` : ""}`,
      value: firstText(row.client_summary, metricSummary(row), "Zapisano pomiar.")
    }));
    if (cleanText(row.trainer_interpretation)) {
      push(events, event({
        sourceType: "body_measurements",
        row,
        sourceDate: date,
        semantic: "INTERPRETATION",
        label: "Interpretacja pomiaru",
        value: row.trainer_interpretation
      }));
    }
  }

  for (const row of workspace.trainingLoad || []) {
    const date = dateFrom(row, ["observed_at", "created_at"]);
    push(events, event({
      sourceType: "training_load_observations",
      row,
      sourceDate: date,
      semantic: "FACT",
      label: "Tolerancja obciążenia",
      value: firstText(row.client_summary, loadSummary(row), "Zapisano odczyt obciążenia.")
    }));
    if (cleanText(row.trainer_note)) {
      push(events, event({
        sourceType: "training_load_observations",
        row,
        sourceDate: date,
        semantic: "INTERPRETATION",
        label: "Notatka trenera do obciążenia",
        value: row.trainer_note
      }));
    }
    if (cleanText(row.load_decision) && cleanText(row.load_decision).toLowerCase() !== "obserwuj") {
      push(events, event({
        sourceType: "training_load_observations",
        row,
        sourceDate: date,
        semantic: "DECISION",
        label: "Decyzja o obciążeniu",
        value: row.load_decision
      }));
    }
  }

  for (const row of workspace.assessments || []) {
    const date = dateFrom(row, ["performed_at", "created_at"]);
    push(events, event({
      sourceType: "assessment_results",
      row,
      sourceDate: date,
      semantic: "FACT",
      label: cleanText(row.test_name) || "Obserwacja ruchowa",
      value: firstText(row.result_text, row.quality, "Zapisano wynik obserwacji.")
    }));
    if (cleanText(row.interpretation)) {
      push(events, event({
        sourceType: "assessment_results",
        row,
        sourceDate: date,
        semantic: "INTERPRETATION",
        label: "Interpretacja obserwacji",
        value: row.interpretation
      }));
    }
    if (cleanText(row.trainer_decision) && cleanText(row.trainer_decision).toLowerCase() !== "obserwuj") {
      push(events, event({
        sourceType: "assessment_results",
        row,
        sourceDate: date,
        semantic: "DECISION",
        label: "Decyzja po obserwacji ruchowej",
        value: firstText(row.trainer_decision, row.next_step)
      }));
    }
  }

  for (const row of workspace.homePlans || []) {
    if (!row.published_at) continue;
    push(events, event({
      sourceType: "home_plans",
      row,
      sourceDate: row.published_at,
      semantic: "DECISION",
      label: "Guidance opublikowane",
      value: firstText(row.focus, row.title, "Opublikowano prowadzenie dla klienta."),
      meta: cleanText(row.guidance_channel)
    }));
  }

  for (const row of workspace.guidanceEvents || []) {
    const date = dateFrom(row, ["event_date", "created_at"]);
    push(events, event({
      sourceType: "guidance_events",
      row,
      sourceDate: date,
      semantic: "FACT",
      label: "Sygnał klienta",
      value: clientCheckinSummary(row)
    }));
  }

  for (const row of workspace.reports || []) {
    const date = dateFrom(row, ["published_at", "created_at"]);
    push(events, event({
      sourceType: "reports",
      row,
      sourceDate: date,
      semantic: "INTERPRETATION",
      label: row.status === "published" ? "Raport opublikowany" : "Raport zapisany",
      value: firstText(row.title, row.content, "Zapisano raport."),
      meta: cleanText(row.type)
    }));
  }

  for (const row of workspace.cycleDecisions || []) {
    const date = dateFrom(row, ["decided_at", "created_at"]);
    push(events, event({
      sourceType: "client_cycle_decisions",
      row,
      sourceDate: date,
      semantic: "DECISION",
      label: "Decyzja co dalej",
      value: firstText(row.decision, row.rationale, "Zapisano decyzję cyklu."),
      meta: cleanText(row.rationale)
    }));
  }

  for (const row of workspace.signalReviews || []) {
    const date = dateFrom(row, ["reviewed_at", "created_at"]);
    push(events, event({
      sourceType: "trainer_signal_reviews",
      row,
      sourceDate: date,
      semantic: "DECISION",
      label: "Przegląd sygnału",
      value: firstText(row.outcome, "Zapisano wynik przeglądu sygnału."),
      meta: cleanText(row.signal_key)
    }));
  }

  return events.sort((a, b) => {
    const dateDiff = sortableTime(b.sourceDate) - sortableTime(a.sourceDate);
    if (dateDiff) return dateDiff;
    const semanticDiff = (SEMANTIC_PRIORITY[b.semantic] || 0) - (SEMANTIC_PRIORITY[a.semantic] || 0);
    if (semanticDiff) return semanticDiff;
    return a.key.localeCompare(b.key, "pl");
  });
}

export const PROCESS_TIMELINE_SEMANTICS = Object.freeze({
  FACT: "FAKT",
  INTERPRETATION: "INTERPRETACJA",
  DECISION: "DECYZJA"
});
