import {
  assertNoPersistentHealthData,
  clearAuthArtifactsFromUrl,
  getProductionRuntimeConfig,
  userSafeError
} from "./runtime.js";
import {
  StudioLasRepository,
  SupabaseAuth
} from "./data.js";
import { collectAttentionSignals } from "./decision-support.js";
import {
  consumeInvitationSession,
  renderInvitationPasswordSetup,
  updateInvitationPassword
} from "./invitation-auth.js";
import {
  renderFatal,
  renderLoading,
  renderLogin
} from "./ui/common.js";
import { renderTrainer } from "./ui/trainer.js";
import { renderClient } from "./ui/client.js";

const root = document.getElementById("app");
const state = {
  config: null,
  auth: null,
  repository: null,
  profile: null,
  clients: [],
  activeClientId: "",
  workspace: null,
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
    announce(`${label}: zapisano w Supabase.`, "ok");
    return result;
  } catch (error) {
    announce(userSafeError(error), "error");
    throw error;
  }
}

async function logout() {
  renderLoading(root, "Wylogowywanie…");
  await state.auth.logout();
  state.profile = null;
  state.clients = [];
  state.activeClientId = "";
  state.workspace = null;
  state.snapshot = null;
  showLogin();
}

function showLogin(message = "") {
  renderLogin(root, {
    message,
    onSubmit: async ({ email, password }) => {
      try {
        renderLoading(root, "Weryfikowanie konta…");
        await state.auth.signInWithPassword(email, password);
        await loadAuthenticatedRuntime();
      } catch (error) {
        showLogin(userSafeError(error));
      }
    }
  });
}

function showInvitationSetup(message = "") {
  renderInvitationPasswordSetup(root, {
    message,
    onCancel: () => logout().catch(handleRuntimeError),
    onSubmit: async password => {
      try {
        renderLoading(root, "Zapisywanie nowego hasła…");
        await updateInvitationPassword(state.auth, password);
        await loadAuthenticatedRuntime();
      } catch (error) {
        showInvitationSetup(userSafeError(error));
      }
    }
  });
}

async function loadAuthenticatedRuntime() {
  renderLoading(root, "Sprawdzanie uprawnień…");
  state.profile = await state.auth.getProfile();

  if (state.profile.role === "trainer") {
    await loadTrainer();
    return;
  }

  if (state.profile.role === "client") {
    await loadClientPortal();
    return;
  }

  throw new Error("Unsupported profile role");
}

async function loadTrainer(preferredClientId = state.activeClientId) {
  renderLoading(root, "Ładowanie panelu trenera…");
  state.clients = await state.repository.listClients();
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

  renderTrainer(root, {
    profile: state.profile,
    clients: state.clients,
    activeClientId: state.activeClientId,
    workspace: state.workspace,
    attentionSignals,
    onSelectClient: clientId => selectClient(clientId).catch(handleRuntimeError),
    onReload: () => loadTrainer(state.activeClientId).catch(handleRuntimeError),
    onLogout: () => logout().catch(handleRuntimeError),
    onCreateClient: async values => {
      const client = await withWrite("Dodawanie klienta", () =>
        state.repository.createClient(state.profile.id, values)
      );
      await loadTrainer(client.id);
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
    onSaveReport: async values => {
      await withWrite("Zapisywanie raportu", () =>
        state.repository.saveReport(state.profile.id, state.activeClientId, values)
      );
      await reloadWorkspace();
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
  if (Number(error?.status || 0) === 401) showLogin(message);
}

async function initialize() {
  try {
    state.config = getProductionRuntimeConfig();
    assertNoPersistentHealthData();
    state.auth = new SupabaseAuth(state.config);
    state.repository = new StudioLasRepository(state.config, state.auth);

    const invitation = consumeInvitationSession(state.auth);
    if (invitation) {
      renderLoading(root, "Weryfikowanie zaproszenia…");
      await state.auth.getUser();
      showInvitationSetup();
      return;
    }

    clearAuthArtifactsFromUrl();
    renderLoading(root);
    const restored = await state.auth.restore();
    if (!restored) {
      showLogin();
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
