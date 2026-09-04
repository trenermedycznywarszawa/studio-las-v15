import { collectAttentionSignals, withoutReviewedSignals } from "../../assets/os/decision-support.js";
import { renderTrainer } from "../../assets/os/ui/trainer.js";

const root = document.getElementById("fixture-root");
const activePlan = {
  id: "plan-active", status: "active", title: "Spokojny kierunek", focus: "Pewny krok bez pośpiechu",
  release_version: 2, guidance_channel: "hybrid", delivery_status: "paper_retirement_unresolved",
  published_at: "2026-09-01T10:00:00Z", created_at: "2026-09-01T09:00:00Z"
};
const draftPlan = {
  id: "plan-draft", status: "draft", title: "Kolejny spokojny kierunek", focus: "Przygotowany przez trenera",
  release_version: 1, guidance_channel: "paper", delivery_status: "pending",
  created_at: "2026-09-04T09:00:00Z"
};

const workspace = {
  client: {
    id: "client-fixture", name: "Anna Przykładowa", engagement_type: "twelve_week_process", stage: 4,
    goal: "Swobodniej wejść po schodach", next_review_date: "2026-09-12", next_milestone: "Omówić kolejny model pracy",
    start_date: "2026-08-15", created_at: "2026-06-01T09:00:00Z", updated_at: "2026-09-04T09:00:00Z"
  },
  intakes: [], preSessionChecks: [], postSessionObservations: [], tasks: [], documents: [],
  sessions: [
    { id: "session-latest", session_type: "session", date: "2026-09-04", readiness: 2, trainer_observation: "Spokojniejszy rytm.", trainer_decision: "Utrzymać tempo.", client_next_step: "Powtórzyć spokojny wariant." },
    { id: "session-old", session_type: "session", date: "2026-08-28", trainer_observation: "Wcześniejsza obserwacja.", trainer_decision: "Bez zmiany." },
    { id: "pwd-latest", session_type: "pwd", date: "2026-08-20", client_summary: "Cel funkcjonalny", trainer_observation: "Najnowsza obserwacja PWD", trainer_decision: "clarify_or_observe", client_next_step: "Rozmowa" },
    { id: "pwd-old", session_type: "pwd", date: "2026-08-01", client_summary: "Pierwszy cel", trainer_observation: "Starsza obserwacja PWD", trainer_decision: "continue_guidance", client_next_step: "Pierwsza wskazówka" }
  ],
  measurements: [], trainingLoad: [],
  assessments: [
    { id: "pwd-observation", session_id: "pwd-latest", observation_type: "trainer_observation", test_name: "Wstawanie", result_text: "Ruch spokojny", reaction_text: "Bez niepewności" }
  ],
  homePlans: [activePlan, draftPlan],
  homePlanItems: [
    { id: "active-item", home_plan_id: "plan-active", name: "Aktywne działanie", dosage: "2 × 5", stop_criteria: "Przerwij przy nowym objawie", status: "active", published_at: "2026-09-01T10:05:00Z" },
    { id: "draft-item", home_plan_id: "plan-draft", name: "Działanie tylko tego szkicu", dosage: "1 × 5", stop_criteria: "Zatrzymaj przy niepewności", status: "active" }
  ],
  guidanceEvents: [],
  reports: [
    { id: "report-12", type: "twelveWeeks", audience: "trainer", status: "draft", title: "Raport 12 tygodni", content: "Wzorzec z całego cyklu.", created_at: "2026-09-04T08:00:00Z" },
    { id: "report-old-12", type: "twelveWeeks", audience: "trainer", status: "archived", title: "Stary raport 12 tygodni", content: "Wzorzec z poprzedniego cyklu.", created_at: "2026-07-10T08:00:00Z" },
    { id: "report-old", type: "fourWeeks", audience: "client", status: "published", title: "Starszy raport", content: "Wcześniejszy zapis.", created_at: "2026-08-01T08:00:00Z" }
  ],
  cycleDecisions: [
    { id: "decision-old", decision: "continue_1_to_1", rationale: "Decyzja z poprzedniego cyklu.", decided_at: "2026-07-05T12:00:00Z" }
  ],
  signalReviews: []
};

function currentSignals() {
  const latestSession = workspace.sessions.find(session => session.session_type === "session");
  return withoutReviewedSignals(
    collectAttentionSignals({ client: workspace.client, session: latestSession }),
    workspace.signalReviews
  );
}

function render() {
  const model = {
    environment: "staging",
    profile: { id: "trainer-fixture", display_name: "Trener testowy" },
    clients: [workspace.client], activeClientId: workspace.client.id, workspace,
    attentionSignals: currentSignals(),
    onSelectClient() {}, onReload() {}, onLogout() {}, onManageMfa() {}, onCreateClient() {},
    onSavePwd() {}, onSaveSession() {}, onSaveMeasurement() {}, onSaveTrainingLoad() {}, onSaveAssessment() {},
    onSaveHomePlan() {}, onSaveHomePlanItem() {}, onPublishHomePlan() {}, onWithdrawHomePlan() {},
    onConfirmHomePlanPaperRetirement() {}, onRecordGuidanceDelivery() {}, onSaveReport() {},
    async onReviewSignal(signalKey, outcome) {
      workspace.signalReviews.unshift({ signal_key: signalKey, outcome, reviewed_at: "2026-09-04T12:00:00Z" });
      render();
    },
    async onSaveCycleDecision(values) {
      workspace.cycleDecisions.unshift({ ...values, id: crypto.randomUUID(), decided_at: "2026-09-04T12:00:00Z" });
      render();
    }
  };
  renderTrainer(root, model);
}

window.advanceDecisionSignalDate = sourceDate => {
  workspace.sessions.find(session => session.id === "session-latest").date = sourceDate;
  render();
};
window.setDecisionFixtureDraftVisible = visible => {
  workspace.homePlans = visible ? [activePlan, draftPlan] : [activePlan];
  render();
};
window.setDecisionFixtureStage = stage => {
  workspace.client.stage = stage;
  render();
};
window.decisionFixtureWorkspace = workspace;
render();
