import { button, create } from "./common.js";

const VIEWS = Object.freeze([
  ["today", "Dzisiaj", "Stan bieżący"],
  ["brief", "Brief", "Przed spotkaniem"],
  ["session", "Sesja", "Zapis trenera"]
]);

function current(node, value) {
  if (value) node.setAttribute("aria-current", value);
  return node;
}

function viewNavigation(model, onSelect, compact = false) {
  const navigation = create("nav", {
    className: compact ? "bottom-navigation" : "workspace-navigation",
    "aria-label": "Widoki aktywnego klienta"
  });
  VIEWS.forEach(([view, label, detail]) => {
    navigation.append(current(button(compact ? label : `${label} · ${detail}`, {
      className: compact ? "bottom-nav-item" : "workspace-nav-item",
      onclick: () => onSelect(view),
      disabled: !model.workspace
    }), model.activeView === view ? "page" : null));
  });
  return navigation;
}

function clientButtons(model, onSelect) {
  if (!model.clients.length) {
    return create("p", { className: "honest-empty", text: "Brak klientów dostępnych dla tego konta." });
  }
  return create("div", { className: "client-list" }, model.clients.map(client =>
    current(button(client.name, {
      className: "client-option",
      onclick: () => onSelect(client.id)
    }), model.activeClientId === client.id ? "true" : null)
  ));
}

function globalTools(model, headingTag = "h2") {
  return create("section", { className: "global-tools" }, [
    create(headingTag, { text: "Narzędzia globalne" }),
    button("Dostęp klientów", {
      onclick: () => window.location.assign("./tools/client-access-admin.html")
    }),
    button("Ustawienia MFA", { onclick: model.onManageMfa }),
    button("Odśwież dane", { onclick: model.onReload }),
    button("Wyloguj", { className: "button danger", onclick: model.onLogout })
  ]);
}

function trapFocus(dialog, event) {
  if (event.key !== "Tab") return;
  const selector = "button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
  const focusable = [...dialog.querySelectorAll(selector)];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function createTrainerChrome(model, handlers) {
  let restoreFocus = null;
  const activeName = model.workspace?.client?.name || "Wybierz klienta";
  const layer = create("div", { className: "drawer-layer", hidden: true });
  const dialog = create("aside", {
    className: "mobile-drawer",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "drawer-title",
    tabindex: "-1"
  });

  const closeDrawer = (restore = true) => {
    layer.hidden = true;
    document.body.classList.remove("modal-open");
    if (restore) restoreFocus?.focus();
  };
  const chooseClient = clientId => {
    if (handlers.selectClient(clientId) !== false) closeDrawer(false);
  };
  const chooseView = view => {
    if (handlers.navigate(view) !== false) closeDrawer(false);
  };

  dialog.append(
    create("header", { className: "drawer-header" }, [
      create("div", {}, [
        create("p", { className: "eyebrow", text: "Studio Las OS" }),
        create("h2", { id: "drawer-title", text: "Kontekst pracy" })
      ]),
      button("Zamknij", { className: "icon-button", onclick: () => closeDrawer() })
    ]),
    create("section", { className: "drawer-section" }, [
      create("h3", { text: "Aktywny klient" }),
      clientButtons(model, chooseClient)
    ]),
    create("section", { className: "drawer-section" }, [
      create("h3", { text: "Praca z tą osobą" }),
      viewNavigation(model, chooseView)
    ]),
    create("div", { className: "drawer-section" }, [globalTools(model, "h3")])
  );
  layer.append(dialog);
  layer.addEventListener("click", event => {
    if (event.target === layer) closeDrawer();
  });
  layer.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
    } else {
      trapFocus(dialog, event);
    }
  });

  const openDrawer = event => {
    restoreFocus = event.currentTarget;
    layer.hidden = false;
    document.body.classList.add("modal-open");
    dialog.focus();
  };
  const brand = create("div", { className: "brand-lockup" }, [
    create("span", { className: "brand-mark", "aria-hidden": "true", text: "L" }),
    create("div", {}, [
      create("p", { className: "eyebrow", text: "Studio Las" }),
      create("strong", { text: activeName })
    ])
  ]);
  const header = create("header", { className: "trainer-topbar" }, [
    brand,
    button("Menu", { className: "menu-button", onclick: openDrawer })
  ]);
  const sidebar = create("aside", { className: "trainer-sidebar" }, [
    create("div", { className: "sidebar-brand" }, [
      create("span", { className: "brand-mark", "aria-hidden": "true", text: "L" }),
      create("div", {}, [
        create("p", { className: "eyebrow", text: "Studio Las OS" }),
        create("strong", { text: model.profile.display_name || "Trener" })
      ])
    ]),
    create("section", { className: "sidebar-section" }, [
      create("h2", { text: "Klienci" }),
      clientButtons(model, handlers.selectClient)
    ]),
    create("section", { className: "sidebar-section active-client-tools" }, [
      create("h2", { text: activeName }),
      viewNavigation(model, handlers.navigate)
    ]),
    create("div", { className: "sidebar-section" }, [globalTools(model)])
  ]);

  return {
    header,
    sidebar,
    bottomNavigation: viewNavigation(model, handlers.navigate, true),
    layer,
    openDrawer
  };
}
