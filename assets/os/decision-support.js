const DISCLAIMER =
  "To są sygnały do przeglądu przez trenera, nie diagnoza ani automatyczna decyzja o progresji, regresji lub leczeniu.";

const SIGNAL_LABELS = Object.freeze({
  "symptom-increase-after-session": "Zgłoszony poziom dolegliwości wzrósł po sesji.",
  "low-readiness": "Klient zgłosił niską gotowość lub energię.",
  "poor-sleep": "Sen został opisany jako słaby.",
  "very-high-perceived-effort": "Wysiłek został odczuty jako bardzo wysoki.",
  "high-zone-present": "W zapisie pojawił się czas w wysokiej strefie wysiłku.",
  "trainer-marked-red-flag-concern": "Trener zaznaczył potrzebę pilnego przeglądu sytuacji.",
  "new-symptoms": "Pojawiła się informacja o nowych objawach.",
  "client-record-has-risk-context": "Rekord klienta zawiera ręcznie wpisany kontekst ryzyka."
});

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedSourceDate(value) {
  const raw = String(value || "").trim();
  return raw ? raw.slice(0, 10) : "brak-daty-źródła";
}

export function signalInstanceKey({ id, source, sourceDate }) {
  return [id, source, normalizedSourceDate(sourceDate)]
    .map(value => encodeURIComponent(String(value || "")))
    .join("::");
}

export function signalIdentity(signalKey) {
  const [id = "", source = "", sourceDate = ""] = String(signalKey || "")
    .split("::")
    .map(value => decodeURIComponent(value));
  return Object.freeze({ id, source, sourceDate });
}

export function signalTypeLabel(signalKey) {
  return SIGNAL_LABELS[signalIdentity(signalKey).id] || "Sygnał zapisany do przeglądu";
}

function addSignal(signals, signal) {
  const sourceDate = normalizedSourceDate(signal.sourceDate);
  signals.push({
    id: signal.id,
    level: signal.level || "review",
    source: signal.source || "process",
    sourceDate,
    signalKey: signalInstanceKey({ ...signal, sourceDate }),
    label: signal.label,
    context: signal.context,
    trainerQuestion: signal.trainerQuestion
  });
}

export function collectAttentionSignals({ client, session, trainingLoad, preSessionCheck } = {}) {
  const signals = [];
  const sessionDate = session?.date || session?.created_at;
  const trainingLoadDate = trainingLoad?.observed_at || trainingLoad?.created_at;
  const preSessionCheckDate = preSessionCheck?.check_date || preSessionCheck?.created_at;

  const painBefore = numberOrNull(session?.vas_before ?? session?.vasBefore);
  const painAfter = numberOrNull(session?.vas_after ?? session?.vasAfter);
  if (painBefore !== null && painAfter !== null && painAfter > painBefore) {
    addSignal(signals, {
      id: "symptom-increase-after-session",
      level: "review",
      source: "session",
      sourceDate: sessionDate,
      label: SIGNAL_LABELS["symptom-increase-after-session"],
      context: `Przed: ${painBefore}/10, po: ${painAfter}/10.`,
      trainerQuestion: "Czy reakcja była spodziewana, przejściowa i zgodna z kontekstem tej osoby?"
    });
  }

  const readiness = numberOrNull(session?.readiness);
  if (readiness !== null && readiness <= 3) {
    addSignal(signals, {
      id: "low-readiness",
      level: "review",
      source: "session",
      sourceDate: sessionDate,
      label: SIGNAL_LABELS["low-readiness"],
      context: `${readiness}/10.`,
      trainerQuestion: "Co działo się tego dnia i czy plan wymaga spokojniejszej interpretacji?"
    });
  }

  const sleep = String(session?.sleep_quality ?? session?.sleepQuality ?? "").toLowerCase();
  if (["bardzo słaby", "słaby", "poor", "very poor"].includes(sleep)) {
    addSignal(signals, {
      id: "poor-sleep",
      level: "review",
      source: "session",
      sourceDate: sessionDate,
      label: SIGNAL_LABELS["poor-sleep"],
      context: session?.sleep_quality ?? session?.sleepQuality,
      trainerQuestion: "Czy słabszy sen był pojedynczym zdarzeniem, czy częścią szerszego wzorca?"
    });
  }

  const rpe = numberOrNull(trainingLoad?.rpe);
  if (rpe !== null && rpe >= 9) {
    addSignal(signals, {
      id: "very-high-perceived-effort",
      level: "review",
      source: "training-load",
      sourceDate: trainingLoadDate,
      label: SIGNAL_LABELS["very-high-perceived-effort"],
      context: `RPE ${rpe}/10.`,
      trainerQuestion: "Czy wysoki wysiłek był zamierzony i dobrze tolerowany w całym kontekście sesji?"
    });
  }

  const highZone = numberOrNull(trainingLoad?.zone_high_min ?? trainingLoad?.zoneHighMin);
  if (highZone !== null && highZone > 0) {
    addSignal(signals, {
      id: "high-zone-present",
      level: "information",
      source: "training-load",
      sourceDate: trainingLoadDate,
      label: SIGNAL_LABELS["high-zone-present"],
      context: `${highZone} min.`,
      trainerQuestion: "Czy ten fragment był planowany i zgodny z reakcją klienta?"
    });
  }

  if (preSessionCheck?.red_flag_concern || preSessionCheck?.redFlagConcern) {
    addSignal(signals, {
      id: "trainer-marked-red-flag-concern",
      level: "urgent-review",
      source: "trainer-check",
      sourceDate: preSessionCheckDate,
      label: SIGNAL_LABELS["trainer-marked-red-flag-concern"],
      context: "Sygnał pochodzi z ręcznego sprawdzenia przed sesją.",
      trainerQuestion: "Czy należy przerwać planowany proces i skierować klienta do odpowiedniej konsultacji?"
    });
  }

  if (preSessionCheck?.new_symptoms || preSessionCheck?.newSymptoms) {
    addSignal(signals, {
      id: "new-symptoms",
      level: "urgent-review",
      source: "trainer-check",
      sourceDate: preSessionCheckDate,
      label: SIGNAL_LABELS["new-symptoms"],
      context: "Program nie interpretuje charakteru ani znaczenia objawów.",
      trainerQuestion: "Jakie dodatkowe informacje trzeba zebrać przed dalszą pracą?"
    });
  }

  return Object.freeze({
    requiresTrainerReview: signals.some(signal => signal.level === "urgent-review" || signal.level === "review"),
    urgent: signals.some(signal => signal.level === "urgent-review"),
    signals,
    disclaimer: DISCLAIMER
  });
}

export function withoutReviewedSignals(result, reviews = []) {
  const reviewed = new Set((reviews || []).map(item => item.signal_key));
  const signals = (result?.signals || []).filter(signal => !reviewed.has(signal.signalKey));
  return Object.freeze({
    requiresTrainerReview: signals.some(signal => signal.level === "urgent-review" || signal.level === "review"),
    urgent: signals.some(signal => signal.level === "urgent-review"),
    signals: Object.freeze(signals),
    disclaimer: result?.disclaimer || DISCLAIMER
  });
}

export function renderSignalText(result) {
  if (!result?.signals?.length) {
    return `Brak automatycznych sygnałów do przeglądu. ${DISCLAIMER}`;
  }

  const lines = result.signals.map((signal, index) =>
    `${index + 1}. ${signal.label} ${signal.context || ""} Pytanie dla trenera: ${signal.trainerQuestion}`
  );

  return `${lines.join("\n")}\n\n${DISCLAIMER}`;
}

export function getDecisionSupportDisclaimer() {
  return DISCLAIMER;
}
