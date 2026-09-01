import {
  assertNoPersistentHealthData,
  clearAuthArtifactsFromUrl,
  getPasswordSetupContext,
  getRuntimeConfig,
  submitPasswordLogin,
  userSafeError
} from "./runtime.js";
import {
  StudioLasRepository,
  SupabaseAuth
} from "./data.js";
import { InquiryRepository } from "./inquiries-data.js";
import { collectAttentionSignals } from "./decision-support.js";
import {
  consumePasswordCallback,
  renderPasswordSetup,
  renderRecoveryRequest,
  requestPasswordRecovery,
  updatePassword
} from "./password-auth.js";
import {
  renderFatal,
  renderLoading,
  renderLogin
} from "./ui/common.js";
import { renderTrainer } from "./ui/trainer.js";
import { renderInquirySection } from "./ui/inquiries-section.js";
import { renderClient } from "./ui/client.js";
import { TrainerMfaController } from "./trainer-mfa.js";
import { savePwdWorkflow } from "./pwd.js";
import { renderTrainerMfa } from "./ui/trainer-mfa.js";
import { createRuntimeFeedback } from "./ui/runtime-feedback.js";

const root = document.getElementById("app");
const state = {
  config: null,
  auth: null,
  repository: null,
  inquiryRepository: null,
  mfa: null,
  mfaView: null,
  profile: null,
  clients: [],
  activeClientId: "",
  workspace: null,
  inquiries: [],
  activeInquiryId: "",
  inquiryDecisions: [],
  snapshot: null
};

const { announce, withWrite } = createRuntimeFeedback(() => state.config?.mode);
async function logout() {
  state.mfa?.clear();
  renderLoading(root, "Wylogowywanie…");
  await state.auth.logout();
  state.profile = null;
  state.clients = [];
  state.activeClientId = "";
  state.workspace = null;
  state.inquiries = [];
  state.activeInquiryId = "";
  state.inquiryDecisions = [];
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
    if (state.auth.getAuthenticatorAssuranceLevel() !== "aal2") {
      state.auth.suspendSessionPersistence();
    }
    await enforceTrainerMfa();
    return;
  }

  if (state.profile.role === "client") {
    await loadClientPortal();
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
      await loadTrainer(state.activeClientId);
      return;
    }
    renderMfaView(next);
  } catch (error) {
    const fallback = state.mfaView || { status: "enrollment_required" };
    renderMfaView(fallback, userSafeError(error, state.config?.mode));
  }
}

async function enforceTrainerMfa() {
  await advanceMfa(
    () => state.mfa.prepare(),
    "Sprawdzanie drugiego składnika…"
  );
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
      await loadTrainer(state.activeClientId);
      return;
    }
    renderMfaView(next);
  } catch (error) {
    const fallback = state.mfaView || { status: "management", factors: [] };
    renderMfaView(fallback, userSafeError(error, state.config?.mode));
  }
}

async function refreshInquiries(preferredInquiryId = state.activeInquiryId) {
  state.inquiries = await state.inquiryRepository.listInquiries();
  state.activeInquiryId = preferredInquiryId && state.inquiries.some(item => item.id === preferredInquiryId)
    ? preferredInquiryId
    : "";
  state.inquiryDecisions = state.activeInquiryId
    ? await state.inquiryRepository.listDecisions(state.activeInquiryId)
    : [];
}

async function loadTrainer(preferredClientId = state.activeClientId) {
  renderLoading(root, "Ładowanie panelu trenera…");
  const mfaView = await state.mfa.prepare();
  if (mfaView.status !== "verified") {
    renderMfaView(mfaView);
    return;
  }
  state.mfaView = null;
  [state.clients] = await Promise.all([
    state.repository.listClients(),
    refreshInquiries()
  ]);
  state.activeClientId = preferredClientId && state.clients.some(client => client.id === preferredClientId)
    ? preferredClientId
    : "";
  state.workspace = state.activeClientId
    ? await state.repository.getClientWorkspace(state.activeClientId)
    : null;
  renderTrainerState();
}

async function selectClient(clientId) {
  state.activeClientId = clientId || "";
  if (!state.activeClientId) {
    state.workspace = null;
    renderTrainerState();
    return;
  }

  renderLoading(root, "Ładowanie procesu klienta…");
  state.workspace = await state.repository.getClientWorkspace(state.activeClientId);
  renderTrainerState();
}

async function selectInquiry(inquiryId) {
  state.activeInquiryId = inquiryId || "";
  state.inquiryDecisions = state.activeInquiryId
    ? await state.inquiryRepository.listDecisions(state.activeInquiryId)
    : [];
  renderTrainerState();
}

function renderTrainerState() {
  const latestSession = state.workspace?.sessions?.[0] || null;
  const latestTrainingLoad = state.workspace?.trainingLoad?.[0] || null;
  const latestPreSessionCheck = state.workspace?.preSessionChecks?.[0] || null;
  const attentionSignals = collectAttentionSignals({
    client: state.workspace?.client,
    session: latestSession,
    trainingLoad: latestTrainingLoad,
    preSessionCheck: latestPreSessionCheck
  });

  const reloadWorkspace = async () => {
    if (state.activeClientId) {
      state.workspace = await state.repository.getClientWorkspace(state.activeClientId);
    }
    state.clients = await state.repository.listClients();
    renderTrainerState();
  };

  const reloadInquiry = async inquiryId => {
    await refreshInquiries(inquiryId || state.activeInquiryId);
    renderTrainerState();
  };

  renderTrainer(root, {
    environment: state.config?.mode,
    profile: state.profile,
    clients: state.clients,
    activeClientId: state.activeClientId,
    workspace: state.workspace,
    attentionSignals,
    onSelectClient: clientId => selectClient(clientId).catch(handleRuntimeError),
    onReload: () => loadTrainer(state.activeClientId).catch(handleRuntimeError),
    onLogout: () => logout().catch(handleRuntimeError),
    onManageMfa: () => showMfaManagement(),
    onCreateClient: async values => {
      const client = await withWrite("Dodawanie klienta", () =>
        state.repository.createClient(state.profile.id, values)
      );
      await loadTrainer(client.id);
    },
    onSavePwd: async values => {
      await withWrite("Zapisywanie PWD", () =>
        savePwdWorkflow(state.repository, state.activeClientId, values)
      );
      await reloadWorkspace();
    },
    onSaveSession: async values => {
      await withWrite("Zapisywanie sesji", () => state.repository.saveSession(state.activeClientId, values));
      await reloadWorkspace();
    },
    onSaveMeasurement: async values => {
      await withWrite("Zapisywanie pomiaru", () => state.repository.saveMeasurement(state.activeClientId, values));
      await reloadWorkspace();
    },
    onSaveTrainingLoad: async values => {
      await withWrite("Zapisywanie odczytu", () => state.repository.saveTrainingLoad(state.activeClientId, values));
      await reloadWorkspace();
    },
    onSaveAssessment: async values => {
      await withWrite("Zapisywanie obserwacji", () => state.repository.saveAssessment(state.activeClientId, values));
      await reloadWorkspace();
    },
    onSaveHomePlan: async values => {
      await withWrite("Zapisywanie planu", () => state.repository.saveHomePlan(state.activeClientId, values));
      await reloadWorkspace();
    },
    onSaveHomePlanItem: async (homePlanId, values) => {
      await withWrite("Zapisywanie zadania", () =>
        state.repository.saveHomePlanItem(state.activeClientId, homePlanId, values)
      );
      await reloadWorkspace();
    },
    onPublishHomePlan: async homePlanId => {
      await withWrite("Publikowanie wskazówki", () => state.repository.publishHomePlanGuidance(homePlanId));
      await reloadWorkspace();
    },
    onWithdrawHomePlan: async homePlanId => {
      await withWrite("Wycofywanie wskazówki", () => state.repository.withdrawHomePlanGuidance(homePlanId));
      await reloadWorkspace();
    },
    onConfirmHomePlanPaperRetirement: async homePlanId => {
      await withWrite("Potwierdzanie wycofania poprzedniej kopii papierowej", () =>
        state.repository.confirmHomePlanPaperRetirement(homePlanId)
      );
      await reloadWorkspace();
    },
    onRecordGuidanceDelivery: async (homePlanId, deliveryStatus) => {
      await withWrite("Zapisywanie dostarczenia", () =>
        state.repository.recordHomePlanGuidanceDelivery(homePlanId, deliveryStatus)
      );
      await reloadWorkspace();
    },
    onSaveReport: async values => {
      await withWrite("Zapisywanie raportu", () =>
        state.repository.saveReport(state.profile.id, state.activeClientId, values)
      );
      await reloadWorkspace();
    }
  });

  renderInquirySection(root.querySelector(".workspace"), {
    inquiries: state.inquiries,
    activeInquiryId: state.activeInquiryId,
    inquiryDecisions: state.inquiryDecisions,
    onSelectInquiry: inquiryId => selectInquiry(inquiryId).catch(handleRuntimeError),
    onSetContactState: async (inquiryId, values) => {
      await withWrite("Zapisywanie stanu kontaktu", () => state.inquiryRepository.setContactState(inquiryId, values));
      await reloadInquiry(inquiryId);
    },
    onSaveDecision: async (inquiryId, values) => {
      await withWrite("Zapisywanie decyzji po rozmowie", () => state.inquiryRepository.saveDecision(inquiryId, values));
      await reloadInquiry(inquiryId);
    },
    onConvertInquiry: async inquiryId => {
      const result = await withWrite("Tworzenie klienta do PWD", () => state.inquiryRepository.convertToPwdClient(inquiryId));
      await refreshInquiries(inquiryId);
      await loadTrainer(result?.clientId || state.activeClientId);
    }
  });
}

async function loadClientPortal() {
  renderLoading(root, "Ładowanie panelu klienta…");
  state.snapshot = await state.repository.getClientPortalSnapshot();
  renderClient(root, {
    profile: state.profile,
    snapshot: state.snapshot,
    onReload: () => loadClientPortal().catch(handleRuntimeError),
    onLogout: () => logout().catch(handleRuntimeError),
    onSaveCheckin: async values => {
      await withWrite("Zapisywanie sygnału", () => state.repository.saveClientCheckin(values));
      await loadClientPortal();
    }
  });
}

function handleRuntimeError(error) {
  const message = userSafeError(error, state.config?.mode);
  announce(message, "error");
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
    state.inquiryRepository = new InquiryRepository(state.config, state.auth);
    state.mfa = new TrainerMfaController(state.auth);

    // Password callbacks are consumed and removed from the address bar before any
    // other gate can stop the application. The context survives reloads only in
    // this tab and prevents access until the password has been updated.
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
