import {
  button,
  clear,
  create,
  detailsForm,
  formatDate,
  panel,
  recordList
} from "./common.js";
import {
  assessmentForm,
  homePlanForm,
  homePlanItemForm,
  measurementForm,
  newClientForm,
  reportForm,
  sessionForm,
  trainingLoadForm
} from "./forms.js";
import {
  CANONICAL_ENGAGEMENTS,
  CANONICAL_STAGES
} from "../runtime.js";

function summaryGrid(client) {
  const values = [
    ["Typ współpracy", CANONICAL_ENGAGEMENTS[client.engagement_type] || "Archiwalny typ współpracy"],
    ["Etap", CANONICAL_STAGES[client.stage] || "Proces Studio Las"],
    ["Następna sesja", formatDate(client.next_session_date)],
    ["Następny przegląd", formatDate(client.next_review_date)],
    ["Cel procesu", client.goal || "Nie zapisano"],
    ["Następny kamień milowy", client.next_milestone || "Nie zapisano"]
  ];

  return create("div", { className: "summary-grid" }, values.map(([label, value], index) =>
    create("div", { className: `summary-item ${index > 3 ? "wide" : ""}` }, [
      create("span", { text: label }),
      create("strong", { text: value })
    ])
  ));
}

function signalPanel(result) {
  const body = create("div", { className: "signal-list" });
  if (!result?.signals?.length) {
    body.append(create("div", { className: "status ok", text: "Brak automatycznych sygnałów do przeglądu. Decyzję nadal podejmuje trener." }));
  } else {
    result.signals.forEach(signal => {
      body.append(create("article", { className: `signal ${signal.level}` }, [
        create("strong", { text: signal.label }),
        signal.context ? create("p", { text: signal.context }) : null,
        create("p", { className: "muted", text: `Pytanie dla trenera: ${signal.trainerQuestion}` })
      ]));
    });
  }
  body.append(create("p", { className: "disclaimer", text: result?.disclaimer || "Program nie podejmuje decyzji medycznych." }));
  return body;
}

function sessionsSection(workspace, model) {
  return panel("Sesje", create("div", {}, [
    recordList(workspace.sessions, session => create("article", { className: "record" }, [
      create("strong", { text: formatDate(session.date) }),
      create("p", { text: session.trainer_observation || "Brak obserwacji" }),
      create("p", { className: "muted", text: session.trainer_decision || "Brak zapisanej decyzji trenera" })
    ]), "Brak sesji."),
    detailsForm("Dodaj sesję", sessionForm(model.onSaveSession))
  ]));
}

function measurementsSection(workspace, model) {
  const measurements = create("div", {}, [
    create("h3", { text: "Pomiary" }),
    recordList(workspace.measurements, item => create("article", { className: "record" }, [
      create("strong", { text: `${formatDate(item.measured_at)} · ${item.source}` }),
      create("p", { text: item.client_summary || item.trainer_interpretation || "Brak podsumowania" })
    ]), "Brak pomiarów."),
    detailsForm("Dodaj pomiar", measurementForm(model.onSaveMeasurement))
  ]);

  const trainingLoad = create("div", {}, [
    create("h3", { text: "Polar / tolerancja obciążenia" }),
    recordList(workspace.trainingLoad, item => create("article", { className: "record" }, [
      create("strong", { text: `${formatDate(item.observed_at)} · ${item.session_type || "Sesja"}` }),
      create("p", { text: `RPE: ${item.rpe ?? "—"}, HR śr.: ${item.hr_avg ?? "—"}` }),
      create("p", { className: "muted", text: item.trainer_note || "Brak notatki" })
    ]), "Brak odczytów."),
    detailsForm("Dodaj odczyt", trainingLoadForm(model.onSaveTrainingLoad))
  ]);

  return panel("Pomiary i tolerancja obciążenia", create("div", { className: "two-column" }, [measurements, trainingLoad]));
}

function assessmentsSection(workspace, model) {
  return panel("Obserwacje ruchowe", create("div", {}, [
    recordList(workspace.assessments, item => create("article", { className: "record" }, [
      create("strong", { text: `${formatDate(item.performed_at)} · ${item.test_name || "Obserwacja"}` }),
      create("p", { text: item.result_text || "Brak opisu" }),
      create("p", { className: "muted", text: item.interpretation || "Bez automatycznej interpretacji" })
    ]), "Brak zapisanych obserwacji."),
    detailsForm("Dodaj obserwację", assessmentForm(model.onSaveAssessment))
  ]));
}

function plansSection(workspace, model) {
  const plans = create("div", {}, [
    create("h3", { text: "Plany" }),
    recordList(workspace.homePlans, plan => create("article", { className: "record" }, [
      create("strong", { text: plan.title || "Plan" }),
      create("p", { text: plan.focus || "Brak kierunku" }),
      create("p", { className: "muted", text: `${plan.status} · ${plan.published_at ? "opublikowany" : "nieopublikowany"}` })
    ]), "Brak planu."),
    detailsForm("Utwórz plan", homePlanForm(model.onSaveHomePlan))
  ]);

  const items = create("div", {}, [
    create("h3", { text: "Zadania" }),
    recordList(workspace.homePlanItems, item => create("article", { className: "record" }, [
      create("strong", { text: item.name }),
      create("p", { text: [item.dosage, item.frequency].filter(Boolean).join(" · ") || "Brak dawkowania" }),
      create("p", { className: "muted", text: item.client_cue || "Brak wskazówki" })
    ]), "Brak zadań."),
    detailsForm("Dodaj zadanie", homePlanItemForm(workspace.homePlans, model.onSaveHomePlanItem))
  ]);

  return panel("Plan domowy", create("div", { className: "two-column" }, [plans, items]));
}

function reportsSection(workspace, model) {
  return panel("Raporty", create("div", {}, [
    recordList(workspace.reports, report => create("article", { className: "record" }, [
      create("strong", { text: report.title || report.type }),
      create("p", { text: `${report.content.slice(0, 260)}${report.content.length > 260 ? "…" : ""}` }),
      create("p", { className: "muted", text: `${report.audience} · ${report.status}` })
    ]), "Brak raportów."),
    detailsForm("Dodaj raport", reportForm(model.onSaveReport))
  ]));
}

export function renderTrainer(root, model) {
  clear(root);

  const clientSelect = create("select", { className: "client-select", "aria-label": "Wybierz klienta" }, [
    create("option", { value: "", text: "Wybierz klienta" }),
    ...model.clients.map(client => create("option", { value: client.id, text: client.name }))
  ]);
  clientSelect.value = model.activeClientId || "";
  clientSelect.addEventListener("change", () => model.onSelectClient(clientSelect.value));

  const header = create("header", { className: "topbar" }, [
    create("div", {}, [
      create("p", { className: "eyebrow", text: "Studio Las OS · produkcja" }),
      create("h1", { text: "Panel trenera" })
    ]),
    create("div", { className: "top-actions" }, [
      create("span", { className: "role-badge", text: model.profile.display_name || model.profile.email || "Trener" }),
      button("Dostęp klientów", { onclick: () => window.location.assign("./tools/client-access-admin.html") }),
      button("MFA", { onclick: model.onManageMfa }),
      button("Odśwież", { onclick: model.onReload }),
      button("Wyloguj", { className: "button danger", onclick: model.onLogout })
    ])
  ]);

  const sidebar = create("aside", { className: "sidebar" }, [
    create("h2", { text: "Klienci" }),
    clientSelect,
    detailsForm("Dodaj klienta", newClientForm(model.onCreateClient)),
    create("div", { className: "security-note" }, [
      create("strong", { text: "Jedno źródło prawdy" }),
      create("p", { text: "Każdy zapis trafia bezpośrednio do Supabase. Brak localStorage i kolejki offline." })
    ])
  ]);

  const content = create("main", { className: "workspace" });
  if (!model.workspace) {
    content.append(panel("Wybierz klienta", create("p", { className: "muted", text: "Po wyborze zobaczysz proces i formularze zapisujące bezpośrednio do Supabase." })));
  } else {
    const workspace = model.workspace;
    content.append(
      panel(workspace.client.name, summaryGrid(workspace.client)),
      panel("Sygnały do przeglądu", signalPanel(model.attentionSignals), "Program nie podejmuje decyzji za trenera."),
      sessionsSection(workspace, model),
      measurementsSection(workspace, model),
      assessmentsSection(workspace, model),
      plansSection(workspace, model),
      reportsSection(workspace, model)
    );
  }

  root.append(header, create("div", { className: "app-layout" }, [sidebar, content]));
}
