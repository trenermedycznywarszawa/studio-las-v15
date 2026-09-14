import { button, create, formatDate, panel, recordList, statusBox } from "./common.js";
import { prePwdV31Form } from "./pre-pwd-v31-form.js";

const LEGACY_V31_CONSENT_TEXT_VERSION = "pre-pwd-health-draft-gate-v1";

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

  const expectedConsentText = String(questionnaire.snapshot?.expectedConsentText || "").trim();
  const expectedConsentTextVersion = String(questionnaire.snapshot?.expectedConsentTextVersion || "").trim();
  const legacyV31Consent =
    questionnaire.snapshot?.versionCode === "3.1"
    && expectedConsentTextVersion === LEGACY_V31_CONSENT_TEXT_VERSION;
  const consentContractReady = Boolean(expectedConsentText) || legacyV31Consent;

  const content = create("div", { className: "questionnaire-workspace" }, [
    questionnaire.error ? statusBox(questionnaire.error, "error") : null,
    !consentContractReady
      ? statusBox("Ta wersja ankiety nie ma kompletnej treści zgody powiązanej z zapisem danych zdrowotnych.", "error")
      : null,
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
      healthConsentText: expectedConsentText || undefined,
      healthConsentEnabled: consentContractReady,
      healthGateNote: "Zapis odpowiedzi zdrowotnych rozpoczyna się dopiero po świadomym potwierdzeniu."
    }),
    expectedConsentText ? create("p", { text: expectedConsentText }) : null,
    create("div", { className: "top-actions" }, [
      button("Zamknij", { onclick: questionnaire.close, disabled: questionnaire.submitting || questionnaire.consentBusy }),
      questionnaire.snapshot?.submissionEnabled
        ? button("Przekaż ankietę trenerowi", {
            onclick: questionnaire.onSubmit,
            disabled: questionnaire.submitting || questionnaire.consentBusy || questionnaire.conflict || !consentContractReady
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
