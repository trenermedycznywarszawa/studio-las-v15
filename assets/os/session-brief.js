function text(value) {
  return String(value ?? "").trim();
}

function textList(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" · ");
  return text(value);
}

function sourceDate(row, ...keys) {
  for (const key of keys) {
    const value = text(row?.[key]);
    if (value) return value;
  }
  return null;
}

function fact(label, value, sourceType, date) {
  const normalized = textList(value);
  if (!normalized) return null;
  return Object.freeze({ label, value: normalized, sourceType, sourceDate: date || null });
}

function timestamp(value) {
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function latest(rows, ...keys) {
  return [...(rows || [])].sort((left, right) => {
    for (const key of keys) {
      const difference = timestamp(right?.[key]) - timestamp(left?.[key]);
      if (difference) return difference;
    }
    return 0;
  })[0] || null;
}

function publishedActive(row) {
  return row?.status === "active" && Boolean(row.published_at) && !row.deleted_at;
}

function buildSafetyFacts(workspace) {
  const client = workspace.client || {};
  const intake = latest(workspace.intakes, "updated_at", "created_at");
  const clientDate = sourceDate(client, "updated_at", "created_at");
  const intakeDate = sourceDate(intake, "updated_at", "created_at");

  return [
    fact("Przeciwwskazania", client.contraindications, "Karta klienta", clientDate),
    fact("Kontekst wymagający uwagi", client.red_flags_text, "Karta klienta", clientDate),
    fact("Flagi z intake", intake?.medical_flags, "Najnowszy intake", intakeDate),
    fact("Ograniczenia ruchowe", intake?.movement_limitations, "Najnowszy intake", intakeDate)
  ].filter(Boolean);
}

function buildCurrentFocus(workspace, activePlan) {
  if (activePlan) {
    return fact(
      "Aktualny fokus",
      activePlan.focus || activePlan.title,
      "Aktywny plan domowy",
      sourceDate(activePlan, "published_at", "updated_at", "created_at")
    );
  }

  const intake = latest(workspace.intakes, "updated_at", "created_at");
  const intakeFocus = fact(
    "Aktualny fokus",
    intake?.first_session_focus,
    "Najnowszy intake",
    sourceDate(intake, "updated_at", "created_at")
  );
  if (intakeFocus) return intakeFocus;

  return fact(
    "Aktualny fokus",
    workspace.client?.goal,
    "Karta klienta — cel procesu",
    sourceDate(workspace.client, "updated_at", "created_at")
  );
}

function buildLastDecision(workspace) {
  const session = latest(
    (workspace.sessions || []).filter(item => text(item.trainer_decision)),
    "date",
    "updated_at",
    "created_at"
  );
  return fact(
    "Ostatnia decyzja trenera",
    session?.trainer_decision,
    "Sesja",
    sourceDate(session, "date", "updated_at", "created_at")
  );
}

function buildLatestClientSignal(workspace) {
  const event = latest(
    (workspace.guidanceEvents || []).filter(item => item.kind === "client_checkin"),
    "event_date",
    "created_at"
  );
  if (!event) return null;

  const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
  const item = (workspace.homePlanItems || []).find(entry => entry.id === event.home_plan_item_id);
  const parts = [
    event.completed === true ? "Wykonane: tak" : event.completed === false ? "Wykonane: nie" : "",
    payload.energyScore !== undefined && payload.energyScore !== null ? `Energia: ${payload.energyScore}/10` : "",
    payload.symptomScore !== undefined && payload.symptomScore !== null ? `Dolegliwości: ${payload.symptomScore}/10` : "",
    text(payload.note)
  ].filter(Boolean);

  return fact(
    "Ostatni sygnał klienta",
    parts.join(" · ") || "Sygnał został zapisany.",
    item?.name ? `Check-in klienta — ${item.name}` : "Check-in klienta",
    sourceDate(event, "event_date", "created_at")
  );
}

function buildActiveGuidance(workspace, activePlan) {
  if (!activePlan) return [];
  return (workspace.homePlanItems || [])
    .filter(item => item.home_plan_id === activePlan.id && publishedActive(item))
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
    .map(item => fact(
      item.name || "Zadanie",
      [item.dosage, item.frequency, item.client_cue, item.stop_criteria].map(text).filter(Boolean).join(" · ")
        || "Brak dodatkowej instrukcji.",
      "Opublikowane prowadzenie na papierze",
      sourceDate(item, "published_at", "added_at", "updated_at", "created_at")
    ))
    .filter(Boolean);
}

export function buildTrainerSessionBrief(workspace = {}) {
  const activePlan = latest(
    (workspace.homePlans || []).filter(publishedActive),
    "published_at",
    "updated_at",
    "created_at"
  );
  const client = workspace.client || {};
  const clientDate = sourceDate(client, "updated_at", "created_at");

  return Object.freeze({
    safety: Object.freeze(buildSafetyFacts(workspace)),
    currentFocus: buildCurrentFocus(workspace, activePlan),
    lastDecision: buildLastDecision(workspace),
    latestClientSignal: buildLatestClientSignal(workspace),
    activeGuidance: Object.freeze(buildActiveGuidance(workspace, activePlan)),
    nextSession: fact("Następna sesja", client.next_session_date, "Karta klienta", clientDate),
    reviewPoint: fact("Następny przegląd", client.next_review_date, "Karta klienta", clientDate)
  });
}
