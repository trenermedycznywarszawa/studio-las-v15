import { saveAuthSession } from "./runtime.js";
import {
  button,
  clear,
  create,
  field,
  statusBox
} from "./ui/common.js";

const ALLOWED_CALLBACK_TYPES = new Set(["invite"]);

function clearCallbackUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export function consumeInvitationSession(auth) {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const error = hashParams.get("error_description") || searchParams.get("error_description");
  const type = hashParams.get("type") || searchParams.get("type") || "";
  const accessToken = hashParams.get("access_token") || "";
  const refreshToken = hashParams.get("refresh_token") || "";

  if (error) {
    clearCallbackUrl();
    const callbackError = new Error("Invitation link is invalid or expired");
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
  clearCallbackUrl();
  return { type, session };
}

export async function updateInvitationPassword(auth, password) {
  const value = String(password || "");
  if (value.length < 12 || value.length > 128) {
    const error = new Error("Password must contain 12 to 128 characters");
    error.status = 400;
    throw error;
  }

  return auth.request("/auth/v1/user", {
    method: "PUT",
    body: { password: value }
  });
}

export function renderInvitationPasswordSetup(root, { onSubmit, onCancel, message = "" }) {
  clear(root);

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
    create("p", { className: "eyebrow", text: "Studio Las OS · aktywacja konta" }),
    create("h1", { text: "Ustaw własne hasło" }),
    create("p", {
      className: "muted",
      text: "Zaproszenie zostało zweryfikowane przez Supabase. Ustaw hasło, którego nie używasz w innych usługach."
    }),
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
      renderInvitationPasswordSetup(root, {
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
