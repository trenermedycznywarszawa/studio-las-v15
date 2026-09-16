import {
  button,
  clear,
  create,
  statusBox
} from "./common.js";

function codeForm(onVerify) {
  const input = create("input", {
    type: "text",
    name: "code",
    required: true,
    minlength: 6,
    maxlength: 6,
    inputmode: "numeric",
    pattern: "[0-9]{6}",
    autocomplete: "one-time-code",
    placeholder: "000000",
    "aria-label": "Sze\u015bciocyfrowy kod jednorazowy"
  });
  const form = create("form", { className: "mfa-code-form" }, [
    create("label", { className: "field" }, [
      create("span", { text: "Kod z aplikacji" }),
      input
    ]),
    button("Potwierd\u017a kod", { className: "button primary", type: "submit" })
  ]);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await onVerify(input.value);
    } finally {
      submit.disabled = false;
    }
  });
  return form;
}

function factorList(view, onRemoveFactor) {
  if (!view.factors?.length) {
    return create("p", {
      className: "muted",
      text: "Brak zweryfikowanego sk\u0142adnika TOTP."
    });
  }
  return create("div", { className: "mfa-factor-list" }, view.factors.map((factor, index) =>
    create("article", { className: "mfa-factor" }, [
      create("div", {}, [
        create("strong", { text: factor.label }),
        create("p", {
          className: "muted",
          text: factor.createdAt
            ? `Dodano: ${new Date(factor.createdAt).toLocaleDateString("pl-PL")}`
            : "Zweryfikowany TOTP"
        })
      ]),
      button("Usu\u0144", {
        className: "button danger",
        onclick: () => onRemoveFactor(index)
      })
    ])
  ));
}

export function renderTrainerMfa(root, {
  view,
  message = "",
  onStartEnrollment,
  onVerify,
  onRetry,
  onLogout,
  onRemoveFactor,
  onBack
}) {
  clear(root);
  const body = [
    create("p", {
      className: "eyebrow",
      text: "Studio Las OS \u00b7 bezpiecze\u0144stwo trenera"
    }),
    create("h1", { text: "Weryfikacja dwuetapowa" }),
    create("p", {
      className: "muted",
      text: "Dane trenera pozostaj\u0105 zablokowane, dop\u00f3ki konto nie ma dok\u0142adnie jednego zweryfikowanego TOTP, a bie\u017c\u0105ca sesja nie osi\u0105gnie poziomu AAL2."
    }),
    message ? statusBox(message, "error") : null
  ];

  if (view.status === "enrollment_required") {
    body.push(
      statusBox("To konto trenera nie ma jeszcze TOTP. Skonfiguruj dok\u0142adnie jedn\u0105 aplikacj\u0119 uwierzytelniaj\u0105c\u0105.", "info"),
      create("div", { className: "form-actions" }, [
        button("Rozpocznij konfiguracj\u0119", { className: "button primary", onclick: onStartEnrollment }),
        button("Wyloguj", { className: "button danger", onclick: onLogout })
      ])
    );
  } else if (view.status === "enrollment") {
    body.push(
      create("ol", { className: "mfa-steps" }, [
        create("li", { text: "Zeskanuj kod QR w aplikacji uwierzytelniaj\u0105cej." }),
        create("li", { text: "Wpisz aktualny sze\u015bciocyfrowy kod." }),
        create("li", { text: "Po potwierdzeniu sesja zostanie wymieniona na AAL2." })
      ]),
      create("img", { className: "mfa-qr", src: view.qrCode, alt: "Kod QR konfiguracji TOTP" }),
      create("div", { className: "mfa-secret" }, [
        create("span", { text: "Klucz r\u0119czny (tylko na czas konfiguracji)" }),
        create("code", { text: view.secret || "Niedost\u0119pny" })
      ]),
      codeForm(onVerify),
      button("Anuluj i wyloguj", { className: "button danger", onclick: onLogout })
    );
  } else if (view.status === "challenge") {
    body.push(
      statusBox(
        view.multipleFactors
          ? "Najpierw potwierd\u017a kod. Nast\u0119pnie trzeba b\u0119dzie usun\u0105\u0107 nadmiarowe sk\u0142adniki TOTP."
          : `U\u017cyj sk\u0142adnika: ${view.factor?.label || "aplikacja uwierzytelniaj\u0105ca"}.`,
        "info"
      ),
      codeForm(onVerify),
      create("div", { className: "form-actions" }, [
        button("Nowe wyzwanie", { onclick: onRetry }),
        button("Wyloguj", { className: "button danger", onclick: onLogout })
      ])
    );
  } else if (["factor_cleanup_required", "management"].includes(view.status)) {
    body.push(
      view.status === "factor_cleanup_required"
        ? statusBox("Konto ma wi\u0119cej ni\u017c jeden TOTP. Panel pozostaje zablokowany do usuni\u0119cia nadmiarowych sk\u0142adnik\u00f3w.", "error")
        : statusBox("Studio Las wymaga dok\u0142adnie jednego zweryfikowanego sk\u0142adnika TOTP.", "info"),
      factorList(view, onRemoveFactor),
      create("div", { className: "form-actions" }, [
        view.status === "management" ? button("Wr\u00f3\u0107 do panelu", { onclick: onBack }) : null,
        button("Wyloguj", { className: "button danger", onclick: onLogout })
      ])
    );
  }

  root.append(create("main", { className: "center-screen" }, [
    create("section", { className: "mfa-card" }, body)
  ]));
}
