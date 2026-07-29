import { button, clear, create } from "./common.js";
import { createTrainerChrome } from "./trainer-navigation.js";
import { renderTrainerView } from "./trainer-views.js";

export function renderTrainer(root, model) {
  clear(root);
  document.body.classList.remove("modal-open");
  let sessionDirty = false;

  const confirmDiscard = () => !sessionDirty || window.confirm(
    "Niezapisana sesja zostanie wyczyszczona. Kontynuować?"
  );
  const navigate = view => {
    if (view === model.activeView) return true;
    if (!confirmDiscard()) return false;
    model.onNavigate(view);
    return true;
  };
  const selectClient = clientId => {
    if (clientId === model.activeClientId) return true;
    if (!confirmDiscard()) return false;
    model.onSelectClient(clientId);
    return true;
  };

  const chrome = createTrainerChrome(model, { navigate, selectClient });
  const content = create("main", { className: "trainer-workspace" });
  const view = renderTrainerView(model, () => { sessionDirty = true; });
  if (view) {
    content.append(view);
  } else {
    content.append(create("section", { className: "empty-workspace" }, [
      create("p", { className: "eyebrow", text: "Jeden kontekst naraz" }),
      create("h1", { text: "Wybierz aktywnego klienta" }),
      create("p", { text: "Po wyborze system pobierze pełny, autoryzowany kontekst tej osoby." }),
      button("Wybierz klienta", { className: "button primary", onclick: chrome.openDrawer })
    ]));
  }

  root.append(
    chrome.header,
    create("div", { className: "trainer-shell" }, [chrome.sidebar, content]),
    chrome.bottomNavigation,
    chrome.layer
  );
}
