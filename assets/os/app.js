import { TrainerWorkspaceLoader } from "./trainer-workspace-loader.js";
import { collectWorkspaceSignals } from "./trainer-signals.js";
import { loadClientAppRuntime } from "./client-app-runtime.js";
import { QuestionnaireApi } from "./questionnaire-api.js";
import { guidanceActions } from "./guidance-actions.js";
import { assertNoPersistentHealthData, clearAuthArtifactsFromUrl, getPasswordSetupContext, getRuntimeConfig, submitPasswordLogin, userSafeError } from "./runtime.js";
import { StudioLasRepository, SupabaseAuth } from "./data.js";
import { InquiryController } from "./inquiries-controller.js";
import { withoutReviewedSignals } from "./decision-support.js";
import { consumePasswordCallback, renderPasswordSetup, renderRecoveryRequest, requestPasswordRecovery, updatePassword } from "./password-auth.js";
import { renderFatal, renderLoading, renderLogin } from "./ui/common.js";
import { renderTrainer } from "./ui/trainer.js";
import { TrainerMfaController } from "./trainer-mfa.js";
import { savePwdWorkflow } from "./pwd.js";
import { renderTrainerMfa } from "./ui/trainer-mfa.js";
import { createRuntimeFeedback } from "./ui/runtime-feedback.js";

const root = document.getElementById("app");
const state = {
  config: null,
  auth: null,
  repository: null,
  questionnaireApi: null,
  clientQuestionnaire: null,
  inquiryController: null,
  mfa: null,
  mfaView: null,
  profile: null,
  clients: [],
  activeClientId: "",
  workspace: null,
  clientPortal: null,
  snapshot: null
};

const { announce, withWrite, reset: resetFeedback } = createRuntimeFeedback(() => state.config?.mode);
const trainerLoader = new TrainerWorkspaceLoader(state, renderTrainerState);

async function logout() {
  trainerLoader.reset();
  resetFeedback();
  state.clientPortal?.reset();
  state.clientPortal = null;
  state.clientQuestionnaire?.reset();
  state.mfa?.clear();
  state.inquiryController?.reset();
  renderLoading(root, "Wylogowywanie…");
  await state.auth.logout();
  state.profile = null;
  state.clients = [];
  state.activeClientId = "";
  state.workspace = null;
  state.snapshot = null;
  state.mfaView = null;
  showLogin();
}

function showLogin(message = "") {
  renderLogin(root, {
    environment: state.config?.mode,
    message,
    onRecover: () => showRecoveryRequest(),
    onSubmit: async ({ email, password }) => {
      try {
        renderLoading(root, "Weryfikowanie konta…");
        await submitPasswordLogin(state.auth, { email, password });
        await loadAuthenticatedRuntime();
      } catch (error) {
        showLogin(userSafeError(error, state.config?.mode));
      }
    }
  });
}

function showRecoveryRequest({ sent = false, message = "" } = {}) {
  renderRecoveryRequest(root, {
    sent,
    message,
    onCancel: () => showLogin(),
    onSubmit: async email => {
      try {
        renderLoading(root, "Wysyłanie bezpiecznego linku…");
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        await requestPasswordRecovery(state.auth, email, redirectTo);
        showRecoveryRequest({ sent: true });
      } catch (error) {
        showRecoveryRequest({ message: userSafeError(error, state.config?.mode) });
      }
    }
  });
}

function showPasswordSetup(context, message = "") {
  renderPasswordSetup(root, {
    context,
    message,
    onCancel: () => logout().catch(handleRuntimeError),
    onSubmit: async password => {
      try {
        renderLoading(root, "Zapisywanie nowego hasła…");
        await updatePassword(state.auth, password);
        await loadAuthenticatedRuntime();
      } catch (error) {
        showPasswordSetup(context, userSafeError(error, state.config?.mode));
      }
    }
  });
}

async function loadAuthenticatedRuntime() {
  renderLoading(root, "Sprawdzanie uprawnień…");
  state.profile = await state.auth.getProfile();

  if (state.profile.role === "trainer") {
    if (state.auth.getAuthenticatorAssuranceLevel() !== "aal2") state.auth.suspendSessionPersistence();
    await enforceTrainerMfa();
    return;
  }

  if (state.profile.role === "client") {
    await loadClientAppRuntime(root, state, { onLogout: () => logout().catch(handleRuntimeError) });
    state.auth.persistCurrentSession();
    return;
  }
  throw new Error("Unsupported profile role");
}

function renderMfaView(view, message = "") {
  state.mfaView = view;
  renderTrainerMfa(root, {
    view,
    message,
    onStartEnrollment: () => advanceMfa(
      () => state.mfa.beginEnrollment(),
      "Przygotowywanie konfiguracji TOTP…"
    ),
    onVerify: code => advanceMfa(
      () => state.mfa.verify(code),
      "Weryfikowanie kodu TOTP…"
    ),
    onRetry: () => advanceMfa(
      () => state.mfa.prepare(),
      "Tworzenie nowego wyzwania…"
    ),
    onLogout: () => logout().catch(handleRuntimeError),
    onRemoveFactor: index => removeMfaFactor(index),
    onBack: () => loadTrainer(state.activeClientId).catch(handleRuntimeError)
  });
}

async function advanceMfa(operation, loadingMessage) {
  try {
    renderLoading(root, loadingMessage);
    const next = await operation();
    if (next.status === "verified") {
      state.mfaView = null;
      await loadTrainer(state.activeClientId).catch(handleRuntimeError);
      return;
    }
    renderMfaView(next);
  } catch (error) {
    const fallback = state.mfaView || { status: "enrollment_required" };
    renderMfaView(fallback, userSafeError(error, state.config?.mode));
  }
}

async function enforceTrainerMfa() {
  await advanceMfa(() => state.mfa.prepare(), "Sprawdzanie drugiego składnika…");
}

async function showMfaManagement() {
  try {
    renderLoading(root, "Ładowanie ustawień MFA…");
    renderMfaView(await state.mfa.management());
  } catch (error) {
    handleRuntimeError(error);
  }
}

async function removeMfaFactor(index) {
  if (!window.confirm("Usunąć ten składnik TOTP?")) return;
  try {
    renderLoading(root, "Usuwanie składnika TOTP…");
    const next = await state.mfa.removeFactor(index);
    if (next.status === "verified") {
      state.mfaView = null;
      await loadTrainer(state.activeClientId).catch(handleRuntimeError);
      return;
    }
    renderMfaView(next);
  } catch (error) {
    const fallback = state.mfaView || { status: "management", factors: [] };
    renderMfaView(fallback, userSafeError(error, state.config?.mode));
  }
}

async function loadQuestionnaireSubmissionsForTrainer() {
  if (!state.workspace || !state.activeClientId) return;
  const submissions = await state.questionnaireApi.trainerSubmissions(state.activeClientId);
  state.workspace.questionnaireSubmissions = Array.isArray(submissions) ? submissions : [];
}

async function loadTrainerWorkspace(clientId, refreshClients = false) {
  await trainerLoader.load(clientId, refreshClients);
  if (state.workspace && state.activeClientId) {
    await loadQuestionnaireSubmissionsForTrainer();
    renderTrainerState();
  }
}

async function loadTrainer(preferredClientId = state.activeClientId) {
  let mfaView;
  try { mfaView = await state.mfa.prepare(); }
  catch (error) {
    state.loading = false;
    state.loadError = "Nie udało się sprawdzić dostępu. Odśwież przed kolejnym zapisem.";
    renderTrainerState();
    throw error;
  }
  if (mfaView.status !== "verified") {
    renderMfaView(mfaView);
    return;
  }
  state.mfaView = null;
  await loadTrainerWorkspace(preferredClientId, true);
  await state.inquiryController.refresh().catch(error => { state.inquiryController.error = error; });
  renderTrainerState();
}

async function selectClient(clientId) {
  await loadTrainerWorkspace(clientId);
}

function renderTrainerState() {
  const generatedSignals = collectWorkspaceSignals(state.workspace || {});
  const attentionSignals = withoutReviewedSignals(generatedSignals, state.workspace?.signalReviews);
  const clientId = state.activeClientId;
  const reloadWorkspace = () => loadTrainerWorkspace(clientId);

  renderTrainer(root, {
    environment: state.config?.mode,
    profile: state.profile,
    clients: state.clients,
    activeClientId: state.activeClientId,
    workspace: state.workspace,
    loading: state.loading,
    loadError: state.loadError,
    onRetrySection: section => trainerLoader.section(section).catch(handleRuntimeError),
    attentionSignals,
    onSelectClient: clientId => selectClient(clientId).catch(handleRuntimeError),
    onReload: () => loadTrainer(state.activeClientId).catch(handleRuntimeError),
    onLogout: () => logout().catch(handleRuntimeError),
    onManageMfa: () => showMfaManagement(),
    onCreateClient: async values => {
      await withWrite("Dodawanie klienta", () =>
        state.repository.createClient(state.profile.id, values), result => loadTrainerWorkspace(result?.id || "", true)
      );
    },
    onSavePwd: async values => {
      await withWrite("Zapisywanie PWD", () => savePwdWorkflow(state.repository, state.activeClientId, values), reloadWorkspace);
    },
    onSaveSession: async values => {
      await withWrite("Zapisywanie sesji", () => state.repository.saveSession(state.activeClientId, values), reloadWorkspace);
    },
    onSaveMeasurement: async values => {
      await withWrite("Zapisywanie pomiaru", () => state.repository.saveMeasurement(state.activeClientId, values), reloadWorkspace);
    },
    onSaveTrainingLoad: async values => {
      await withWrite("Zapisywanie odczytu", () => state.repository.saveTrainingLoad(state.activeClientId, values), reloadWorkspace);
    },
    onSaveAssessment: async values => {
      await withWrite("Zapisywanie obserwacji", () => state.repository.saveAssessment(state.activeClientId, values), reloadWorkspace);
    },
    onSaveHomePlan: async values => {
      await withWrite("Zapisywanie planu", () => state.repository.saveHomePlan(state.activeClientId, values), reloadWorkspace);
    },
    onSaveHomePlanItem: async (homePlanId, values) => {
      await withWrite("Zapisywanie zadania", () =>
        state.repository.saveHomePlanItem(state.activeClientId, homePlanId, values), reloadWorkspace
      );
    },
    ...guidanceActions(state.repository, state.activeClientId, withWrite, reloadWorkspace),
    onPublishHomePlan: async homePlanId => {
      await withWrite("Publikowanie wskazówki", () => state.repository.publishHomePlanGuidance(homePlanId), reloadWorkspace);
    },
    onWithdrawHomePlan: async homePlanId => {
      await withWrite("Wycofywanie wskazówki", () => state.repository.withdrawHomePlanGuidance(homePlanId), reloadWorkspace);
    },
    onConfirmHomePlanPaperRetirement: async homePlanId => {
      await withWrite("Potwierdzanie wycofania poprzedniej kopii papierowej", () =>
        state.repository.confirmHomePlanPaperRetirement(homePlanId), reloadWorkspace
      );
    },
    onRecordGuidanceDelivery: async (homePlanId, deliveryStatus) => {
      await withWrite("Zapisywanie dostarczenia", () =>
        state.repository.recordHomePlanGuidanceDelivery(homePlanId, deliveryStatus), reloadWorkspace
      );
    },
    onSaveCycleDecision: async values => {
      await withWrite("Zapisywanie decyzji co dalej", () => state.repository.saveCycleDecision(
        state.profile.id, state.activeClientId, values
      ), reloadWorkspace);
    },
    onReviewSignal: async (signalKey, outcome) => {
      await withWrite("Zapisywanie przeglądu sygnału", () => state.repository.saveSignalReview(
        state.profile.id, state.activeClientId, signalKey, outcome
      ), reloadWorkspace);
    },
    onTransitionReport: (report, action, reason) => withWrite(
      action === "approve" ? "Zatwierdzanie raportu" : action === "publish" ? "Publikowanie raportu" : "Wycofywanie raportu",
      () => state.repository.transitionReport(report, action, reason), reloadWorkspace),
    onSaveReport: async values => {
      await withWrite("Zapisywanie raportu", () =>
        state.repository.saveReport(state.profile.id, state.activeClientId, values), reloadWorkspace
      );
    }
  });

  state.inquiryController.render(root.querySelector(".workspace"), {
    activeClientId: state.activeClientId,
    rerender: renderTrainerState,
    loadTrainer,
    onError: handleRuntimeError
  });
}

function handleRuntimeError(error) {
  const message = error?.displayMessage || userSafeError(error, state.config?.mode);
  announce(message, "error", error?.retryRefresh);
  const status = Number(error?.status || 0);
  if (status === 401) showLogin(message);
  else if (status === 403 && state.profile?.role === "trainer"
    && state.auth.getAuthenticatorAssuranceLevel() !== "aal2") {
    enforceTrainerMfa().catch(() => showLogin(message));
  }
}

async function initialize() {
  try {
    state.config = getRuntimeConfig();
    state.auth = new SupabaseAuth(state.config);
    state.repository = new StudioLasRepository(state.config, state.auth);
    state.questionnaireApi = new QuestionnaireApi(state.repository);
    state.inquiryController = new InquiryController(state.config, state.auth, withWrite);
    state.mfa = new TrainerMfaController(state.auth);
    const callback = consumePasswordCallback(state.auth);
    assertNoPersistentHealthData();

    if (callback) {
      renderLoading(root, "Weryfikowanie bezpiecznego linku…");
      await state.auth.getUser();
      showPasswordSetup(callback.type);
      return;
    }

    clearAuthArtifactsFromUrl();
    renderLoading(root);
    const restored = await state.auth.restore();
    if (!restored) {
      showLogin();
      return;
    }

    const pendingContext = getPasswordSetupContext();
    if (pendingContext) {
      await state.auth.getUser();
      showPasswordSetup(pendingContext);
      return;
    }
    await loadAuthenticatedRuntime();
  } catch (error) {
    if (error?.name === "RuntimeConfigurationError") {
      renderFatal(root, error.message);
      return;
    }
    if (Number(error?.status || 0) === 401) {
      showLogin(userSafeError(error, state.config?.mode));
      return;
    }
    renderFatal(root, userSafeError(error, state.config?.mode));
  }
}

window.addEventListener("unhandledrejection", event => {
  event.preventDefault();
  handleRuntimeError(event.reason);
});

initialize();