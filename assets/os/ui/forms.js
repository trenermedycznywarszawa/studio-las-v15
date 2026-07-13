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
    field("Imię i nazwisko", "name", "text", { required: true }),
    field("Email", "email", "email"),
    field("Telefon", "phone", "tel"),
    field("Typ współpracy", "engagementType", "select", {
      options: Object.entries(CANONICAL_ENGAGEMENTS).map(([value, label]) => ({ value, label }))
    }),
    field("Etap", "stage", "select", {
      options: Object.entries(CANONICAL_STAGES).map(([value, label]) => ({ value, label }))
    }),
    field("Data startu", "startDate", "date"),
    field("Następna sesja", "nextSessionDate", "date"),
    field("Następny przegląd", "nextReviewDate", "date"),
    field("Cel procesu", "goal", "textarea", { rows: 2 }),
    field("Kontekst zdrowotny", "healthStatus", "textarea", { rows: 2 }),
    field("Przeciwwskazania", "contraindications", "textarea", { rows: 2 }),
    field("Kontekst wymagający uwagi", "redFlagsText", "textarea", { rows: 2 })
  ], "Dodaj klienta", onSubmit);
}

export function sessionForm(onSubmit) {
  return submitForm([
    field("Data", "date", "date", { value: today(), required: true }),
    field("Gotowość 1–10", "readiness", "number", { min: 1, max: 10 }),
    field("Dolegliwość przed 0–10", "vasBefore", "number", { min: 0, max: 10 }),
    field("Dolegliwość po 0–10", "vasAfter", "number", { min: 0, max: 10 }),
    field("Sen", "sleepQuality", "select", {
      options: ["Bardzo słaby", "Słaby", "Przeciętny", "Dobry", "Bardzo dobry"].map(value => ({ value, label: value }))
    }),
    field("Ćwiczenia — po jednym w linii", "exercises", "textarea"),
    field("Obserwacja trenera", "trainerObservation", "textarea"),
    field("Decyzja trenera", "trainerDecision", "textarea"),
    field("Podsumowanie dla klienta", "clientSummary", "textarea"),
    field("Następny krok dla klienta", "clientNextStep", "textarea"),
    checkbox("Opublikuj klientowi", "clientVisible")
  ], "Zapisz sesję w Supabase", onSubmit);
}

export function measurementForm(onSubmit) {
  return submitForm([
    field("Data", "date", "date", { value: today() }),
    field("Waga kg", "weightKg", "number", { step: 0.1 }),
    field("Tłuszcz %", "fatPercent", "number", { step: 0.1 }),
    field("Masa mięśniowa kg", "muscleMassKg", "number", { step: 0.1 }),
    field("Woda %", "bodyWaterPercent", "number", { step: 0.1 }),
    field("Visceral fat rating", "visceralFatRating", "number", { step: 0.1 }),
    field("BMI", "bmi", "number", { step: 0.1 }),
    field("Interpretacja trenera", "trainerInterpretation", "textarea"),
    field("Podsumowanie dla klienta", "clientSummary", "textarea"),
    checkbox("Opublikuj klientowi", "clientVisible")
  ], "Zapisz pomiar", onSubmit, "form-grid compact");
}

export function trainingLoadForm(onSubmit) {
  return submitForm([
    field("Data", "date", "date", { value: today() }),
    field("Typ sesji", "sessionType"),
    field("Czas min", "durationMin", "number"),
    field("HR średnie", "hrAvg", "number"),
    field("HR maksymalne", "hrMax", "number"),
    field("Strefa wysoka min", "zoneHighMin", "number"),
    field("RPE 1–10", "rpe", "number", { min: 1, max: 10 }),
    field("Notatka trenera", "trainerNote", "textarea"),
    field("Podsumowanie dla klienta", "clientSummary", "textarea"),
    checkbox("Opublikuj klientowi", "clientVisible")
  ], "Zapisz odczyt", onSubmit, "form-grid compact");
}

export function assessmentForm(onSubmit) {
  return submitForm([
    field("Data", "date", "date", { value: today() }),
    field("Nazwa obserwacji/testu", "testName", "text", { required: true }),
    field("Strona", "side", "select", {
      options: [
        { value: "", label: "Brak" },
        { value: "lewa", label: "Lewa" },
        { value: "prawa", label: "Prawa" },
        { value: "obie", label: "Obie" }
      ]
    }),
    field("Wynik opisowy", "resultText", "textarea"),
    field("Dolegliwość przed", "painBefore", "number", { min: 0, max: 10 }),
    field("Dolegliwość po", "painAfter", "number", { min: 0, max: 10 }),
    field("Jakość/tolerancja", "quality", "select", {
      options: ["dobrze tolerowane", "ograniczone", "do obserwacji", "przerwać i skonsultować"].map(value => ({ value, label: value }))
    }),
    field("Interpretacja trenera", "interpretation", "textarea"),
    field("Następny krok", "nextStep", "textarea")
  ], "Zapisz obserwację", onSubmit);
}

export function reportForm(onSubmit) {
  return submitForm([
    field("Typ raportu", "type", "select", {
      options: [
        { value: "startMap", label: "Mapa startowa" },
        { value: "fourWeeks", label: "Przegląd 4 tygodni" },
        { value: "twelveWeeks", label: "Raport 12 tygodni" },
        { value: "continuation", label: "Decyzja o kontynuacji" }
      ]
    }),
    field("Odbiorca", "audience", "select", {
      options: [
        { value: "trainer", label: "Tylko trener" },
        { value: "client", label: "Klient" }
      ]
    }),
    field("Tytuł", "title"),
    field("Treść", "content", "textarea", { rows: 8, required: true }),
    checkbox("Opublikuj", "published")
  ], "Zapisz raport", onSubmit);
}

export function homePlanForm(onSubmit) {
  return submitForm([
    field("Tytuł", "title", "text", { required: true }),
    field("Główny kierunek", "focus", "textarea"),
    field("Częstotliwość", "frequency"),
    field("Czas", "duration"),
    field("Instrukcja ogólna", "instructions", "textarea"),
    checkbox("Opublikuj jako aktywny plan", "published")
  ], "Zapisz plan", onSubmit);
}

export function homePlanItemForm(homePlans, onSubmit) {
  const plans = (homePlans || []).map(plan => ({
    value: plan.id,
    label: `${plan.title || "Plan"} · ${plan.status}`
  }));

  const form = submitForm([
    field("Plan", "homePlanId", "select", {
      options: plans.length ? plans : [{ value: "", label: "Najpierw utwórz plan" }]
    }),
    field("Nazwa zadania", "name", "text", { required: true }),
    field("Kategoria", "category"),
    field("Region", "region"),
    field("Dawkowanie", "dosage"),
    field("Częstotliwość", "frequency"),
    field("Wskazówka dla klienta", "clientCue", "textarea"),
    field("Kiedy przerwać / co zgłosić", "stopCriteria", "textarea"),
    field("Video URL", "videoUrl", "url"),
    checkbox("Opublikuj klientowi", "published")
  ], "Dodaj zadanie do planu", values => onSubmit(values.homePlanId, values));
  return form;
}

export function clientCheckinForm(snapshot, onSubmit) {
  const items = snapshot?.homePlan?.items || [];
  return submitForm([
    field("Zadanie", "homePlanItemId", "select", {
      options: items.length
        ? items.map(item => ({ value: item.id, label: item.name }))
        : [{ value: "", label: "Brak aktywnego zadania" }]
    }),
    checkbox("Wykonane", "protocolDone"),
    field("Energia 0–10", "energyScore", "number", { min: 0, max: 10, required: true }),
    field("Dolegliwości 0–10", "symptomScore", "number", { min: 0, max: 10, required: true }),
    field("Krótka notatka — opcjonalnie", "note", "textarea", { rows: 2 })
  ], "Zapisz krótki sygnał", values => onSubmit({ ...values, clientId: snapshot.client.id }), "form-grid client-checkin");
}
