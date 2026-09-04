const item = (key, instruction, dose, stopCriteria, extra = {}) => ({
  key,
  instruction,
  purpose: "Sprawdzić spokojny, aktualny kierunek w ważnej codziennej sytuacji.",
  dose,
  stopCriteria,
  ...extra
});

const baseItem = item(
  "walk-reset",
  "Wybierz spokojny dziesięciominutowy spacer w znanym otoczeniu.",
  "10 minut, raz przed następnym spotkaniem; krócej, jeśli tak będzie właściwiej.",
  "Zatrzymaj lub skróć, jeśli pojawi się niepokojąca reakcja, wyraźne pogorszenie albo chcesz przerwać. W pilnej sytuacji skorzystaj z odpowiedniej pomocy poza Studio Las."
);

const base = {
  focus: "Spokojny powrót do regularnego ruchu bez zwiększania presji.",
  items: [baseItem],
  reviewAt: "2026-08-31T09:00:00.000Z",
  validUntil: "2026-09-07T09:00:00.000Z",
  responseRequest: {
    prompt: "Jeśli chcesz, wybierz najbliższą odpowiedź po wykonaniu.",
    decisionImpact: "Może pomóc Damianowi zdecydować, czy utrzymać, uprościć albo zmienić wskazówkę."
  }
};

export const fixtures = Object.freeze([
  { id: "app-primary", label: "01 · aplikacja — jedna aktualna instrukcja", risk: "current_authority", ...base, channel: "app" },
  { id: "paper-primary", label: "02 · papier — realne wycofanie", risk: "stale_paper", ...base, channel: "paper" },
  {
    id: "deliberate-hybrid", label: "03 · świadoma hybryda", risk: "duplicate_truth", ...base,
    channel: "deliberate_hybrid", authoritativeChannel: "paper",
    secondaryRole: "Aplikacja pokazuje wyłącznie przypomnienie, że wiążąca instrukcja znajduje się na przekazanej karcie."
  },
  { id: "stopped-or-uncertain", label: "04 · zatrzymanie i pytanie", risk: "non_judgmental_response", ...base, channel: "app", interaction: { executionResponse: "stopped", question: "Czy przed kolejną próbą mam poczekać do rozmowy z Damianem?" } },
  { id: "version-change", label: "05 · materialna zmiana wersji", risk: "stale_guidance", ...base, channel: "app" },
  { id: "partial-release-revision", label: "06 · niepełna rewizja wydania", risk: "atomic_revision", ...base, channel: "app", items: [baseItem, item("chair-rise", "Wstań spokojnie z wybranego krzesła.", "Do 3 spokojnych powtórzeń.", "Przerwij, jeśli potrzebujesz podparcia albo czujesz niepokojącą reakcję.")] },
  { id: "focus-validity-boundary", label: "07 · cel, przegląd i ważność", risk: "review_vs_expiry", ...base, channel: "app" },
  { id: "no-signal-required", label: "08 · brak sygnału jest pełnym planem", risk: "tracking_pressure", ...base, channel: "paper", responseRequest: null },
  { id: "week-4-adjustment", label: "09 · tydzień 4 — tylko punkt przeglądu", risk: "automatic_progression", ...base, channel: "app" },
  { id: "week-8-independence", label: "10 · tydzień 8 — większa samodzielność", risk: "screen_dependence", ...base, channel: "deliberate_hybrid", authoritativeChannel: "app", secondaryRole: "Papier zawiera niezmienny skrót dokładnie tej samej zatwierdzonej instrukcji." },
  { id: "week-12-handoff", label: "11 · tydzień 12 — wybór dowodów", risk: "report_overreach", ...base, channel: "app" },
  { id: "ineligible-stage-4-decision", label: "12 · wejście inne niż START", risk: "entry_gate", ...base, channel: "app", entryValue: "START_CONDITIONAL" },
  { id: "entry-invalidated-mid-cycle", label: "13 · START traci ważność", risk: "entry_invalidation", ...base, channel: "app" },
  { id: "manual-no-portal", label: "14 · pełna ścieżka ręczna", risk: "manual_fallback", ...base, channel: "paper", responseRequest: null },
  { id: "client-safe-boundary", label: "15 · granica widoku klienta", risk: "trainer_only_leak", ...base, channel: "app" },
  { id: "late-response", label: "16 · spóźniona odpowiedź", risk: "context_redirection", ...base, channel: "app" },
  { id: "paper-retirement-failure", label: "17 · starego papieru nie wycofano", risk: "stale_paper", ...base, channel: "paper" },
  { id: "wrong-client-reference", label: "18 · obca referencja", risk: "privacy_isolation", ...base, channel: "app" }
]);

export const fixtureById = id => fixtures.find(fixture => fixture.id === id);
