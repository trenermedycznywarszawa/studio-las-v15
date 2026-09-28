import { button, create, formatDate, statusBox } from "./common.js";

function ensureStyles() {
  const id = "studio-las-trainer-attention-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("../trainer-attention-runtime.css", import.meta.url).href;
  document.head.append(link);
}

function kindLabel(item) {
  if (item.level === "urgent-review") return "Pilny przegląd";
  if (item.kind === "contact") return "Niedomknięty kontakt";
  if (item.kind === "review") return "Przegląd";
  return "Nowy sygnał";
}

function attentionItem(item, onOpenClientContext) {
  return create("article", { className: `sl-attention-item ${item.kind} ${item.level}` }, [
    create("span", { className: "sl-attention-mark", "aria-hidden": "true" }),
    create("div", { className: "sl-attention-item-body" }, [
      create("div", { className: "sl-attention-client" }, [
        create("strong", { text: item.client }),
        create("span", { text: item.stage })
      ]),
      create("span", { className: "sl-attention-kind", text: kindLabel(item) }),
      create("p", { className: "sl-attention-reason", text: item.reason }),
      create("p", { className: "sl-attention-context", text: item.context }),
      create("p", { className: "sl-attention-question", text: `Pytanie dla trenera: ${item.question}` }),
      create("p", { className: "sl-attention-source", text: `Źródło: ${item.source}` })
    ]),
    button("Otwórz kontekst", {
      className: "sl-attention-open",
      onclick: () => onOpenClientContext(item.clientId)
    })
  ]);
}

function reviewSoonItem(item, onOpenClientContext) {
  const row = create("div", { className: "sl-attention-review-row" }, [
    create("div", {}, [
      create("strong", { text: item.client }),
      create("span", { text: item.stage })
    ]),
    create("span", { text: `${formatDate(item.date)} · za ${item.days} dni` })
  ]);
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.addEventListener("click", () => onOpenClientContext(item.clientId));
  row.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenClientContext(item.clientId);
    }
  });
  return row;
}

function quietDetails(model, onOpenClientContext) {
  return create("details", { className: "sl-attention-quiet-details" }, [
    create("summary", { text: `${model.quiet.length} klientów bez otwartego wyjątku` }),
    create("p", {
      text: "Brak otwartego wyjątku nie znaczy, że wszystko jest dobrze. Oznacza tylko, że system nie ma obecnie zapisanego faktu wymagającego przeglądu."
    }),
    create("div", { className: "sl-attention-quiet-list" }, model.quiet.map(item => {
      const row = create("button", {
        className: "sl-attention-quiet-row sl-attention-quiet-button",
        type: "button",
        onclick: () => onOpenClientContext(item.clientId)
      }, [
        create("span", { text: item.client }),
        create("span", { text: item.meta })
      ]);
      return row;
    }))
  ]);
}

export function trainerAttentionView(model, {
  onOpenClientContext,
  onReload
} = {}) {
  ensureStyles();
  if (!model) return statusBox("Nie udało się wczytać Uwaga trenera.", "error");
  if (typeof onOpenClientContext !== "function") {
    throw new TypeError("Trainer Attention UI: onOpenClientContext is required");
  }

  return create("div", { className: "sl-attention-page sl-attention-runtime" }, [
    create("header", { className: "sl-attention-head" }, [
      create("div", {}, [
        create("p", { className: "sl-attention-eyebrow", text: "Uwaga trenera · wersja testowa" }),
        create("h1", { text: "Kto dziś wymaga Twojej uwagi?" }),
        create("p", {
          text: "Najpierw wyjątki i niedomknięte sprawy. Pełny proces klienta otwierasz dopiero wtedy, gdy jest potrzebny do decyzji."
        })
      ]),
      create("div", { className: "sl-attention-runtime-head-actions" }, [
        create("span", { className: "sl-attention-date", text: formatDate(model.today) }),
        typeof onReload === "function" ? button("Odśwież uwagę", { onclick: onReload }) : null
      ])
    ]),
    create("section", { className: "sl-attention-overview", "aria-label": "Dzisiejsza uwaga" }, [
      create("div", {}, [
        create("span", { text: "Na dziś" }),
        create("strong", {
          text: `${model.counts.situations} ${model.counts.situations === 1 ? "sprawa" : "spraw"} · ${model.counts.clients} ${model.counts.clients === 1 ? "klient" : "klientów"}`
        }),
        create("p", { text: "To nie jest ranking klientów. To kolejka faktów, które czekają na ocenę człowieka." })
      ]),
      create("div", { className: "sl-attention-overview-meta" }, [
        model.counts.contacts ? create("span", { text: `Kontakt ${model.counts.contacts}` }) : null,
        model.counts.signals ? create("span", { text: `Sygnały ${model.counts.signals}` }) : null,
        model.counts.reviews ? create("span", { text: `Przeglądy ${model.counts.reviews}` }) : null
      ])
    ]),
    create("div", { className: "sl-attention-grid" }, [
      create("section", { className: "sl-attention-panel" }, [
        create("div", { className: "sl-attention-panel-head" }, [
          create("div", {}, [
            create("h2", { text: "Do przejrzenia" }),
            create("p", { text: "Powód → źródło → pytanie dla trenera" })
          ]),
          create("span", { text: "bez automatycznej interpretacji" })
        ]),
        model.attention.length
          ? create("div", { className: "sl-attention-list" }, model.attention.map(item => attentionItem(item, onOpenClientContext)))
          : create("div", { className: "sl-attention-empty" }, [
              create("strong", { text: "Brak zapisanych wyjątków wymagających przeglądu." }),
              create("p", { text: "To jest stan kolejki, nie ocena zdrowia ani bezpieczeństwa klienta." })
            ])
      ]),
      create("aside", { className: "sl-attention-side" }, [
        create("section", { className: "sl-attention-panel sl-attention-side-panel" }, [
          create("h3", { text: "Nadchodzące przeglądy" }),
          model.reviewSoon.length
            ? create("div", { className: "sl-attention-review-list" }, model.reviewSoon.map(item => reviewSoonItem(item, onOpenClientContext)))
            : create("p", { text: "Brak zaplanowanych przeglądów w najbliższych siedmiu dniach." })
        ]),
        create("section", { className: "sl-attention-panel sl-attention-side-panel" }, [quietDetails(model, onOpenClientContext)]),
        create("section", { className: "sl-attention-panel sl-attention-side-panel" }, [
          create("h3", { text: "Granica odpowiedzialności" }),
          create("p", { text: model.disclaimer }),
          create("strong", { className: "sl-attention-principle", text: "System kieruje uwagę. Trener nadaje znaczenie." })
        ])
      ])
    ]),
    create("p", { className: "sl-attention-footnote", text: "Uwaga trenera · wersja testowa · dane tylko do odczytu" })
  ]);
}
