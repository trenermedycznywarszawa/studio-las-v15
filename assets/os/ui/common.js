export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function create(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value ?? "";
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null && value !== false) {
      node.setAttribute(key, value === true ? "" : String(value));
    }
  });

  (Array.isArray(children) ? children : [children])
    .filter(Boolean)
    .forEach(child => node.append(child instanceof Node ? child : document.createTextNode(String(child))));
  return node;
}

export function field(label, name, type = "text", options = {}) {
  let input;
  const shared = {
    name,
    required: options.required,
    disabled: options.disabled,
    autocomplete: options.autocomplete
  };

  if (type === "textarea") {
    input = create("textarea", {
      ...shared,
      rows: options.rows || 3,
      placeholder: options.placeholder || "",
      minlength: options.minlength,
      maxlength: options.maxlength
    });
  } else if (type === "select") {
    input = create("select", shared);
    (options.options || []).forEach(option => input.append(create("option", {
      value: option.value,
      text: option.label,
      disabled: option.disabled
    })));
  } else {
    input = create("input", {
      ...shared,
      type,
      min: options.min,
      max: options.max,
      step: options.step,
      minlength: options.minlength,
      maxlength: options.maxlength,
      placeholder: options.placeholder || ""
    });
  }

  if (options.value !== undefined && options.value !== null) input.value = options.value;
  return create("label", { className: "field" }, [create("span", { text: label }), input]);
}

export function checkbox(label, name, checked = false, options = {}) {
  const input = create("input", {
    type: "checkbox",
    name,
    disabled: options.disabled,
    required: options.required
  });
  input.checked = checked;
  return create("label", { className: "check-field" }, [input, create("span", { text: label })]);
}

export function formValues(form) {
  const result = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll('input[type="checkbox"][name]').forEach(input => {
    result[input.name] = input.checked;
  });
  return result;
}

export function button(label, options = {}) {
  return create("button", {
    className: options.className || "button",
    type: options.type || "button",
    text: label,
    onclick: options.onclick,
    disabled: options.disabled
  });
}

export function statusBox(message, kind = "info") {
  return create("div", { className: `status ${kind}`, text: message });
}

export function panel(title, body, note = "") {
  return create("section", { className: "panel" }, [
    create("div", { className: "section-heading" }, [
      create("h2", { text: title }),
      note ? create("p", { text: note }) : null
    ]),
    body
  ]);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("pl-PL");
}

export function recordList(rows, renderRow, emptyText) {
  if (!rows?.length) return create("p", { className: "muted", text: emptyText });
  return create("div", { className: "record-list" }, rows.map(renderRow));
}

export function detailsForm(summary, form) {
  return create("details", { className: "details-card" }, [
    create("summary", { text: summary }),
    form
  ]);
}

export function submitForm(fields, label, onSubmit, className = "form-grid", options = {}) {
  const form = create("form", { className }, [
    ...fields,
    create("div", { className: "form-actions" }, [
      button(label, {
        className: "button primary",
        type: "submit",
        disabled: options.disabled
      })
    ])
  ]);

  if (options.disabledReason) {
    form.prepend(statusBox(options.disabledReason, "error"));
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await onSubmit(formValues(form));
      form.reset();
    } finally {
      submit.disabled = Boolean(options.disabled);
    }
  });
  return form;
}

export function renderFatal(root, message) {
  clear(root);
  root.append(create("main", { className: "center-screen" }, [
    create("section", { className: "fatal-card" }, [
      create("p", { className: "eyebrow", text: "Studio Las OS" }),
      create("h1", { text: "Produkcja zatrzymana" }),
      create("p", { text: message }),
      create("p", { className: "muted", text: "Dane nie zostały zapisane lokalnie." })
    ])
  ]));
}

export function renderLoading(root, message = "Ładowanie bezpiecznego środowiska…") {
  clear(root);
  root.append(create("main", { className: "center-screen" }, [
    create("div", { className: "loading-card", text: message })
  ]));
}

export function renderLogin(root, { onSubmit, onRecover, message = "" }) {
  clear(root);
  const form = submitForm([
    create("p", { className: "eyebrow", text: "Studio Las OS · produkcja" }),
    create("h1", { text: "Bezpieczne logowanie" }),
    create("p", { className: "muted", text: "Konto trenera lub klienta w Supabase Auth. Lokalne kody dostępu nie są obsługiwane." }),
    message ? statusBox(message, "error") : null,
    field("Email", "email", "email", { required: true, maxlength: 254, autocomplete: "email" }),
    field("Hasło", "password", "password", { required: true, maxlength: 1024, autocomplete: "current-password" })
  ], "Zaloguj", onSubmit, "login-card");

  if (typeof onRecover === "function") {
    form.append(create("div", { className: "form-actions" }, [
      button("Nie pamiętam hasła", { onclick: onRecover })
    ]));
  }

  root.append(create("main", { className: "center-screen" }, [form]));
}
