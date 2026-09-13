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
import { activeQuestionnaire, questionnaireList } from "./client-questionnaires.js";

function guidanceVideo(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? create("a", {href:url.href,text:"Film do wskazówki",target:"_blank",rel:"noopener noreferrer"}) : null; }
  catch { return null; }
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
