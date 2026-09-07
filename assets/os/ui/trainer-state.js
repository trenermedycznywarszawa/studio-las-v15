import {
  currentCycleDecision,
  cycleDecisionLabel,
  guidanceChannelLabel,
  isCycleDecisionStage,
  isInCurrentCycle,
  reportAudienceLabel,
  reportStatusLabel,
  reportTypeLabel,
  signalReviewOutcomeLabel
} from "../decision-state.js";
import { signalIdentity, signalTypeLabel } from "../decision-support.js";
import { CANONICAL_ENGAGEMENTS, CANONICAL_STAGES } from "../runtime.js";
import { buildTrainerSessionBrief } from "../session-brief.js";
import { cycleDecisionForm, reportForm, signalReviewForm } from "./forms.js";
import { create, detailsForm, formatDate, panel, recordList } from "./common.js";

const SIGNAL_SOURCE_LABELS = Object.freeze({
  session: "Sesja",
  "training-load": "Tolerancja obciążenia",
  "trainer-check": "Sprawdzenie trenera",
  "client-record": "Karta klienta",
  process: "Proces"
});

function detailsBlock(summary, content) {
  return create("details", { className: "details-card" }, [
    create("summary", { text: summary }),
    create("div", { className: "details-content" }, content)
  ]);
}

function nowItem(label, value, meta = "", className = "now-item") {
  return create("article", { className }, [
    create("span", { text: label }),
    create("strong", { text: value }),
    meta ? create("p", { className: "muted", text: meta }) : null
  ]);
}

export function clientIdentityPanel(client) {
  return panel(client.name, create("div", { className: "client-identity" }, [
    create("strong", {
      text: CANONICAL_ENGAGEMENTS[client.engagement_type] || "Współpraca Studio Las"
    })
  ]));
}

export function nowPanel(workspace, attentionSignals) {
  const brief = buildTrainerSessionBrief(workspace);
  const openSignal = attentionSignals?.signals?.[0] || null;
  const plan = brief.activePlan;
  const focusMeta = plan
    ? `Obowiązująca wskazówka: ${plan.title || "Bez nazwy"} · Wersja ${plan.release_version || 1} · ${guidanceChannelLabel(plan.guidance_channel)}`
    : "Brak aktywnej wskazówki.";
  const decisionMeta = brief.lastDecision?.sourceDate
    ? `${brief.lastDecision.sourceType} · ${formatDate(brief.lastDecision.sourceDate)}`
    : "Brak zapisanej decyzji trenera.";
  const signalMeta = openSignal
    ? `${SIGNAL_SOURCE_LABELS[openSignal.source] || "Źródło procesu"} · ${formatDate(openSignal.sourceDate)}`
    : "Przejrzane sygnały pozostają w historii.";
  const nextMeta = brief.nextStep.date ? formatDate(brief.nextStep.date) : "Bez zaplanowanej daty";

  return panel("Teraz", create("div", { className: "now-block" }, [
    create("div", { className: "now-grid" }, [
      nowItem("Etap procesu", CANONICAL_STAGES[workspace.client.stage] || "Proces Studio Las"),
      nowItem("Aktualny fokus", brief.currentFocus?.value || "Fokus nie został jeszcze zapisany.", focusMeta),
      nowItem("Ostatnia obowiązująca decyzja trenera", brief.lastDecision?.value || "Brak zapisanej decyzji trenera.", decisionMeta),
      nowItem("Otwarty sygnał wymagający uwagi", openSignal?.label || "Brak otwartego sygnału wymagającego uwagi.", signalMeta),
      nowItem(brief.nextStep.label, brief.nextStep.value, nextMeta, "now-item wide")
    ]),
    brief.requiresCycleDecision
      ? create("div", { className: "cycle-decision-required", text: "Wymaga decyzji co dalej" })
      : null
  ]), "Krótki zapis faktów · bez automatycznej interpretacji");
}

function cycleDecisionRecord(decision) {
  return create("article", { className: "record" }, [
    create("strong", { text: cycleDecisionLabel(decision.decision) }),
    create("p", { text: decision.rationale }),
    create("p", { className: "muted", text: `Decyzja trenera · ${formatDate(decision.decided_at)}` })
  ]);
}

export function cycleDecisionSection(workspace, model) {
  const decisions = [...(workspace.cycleDecisions || [])].sort((left, right) =>
    String(right.decided_at || right.created_at || "").localeCompare(String(left.decided_at || left.created_at || ""))
  );
  const current = currentCycleDecision(workspace);
  const previousDecisions = decisions.filter(decision => decision.id !== current?.id);
  const content = [
    current
      ? create("div", { className: "latest-cycle-decision" }, [
          create("span", { text: "Aktualna decyzja" }),
          create("strong", { text: cycleDecisionLabel(current.decision) }),
          create("p", { text: current.rationale }),
          create("p", { className: "muted", text: formatDate(current.decided_at) })
        ])
      : create("p", { className: "muted", text: "Nie zapisano jeszcze decyzji zamykającej cykl." }),
    previousDecisions.length
      ? detailsBlock("Pokaż historię decyzji", [
          recordList(previousDecisions, cycleDecisionRecord, "Brak wcześniejszych decyzji.")
        ])
      : null,
    isCycleDecisionStage(workspace)
      ? detailsForm(
          current ? "Dodaj nową decyzję co dalej" : "Zapisz decyzję co dalej",
          cycleDecisionForm(model.onSaveCycleDecision)
        )
      : null
  ];
  return panel("Decyzja co dalej", create("div", {}, content));
}

function signalSourceLine(signal) {
  return `${SIGNAL_SOURCE_LABELS[signal.source] || "Źródło procesu"} · ${formatDate(signal.sourceDate)}`;
}

export function signalsSection(workspace, attentionSignals, model) {
  const openSignals = attentionSignals?.signals || [];
  const reviews = workspace.signalReviews || [];
  const open = recordList(openSignals, signal => create("article", { className: `signal ${signal.level}` }, [
    create("strong", { text: signal.label }),
    signal.context ? create("p", { text: signal.context }) : null,
    create("p", { className: "muted", text: signalSourceLine(signal) }),
    create("p", { className: "muted", text: `Pytanie dla trenera: ${signal.trainerQuestion}` }),
    detailsForm("Zapisz wynik przeglądu", signalReviewForm(signal.signalKey, model.onReviewSignal))
  ]), "Brak otwartych sygnałów wymagających przeglądu.");

  const history = reviews.length
    ? detailsBlock("Pokaż historię przejrzanych sygnałów", [
        recordList(reviews, review => {
          const identity = signalIdentity(review.signal_key);
          return create("article", { className: "record" }, [
            create("strong", { text: signalTypeLabel(review.signal_key) }),
            create("p", { text: signalReviewOutcomeLabel(review.outcome) }),
            create("p", { className: "muted", text: `Źródło: ${SIGNAL_SOURCE_LABELS[identity.source] || "Proces"} · ${formatDate(identity.sourceDate)} · Przegląd: ${formatDate(review.reviewed_at)}` })
          ]);
        }, "Brak historii przeglądu.")
      ])
    : null;

  return panel("Sygnały do przeglądu", create("div", { className: "signal-list" }, [
    open,
    history,
    create("p", { className: "disclaimer", text: attentionSignals?.disclaimer || "Program nie podejmuje decyzji za trenera." })
  ]), "Domyślnie widoczne są tylko otwarte sygnały");
}

function reportRecord(report, cycleDecision, isCurrentTwelveWeekReport) {
  const typeLabel = reportTypeLabel(report.type);
  const decision = isCurrentTwelveWeekReport ? cycleDecision : null;
  const content = String(report.content || "");
  return create("article", { className: "record report-record" }, [
    create("strong", { text: report.title || typeLabel }),
    create("p", { className: "muted", text: typeLabel }),
    create("p", { text: `${content.slice(0, 260)}${content.length > 260 ? "…" : ""}` }),
    create("p", { className: "muted", text: `${reportAudienceLabel(report.audience)} · ${reportStatusLabel(report.status)}` }),
    isCurrentTwelveWeekReport
      ? create("div", { className: "report-decision" }, decision ? [
          create("span", { text: "Decyzja co dalej" }),
          create("strong", { text: cycleDecisionLabel(decision.decision) }),
          create("p", { text: decision.rationale }),
          create("p", { className: "muted", text: formatDate(decision.decided_at) })
        ] : [
          create("span", { text: "Decyzja co dalej" }),
          create("p", { className: "muted", text: "Brak zapisanej decyzji. Raport jej nie generuje." })
        ])
      : null
  ]);
}

export function reportsSection(workspace, model) {
  const reports = [...(workspace.reports || [])].sort((left, right) => {
    if (left.type === "twelveWeeks" && right.type !== "twelveWeeks") return -1;
    if (right.type === "twelveWeeks" && left.type !== "twelveWeeks") return 1;
    return String(right.created_at || "").localeCompare(String(left.created_at || ""));
  });
  const currentReport = reports.find(report =>
    report.type === "twelveWeeks" && isInCurrentCycle(workspace, report.created_at)
  ) || null;
  const decision = currentCycleDecision(workspace);
  return panel("Raporty", create("div", {}, [
    recordList(reports, report => reportRecord(
      report,
      decision,
      report === currentReport
    ), "Brak raportów."),
    detailsForm("Dodaj raport", reportForm(model.onSaveReport))
  ]), "Raport pokazuje wzorzec; nie tworzy decyzji automatycznie");
}
