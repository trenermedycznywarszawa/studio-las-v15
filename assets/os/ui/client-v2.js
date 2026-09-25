import {
  button,
  clear,
  create,
  detailsForm,
  formatDate,
  panel,
  recordList,
  statusBox
} from "./common.js";
import { clientResponseForm } from "./client-response.js";
import { activeQuestionnaire, questionnaireList } from "./client-questionnaires.js";

function guidanceVideo(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      ? create("a", { href: url.href, text: "Film do wskazówki", target: "_blank", rel: "noopener noreferrer" })
      : null;
  } catch {
    return null;
  }
}

function navLink(label, mark, href, current = false) {
  return create("a", {
    href,
    ...(current ? { "aria-current": "page" } : {})
  }, [
    create("span", { className: "sl-nav-mark", text: mark, "aria-hidden": "true" }),
    label
  ]);
}

function planItem(item, model) {
  const meta = [item.dosage, item.frequency].filter(Boolean).join(" · ");
  return create("article", { className: "sl-runtime-item" }, [
    create("strong", { text: item.name || "Zadanie" }),
    meta ? create("p", { text: meta }) : null,
    item.clientCue ? create("p", { text: item.clientCue }) : null,
    item.stopCriteria
      ? create("p", { className: "stop-note", text: `Ustalona granica: ${item.stopCriteria}` })
      : null,
    guidanceVideo(item.videoUrl),
    clientResponseForm(item, model)
  ]);
}

function todayFocus(snapshot, model) {
  const plan = snapshot.homePlan;
  if (!plan) {
    return create("section", { className: "sl-card sl-focus", id: "today-v2-focus" }, [
      create("div", { className: "sl-card-head" }, [
        create("span", { className: "sl-card-kicker", text: "Na dziś" }),
        create("span", { className: "sl-pill", text: "Bez dodatkowego zadania" })
      ]),
      create("div", { className: "sl-runtime-empty" }, [
        create("strong", { text: "Nie ma teraz opublikowanej wskazówki." }),
        create("p", { text: "Nie musisz wykonywać ani zgłaszać dodatkowego zadania." })
      ])
    ]);
  }

  const meta = [plan.frequency, plan.duration].filter(Boolean);
  const items = Array.isArray(plan.items) ? plan.items : [];

  return create("section", { className: "sl-card sl-focus", id: "today-v2-focus" }, [
    create("div", { className: "sl-card-head" }, [
      create("span", { className: "sl-card-kicker", text: "Na dziś" }),
      create("span", { className: "sl-pill", text: "Ustalone przez trenera" })
    ]),
    create("div", { className: "sl-focus-label", text: "Aktualne ustalenie" }),
    create("h3", { className: "sl-focus-title", text: plan.title || "Twoje ustalenie" }),
    plan.focus ? create("p", { className: "sl-process-copy", text: plan.focus }) : null,
    meta.length
      ? create("div", { className: "sl-focus-meta" }, meta.map(text => create("span", { text })))
      : null,
    plan.instructions ? create("div", { className: "sl-focus-cue", text: plan.instructions }) : null,
    plan.guidanceChannel === "paper"
      ? create("div", { className: "sl-focus-cue", text: "Obowiązują ustalenia przekazane na papierze. Tutaj możesz do nich wrócić." })
      : null,
    items.length
      ? create("div", { className: "sl-runtime-focus-list" }, items.map(item => planItem(item, model)))
      : create("div", { className: "sl-runtime-empty" }, [
          create("strong", { text: "Brak przypisanych zadań." }),
          create("p", { text: "Jeżeli to wymaga wyjaśnienia, skontaktuj się z trenerem." })
        ])
  ]);
}

function trainerAgreement(snapshot) {
  const agreement = snapshot.latestAgreement;
  if (!agreement) return null;

  return create("section", { className: "sl-card", id: "today-v2-agreement" }, [
    create("div", { className: "sl-card-head" }, [
      create("h3", { text: "Ostatnie ustalenie" }),
      create("span", { className: "sl-card-kicker", text: "Od trenera" })
    ]),
    create("div", { className: "sl-runtime-agreement" }, [
      create("div", { className: "sl-avatar", text: "D", "aria-hidden": "true" }),
      create("div", {}, [
        agreement.summary ? create("p", { text: agreement.summary }) : null,
        agreement.nextStep ? create("strong", { text: agreement.nextStep }) : null
      ])
    ])
  ]);
}

function processContext(snapshot) {
  const client = snapshot.client || {};
  return create("section", { className: "sl-card", id: "today-v2-process" }, [
    create("div", { className: "sl-card-head" }, [
      create("h3", { text: "Kierunek procesu" }),
      create("span", { className: "sl-card-kicker", text: "Kontekst" })
    ]),
    create("div", { className: "sl-process-facts" }, [
      create("div", { className: "sl-process-fact" }, [
        create("span", { text: "Cel" }),
        create("strong", { text: client.goal || "Kierunek procesu omawiasz z trenerem." })
      ]),
      create("div", { className: "sl-process-fact" }, [
        create("span", { text: "Etap" }),
        create("strong", { text: client.stageLabel || "—" })
      ]),
      create("div", { className: "sl-process-fact" }, [
        create("span", { text: "Następna sesja" }),
        create("strong", { text: formatDate(client.nextSessionDate) })
      ])
    ]),
    create("div", { className: "sl-process-actions" }, [
      create("a", { className: "sl-action-link", href: "tel:+48503975998", text: "Zadzwoń do Damiana" })
    ])
  ]);
}

function publishedReports(snapshot) {
  return recordList(snapshot.reports, report => create("article", { className: "record client-record" }, [
    create("strong", { text: report.title || report.type }),
    create("p", { className: "preserve-lines", text: report.content }),
    create("p", { className: "muted", text: formatDate(report.publishedAt) })
  ]), "Brak opublikowanych raportów.");
}

function publishedMeasurements(snapshot) {
  return recordList(snapshot.measurements, item => create("article", { className: "record client-record" }, [
    create("strong", { text: `${formatDate(item.date)} · ${item.source || "Pomiar"}` }),
    create("p", { text: item.summary || "Pomiar zapisany do omówienia z trenerem." })
  ]), "Brak opublikowanych pomiarów.");
}

function loadingView(root, model) {
  clear(root);
  root.append(create("main", { className: "center-screen" }, [
    statusBox(model.error || "Ładowanie Twoich ustaleń…", model.error ? "error" : "info")
  ]));
}

export function renderClientV2(root, model) {
  const snapshot = model.snapshot;
  if (!snapshot) {
    loadingView(root, model);
    return;
  }

  clear(root);
  const questionnaire = model.questionnaire || {};
  const clientName = snapshot.client?.firstName || "";

  const sidebar = create("aside", { className: "sl-sidebar", "aria-label": "Nawigacja klienta" }, [
    create("div", { className: "sl-brand" }, ["Studio Las ", create("small", { text: "OS" })]),
    create("nav", { className: "sl-nav" }, [
      navLink("Dzisiaj", "○", "#today-v2", true),
      navLink("Proces", "↗", "#today-v2-process"),
      snapshot.reports?.length ? navLink("Raport", "□", "#today-v2-reports") : null
    ]),
    create("div", { className: "sl-sidebar-foot" }, [
      create("div", { className: "sl-person" }, [
        create("div", { className: "sl-avatar", text: clientName.slice(0, 1).toUpperCase() || "K", "aria-hidden": "true" }),
        create("div", {}, [
          create("strong", { text: clientName || "Klient" }),
          create("span", { text: "Studio Las" })
        ])
      ])
    ])
  ]);

  const pageHead = create("header", { className: "sl-page-head" }, [
    create("h1", { className: "sl-page-title", text: "Dzisiaj" }),
    create("div", { className: "sl-runtime-actions" }, [
      create("span", { className: "sl-runtime-date", text: formatDate(snapshot.serverDate) }),
      button("Odśwież", { className: "sl-action", onclick: model.onReload, disabled: model.loading }),
      button("Wyloguj", { className: "sl-action sl-action-danger", onclick: model.onLogout })
    ])
  ]);

  const hasPlan = Boolean(snapshot.homePlan);
  const hero = create("section", { className: "sl-hero", "aria-labelledby": "today-v2-title" }, [
    create("div", { className: "sl-hero-copy" }, [
      create("p", { className: "sl-eyebrow", text: `Dzień dobry${clientName ? `, ${clientName}` : ""}` }),
      create("h2", {
        id: "today-v2-title",
        text: hasPlan ? "Jedna ważna rzecz na dziś." : "Dziś niczego nie trzeba dokładać."
      }),
      create("p", {
        text: hasPlan
          ? "Zobacz aktualne ustalenie. Po wykonaniu możesz zostawić krótki sygnał dla trenera."
          : "Nie ma teraz opublikowanej wskazówki. Nie musisz wykonywać ani zgłaszać dodatkowego zadania."
      })
    ]),
    create("div", {
      className: "sl-hero-art",
      role: "img",
      "aria-label": "Spokojny, leśny motyw wizualny"
    })
  ]);

  const status = create("div", { className: "sl-runtime-status" }, [
    model.error ? statusBox(model.error, "error") : null,
    model.loading ? statusBox("Odświeżanie ustaleń…") : null
  ]);

  const mainGrid = create("div", { className: "sl-section-grid" }, [
    create("div", { className: "sl-stack" }, [
      todayFocus(snapshot, model),
      trainerAgreement(snapshot)
    ]),
    create("div", { className: "sl-stack" }, [
      processContext(snapshot)
    ])
  ]);

  const staleResponses = Object.entries(model.responseStates || {})
    .filter(([id]) => !snapshot.homePlan?.items?.some(item => item.id === id))
    .map(([id]) => panel("Odpowiedź do poprzedniej wskazówki", clientResponseForm({ id }, model)));

  const secondary = create("div", { className: "sl-runtime-secondary" }, [
    ...staleResponses,
    snapshot.questionnaires?.length ? panel("Ankiety", questionnaireList(snapshot.questionnaires, questionnaire)) : null,
    activeQuestionnaire(questionnaire),
    snapshot.reports?.length
      ? create("div", { id: "today-v2-reports" }, [detailsForm("Podsumowania postępu", publishedReports(snapshot))])
      : null,
    snapshot.measurements?.length
      ? detailsForm("Pomiary do omówienia", publishedMeasurements(snapshot))
      : null
  ]);

  const page = create("main", { className: "sl-page", id: "today-v2" }, [
    pageHead,
    status,
    hero,
    mainGrid,
    secondary,
    create("p", {
      className: "sl-runtime-disclaimer",
      text: "Panel nie diagnozuje i nie zmienia planu automatycznie. Znaczenie sygnałów omawiasz z trenerem."
    })
  ]);

  root.append(create("div", { className: "sl-app-shell sl-runtime-shell" }, [sidebar, page]));
}
