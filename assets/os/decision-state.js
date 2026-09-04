export const CYCLE_DECISION_OPTIONS = Object.freeze([
  Object.freeze({ value: "independent", label: "Samodzielność" }),
  Object.freeze({ value: "continue_1_to_1", label: "Dalsze 1:1" }),
  Object.freeze({ value: "next_cycle", label: "Kolejny cykl" }),
  Object.freeze({ value: "hybrid", label: "Model mieszany" })
]);

export const SIGNAL_REVIEW_OPTIONS = Object.freeze([
  Object.freeze({ value: "noted_no_change", label: "Uwzględniono — bez zmiany" }),
  Object.freeze({ value: "changed_guidance", label: "Uwzględniono — zmieniono prowadzenie" }),
  Object.freeze({ value: "outdated", label: "Nieaktualne" }),
  Object.freeze({ value: "contact_required", label: "Wymaga kontaktu" })
]);

export const GUIDANCE_STATUS_LABELS = Object.freeze({
  draft: "Szkic",
  active: "Aktywna",
  archived: "Archiwalna"
});

export const GUIDANCE_CHANNEL_LABELS = Object.freeze({
  app: "Aplikacja",
  paper: "Papier",
  hybrid: "Papier + aplikacja"
});

export const GUIDANCE_DELIVERY_LABELS = Object.freeze({
  pending: "Oczekuje na potwierdzenie dostarczenia",
  recorded: "Dostarczona",
  paper_retirement_unresolved: "Poprzednia kopia papierowa wymaga wycofania",
  paper_retirement_confirmed: "Wycofanie poprzedniej kopii papierowej potwierdzone"
});

export const REPORT_TYPE_LABELS = Object.freeze({
  startMap: "Mapa startowa",
  fourWeeks: "Przegląd 4 tygodni",
  twelveWeeks: "Raport 12 tygodni",
  continuation: "Decyzja o kontynuacji"
});

export const REPORT_AUDIENCE_LABELS = Object.freeze({
  trainer: "Tylko trener",
  client: "Klient"
});

export const REPORT_STATUS_LABELS = Object.freeze({
  draft: "Szkic",
  published: "Opublikowany",
  archived: "Archiwalny"
});

function optionLabel(options, value, fallback) {
  return options.find(option => option.value === value)?.label || fallback;
}

export function cycleDecisionLabel(value) {
  return optionLabel(CYCLE_DECISION_OPTIONS, value, "Nieznana decyzja historyczna");
}

export function signalReviewOutcomeLabel(value) {
  return optionLabel(SIGNAL_REVIEW_OPTIONS, value, "Nieznany wynik historyczny");
}

export function guidanceStatusLabel(value) {
  return GUIDANCE_STATUS_LABELS[value] || "Stan historyczny";
}

export function guidanceChannelLabel(value) {
  return GUIDANCE_CHANNEL_LABELS[value] || "Kanał nieustalony";
}

export function guidanceDeliveryLabel(value) {
  return GUIDANCE_DELIVERY_LABELS[value] || "Dostarczenie nieustalone";
}

export function reportTypeLabel(value) {
  return REPORT_TYPE_LABELS[value] || "Raport historyczny";
}

export function reportAudienceLabel(value) {
  return REPORT_AUDIENCE_LABELS[value] || "Odbiorca historyczny";
}

export function reportStatusLabel(value) {
  return REPORT_STATUS_LABELS[value] || "Stan historyczny";
}

export function latestCycleDecision(rows = []) {
  return [...rows].sort((left, right) => {
    const leftTime = Date.parse(left?.decided_at || left?.created_at || "") || 0;
    const rightTime = Date.parse(right?.decided_at || right?.created_at || "") || 0;
    return rightTime - leftTime;
  })[0] || null;
}
