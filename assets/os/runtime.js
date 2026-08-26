const AUTH_SESSION_KEY = "studio-las-auth-session";
const PASSWORD_SETUP_CONTEXT_KEY = "studio-las-password-setup-context";
const PASSWORD_SETUP_CONTEXTS = new Set(["invite", "recovery"]);

export class RuntimeConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RuntimeConfigurationError(`${label} ma nieprawidłowy format.`);
  }
}

const CANONICAL_PRODUCTION_REF = "ufcumhbnuyernuwepcij";
const CANONICAL_STAGING_REF = "ulauyoqjoetjqktegeuq";

function normalizeUrl(value) {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:") {
    throw new RuntimeConfigurationError("Adres Supabase musi używać HTTPS.");
  }
  return url.origin;
}

export function getRuntimeConfig() {
  const raw = window.STUDIO_LAS_CONFIG;
  assertPlainObject(raw, "STUDIO_LAS_CONFIG");

  assertPlainObject(raw.supabase, "STUDIO_LAS_CONFIG.supabase");

  const mode = String(raw.mode || "").trim();
  const projectRef = String(raw.supabase.projectRef || "").trim();
  const supabaseUrl = normalizeUrl(raw.supabase.url);
  const publishableKey = String(raw.supabase.publishableKey || "").trim();

  if (!publishableKey || publishableKey.length < 40) {
    throw new RuntimeConfigurationError("Brak prawidłowego klucza publicznego Supabase.");
  }

  if (mode !== "production" && mode !== "staging") {
    throw new RuntimeConfigurationError(
      "Nieobsługiwane środowisko: STUDIO_LAS_CONFIG.mode musi mieć wartość production albo staging."
    );
  }

  const expectedRef = mode === "production" ? CANONICAL_PRODUCTION_REF : CANONICAL_STAGING_REF;
  if (projectRef !== expectedRef) {
    const environment = mode === "production" ? "production" : "stagingu";
    throw new RuntimeConfigurationError(
      `Błędna konfiguracja ${environment}: dozwolony jest wyłącznie kanoniczny ref ${expectedRef}.`
    );
  }

  if (supabaseUrl !== `https://${expectedRef}.supabase.co`) {
    throw new RuntimeConfigurationError(
      `Błędna konfiguracja ${mode === "production" ? "production" : "stagingu"}: URL Supabase musi wskazywać kanoniczny ref ${expectedRef}.`
    );
  }

  return Object.freeze({
    mode,
    supabaseUrl,
    publishableKey,
    projectRef,
    authStorage: "sessionStorage",
    healthDataStorage: "supabase-only"
  });
}

export function loadAuthSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.access_token !== "string" ||
      typeof parsed.refresh_token !== "string" ||
      typeof parsed.expires_at !== "number"
    ) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function saveAuthSession(session) {
  if (!session) {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(PASSWORD_SETUP_CONTEXT_KEY);
    return;
  }

  const safeSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Number(session.expires_at || 0),
    token_type: session.token_type || "bearer"
  };

  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safeSession));
}

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(PASSWORD_SETUP_CONTEXT_KEY);
}

export function markPasswordSetupPending(context) {
  if (!PASSWORD_SETUP_CONTEXTS.has(context)) {
    throw new RuntimeConfigurationError("Nieobsługiwany kontekst ustawiania hasła.");
  }
  sessionStorage.setItem(PASSWORD_SETUP_CONTEXT_KEY, context);
}

export function clearPasswordSetupPending() {
  sessionStorage.removeItem(PASSWORD_SETUP_CONTEXT_KEY);
}

export function getPasswordSetupContext() {
  const context = sessionStorage.getItem(PASSWORD_SETUP_CONTEXT_KEY);
  if (!PASSWORD_SETUP_CONTEXTS.has(context)) {
    sessionStorage.removeItem(PASSWORD_SETUP_CONTEXT_KEY);
    return null;
  }
  return context;
}

export function clearAuthArtifactsFromUrl() {
  if (!window.location.hash && !window.location.search) return;

  const sensitiveKeys = [
    "access_token",
    "refresh_token",
    "expires_in",
    "expires_at",
    "token_type",
    "type",
    "code",
    "error",
    "error_code",
    "error_description"
  ];

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const containsAuthArtifact = sensitiveKeys.some(
    key => hashParams.has(key) || searchParams.has(key)
  );

  if (containsAuthArtifact) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

export function assertNoPersistentHealthData() {
  const forbiddenPrefixes = [
    "studioLasOS",
    "studio-las-client",
    "studio-las-health",
    "studioLasExerciseLibrary",
    "studioLasGuidance"
  ];

  const violations = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && forbiddenPrefixes.some(prefix => key.startsWith(prefix))) {
      violations.push(key);
    }
  }

  if (violations.length) {
    throw new RuntimeConfigurationError(
      `Wykryto starsze lokalne dane aplikacji (${violations.join(", ")}). ` +
      "Produkcja nie uruchomi się, dopóki dane nie zostaną wyeksportowane, zweryfikowane i usunięte z przeglądarki."
    );
  }
}

export function userSafeError(error) {
  if (error instanceof RuntimeConfigurationError) return error.message;

  const status = Number(error?.status || 0);
  if (status === 400) return "Dane formularza nie spełniają wymagań. Sprawdź pola i spróbuj ponownie.";
  if (status === 401) return "Sesja wygasła albo link jest nieprawidłowy. Zaloguj się ponownie.";
  if (status === 403) return "Nie masz dostępu do tych danych.";
  if (status === 409) return "Taki zapis już istnieje albo narusza regułę danych.";
  if (status === 429) return "Wysłano zbyt wiele prób. Odczekaj i spróbuj ponownie później.";
  if (status >= 500) return "Usługa danych jest chwilowo niedostępna. Zapis nie został wykonany.";

  return "Operacja nie powiodła się. Dane nie zostały zapisane lokalnie.";
}

export const CANONICAL_ENGAGEMENTS = Object.freeze({
  diagnostic_visit: "Pierwsza Wizyta Diagnostyczna",
  twelve_week_process: "Proces 12-tygodniowy",
  continuation: "Prowadzenie kontynuacyjne"
});

export const CANONICAL_STAGES = Object.freeze({
  1: "Diagnostyka i punkt startowy",
  2: "Plan i pierwsze decyzje",
  3: "Prowadzona praca 1:1",
  4: "Raport i decyzja co dalej"
});
