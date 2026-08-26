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
  pwdForm,
  sessionForm,
  trainingLoadForm
} from "./forms.js";
import {
  CANONICAL_ENGAGEMENTS,
  CANONICAL_STAGES
} from "../runtime.js";
import { buildTrainerSessionBrief } from "../session-brief.js";

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
  const timing = create("div", { className: "brief-timing" }, [
    briefFactCard("Następna sesja", brief.nextSession, "Nie zapisano terminu następnej sesji."),
    briefFactCard("Punkt przeglądu", brief.reviewPoint, "Nie zapisano terminu przeglądu.")
  ]);
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

  return panel("Przed następną sesją", create("div", { className: "session-brief" }, [
    create("p", {
      className: "brief-intro",
      text: "Krótki kontekst z istniejących zapisów. System nie interpretuje go i nie podejmuje decyzji za trenera."
    }),
    timing,
    context
  ]), "Tylko odczyt · każdy fakt pokazuje źródło i datę");
}


function pwdSection(workspace, model) {
  const pwdSessions = (workspace.sessions || []).filter(session => session.session_type === "pwd");
  return panel("PWD — pierwsza wizyta diagnostyczna", create("div", {}, [
    create("p", { className: "muted", text: "Pytanie → obserwacja → znaczenie → decyzja Damiana. Każdy ruch jest dobrowolny; system nie diagnozuje ani nie wybiera decyzji." }),
    recordList(pwdSessions, session => create("article", { className: "record" }, [
      create("strong", { text: `PWD · ${formatDate(session.date)}` }),
      create("p", { text: session.client_summary || "Cel i znaczenie zapisano w karcie klienta." }),
      create("p", { text: session.trainer_observation || "Brak kontekstu i interpretacji." }),
      create("p", { className: "muted", text: `Decyzja: ${session.trainer_decision || "brak"}` }),
      create("p", { className: "muted", text: `Kolejny krok: ${session.client_next_step || "brak"}` })
    ]), "Brak zapisanej PWD."),
    detailsForm("Zapisz PWD", pwdForm(model.onSavePwd)),
    create("p", { className: "muted", text: "Zapis PWD nie tworzy ani nie publikuje wskazówki. Przygotowanie i publikacja pierwszej wskazówki pozostają osobnym krokiem w sekcji Prowadzenie klienta." })
  ]));
}
function sessionsSection(workspace, model) {
  return panel("Sesje", create("div", {}, [
    recordList((workspace.sessions || []).filter(session => session.session_type !== "pwd"), session => create("article", { className: "record" }, [
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

function guidancePlanCard(plan, model) {
  const paperChannel = ["paper", "hybrid"].includes(plan.guidance_channel);
  const retirementConfirmed = plan.delivery_status === "paper_retirement_confirmed";
  const retirementRequired = paperChannel && !retirementConfirmed;
  const delivery = create("select", { "aria-label": "Status dostarczenia wskazówki" }, [
    { value: "pending", text: "Dostarczenie oczekuje" },
    { value: "recorded", text: "Dostarczenie zapisane" },
    { value: "paper_retirement_unresolved", text: "Papier: wycofanie kopii przed następcą niepotwierdzone" }
  ].map(option => create("option", option)));
  delivery.value = retirementConfirmed ? "recorded" : (plan.delivery_status || "pending");
  const actions = [];
  if (plan.status === "draft") actions.push(button("Opublikuj jako aktualną wskazówkę", { className: "button primary", onclick: () => model.onPublishHomePlan(plan.id) }));
  if (plan.status === "active") {
    if (retirementRequired) actions.push(button("Potwierdź wycofanie poprzedniej kopii papierowej", { onclick: () => model.onConfirmHomePlanPaperRetirement(plan.id) }));
    if (!retirementConfirmed) actions.push(button("Zapisz dostarczenie", { onclick: () => model.onRecordGuidanceDelivery(plan.id, delivery.value) }));
    actions.push(button("Wycofaj wskazówkę", { className: "button danger", onclick: () => model.onWithdrawHomePlan(plan.id) }));
  }
  return create("article", { className: "record" }, [
    create("strong", { text: plan.title || "Wskazówka" }),
    create("p", { text: plan.focus || "Brak celu wskazówki" }),
    create("p", { className: "muted", text: `Wersja ${plan.release_version || 1} · ${plan.status} · kanał: ${plan.guidance_channel || "brak"}` }),
    create("p", { className: "muted", text: `Dostarczenie: ${plan.delivery_status || "oczekuje"}` }),
    retirementRequired ? create("p", { className: "muted", text: "Przed publikacją następcy Damian musi potwierdzić wycofanie poprzedniej kopii papierowej." }) : null,
    paperChannel && retirementConfirmed ? create("p", { className: "muted", text: "Wycofanie poprzedniej kopii papierowej: potwierdzone." }) : null,
    plan.status === "active" && !retirementConfirmed ? delivery : null,
    actions.length ? create("div", { className: "form-actions" }, actions) : null
  ]);
}
function plansSection(workspace, model) {
  const plans = [...(workspace.homePlans || [])].sort((left, right) => {
    if (left.status === "active") return -1;
    if (right.status === "active") return 1;
    return String(right.created_at || "").localeCompare(String(left.created_at || ""));
  });
  const drafts = plans.filter(plan => plan.status === "draft");
  const planColumn = create("div", {}, [
    create("h3", { text: "Aktualne prowadzenie i historia" }),
    create("p", { className: "muted", text: "Damian podejmuje decyzję o publikacji, zastąpieniu, wycofaniu i kanale. System nie rekomenduje decyzji medycznej." }),
    recordList(plans, plan => guidancePlanCard(plan, model), "Brak wskazówki."),
    detailsForm("Utwórz szkic wskazówki", homePlanForm(model.onSaveHomePlan))
  ]);
  const items = create("div", {}, [
    create("h3", { text: "Działania w szkicu" }),
    recordList(workspace.homePlanItems, item => create("article", { className: "record" }, [
      create("strong", { text: item.name }),
      create("p", { text: [item.dosage, item.frequency].filter(Boolean).join(" · ") || "Brak dawkowania" }),
      create("p", { className: "muted", text: [item.client_cue, item.stop_criteria].filter(Boolean).join(" · ") || "Brak celu lub granicy" })
    ]), "Brak działań w szkicu."),
    detailsForm("Dodaj działanie do szkicu", homePlanItemForm(drafts, model.onSaveHomePlanItem))
  ]);
  return panel("Prowadzenie klienta", create("div", { className: "two-column" }, [planColumn, items]));
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
      pwdSection(workspace, model),
      sessionBriefPanel(workspace),
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
