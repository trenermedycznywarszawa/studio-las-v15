import {
  assertNoPersistentHealthData,
  clearAuthArtifactsFromUrl,
  getPasswordSetupContext,
  getProductionRuntimeConfig,
  userSafeError
} from "./runtime.js";
import {
  StudioLasRepository,
  SupabaseAuth
} from "./data.js";
import { prepareSessionInput } from "./trainer-workspace.js";
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
import { renderClient } from "./ui/client.js";
import { TrainerMfaController } from "./trainer-mfa.js";
import { renderTrainerMfa } from "./ui/trainer-mfa.js";

const root = document.getElementById("app");
const state = {
  config: null,
  auth: null,
  repository: null,
  mfa: null,
  mfaView: null,
  profile: null,
  clients: [],
  activeClientId: "",
  workspace: null,
  activeTrainerView: "today",
  workspaceRequestId: 0,
  snapshot: null
};

function announce(message, kind = "info") {
  let region = document.getElementById("runtime-message");
  if (!region) {
    region = document.createElement("div");
    region.id = "runtime-message";
    region.setAttribute("role", "status");
    document.body.append(region);
  }
  region.className = `runtime-message ${kind}`;
  region.textContent = message;
  window.setTimeout(() => {
    if (region.textContent === message) region.textContent = "";
  }, 6000);
}

async function withWrite(label, operation) {
  announce(`${label}…`);
  try {
    const result = await operation();
    announce(`${label}: zapis potwierdzony.`, "ok");
    return result;
  } catch (error) {
    announce(userSafeError(error), "error");
    throw error;
  }
}

async function logout() {
  state.mfa?.clear();
  renderLoading(root, "Wylogowywanie…");
  await state.auth.logout();
  state.profile = null;
  state.clients = [];
  state.activeClientId = "";
  state.workspace = null;
  state.activeTrainerView = "today";
  state.workspaceRequestId += 1;
  state.snapshot = null;
  state.mfaView = null;
  showLogin();
}

function showLogin(message = "") {
  renderLogin(root, {
    message,
    onRecover: () => showRecoveryRequest(),
    onSubmit: async ({ email, password }) => {
      try {
        renderLoading(root, "Weryfikowanie konta…");
        await state.auth.signInWithPassword(email, password, { persist: false });
        await loadAuthenticatedRuntime();
      } catch (error) {
        showLogin(userSafeError(error));
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
        showRecoveryRequest({ message: userSafeError(error) });
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
        showPasswordSetup(context, userSafeError(error));
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
      "Przygotowywanie konfiguracji TOTP\u2026"
    ),
    onVerify: code => advanceMfa(
      () => state.mfa.verify(code),
      "Weryfikowanie kodu TOTP\u2026"
    ),
    onRetry: () => advanceMfa(
      () => state.mfa.prepare(),
      "Tworzenie nowego wyzwania\u2026"
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
    renderMfaView(fallback, userSafeError(error));
  }
}

async function enforceTrainerMfa() {
  await advanceMfa(
    () => state.mfa.prepare(),
    "Sprawdzanie drugiego sk\u0142adnika\u2026"
  );
}

async function showMfaManagement() {
  try {
    renderLoading(root, "\u0141adowanie ustawie\u0144 MFA\u2026");
    renderMfaView(await state.mfa.management());
  } catch (error) {
    handleRuntimeError(error);
  }
}

async function removeMfaFactor(index) {
  if (!window.confirm("Usun\u0105\u0107 ten sk\u0142adnik TOTP?")) return;
  try {
    renderLoading(root, "Usuwanie sk\u0142adnika TOTP\u2026");
    const next = await state.mfa.removeFactor(index);
    if (next.status === "verified") {
      state.mfaView = null;
      await loadTrainer(state.activeClientId);
      return;
    }
    renderMfaView(next);
  } catch (error) {
    const fallback = state.mfaView || { status: "management", factors: [] };
    renderMfaView(fallback, userSafeError(error));
  }
}

async function loadTrainer(preferredClientId = state.activeClientId) {
  const requestId = ++state.workspaceRequestId;
  renderLoading(root, "Ładowanie panelu trenera…");
  const mfaView = await state.mfa.prepare();
  if (requestId !== state.workspaceRequestId) return;
  if (mfaView.status !== "verified") {
    renderMfaView(mfaView);
    return;
  }
  state.mfaView = null;
  const clients = await state.repository.listClients();
  const activeClientId = preferredClientId && clients.some(client => client.id === preferredClientId)
    ? preferredClientId
    : "";
  const workspace = activeClientId
    ? await state.repository.getClientWorkspace(activeClientId)
    : null;
  if (requestId !== state.workspaceRequestId) return;
  state.clients = clients;
  state.activeClientId = activeClientId;
  state.workspace = workspace;
  renderTrainerState();
}

async function selectClient(clientId) {
  const nextClientId = clientId || "";
  const requestId = ++state.workspaceRequestId;
  if (!nextClientId) {
    state.activeClientId = "";
    state.workspace = null;
    state.activeTrainerView = "today";
    renderTrainerState();
    return;
  }

  renderLoading(root, "Ładowanie procesu klienta…");
  try {
    const workspace = await state.repository.getClientWorkspace(nextClientId);
    if (requestId !== state.workspaceRequestId) return;
    state.activeClientId = nextClientId;
    state.workspace = workspace;
    state.activeTrainerView = "today";
  } catch (error) {
    if (requestId === state.workspaceRequestId) {
      state.activeClientId = "";
      state.workspace = null;
      state.activeTrainerView = "today";
      renderTrainerState();
    }
    throw error;
  }
  renderTrainerState();
}

function renderTrainerState() {
  const reloadWorkspace = async () => {
    const clientId = state.activeClientId;
    const requestId = ++state.workspaceRequestId;
    const [workspace, clients] = await Promise.all([
      clientId ? state.repository.getClientWorkspace(clientId) : null,
      state.repository.listClients()
    ]);
    if (requestId !== state.workspaceRequestId || clientId !== state.activeClientId) return;
    state.workspace = workspace;
    state.clients = clients;
    renderTrainerState();
  };

  renderTrainer(root, {
    profile: state.profile,
    clients: state.clients,
    activeClientId: state.activeClientId,
    workspace: state.workspace,
    activeView: state.activeTrainerView,
    onSelectClient: clientId => selectClient(clientId).catch(handleRuntimeError),
    onNavigate: view => {
      if (!["today", "brief", "session"].includes(view)) return;
      state.activeTrainerView = view;
      renderTrainerState();
    },
    onReload: () => loadTrainer(state.activeClientId).catch(handleRuntimeError),
    onLogout: () => logout().catch(handleRuntimeError),
    onManageMfa: () => showMfaManagement(),
    onSaveSession: async values => {
      const clientId = state.activeClientId;
      if (!clientId) throw new Error("Wybierz klienta przed zapisem sesji.");
      const input = prepareSessionInput(values);
      await withWrite(
        "Zapisywanie sesji",
        () => state.repository.saveSession(clientId, input)
      );
      if (state.activeClientId === clientId) await reloadWorkspace();
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
  const message = userSafeError(error);
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
    state.config = getProductionRuntimeConfig();
    state.auth = new SupabaseAuth(state.config);
    state.repository = new StudioLasRepository(state.config, state.auth);
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
      showLogin(userSafeError(error));
      return;
    }

    renderFatal(root, userSafeError(error));
  }
}

window.addEventListener("unhandledrejection", event => {
  event.preventDefault();
  handleRuntimeError(event.reason);
});

initialize();
