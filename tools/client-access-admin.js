import {
  assertNoPersistentHealthData,
  getProductionRuntimeConfig,
  userSafeError
} from "../assets/os/runtime.js";
import {
  StudioLasRepository,
  SupabaseAuth
} from "../assets/os/data.js";
import {
  button,
  clear,
  create,
  panel,
  renderFatal,
  renderLoading,
  renderLogin,
  statusBox
} from "../assets/os/ui/common.js";
import { TrainerMfaController } from "../assets/os/trainer-mfa.js";
import { renderTrainerMfa } from "../assets/os/ui/trainer-mfa.js";

const root = document.getElementById("access-admin");
const state = {
  config: null,
  auth: null,
  repository: null,
  mfa: null,
  mfaView: null,
  profile: null,
  clients: [],
  activeClientId: "",
  access: null
};

function activeClient() {
  return state.clients.find(client => client.id === state.activeClientId) || null;
}

async function invokeClientAccess(action, clientId, email = "") {
  const response = await fetch(`${state.config.supabaseUrl}/functions/v1/client-access`, {
    method: "POST",
    headers: {
      apikey: state.config.publishableKey,
      Authorization: `Bearer ${state.auth.session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action, clientId, email })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || "client_access_operation_failed");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadStatus() {
  if (!state.activeClientId) {
    state.access = null;
    renderAdmin();
    return;
  }

  renderLoading(root, "Sprawdzanie dostępu klienta…");
  const payload = await invokeClientAccess("status", state.activeClientId);
  state.access = payload.access || null;
  renderAdmin();
}

async function inviteClient() {
  const client = activeClient();
  if (!client?.email) throw new Error("Klient nie ma zapisanego adresu email.");

  renderLoading(root, "Wysyłanie bezpiecznego zaproszenia…");
  const payload = await invokeClientAccess("invite", client.id, client.email);
  state.access = payload.access || null;
  renderAdmin("Zaproszenie zostało obsłużone przez Supabase Auth.", "ok");
}

async function revokeClient() {
  const client = activeClient();
  if (!client) return;
  if (!window.confirm(`Cofnąć dostęp klienta ${client.name}?`)) return;

  renderLoading(root, "Cofanie dostępu…");
  const payload = await invokeClientAccess("revoke", client.id);
  state.access = payload.access || null;
  renderAdmin("Dostęp został cofnięty. Aktywny token nie daje już dostępu do danych klienta.", "ok");
}

async function logout() {
  state.mfa?.clear();
  renderLoading(root, "Wylogowywanie…");
  await state.auth.logout();
  state.profile = null;
  state.clients = [];
  state.activeClientId = "";
  state.access = null;
  state.mfaView = null;
  showLogin();
}

function accessStatusText() {
  const status = state.access?.status || "not_invited";
  if (status === "active") return "Dostęp aktywny";
  if (status === "revoked") return "Dostęp cofnięty";
  if (status === "not_found") return "Klient niedostępny";
  return "Brak aktywnego konta klienta";
}

function renderAdmin(message = "", kind = "info") {
  clear(root);
  const client = activeClient();

  const select = create("select", {
    className: "client-select",
    "aria-label": "Wybierz klienta"
  }, [
    create("option", { value: "", text: "Wybierz klienta" }),
    ...state.clients.map(item => create("option", {
      value: item.id,
      text: `${item.name}${item.email ? ` · ${item.email}` : " · brak email"}`
    }))
  ]);
  select.value = state.activeClientId;
  select.addEventListener("change", () => {
    state.activeClientId = select.value;
    state.access = null;
    loadStatus().catch(handleError);
  });

  const accessBody = create("div", {}, [
    message ? statusBox(message, kind) : null,
    client ? create("div", { className: "summary-grid" }, [
      create("div", { className: "summary-item" }, [
        create("span", { text: "Klient" }),
        create("strong", { text: client.name })
      ]),
      create("div", { className: "summary-item" }, [
        create("span", { text: "Email konta" }),
        create("strong", { text: client.email || "Brak — najpierw uzupełnij profil klienta" })
      ]),
      create("div", { className: "summary-item" }, [
        create("span", { text: "Stan dostępu" }),
        create("strong", { text: accessStatusText() })
      ])
    ]) : create("p", { className: "muted", text: "Wybierz klienta, aby zarządzać dostępem." }),
    client ? create("div", { className: "form-actions" }, [
      button("Wyślij lub aktywuj zaproszenie", {
        className: "button primary",
        onclick: () => inviteClient().catch(handleError),
        disabled: !client.email
      }),
      button("Cofnij dostęp", {
        className: "button danger",
        onclick: () => revokeClient().catch(handleError),
        disabled: state.access?.status !== "active"
      }),
      button("Odśwież status", {
        onclick: () => loadStatus().catch(handleError)
      })
    ]) : null,
    create("div", { className: "security-note" }, [
      create("strong", { text: "Granica bezpieczeństwa" }),
      create("p", { text: "Zaproszenia są wysyłane przez Edge Function. Klucz service role nie trafia do tej strony ani do repozytorium." })
    ])
  ]);

  const header = create("header", { className: "topbar" }, [
    create("div", {}, [
      create("p", { className: "eyebrow", text: "Studio Las OS · administracja dostępu" }),
      create("h1", { text: "Konta klientów" })
    ]),
    create("div", { className: "top-actions" }, [
      create("span", { className: "role-badge", text: state.profile.display_name || state.profile.email || "Trener" }),
      button("Wróć do OS", { onclick: () => window.location.assign("../studio-las-os.html") }),
      button("Wyloguj", { className: "button danger", onclick: () => logout().catch(handleError) })
    ])
  ]);

  root.append(header, create("main", { className: "workspace" }, [
    panel("Wybierz klienta", select, "Tylko właściciel procesu może zaprosić lub odwołać konto klienta."),
    panel("Dostęp klienta", accessBody)
  ]));
}

function showLogin(message = "") {
  renderLogin(root, {
    message,
    onSubmit: async ({ email, password }) => {
      try {
        renderLoading(root, "Weryfikowanie konta trenera…");
        await state.auth.signInWithPassword(email, password, { persist: false });
        await loadAuthenticatedTool();
      } catch (error) {
        showLogin(userSafeError(error));
      }
    }
  });
}

async function loadAuthenticatedTool() {
  state.profile = await state.auth.getProfile();
  if (state.profile.role !== "trainer") {
    await state.auth.logout();
    throw new Error("Narzędzie jest dostępne wyłącznie dla trenera.");
  }

  if (state.auth.getAuthenticatorAssuranceLevel() !== "aal2") {
    state.auth.suspendSessionPersistence();
  }
  await enforceTrainerMfa();
}

async function loadAdmin() {
  renderLoading(root, "\u0141adowanie administracji dost\u0119pu\u2026");
  state.clients = await state.repository.listClients();
  state.activeClientId = "";
  state.access = null;
  renderAdmin();
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
    onLogout: () => logout().catch(handleError),
    onRemoveFactor: index => removeMfaFactor(index),
    onBack: () => loadAdmin().catch(handleError)
  });
}

async function advanceMfa(operation, loadingMessage) {
  try {
    renderLoading(root, loadingMessage);
    const next = await operation();
    if (next.status === "verified") {
      state.mfaView = null;
      await loadAdmin();
      return;
    }
    renderMfaView(next);
  } catch (error) {
    renderMfaView(
      state.mfaView || { status: "enrollment_required" },
      userSafeError(error)
    );
  }
}

async function enforceTrainerMfa() {
  await advanceMfa(
    () => state.mfa.prepare(),
    "Sprawdzanie drugiego sk\u0142adnika\u2026"
  );
}

async function removeMfaFactor(index) {
  if (!window.confirm("Usun\u0105\u0107 ten sk\u0142adnik TOTP? Sesja zostanie zako\u0144czona.")) return;
  try {
    renderLoading(root, "Usuwanie sk\u0142adnika i ko\u0144czenie sesji\u2026");
    await state.mfa.removeFactor(index);
    state.profile = null;
    state.clients = [];
    state.activeClientId = "";
    state.access = null;
    state.mfaView = null;
    showLogin("Sk\u0142adnik TOTP usuni\u0119to. Zaloguj si\u0119 ponownie.");
  } catch (error) {
    renderMfaView(
      state.mfaView || { status: "management", factors: [] },
      userSafeError(error)
    );
  }
}

function handleError(error) {
  const message = userSafeError(error);
  if (Number(error?.status || 0) === 401) {
    showLogin(message);
    return;
  }
  if (Number(error?.status || 0) === 403 && state.profile?.role === "trainer"
    && state.auth.getAuthenticatorAssuranceLevel() !== "aal2") {
    enforceTrainerMfa().catch(() => showLogin(message));
    return;
  }
  renderAdmin(message, "error");
}

async function initialize() {
  try {
    state.config = getProductionRuntimeConfig();
    assertNoPersistentHealthData();
    state.auth = new SupabaseAuth(state.config);
    state.repository = new StudioLasRepository(state.config, state.auth);
    state.mfa = new TrainerMfaController(state.auth);

    const restored = await state.auth.restore();
    if (!restored) {
      showLogin();
      return;
    }
    await loadAuthenticatedTool();
  } catch (error) {
    renderFatal(root, userSafeError(error));
  }
}

initialize();
