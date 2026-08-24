import {
  checkbox,
  field,
  submitForm
} from "./common.js";
import {
  CANONICAL_ENGAGEMENTS,
  CANONICAL_STAGES
} from "../runtime.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function newClientForm(onSubmit) {
  return submitForm([
    field("Imię i nazwisko", "name", "text", { required: true, maxlength: 180 }),
    field("Email", "email", "email", { maxlength: 254 }),
    field("Telefon", "phone", "tel", { maxlength: 40 }),
    field("Typ współpracy", "engagementType", "select", {
      required: true,
      options: Object.entries(CANONICAL_ENGAGEMENTS).map(([value, label]) => ({ value, label }))
    }),
    field("Etap", "stage", "select", {
      required: true,
      options: Object.entries(CANONICAL_STAGES).map(([value, label]) => ({ value, label }))
    }),
    field("Data startu", "startDate", "date"),
    field("Następna sesja", "nextSessionDate", "date"),
    field("Następny przegląd", "nextReviewDate", "date"),
    field("Cel procesu", "goal", "textarea", { rows: 2, maxlength: 4000 }),
    field("Kontekst zdrowotny", "healthStatus", "textarea", { rows: 2, maxlength: 6000 }),
    field("Przeciwwskazania", "contraindications", "textarea", { rows: 2, maxlength: 6000 }),
    field("Kontekst wymagający uwagi", "redFlagsText", "textarea", { rows: 2, maxlength: 6000 })
  ], "Dodaj klienta", onSubmit);
}

export function sessionForm(onSubmit) {
  return submitForm([
    field("Data", "date", "date", { value: today(), required: true }),
    field("Co zaobserwowałem", "observation", "textarea", {
      rows: 4,
      required: true,
      maxlength: 6000,
      placeholder: "Fakty z rozmowy i pracy podczas sesji."
    }),
    field("Jak to interpretuję", "interpretation", "textarea", {
      rows: 4,
      required: true,
      maxlength: 6000,
      placeholder: "Interpretacja trenera — bez automatycznej oceny systemu."
    }),
    field("Moja decyzja", "trainerDecision", "textarea", {
      rows: 3,
      required: true,
      maxlength: 8000,
      placeholder: "Jawna decyzja, którą podejmuje trener."
    }),
    field("Następny krok", "clientNextStep", "textarea", {
      rows: 3,
      maxlength: 4000,
      placeholder: "Krok zapisany przez trenera; pole może pozostać puste."
    })
  ], "Zapisz sesję", onSubmit, "form-grid session-form");
}

export function measurementForm(onSubmit) {
  return submitForm([
    field("Data", "date", "date", { value: today(), required: true }),
    field("Waga kg", "weightKg", "number", { step: 0.1, min: 0 }),
    field("Tłuszcz %", "fatPercent", "number", { step: 0.1, min: 0, max: 100 }),
    field("Masa mięśniowa kg", "muscleMassKg", "number", { step: 0.1, min: 0 }),
    field("Woda %", "bodyWaterPercent", "number", { step: 0.1, min: 0, max: 100 }),
    field("Visceral fat rating", "visceralFatRating", "number", { step: 0.1, min: 0 }),
    field("BMI", "bmi", "number", { step: 0.1, min: 0 }),
    field("Interpretacja trenera", "trainerInterpretation", "textarea", { maxlength: 8000 }),
    field("Podsumowanie dla klienta", "clientSummary", "textarea", { maxlength: 4000 }),
    checkbox("Opublikuj klientowi", "clientVisible")
  ], "Zapisz pomiar", onSubmit, "form-grid compact");
}

export function trainingLoadForm(onSubmit) {
  return submitForm([
    field("Data", "date", "date", { value: today(), required: true }),
    field("Typ sesji", "sessionType", "text", { maxlength: 160 }),
    field("Czas min", "durationMin", "number", { min: 0 }),
    field("HR średnie", "hrAvg", "number", { min: 0 }),
    field("HR maksymalne", "hrMax", "number", { min: 0 }),
    field("Strefa wysoka min", "zoneHighMin", "number", { min: 0 }),
    field("RPE 1–10", "rpe", "number", { min: 1, max: 10 }),
    field("Notatka trenera", "trainerNote", "textarea", { maxlength: 8000 }),
    field("Podsumowanie dla klienta", "clientSummary", "textarea", { maxlength: 4000 }),
    checkbox("Opublikuj klientowi", "clientVisible")
  ], "Zapisz odczyt", onSubmit, "form-grid compact");
}

export function assessmentForm(onSubmit) {
  return submitForm([
    field("Data", "date", "date", { value: today(), required: true }),
    field("Nazwa obserwacji/testu", "testName", "text", { required: true, maxlength: 240 }),
    field("Strona", "side", "select", {
      options: [
        { value: "", label: "Brak" },
        { value: "lewa", label: "Lewa" },
        { value: "prawa", label: "Prawa" },
        { value: "obie", label: "Obie" }
      ]
    }),
    field("Wynik opisowy", "resultText", "textarea", { maxlength: 8000 }),
    field("Dolegliwość przed", "painBefore", "number", { min: 0, max: 10 }),
    field("Dolegliwość po", "painAfter", "number", { min: 0, max: 10 }),
    field("Jakość/tolerancja", "quality", "select", {
      options: ["dobrze tolerowane", "ograniczone", "do obserwacji", "przerwać i skonsultować"].map(value => ({ value, label: value }))
    }),
    field("Interpretacja trenera", "interpretation", "textarea", { maxlength: 8000 }),
    field("Następny krok", "nextStep", "textarea", { maxlength: 4000 })
  ], "Zapisz obserwację", onSubmit);
}

export function reportForm(onSubmit) {
  return submitForm([
    field("Typ raportu", "type", "select", {
      required: true,
      options: [
        { value: "startMap", label: "Mapa startowa" },
        { value: "fourWeeks", label: "Przegląd 4 tygodni" },
        { value: "twelveWeeks", label: "Raport 12 tygodni" },
        { value: "continuation", label: "Decyzja o kontynuacji" }
      ]
    }),
    field("Odbiorca", "audience", "select", {
      required: true,
      options: [
        { value: "trainer", label: "Tylko trener" },
        { value: "client", label: "Klient" }
      ]
    }),
    field("Tytuł", "title", "text", { maxlength: 240 }),
    field("Treść", "content", "textarea", { rows: 8, required: true, maxlength: 50000 }),
    checkbox("Opublikuj", "published")
  ], "Zapisz raport", onSubmit);
}

export function homePlanForm(onSubmit) {
  return submitForm([
    field("Tytuł", "title", "text", { required: true, maxlength: 240 }),
    field("Główny kierunek", "focus", "textarea", { maxlength: 4000 }),
    field("Częstotliwość", "frequency", "text", { maxlength: 160 }),
    field("Czas", "duration", "text", { maxlength: 160 }),
    field("Instrukcja ogólna", "instructions", "textarea", { maxlength: 8000 }),
    checkbox("Opublikuj jako aktywny plan", "published")
  ], "Zapisz plan", onSubmit);
}

export function homePlanItemForm(homePlans, onSubmit) {
  const plans = (homePlans || []).map(plan => ({
    value: plan.id,
    label: `${plan.title || "Plan"} · ${plan.status}`
  }));
  const hasPlan = plans.length > 0;

  return submitForm([
    field("Plan", "homePlanId", "select", {
      required: true,
      disabled: !hasPlan,
      options: hasPlan ? plans : [{ value: "", label: "Najpierw utwórz plan" }]
    }),
    field("Nazwa zadania", "name", "text", { required: true, maxlength: 240, disabled: !hasPlan }),
    field("Kategoria", "category", "text", { maxlength: 160, disabled: !hasPlan }),
    field("Region", "region", "text", { maxlength: 160, disabled: !hasPlan }),
    field("Dawkowanie", "dosage", "text", { maxlength: 240, disabled: !hasPlan }),
    field("Częstotliwość", "frequency", "text", { maxlength: 240, disabled: !hasPlan }),
    field("Wskazówka dla klienta", "clientCue", "textarea", { maxlength: 4000, disabled: !hasPlan }),
    field("Kiedy przerwać / co zgłosić", "stopCriteria", "textarea", { maxlength: 4000, disabled: !hasPlan }),
    field("Video URL", "videoUrl", "url", { maxlength: 2000, disabled: !hasPlan }),
    checkbox("Opublikuj klientowi", "published", false, { disabled: !hasPlan })
  ], "Dodaj zadanie do planu", values => onSubmit(values.homePlanId, values), "form-grid", {
    disabled: !hasPlan,
    disabledReason: hasPlan ? "" : "Najpierw utwórz plan domowy. Zadanie nie może istnieć bez planu nadrzędnego."
  });
}

export function clientCheckinForm(snapshot, onSubmit) {
  const items = snapshot?.homePlan?.items || [];
  const hasItem = items.length > 0;

  return submitForm([
    field("Zadanie", "homePlanItemId", "select", {
      required: true,
      disabled: !hasItem,
      options: hasItem
        ? items.map(item => ({ value: item.id, label: item.name }))
        : [{ value: "", label: "Brak aktywnego zadania" }]
    }),
    checkbox("Wykonane", "protocolDone", false, { disabled: !hasItem }),
    field("Energia 0–10", "energyScore", "number", { min: 0, max: 10, required: true, disabled: !hasItem }),
    field("Dolegliwości 0–10", "symptomScore", "number", { min: 0, max: 10, required: true, disabled: !hasItem }),
    field("Krótka notatka — opcjonalnie", "note", "textarea", { rows: 2, maxlength: 500, disabled: !hasItem })
  ], "Zapisz krótki sygnał", onSubmit, "form-grid client-checkin", {
    disabled: !hasItem,
    disabledReason: hasItem ? "" : "Nie ma aktywnego, opublikowanego zadania, do którego można zapisać sygnał."
  });
}
