import { signalInstanceKey } from "../assets/os/decision-support.js";
import { buildTrainerAttentionModel } from "../assets/os/trainer-attention-model.js";

const annaSignalKey = signalInstanceKey({
  id: "client-observation",
  source: "client-response",
  sourceDate: "2026-09-24",
  sourceId: "evt-anna-1",
  sourceRevision: "2026-09-24T18:00:00Z"
});

export const trainerAttentionLabSnapshot = {
  clients: [
    { id: "anna", name: "Anna K.", status: "active", stage: 6, stage_label: "Prowadzenie · tydzień 6", next_session_date: "2026-09-26", next_review_date: "2026-10-18" },
    { id: "marek", name: "Marek P.", status: "active", stage: 4, stage_label: "Prowadzenie · tydzień 4", next_session_date: "2026-09-27", next_review_date: "2026-10-30" },
    { id: "ewa", name: "Ewa S.", status: "active", stage: null, stage_label: "Review", next_session_date: null, next_review_date: "2026-09-25" },
    { id: "piotr", name: "Piotr R.", status: "active", stage: 2, stage_label: "Prowadzenie · tydzień 2", next_session_date: "2026-09-27", next_review_date: "2026-11-05" },
    { id: "kasia", name: "Kasia W.", status: "active", stage: 8, stage_label: "Prowadzenie · tydzień 8", next_session_date: "2026-09-29", next_review_date: "2026-10-15" },
    { id: "tomasz", name: "Tomasz L.", status: "active", stage: 10, stage_label: "Prowadzenie · tydzień 10", next_session_date: "2026-09-28", next_review_date: "2026-10-01" }
  ],
  sessions: [],
  trainingLoad: [],
  preSessionChecks: [],
  guidanceEvents: [
    {
      id: "evt-anna-1",
      client_id: "anna",
      event_date: "2026-09-24",
      note: "Po zadaniu pojawiła się informacja, którą trener oznaczył do kontaktu.",
      created_at: "2026-09-24T18:00:00Z"
    },
    {
      id: "evt-marek-1",
      client_id: "marek",
      event_date: "2026-09-25",
      note: "Kolano spokojne w trakcie, wieczorem lekko sztywniejsze.",
      created_at: "2026-09-25T07:40:00Z"
    }
  ],
  signalReviews: [
    {
      id: "review-anna-1",
      client_id: "anna",
      signal_key: annaSignalKey,
      outcome: "contact_required",
      contact_resolved_at: null
    }
  ]
};

export const trainerAttentionLabModel = buildTrainerAttentionModel(
  trainerAttentionLabSnapshot,
  { today: "2026-09-25", reviewSoonDays: 7 }
);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function kindLabel(item) {
  if (item.level === "urgent-review") return "Pilny przegląd";
  if (item.kind === "contact") return "Niedomknięty kontakt";
  if (item.kind === "review") return "Review";
  return "Nowy sygnał";
}

function attentionItem(item) {
  return el("article", { className: `sl-attention-item ${item.kind} ${item.level}` }, [
    el("span", { className: "sl-attention-mark", "aria-hidden": "true" }),
    el("div", { className: "sl-attention-item-body" }, [
      el("div", { className: "sl-attention-client" }, [
        el("strong", { text: item.client }),
        el("span", { text: item.stage })
      ]),
      el("span", { className: "sl-attention-kind", text: kindLabel(item) }),
      el("p", { className: "sl-attention-reason", text: item.reason }),
      el("p", { className: "sl-attention-context", text: item.context }),
      el("p", { className: "sl-attention-question", text: `Pytanie dla trenera: ${item.question}` }),
      el("p", { className: "sl-attention-source", text: `Źródło: ${item.source}` })
    ]),
    el("button", { className: "sl-attention-open", type: "button", text: "Otwórz kontekst" })
  ]);
}

function reviewSoonItem(item) {
  return el("div", { className: "sl-attention-review-row" }, [
    el("div", {}, [
      el("strong", { text: item.client }),
      el("span", { text: item.stage })
    ]),
    el("span", { text: `${item.date} · za ${item.days} dni` })
  ]);
}

function quietDetails(model) {
  return el("details", { className: "sl-attention-quiet-details" }, [
    el("summary", { text: `${model.quiet.length} klientów bez otwartego wyjątku` }),
    el("p", { text: "Brak otwartego wyjątku nie znaczy, że „wszystko jest dobrze”. Oznacza tylko, że system nie ma obecnie zapisanego faktu wymagającego przeglądu." }),
    el("div", { className: "sl-attention-quiet-list" }, model.quiet.map(item =>
      el("div", { className: "sl-attention-quiet-row" }, [
        el("span", { text: item.client }),
        el("span", { text: item.meta })
      ])
    ))
  ]);
}

export function renderTrainerAttentionLab(root = document.getElementById("app")) {
  if (!root) throw new Error("Trainer Attention Lab: missing #app root");
  const model = trainerAttentionLabModel;
  root.append(
    el("div", { className: "sl-attention-shell" }, [
      el("aside", { className: "sl-attention-rail" }, [
        el("div", { className: "sl-attention-brand" }, [
          document.createTextNode("Studio Las"),
          el("small", { text: "Panel trenera · lab" })
        ]),
        el("nav", { className: "sl-attention-nav", "aria-label": "Makieta nawigacji" }, [
          el("span", { className: "active", text: "Uwaga" }),
          el("span", { text: "Klienci" }),
          el("span", { text: "Proces" }),
          el("span", { text: "Raporty" })
        ]),
        el("p", { className: "sl-attention-rail-note", text: "Syntetyczny prototyp. Zero połączenia z Supabase, zero zapisów, zero automatycznych decyzji." })
      ]),
      el("main", { className: "sl-attention-page" }, [
        el("header", { className: "sl-attention-head" }, [
          el("div", {}, [
            el("p", { className: "sl-attention-eyebrow", text: "Uwaga trenera" }),
            el("h1", { text: "Kto dziś wymaga Twojej uwagi?" }),
            el("p", { text: "Najpierw wyjątki i niedomknięte sprawy. Pełny proces klienta otwierasz dopiero wtedy, gdy jest potrzebny do decyzji." })
          ]),
          el("span", { className: "sl-attention-date", text: "25 września 2026" })
        ]),
        el("section", { className: "sl-attention-overview", "aria-label": "Dzisiejsza uwaga" }, [
          el("div", {}, [
            el("span", { text: "Na dziś" }),
            el("strong", { text: `${model.counts.situations} sprawy · ${model.counts.clients} klientów` }),
            el("p", { text: "To nie jest ranking klientów. To kolejka faktów, które czekają na ocenę człowieka." })
          ]),
          el("div", { className: "sl-attention-overview-meta" }, [
            model.counts.contacts ? el("span", { text: `Kontakt ${model.counts.contacts}` }) : null,
            model.counts.signals ? el("span", { text: `Nowe sygnały ${model.counts.signals}` }) : null,
            model.counts.reviews ? el("span", { text: `Review ${model.counts.reviews}` }) : null
          ])
        ]),
        el("div", { className: "sl-attention-grid" }, [
          el("section", { className: "sl-attention-panel" }, [
            el("div", { className: "sl-attention-panel-head" }, [
              el("div", {}, [
                el("h2", { text: "Do przejrzenia" }),
                el("p", { text: "Powód → źródło → pytanie dla trenera" })
              ]),
              el("span", { text: "bez automatycznej interpretacji" })
            ]),
            model.attention.length
              ? el("div", { className: "sl-attention-list" }, model.attention.map(attentionItem))
              : el("p", { className: "sl-attention-empty", text: "Brak zapisanych wyjątków wymagających przeglądu." })
          ]),
          el("aside", { className: "sl-attention-side" }, [
            el("section", { className: "sl-attention-panel sl-attention-side-panel" }, [
              el("h3", { text: "Nadchodzące Review" }),
              model.reviewSoon.length
                ? el("div", { className: "sl-attention-review-list" }, model.reviewSoon.map(reviewSoonItem))
                : el("p", { text: "Brak Review w najbliższych 7 dniach." })
            ]),
            el("section", { className: "sl-attention-panel sl-attention-side-panel" }, [quietDetails(model)]),
            el("section", { className: "sl-attention-panel sl-attention-side-panel" }, [
              el("h3", { text: "Granica odpowiedzialności" }),
              el("p", { text: model.disclaimer }),
              el("strong", { className: "sl-attention-principle", text: "System kieruje uwagę. Trener nadaje znaczenie." })
            ])
          ])
        ]),
        el("p", { className: "sl-attention-footnote", text: "Trainer Attention Lab v1 · syntetyczne dane · żadnego dostępu do danych klientów" })
      ])
    ])
  );
}

if (typeof document !== "undefined") renderTrainerAttentionLab();
