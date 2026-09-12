import {
  button,
  clear,
  create,
  formatDate,
  panel,
  recordList,
  statusBox,
  detailsForm
} from "./common.js";
import { clientResponseForm } from "./client-response.js";
import { prePwdV31Form } from "./pre-pwd-v31-form.js";

function guidanceVideo(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? create("a", {href:url.href,text:"Film do wskazówki",target:"_blank",rel:"noopener noreferrer"}) : null; }
  catch { return null; }
}

function questionnaireStatusLabel(status) {
  return ({
    assigned: "Do wypełnienia",
    in_progress: "W trakcie",
    submitted: "Wypełniona"
  })[String(status || "")] || "Status do sprawdzenia";
}

function questionnaireList(items, questionnaire) {
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

function activeQuestionnaire(questionnaire) {
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

export function renderClient(root, model) {
  clear(root);
  const snapshot = model.snapshot;
  const questionnaire = model.questionnaire || {};

  const header = create("header", { className: "topbar client-topbar" }, [
    create("div", {}, [
      create("p", { className: "eyebrow", text: "Studio Las" }),
      create("h1", { text: `Dzień dobry, ${snapshot?.client?.firstName || ""}`.trim() })
    ]),
    create("div", { className: "top-actions" }, [
      button("Odśwież", { onclick: model.onReload, disabled: model.loading }),
      button("Wyloguj", { className: "button danger", onclick: model.onLogout })
    ])
  ]);

  if (!snapshot) {
    root.append(header, statusBox(model.error || "Ładowanie Twoich ustaleń…", model.error ? "error" : "info"));
    return;
  }
  const stage = create("div", { className: "client-stage" }, [
    create("strong", { text: snapshot.client.stageLabel }),
    create("p", { text: snapshot.client.goal || "Kierunek procesu omawiasz z trenerem." }),
    create("p", { className: "muted", text: `Następna sesja: ${formatDate(snapshot.client.nextSessionDate)}` }),
    create("a", {className:"button",href:"tel:+48503975998",text:"Zadzwoń do Damiana"})
  ]);

  const plan = snapshot.homePlan
    ? create("div", {}, [
        create("h3", { text: snapshot.homePlan.title || "Plan" }),
        create("p", { text: snapshot.homePlan.focus || "" }),
        create("p", { text: snapshot.homePlan.instructions || "" }),
        create("p", { text: [snapshot.homePlan.frequency,snapshot.homePlan.duration].filter(Boolean).join(" · ") }),
        snapshot.homePlan.guidanceChannel === "paper" ? create("p",{text:"Obowiązują ustalenia przekazane na papierze. Tutaj możesz do nich wrócić."}) : null,
        recordList(snapshot.homePlan.items, item => create("article", { className: "record client-record" }, [
          create("strong", { text: item.name }),
          create("p", { text: [item.dosage, item.frequency].filter(Boolean).join(" · ") }),
          create("p", { text: item.clientCue || "" }),
          item.stopCriteria
            ? create("p", { className: "stop-note", text: `Ustalona granica: ${item.stopCriteria}` })
            : null,
          guidanceVideo(item.videoUrl),
          clientResponseForm(item, model)
        ]), "Brak przypisanych zadań.")
      ])
    : create("p", { className: "muted", text: "Nie ma teraz opublikowanej wskazówki. Nie musisz wykonywać ani zgłaszać dodatkowego zadania." });

  const agreement = snapshot.latestAgreement
    ? create("div", {}, [
        create("p", { text: snapshot.latestAgreement.summary || "" }),
        create("strong", { text: snapshot.latestAgreement.nextStep || "" })
      ])
    : create("p", { className: "muted", text: "Brak opublikowanego podsumowania." });

  const reports = recordList(snapshot.reports, report => create("article", { className: "record client-record" }, [
    create("strong", { text: report.title || report.type }),
    create("p", { className: "preserve-lines", text: report.content }),
    create("p", { className: "muted", text: formatDate(report.publishedAt) })
  ]), "Brak opublikowanych raportów.");

  const measurements = recordList(snapshot.measurements, item => create("article", { className: "record client-record" }, [
    create("strong", { text: `${formatDate(item.date)} · ${item.source || "Pomiar"}` }),
    create("p", { text: item.summary || "Pomiar zapisany do omówienia z trenerem." })
  ]), "Brak opublikowanych pomiarów.");

  const main = create("main", { className: "client-workspace" }, [
    model.error ? statusBox(model.error,"error") : null,
    model.loading ? statusBox("Odświeżanie ustaleń…") : null,
    panel("Teraz · Twoje ustalenia", plan),
    ...Object.entries(model.responseStates || {}).filter(([id]) => !snapshot.homePlan?.items?.some(item=>item.id===id)).map(([id]) =>
      panel("Odpowiedź do poprzedniej wskazówki",clientResponseForm({id},model))),
    panel("Następne spotkanie i kierunek", stage),
    snapshot.questionnaires?.length ? panel("ANKIETY", questionnaireList(snapshot.questionnaires, questionnaire)) : null,
    activeQuestionnaire(questionnaire),
    panel("Ostatnie ustalenie", agreement),
    snapshot.reports?.length ? detailsForm("Podsumowania postępu", reports) : null,
    snapshot.measurements?.length ? detailsForm("Pomiary do omówienia", measurements) : null,
    create("p", { className: "client-disclaimer", text: "Panel nie diagnozuje i nie zmienia planu automatycznie. Znaczenie sygnałów omawiasz z trenerem." })
  ]);

  root.append(header, main);
}
