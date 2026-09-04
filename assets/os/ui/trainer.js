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
  measurementForm,
  newClientForm,
  sessionForm,
  trainingLoadForm
} from "./forms.js";
import { runtimeEnvironmentLabel } from "../runtime.js";
import { buildTrainerSessionBrief } from "../session-brief.js";
import { pwdSection } from "./pwd-section.js";
import { plansSection } from "./trainer-guidance.js";
import {
  clientIdentityPanel,
  cycleDecisionSection,
  nowPanel,
  reportsSection,
  signalsSection
} from "./trainer-state.js";

function sourceLine(item) {
  return create("p", {
    className: "brief-source",
    text: `Źródło: ${item.sourceType} · ${formatDate(item.sourceDate)}`
  });
}

function briefFactCard(title, item, emptyText, className = "brief-card") {
  return create("article", { className }, [
    create("h3", { text: title }),
    item
      ? create("div", {}, [create("p", { text: item.value }), sourceLine(item)])
      : create("p", { className: "muted", text: emptyText })
  ]);
}

function briefListCard(title, items, emptyText, className = "brief-card") {
  const content = items.length
    ? create("div", { className: "brief-list" }, items.map(item => create("div", { className: "brief-list-item" }, [
        create("strong", { text: item.label }),
        create("p", { text: item.value }),
        sourceLine(item)
      ])))
    : create("p", { className: "muted", text: emptyText });
  return create("article", { className }, [create("h3", { text: title }), content]);
}

function sessionBriefPanel(workspace) {
  const brief = buildTrainerSessionBrief(workspace);
  const title = brief.nextSession
    ? "Przed następną sesją"
    : brief.reviewPoint
      ? "Do kolejnego przeglądu"
      : "Aktualny kontekst";
  const timingCards = [
    brief.nextSession ? briefFactCard("Następna sesja", brief.nextSession, "") : null,
    brief.reviewPoint ? briefFactCard("Punkt przeglądu", brief.reviewPoint, "") : null
  ].filter(Boolean);
  const context = create("div", { className: "brief-grid" }, [
    briefListCard(
      "Bezpieczeństwo i ograniczenia",
      brief.safety,
      "Nie zapisano ograniczeń. To nie jest potwierdzenie ich braku."
    ),
    briefFactCard("Aktualny fokus", brief.currentFocus, "Nie zapisano aktualnego fokusu."),
    briefFactCard("Ostatnia decyzja trenera", brief.lastDecision, "Nie zapisano jeszcze decyzji trenera."),
    briefFactCard("Ostatni sygnał klienta", brief.latestClientSignal, "Klient nie zapisał jeszcze sygnału."),
    briefListCard(
      "Aktywne prowadzenie na papierze",
      brief.activeGuidance,
      "Brak aktywnego, opublikowanego prowadzenia.",
      "brief-card wide"
    )
  ]);

  return panel(title, create("div", { className: "session-brief" }, [
    create("p", {
      className: "brief-intro",
      text: "Kontekst z istniejących zapisów. System nie interpretuje go i nie podejmuje decyzji za trenera."
    }),
    timingCards.length ? create("div", { className: "brief-timing" }, timingCards) : null,
    context
  ]), "Tylko odczyt · każdy fakt pokazuje źródło i datę");
}

function sessionRecord(session) {
  return create("article", { className: "record" }, [
    create("strong", { text: formatDate(session.date) }),
    create("p", { text: session.trainer_observation || "Brak obserwacji" }),
    create("p", { className: "muted", text: session.trainer_decision || "Brak zapisanej decyzji trenera" })
  ]);
}

function sessionsSection(workspace, model) {
  const sessions = (workspace.sessions || []).filter(session => session.session_type !== "pwd");
  const latest = sessions[0] || null;
  const previousSessions = sessions.slice(1);
  const history = previousSessions.length
    ? create("details", { className: "details-card" }, [
        create("summary", { text: "Pokaż pełną historię sesji" }),
        create("div", { className: "details-content" }, [
          recordList(previousSessions, sessionRecord, "Brak wcześniejszych sesji.")
        ])
      ])
    : null;
  return panel("Sesje", create("div", {}, [
    latest ? sessionRecord(latest) : create("p", { className: "muted", text: "Brak sesji." }),
    history,
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
  const ordinaryAssessments = (workspace.assessments || []).filter(item => !item.observation_type);
  return panel("Obserwacje ruchowe", create("div", {}, [
    recordList(ordinaryAssessments, item => create("article", { className: "record" }, [
      create("strong", { text: `${formatDate(item.performed_at)} · ${item.test_name || "Obserwacja"}` }),
      create("p", { text: item.result_text || "Brak opisu" }),
      create("p", { className: "muted", text: item.interpretation || "Bez automatycznej interpretacji" })
    ]), "Brak zapisanych obserwacji."),
    detailsForm("Dodaj obserwację", assessmentForm(model.onSaveAssessment))
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
      create("p", { className: "eyebrow", text: `Studio Las OS · ${runtimeEnvironmentLabel(model.environment)}` }),
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
    content.append(...[
      clientIdentityPanel(workspace.client),
      nowPanel(workspace, model.attentionSignals),
      Number(workspace.client.stage) === 4 || workspace.cycleDecisions?.length
        ? cycleDecisionSection(workspace, model)
        : null,
      pwdSection(workspace, model),
      signalsSection(workspace, model.attentionSignals, model),
      sessionBriefPanel(workspace),
      sessionsSection(workspace, model),
      measurementsSection(workspace, model),
      assessmentsSection(workspace, model),
      plansSection(workspace, model),
      reportsSection(workspace, model)
    ].filter(Boolean));
  }

  root.append(header, create("div", { className: "app-layout" }, [sidebar, content]));
}
