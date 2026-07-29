import { create, formatDate } from "./common.js";
import { sessionForm } from "./forms.js";
import { CANONICAL_STAGES } from "../runtime.js";
import { buildTrainerWorkspace } from "../trainer-workspace.js";

function sourceLine(item) {
  if (!item?.sourceDate) {
    return create("p", { className: "source-line", text: item?.sourceType || "" });
  }
  return create("p", {
    className: "source-line",
    text: `${item.sourceType} · ${formatDate(item.sourceDate)}`
  });
}

function factCard(item, emptyText, className = "fact-card") {
  return create("article", { className }, [
    create("p", { className: "fact-label", text: item?.label || "Brak informacji" }),
    create("p", {
      className: item ? "fact-value" : "fact-value muted",
      text: item?.value || emptyText
    }),
    item ? sourceLine(item) : null
  ]);
}

function screenHeading(kicker, title, description) {
  return create("header", { className: "screen-heading" }, [
    create("p", { className: "eyebrow", text: kicker }),
    create("h1", { text: title }),
    create("p", { className: "screen-intro", text: description })
  ]);
}

function todayView(workspace, summary) {
  const today = summary.today;
  const priority = today.missing[0] || today.nextStep || today.latestClientSignal;
  return create("div", { className: "view-stack", "data-view": "today" }, [
    screenHeading(
      "Aktywny klient",
      "Dzisiaj",
      "Tylko informacje, które pomagają wejść w sytuację. Decyzję podejmuje trener."
    ),
    create("section", { className: "orientation-strip", "aria-label": "Orientacja w procesie" }, [
      create("div", {}, [
        create("span", { text: "Etap prowadzenia" }),
        create("strong", {
          text: CANONICAL_STAGES[workspace.client.stage] || `Etap ${workspace.client.stage}`
        })
      ]),
      create("div", {}, [
        create("span", { text: "Najbliższe spotkanie" }),
        create("strong", {
          text: today.nextSession?.value ? formatDate(today.nextSession.value) : "Nie zapisano"
        })
      ])
    ]),
    create("section", { className: `priority-panel ${today.missing.length ? "attention" : ""}` }, [
      create("p", {
        className: "priority-kicker",
        text: today.missing.length ? "Brakuje przed decyzją" : "Bieżący punkt"
      }),
      create("h2", { text: priority?.label || "Brak nowego sygnału" }),
      create("p", {
        text: priority?.value || "System nie ma nowej informacji do pokazania. To nie zastępuje rozmowy z klientem."
      }),
      priority ? sourceLine(priority) : null
    ]),
    create("section", { className: "fact-grid", "aria-label": "Bieżący kontekst" }, [
      factCard(today.lastDecision, "Nie zapisano jeszcze decyzji trenera."),
      factCard(today.latestClientSignal, "Klient nie przekazał jeszcze sygnału."),
      factCard(today.nextStep, "Trener nie zapisał jeszcze następnego kroku.")
    ])
  ]);
}

function briefList(title, items, emptyText) {
  return create("section", { className: "brief-section" }, [
    create("h2", { text: title }),
    items.length
      ? create("div", { className: "brief-facts" }, items.map(item => factCard(item, "")))
      : create("div", { className: "honest-empty", text: emptyText })
  ]);
}

function briefView(summary) {
  const brief = summary.brief;
  return create("div", { className: "view-stack", "data-view": "brief" }, [
    screenHeading(
      "Przed spotkaniem",
      "Brief",
      "Fakty i luki z istniejących zapisów. Brief nie diagnozuje i nie wybiera pierwszego ruchu."
    ),
    create("section", { className: "change-panel" }, [
      create("p", { className: "priority-kicker", text: "Co zmieniło się od poprzedniej sesji" }),
      brief.changedSinceSession
        ? factCard(brief.changedSinceSession, "", "change-fact")
        : create("p", {
            className: "honest-empty",
            text: brief.lastSessionDate
              ? "Nie ma nowszego, zapisanego sygnału klienta."
              : "Brak poprzedniej sesji, więc system nie może wiarygodnie opisać zmiany."
          })
    ]),
    briefList("Co wiadomo", brief.known, "Brak zapisanych faktów do krótkiego briefu."),
    briefList("Czego nie wiadomo", brief.unknown, "Nie wykryto jawnych braków w używanych polach."),
    briefList(
      "Wcześniej zapisane do sprawdzenia",
      brief.thingToCheck ? [brief.thingToCheck] : [],
      "Brak osobnej notatki trenera w briefie przed sesją."
    ),
    create("p", {
      className: "method-note",
      text: "Trener nadaje znaczenie. System jedynie porządkuje zapisane fakty."
    })
  ]);
}

function sessionView(summary, model, onDirty) {
  const form = sessionForm(model.onSaveSession);
  form.addEventListener("input", onDirty);
  form.addEventListener("change", onDirty);
  return create("div", { className: "view-stack", "data-view": "session" }, [
    screenHeading(
      "Po pracy 1:1",
      "Sesja",
      "Neutralny zapis trenera. Żadna ocena, interpretacja ani decyzja nie jest wypełniona automatycznie."
    ),
    create("section", { className: "readonly-context", "aria-label": "Poprzedni sygnał tylko do odczytu" }, [
      create("div", {}, [
        create("p", { className: "priority-kicker", text: "Kontekst tylko do odczytu" }),
        create("h2", { text: "Poprzedni sygnał klienta" })
      ]),
      summary.previousSignal
        ? factCard(summary.previousSignal, "")
        : create("p", { className: "honest-empty", text: "Brak wcześniejszego sygnału klienta." }),
      create("p", {
        className: "source-line",
        text: "Ten sygnał nie zostanie skopiowany do nowej sesji."
      })
    ]),
    create("section", { className: "session-entry" }, [
      create("div", { className: "section-title" }, [
        create("p", { className: "eyebrow", text: "Jawny zapis" }),
        create("h2", { text: "Co chcesz zachować po sesji?" })
      ]),
      form
    ])
  ]);
}

export function renderTrainerView(model, onDirty) {
  if (!model.workspace) return null;
  const summary = buildTrainerWorkspace(model.workspace);
  if (model.activeView === "brief") return briefView(summary);
  if (model.activeView === "session") return sessionView(summary, model, onDirty);
  return todayView(model.workspace, summary);
}
