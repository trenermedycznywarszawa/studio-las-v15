const DISCLAIMER =
  "To są sygnały do przeglądu przez trenera, nie diagnoza ani automatyczna decyzja o progresji, regresji lub leczeniu.";

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function addSignal(signals, signal) {
  signals.push({
    id: signal.id,
    level: signal.level || "review",
    source: signal.source || "process",
    label: signal.label,
    context: signal.context,
    trainerQuestion: signal.trainerQuestion
  });
}

export function collectAttentionSignals({ client, session, trainingLoad, preSessionCheck } = {}) {
  const signals = [];

  const painBefore = numberOrNull(session?.vas_before ?? session?.vasBefore);
  const painAfter = numberOrNull(session?.vas_after ?? session?.vasAfter);
  if (painBefore !== null && painAfter !== null && painAfter > painBefore) {
    addSignal(signals, {
      id: "symptom-increase-after-session",
      level: "review",
      source: "session",
      label: "Zgłoszony poziom dolegliwości wzrósł po sesji.",
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
      label: "Klient zgłosił niską gotowość lub energię.",
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
      label: "Sen został opisany jako słaby.",
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
      label: "Wysiłek został odczuty jako bardzo wysoki.",
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
      label: "W zapisie pojawił się czas w wysokiej strefie wysiłku.",
      context: `${highZone} min.`,
      trainerQuestion: "Czy ten fragment był planowany i zgodny z reakcją klienta?"
    });
  }

  if (preSessionCheck?.red_flag_concern || preSessionCheck?.redFlagConcern) {
    addSignal(signals, {
      id: "trainer-marked-red-flag-concern",
      level: "urgent-review",
      source: "trainer-check",
      label: "Trener zaznaczył potrzebę pilnego przeglądu sytuacji.",
      context: "Sygnał pochodzi z ręcznego sprawdzenia przed sesją.",
      trainerQuestion: "Czy należy przerwać planowany proces i skierować klienta do odpowiedniej konsultacji?"
    });
  }

  if (preSessionCheck?.new_symptoms || preSessionCheck?.newSymptoms) {
    addSignal(signals, {
      id: "new-symptoms",
      level: "urgent-review",
      source: "trainer-check",
      label: "Pojawiła się informacja o nowych objawach.",
      context: "Program nie interpretuje charakteru ani znaczenia objawów.",
      trainerQuestion: "Jakie dodatkowe informacje trzeba zebrać przed dalszą pracą?"
    });
  }

  const redFlagsText = String(client?.red_flags_text ?? client?.redFlagsText ?? "").trim();
  if (redFlagsText) {
    addSignal(signals, {
      id: "client-record-has-risk-context",
      level: "information",
      source: "client-record",
      label: "Rekord klienta zawiera ręcznie wpisany kontekst ryzyka.",
      context: "Treść pozostaje notatką trenera i nie jest interpretowana automatycznie.",
      trainerQuestion: "Czy obecny plan uwzględnia tę informację i czy nadal jest aktualna?"
    });
  }

  return Object.freeze({
    requiresTrainerReview: signals.some(signal => signal.level === "urgent-review" || signal.level === "review"),
    urgent: signals.some(signal => signal.level === "urgent-review"),
    signals,
    disclaimer: DISCLAIMER
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
