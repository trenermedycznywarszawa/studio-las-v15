import { buildTrainerSessionBrief } from "./session-brief.js";

function text(value) {
  return String(value ?? "").trim();
}

function timestamp(value) {
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourceDate(row, ...keys) {
  for (const key of keys) {
    const value = text(row?.[key]);
    if (value) return value;
  }
  return null;
}

function latest(rows, predicate = () => true, ...dateKeys) {
  return [...(rows || [])]
    .filter(predicate)
    .sort((left, right) => {
      for (const key of dateKeys) {
        const difference = timestamp(right?.[key]) - timestamp(left?.[key]);
        if (difference) return difference;
      }
      return 0;
    })[0] || null;
}

function fact(label, value, sourceType, date) {
  const normalized = text(value);
  if (!normalized) return null;
  return {
    label,
    value: normalized,
    sourceType,
    sourceDate: date || null
  };
}

function missingFact(label, value) {
  return {
    label,
    value,
    sourceType: "Brak w istniejących rekordach",
    sourceDate: null
  };
}

export function composeTrainerObservation(observation, interpretation) {
  const parts = [
    text(observation) ? `Obserwacja:\n${text(observation)}` : "",
    text(interpretation) ? `Interpretacja trenera:\n${text(interpretation)}` : ""
  ].filter(Boolean);
  return parts.join("\n\n") || null;
}

export function prepareSessionInput(input = {}) {
  return {
    date: text(input.date),
    trainerObservation: composeTrainerObservation(input.observation, input.interpretation),
    trainerDecision: text(input.trainerDecision) || null,
    clientNextStep: text(input.clientNextStep) || null
  };
}

export function buildTrainerWorkspace(workspace = {}) {
  const client = workspace.client || {};
  const sourceBrief = buildTrainerSessionBrief(workspace);
  const latestSession = latest(
    workspace.sessions,
    () => true,
    "date",
    "updated_at",
    "created_at"
  );
  const nextStepSession = latest(
    workspace.sessions,
    row => text(row.client_next_step),
    "date",
    "updated_at",
    "created_at"
  );
  const previousCheck = latest(
    workspace.preSessionChecks,
    row => text(row.trainer_note),
    "check_date",
    "updated_at",
    "created_at"
  );
  const clientDate = sourceDate(client, "updated_at", "created_at");
  const phase = fact("Etap prowadzenia", client.stage, "Karta klienta", clientDate);
  const nextStep = fact(
    "Następny krok zapisany przez trenera",
    nextStepSession?.client_next_step,
    "Sesja",
    sourceDate(nextStepSession, "date", "updated_at", "created_at")
  );
  const thingToCheck = fact(
    "Wcześniej zapisana rzecz do sprawdzenia",
    previousCheck?.trainer_note,
    "Brief przed sesją",
    sourceDate(previousCheck, "check_date", "updated_at", "created_at")
  );

  const missing = [
    !sourceBrief.nextSession
      ? missingFact("Termin", "Nie zapisano terminu najbliższego spotkania.")
      : null,
    !sourceBrief.lastDecision
      ? missingFact("Decyzja", "Nie zapisano decyzji z poprzedniej sesji.")
      : null,
    !sourceBrief.latestClientSignal
      ? missingFact("Sygnał klienta", "Brak sygnału po ostatnim działaniu offline.")
      : null,
    !thingToCheck
      ? missingFact("Do sprawdzenia", "Trener nie zapisał wcześniej osobnej rzeczy do sprawdzenia.")
      : null
  ].filter(Boolean);

  const lastSessionDate = sourceDate(latestSession, "date", "updated_at", "created_at");
  const changedSinceSession = sourceBrief.latestClientSignal
    && lastSessionDate
    && timestamp(sourceBrief.latestClientSignal.sourceDate) > timestamp(lastSessionDate)
      ? {
          ...sourceBrief.latestClientSignal,
          label: "Nowy sygnał od poprzedniej sesji"
        }
      : null;

  const known = [
    sourceBrief.currentFocus,
    sourceBrief.lastDecision,
    sourceBrief.latestClientSignal,
    ...sourceBrief.safety
  ].filter(Boolean);

  return {
    today: {
      phase,
      nextSession: sourceBrief.nextSession,
      lastDecision: sourceBrief.lastDecision,
      latestClientSignal: sourceBrief.latestClientSignal,
      missing,
      nextStep
    },
    brief: {
      changedSinceSession,
      known,
      unknown: missing,
      thingToCheck,
      lastSessionDate
    },
    previousSignal: sourceBrief.latestClientSignal
  };
}
