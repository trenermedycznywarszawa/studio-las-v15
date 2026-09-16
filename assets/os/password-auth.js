import {
  clearPasswordSetupPending,
  markPasswordSetupPending,
  saveAuthSession
} from "./runtime.js";
import {
  button,
  clear,
  create,
  field,
  statusBox
} from "./ui/common.js";

const ALLOWED_CALLBACK_TYPES = new Set(["invite", "recovery"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clearCallbackUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function passwordSetupCopy(context) {
  if (context === "recovery") {
    return {
      eyebrow: "Studio Las OS · odzyskiwanie dostępu",
      title: "Ustaw nowe hasło",
      description: "Link odzyskiwania został zweryfikowany przez Supabase. Ustaw nowe hasło, którego nie używasz w innych usługach."
    };
  }

  return {
    eyebrow: "Studio Las OS · aktywacja konta",
    title: "Ustaw własne hasło",
    description: "Zaproszenie zostało zweryfikowane przez Supabase. Ustaw hasło, którego nie używasz w innych usługach."
  };
}

export function consumePasswordCallback(auth) {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const error = hashParams.get("error_description") || searchParams.get("error_description");
  const type = hashParams.get("type") || searchParams.get("type") || "";
  const accessToken = hashParams.get("access_token") || "";
  const refreshToken = hashParams.get("refresh_token") || "";

  if (error) {
    clearCallbackUrl();
    const callbackError = new Error("Password callback is invalid or expired");
    callbackError.status = 401;
    throw callbackError;
  }

  if (!accessToken && !refreshToken && !type) return null;

  if (!ALLOWED_CALLBACK_TYPES.has(type) || !accessToken || !refreshToken) {
    clearCallbackUrl();
    const callbackError = new Error("Unsupported or incomplete authentication callback");
    callbackError.status = 401;
    throw callbackError;
  }

  const expiresIn = Number(hashParams.get("expires_in") || 3600);
  const expiresAt = Number(hashParams.get("expires_at")) || Math.floor(Date.now() / 1000) + expiresIn;
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: hashParams.get("token_type") || "bearer",
    expires_at: expiresAt
  };

  auth.session = session;
  saveAuthSession(session);
  markPasswordSetupPending(type);
  clearCallbackUrl();
  return { type, session };
}

export async function requestPasswordRecovery(auth, email, redirectTo) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const redirect = new URL(String(redirectTo || ""));

  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
    const error = new Error("Valid email required");
    error.status = 400;
    throw error;
  }

  if (redirect.protocol !== "https:" || redirect.origin !== window.location.origin) {
    const error = new Error("Unsafe recovery redirect");
    error.status = 400;
    throw error;
  }

  await auth.request(
    `/auth/v1/recover?redirect_to=${encodeURIComponent(redirect.toString())}`,
    {
      method: "POST",
      body: { email: normalizedEmail }
    },
    false
  );
}

export async function updatePassword(auth, password) {
  const value = String(password || "");
  if (value.length < 12 || value.length > 128) {
    const error = new Error("Password must contain 12 to 128 characters");
    error.status = 400;
    throw error;
  }

  const result = await auth.request("/auth/v1/user", {
    method: "PUT",
    body: { password: value }
  });
  clearPasswordSetupPending();
  return result;
}

export function renderPasswordSetup(root, { context, onSubmit, onCancel, message = "" }) {
  clear(root);
  const copy = passwordSetupCopy(context);

  const passwordField = field("Nowe hasło", "password", "password", {
    required: true,
    minlength: 12,
    maxlength: 128,
    autocomplete: "new-password"
  });
  const confirmField = field("Powtórz hasło", "passwordConfirm", "password", {
    required: true,
    minlength: 12,
    maxlength: 128,
    autocomplete: "new-password"
  });

  const form = create("form", { className: "login-card" }, [
    create("p", { className: "eyebrow", text: copy.eyebrow }),
    create("h1", { text: copy.title }),
    create("p", { className: "muted", text: copy.description }),
    message ? statusBox(message, "error") : null,
    passwordField,
    confirmField,
    create("div", { className: "form-actions" }, [
      button("Ustaw hasło i przejdź do panelu", {
        className: "button primary",
        type: "submit"
      }),
      button("Anuluj i wyloguj", { onclick: onCancel })
    ])
  ]);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("passwordConfirm") || "");
    if (password !== confirmation) {
      renderPasswordSetup(root, {
        context,
        onSubmit,
        onCancel,
        message: "Hasła nie są identyczne."
      });
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await onSubmit(password);
    } finally {
      submit.disabled = false;
    }
  });

  root.append(create("main", { className: "center-screen" }, [form]));
}

export function renderRecoveryRequest(root, { onSubmit, onCancel, sent = false, message = "" }) {
  clear(root);

  const form = create("form", { className: "login-card" }, [
    create("p", { className: "eyebrow", text: "Studio Las OS · odzyskiwanie dostępu" }),
    create("h1", { text: "Zresetuj hasło" }),
    create("p", {
      className: "muted",
      text: "Podaj adres używany w Studio Las. Ze względów bezpieczeństwa komunikat nie potwierdzi, czy konto istnieje."
    }),
    sent ? statusBox("Jeśli konto istnieje, wiadomość z linkiem została wysłana.", "ok") : null,
    message ? statusBox(message, "error") : null,
    field("Email", "email", "email", {
      required: true,
      maxlength: 254,
      autocomplete: "email"
    }),
    create("div", { className: "form-actions" }, [
      button("Wyślij link odzyskiwania", {
        className: "button primary",
        type: "submit",
        disabled: sent
      }),
      button("Wróć do logowania", { onclick: onCancel })
    ])
  ]);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const data = new FormData(form);
      await onSubmit(String(data.get("email") || ""));
    } finally {
      submit.disabled = false;
    }
  });

  root.append(create("main", { className: "center-screen" }, [form]));
}
