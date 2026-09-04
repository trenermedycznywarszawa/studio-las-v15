import {
  button,
  clear,
  create,
  formatDate,
  panel,
  recordList
} from "./common.js";
import { clientCheckinForm } from "./forms.js";

export function renderClient(root, model) {
  clear(root);
  const snapshot = model.snapshot;

  const header = create("header", { className: "topbar client-topbar" }, [
    create("div", {}, [
      create("p", { className: "eyebrow", text: "Studio Las OS · panel klienta" }),
      create("h1", { text: `Dzień dobry, ${snapshot.client.firstName || ""}`.trim() })
    ]),
    create("div", { className: "top-actions" }, [
      button("Odśwież", { onclick: model.onReload }),
      button("Wyloguj", { className: "button danger", onclick: model.onLogout })
    ])
  ]);

  const stage = create("div", { className: "client-stage" }, [
    create("strong", { text: snapshot.client.stageLabel }),
    create("p", { text: snapshot.client.goal || "Kierunek procesu omawiasz z trenerem." }),
    create("p", { className: "muted", text: `Następna sesja: ${formatDate(snapshot.client.nextSessionDate)}` })
  ]);

  const checkin = create("div", {}, [
    create("p", { text: "Najpierw wykonaj ustalenia offline. Tutaj zapisz tylko krótki sygnał, który trener zobaczy w kontekście całego procesu." }),
    clientCheckinForm(snapshot, model.onSaveCheckin)
  ]);

  const plan = snapshot.homePlan
    ? create("div", {}, [
        create("h3", { text: snapshot.homePlan.title || "Plan" }),
        create("p", { text: snapshot.homePlan.focus || "" }),
        recordList(snapshot.homePlan.items, item => create("article", { className: "record client-record" }, [
          create("strong", { text: item.name }),
          create("p", { text: [item.dosage, item.frequency].filter(Boolean).join(" · ") }),
          create("p", { text: item.clientCue || "" }),
          item.stopCriteria
            ? create("p", { className: "stop-note", text: `Przerwij i zgłoś: ${item.stopCriteria}` })
            : null
        ]), "Brak przypisanych zadań.")
      ])
    : create("p", { className: "muted", text: "Brak opublikowanego planu." });

  const agreement = snapshot.latestAgreement
    ? create("div", {}, [
        create("p", { text: snapshot.latestAgreement.summary || "" }),
        create("strong", { text: snapshot.latestAgreement.nextStep || "" })
      ])
    : create("p", { className: "muted", text: "Brak opublikowanego podsumowania." });

  const reports = recordList(snapshot.reports, report => create("article", { className: "record client-record" }, [
    create("strong", { text: report.title || report.type }),
    create("p", { text: report.content }),
    create("p", { className: "muted", text: formatDate(report.publishedAt) })
  ]), "Brak opublikowanych raportów.");

  const measurements = recordList(snapshot.measurements, item => create("article", { className: "record client-record" }, [
    create("strong", { text: `${formatDate(item.date)} · ${item.source || "Pomiar"}` }),
    create("p", { text: item.summary || "Pomiar zapisany do omówienia z trenerem." })
  ]), "Brak opublikowanych pomiarów.");

  const main = create("main", { className: "client-workspace" }, [
    panel("Twój obecny etap", stage),
    panel("Krótki sygnał", checkin),
    panel("Plan domowy", plan),
    panel("Ostatnie ustalenie", agreement),
    panel("Pomiary", measurements),
    panel("Raporty", reports),
    create("p", { className: "client-disclaimer", text: "Panel nie diagnozuje i nie zmienia planu automatycznie. Znaczenie sygnałów omawiasz z trenerem." })
  ]);

  root.append(header, main);
}
