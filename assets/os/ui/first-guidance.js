import { firstGuidanceInput } from "../first-guidance.js";
import { create, detailsForm, field, formatDate, submitForm } from "./common.js";

export function firstGuidanceComposer(session, model) {
  const form = submitForm([
    create("p", {className: "muted wide", text: `Kontekst: PWD z ${formatDate(session.date)} · zapis ${session.id}. Powyżej pozostają obserwacje, interpretacja, decyzja i następny krok. Do szkicu przenosimy tylko opis celu; sprawdź go przed zapisem.`}),
    field("Tytuł pierwszej wskazówki", "title", "text", {required: true, maxlength: 240, value: "Pierwsze 2–3 tygodnie"}),
    field("Cel na pierwsze 2–3 tygodnie", "focus", "textarea", {required: true, maxlength: 4000, value: session.client_summary || ""}),
    field("Częstotliwość w tym okresie", "frequency", "text", {required: true, maxlength: 160}),
    field("Okres prowadzenia", "duration", "text", {required: true, maxlength: 160, value: "Pierwsze 2–3 tygodnie"}),
    field("Termin przeglądu", "reviewDate", "date", {required: true}),
    field("Ustalenia dla klienta", "instructions", "textarea", {maxlength: 7900}),
    field("Kanał pierwszej wskazówki", "guidanceChannel", "select", {required: true, options: [{value:"app",label:"Aplikacja"},{value:"paper",label:"Papier"},{value:"hybrid",label:"Papier i aplikacja"}]}),
    create("p", {className:"muted wide",text:"Zapisz szkic, następnie dodaj działania, dawkowanie i granice w sekcji prowadzenia. Termin przeglądu jest częścią treści tej wersji wskazówki. Zatwierdzenie i publikacja pozostają osobnymi krokami."})
  ], "Zapisz szkic pierwszej wskazówki", async values => {
    await model.onSaveHomePlan(firstGuidanceInput(values));
    document.getElementById("trainer-guidance")?.scrollIntoView({block:"start"});
  });
  form.classList.add("first-guidance-form");
  return detailsForm("Przygotuj pierwszą wskazówkę z tej PWD", form);
}
