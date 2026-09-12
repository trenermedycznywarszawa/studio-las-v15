import { button, create, formatDate, panel, recordList, statusBox } from "./common.js";
import { prePwdV31Form } from "./pre-pwd-v31-form.js";

const FINAL_HEALTH_CONSENT_TEXT = "Wyrażam zgodę na przetwarzanie przez Studio Las danych dotyczących mojego zdrowia, które podaję w tej ankiecie, w celu przygotowania i prowadzenia indywidualnej współpracy treningowej z uwzględnieniem informacji istotnych dla doboru zakresu i obciążeń treningowych. Wiem, że dane są zapisywane podczas wypełniania ankiety, a trener zobaczy je dopiero, gdy wybiorę „Przekaż ankietę trenerowi”. Zgodę mogę w dowolnym momencie wycofać ze skutkiem na przyszłość.";

function questionnaireStatusLabel(status) {
  return ({
    assigned: "Do wypełnienia",
    in_progress: "W trakcie",
    submitted: "Wypełniona"
  })[String(status || "")] || "Status do sprawdzenia";
}

export function questionnaireList(items, questionnaire) {
  return recordList(items, item => create("article", { className: "record client-record" }, [
    create("strong", { text: item.title || "Ankieta" }),
    create("p", { text: questionnaireStatusLabel(item.status) }),
    create("p", {
      className: "muted",
      text: item.submittedAt
        ? `Przekazano: ${formatDate(item.submittedAt)}`
        : `Przypisano: ${formatDate(item.assignedAt)}`
    }),
    ["assigned", "in_progress"].includes(item.status) && item.canOpen
      ? button(item.status === "in_progress" ? "Kontynuuj" : "Wypełnij", {
          onclick: () => questionnaire.open(item),
          disabled: questionnaire.loading || questionnaire.submitting
        })
      : ["assigned", "in_progress"].includes(item.status)
        ? create("p", { className: "muted", text: "Ta wersja ankiety nie jest jeszcze dostępna do bezpiecznego wypełnienia." })
        : null
  ]), "Brak przypisanych ankiet.");
}

export function activeQuestionnaire(questionnaire) {
  if (!questionnaire?.assignment) return null;
  if (questionnaire.loading && !questionnaire.snapshot) {
    return panel("Ankieta przed pierwszą wizytą", statusBox("Wczytywanie ankiety…", "info"));
  }

  const content = create("div", { className: "questionnaire-workspace" }, [
    questionnaire.error ? statusBox(questionnaire.error, "error") : null,
    questionnaire.conflict
      ? create("div", {}, [
          statusBox("W innej karcie istnieje nowszy zapis. Niczego nie nadpisaliśmy.", "error"),
          button("Wczytaj zapis z serwera", { onclick: questionnaire.onReloadFromServer })
        ])
      : null,
    questionnaire.validationMissing?.length
      ? statusBox("Uzupełnij wymagane informacje przed przekazaniem ankiety trenerowi.", "error")
      : null,
    questionnaire.validationInvalid?.length
      ? statusBox("Część odpowiedzi ma nieprawidłowy format. Sprawdź formularz.", "error")
      : null,
    prePwdV31Form({
      answers: questionnaire.answers,
      profileContext: questionnaire.profileContext,
      consentAccepted: questionnaire.consentAccepted,
      onAnswerChange: questionnaire.onAnswerChange,
      onProfileChange: questionnaire.onProfileChange,
      onConsentChange: questionnaire.onConsentChange,
      healthGateNote: "Zapis odpowiedzi zdrowotnych rozpoczyna się dopiero po świadomym potwierdzeniu."
    }),
    create("p", { text: FINAL_HEALTH_CONSENT_TEXT }),
    create("div", { className: "top-actions" }, [
      button("Zamknij", { onclick: questionnaire.close, disabled: questionnaire.submitting || questionnaire.consentBusy }),
      questionnaire.snapshot?.submissionEnabled
        ? button("Przekaż ankietę trenerowi", {
            onclick: questionnaire.onSubmit,
            disabled: questionnaire.submitting || questionnaire.consentBusy || questionnaire.conflict
          })
        : create("p", { className: "muted", text: "Ta wersja nie jest jeszcze dopuszczona do przekazania trenerowi." })
    ]),
    create("p", {
      className: "muted",
      text: "Przekazanie jest świadomą, końcową czynnością. Dopiero wtedy trener zobaczy odpowiedzi."
    })
  ]);

  return panel("ANKIETA · przed pierwszą wizytą", content);
}
