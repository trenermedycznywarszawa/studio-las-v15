import { LAB_DATE, LAB_SCENARIOS, buildLabModel, createLabState, reviewLabSignal } from "./trainer-attention-lab-state.js";

export const trainerAttentionLabSnapshot = createLabState().snapshot;
export const trainerAttentionLabModel = buildLabModel(createLabState());
const outcomeLabels = {
  noted_no_change: "Przejrzane · bez zmiany", contact_required: "Potrzebny kontakt", contact_resolved: "Kontakt zakończony"
};
const formatDate = value => new Intl.DateTimeFormat("pl-PL", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
}).format(new Date(`${value}T12:00:00Z`));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "onclick") node.addEventListener("click", value);
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}
const control = (text, onclick, attrs = {}) => el("button", {
  type: "button", className: "sl-attention-open", text, onclick, ...attrs
});

export function renderTrainerAttentionLab(root = document.getElementById("app")) {
  if (!root) throw new Error("Trainer Attention Lab: missing #app root");
  let state = createLabState();
  let selectedClient = null;
  let activeTab = "attention";
  let notice = "";

  function openClient(clientId) { selectedClient = clientId; draw("context"); }
  function review(item, outcome) {
    state = reviewLabSignal(state, item.signalKey, outcome);
    notice = `${item.client}: ${outcomeLabels[outcome].toLowerCase()}.`;
    draw("context");
  }
  function attentionItem(item) {
    return el("article", { className: `sl-attention-item ${item.kind} ${item.level}` }, [
      el("span", { className: "sl-attention-mark", "aria-hidden": "true" }),
      el("div", { className: "sl-attention-item-body" }, [
        el("div", { className: "sl-attention-client" }, [el("strong", { text: item.client }), el("span", { text: item.stage })]),
        el("span", { className: "sl-attention-kind", text: item.kind === "contact" ? "Kontakt do domknięcia" : "Nowe zdarzenie" }),
        el("p", { className: "sl-attention-reason", text: item.reason }),
        el("p", { className: "sl-attention-context", text: item.context }),
        el("p", { className: "sl-attention-source", text: item.source })
      ]),
      control("Otwórz kontekst", () => openClient(item.clientId), { "aria-label": `Otwórz kontekst: ${item.client}` })
    ]);
  }
  function historyRows(entries) {
    return entries.length ? el("ol", { className: "sl-lab-history" }, [...entries].reverse().map(entry => el("li", {}, [
      el("strong", { text: entry.client }), el("p", { text: outcomeLabels[entry.outcome] }),
      el("small", { text: `${formatDate(entry.date)} · ${entry.source}` }),
      el("p", { className: "sl-lab-history-context", text: entry.context })
    ]))) : el("p", { className: "sl-lab-muted", text: "Historia pojawi się po przejrzeniu zdarzenia." });
  }
  function contextPanel(model) {
    if (!selectedClient) return el("section", { className: "sl-attention-panel sl-attention-side-panel" }, [
      el("h3", { text: "Kontekst klienta" }), el("p", { text: "Otwórz zdarzenie, aby zobaczyć zapis i zdecydować, czy potrzebny jest kontakt." })
    ]);
    const client = state.snapshot.clients.find(row => row.id === selectedClient);
    const items = model.attention.filter(row => row.clientId === selectedClient);
    const sessions = state.snapshot.sessions.filter(row => row.client_id === selectedClient);
    const response = state.snapshot.guidanceEvents.find(row => row.client_id === selectedClient);
    const history = state.history.filter(row => row.clientId === selectedClient);
    return el("section", { className: "sl-attention-panel sl-attention-side-panel sl-lab-context", id: "lab-context", tabindex: "-1" }, [
      el("div", { className: "sl-lab-context-head" }, [el("h3", { text: client.name }), control("Zamknij", () => {
        selectedClient = null; draw("heading");
      }, { "aria-label": "Zamknij kontekst klienta" })]),
      el("p", { className: "sl-lab-muted", text: "Prowadzenie · dane przykładowe" }),
      response ? el("blockquote", { text: response.note }) : null,
      ...sessions.map(session => el("div", { className: "sl-lab-fact" }, [
        el("strong", { text: `Sesja · ${formatDate(session.date)}` }),
        el("p", { text: `Dolegliwości przed: ${session.vas_before}/10 · po: ${session.vas_after}/10` })
      ])),
      ...items.map(item => el("div", { className: "sl-lab-decision" }, [
        el("p", { text: item.question }), el("small", { text: `Źródło: ${item.source}` }),
        el("div", { className: "sl-lab-actions" }, item.kind === "contact"
          ? [control("Kontakt zakończony", () => review(item, "contact_resolved"), { className: "sl-attention-open sl-lab-primary" })]
          : [control("Przejrzane · bez zmiany", () => review(item, "noted_no_change")),
             control("Potrzebny kontakt", () => review(item, "contact_required"), { className: "sl-attention-open sl-lab-primary" })])
      ])),
      !items.length ? el("p", { text: "Brak otwartych spraw tego klienta." }) : null,
      history.length ? el("div", {}, [el("h4", { text: "Historia sprawy" }), historyRows(history)]) : null
    ]);
  }
  function mainPanel(model) {
    if (activeTab === "history") return el("section", { className: "sl-attention-panel sl-lab-content" }, [el("h2", { text: "Historia" }), historyRows(state.history)]);
    if (activeTab === "clients") return el("section", { className: "sl-attention-panel sl-lab-content" }, [
      el("h2", { text: "Klienci" }), el("div", { className: "sl-lab-clients" }, state.snapshot.clients.map(client =>
        control(client.name, () => openClient(client.id), { className: "sl-lab-client-button" })))
    ]);
    return el("section", { className: "sl-attention-panel" }, [
      el("div", { className: "sl-attention-panel-head" }, [el("div", {}, [el("h2", { text: "Do przejrzenia" }), el("p", { text: "Zdarzenie i jego źródło" })])]),
      model.attention.length ? el("div", { className: "sl-attention-list" }, model.attention.map(attentionItem))
        : el("div", { className: "sl-attention-empty sl-lab-empty" }, [
            el("span", { className: "sl-lab-empty-symbol", "aria-hidden": "true", text: "—" }),
            el("h3", { text: "Brak spraw do przejrzenia." }), el("p", { text: "Nowe zdarzenia i odpowiedzi klienta pojawią się tutaj." })])
    ]);
  }
  function draw(focus) {
    const model = buildLabModel(state);
    root.replaceChildren(el("div", { className: "sl-attention-shell" }, [
      el("aside", { className: "sl-attention-rail" }, [
        el("div", { className: "sl-attention-brand", text: "Studio Las" }, [el("small", { text: "Panel trenera" })]),
        el("nav", { className: "sl-attention-nav", "aria-label": "Panel trenera" }, [
          ["attention", "Do przejrzenia"], ["clients", "Klienci"], ["history", "Historia"]
        ].map(([id, label]) => control(label, () => { activeTab = id; draw(`tab-${id}`); }, {
          id: `lab-tab-${id}`, className: activeTab === id ? "active" : "", "aria-current": activeTab === id ? "page" : "false"
        }))),
        el("p", { className: "sl-attention-rail-note", text: "Podgląd na fikcyjnych danych. Wybierz przykład, aby zobaczyć obsługę zdarzenia." })
      ]),
      el("main", { className: "sl-attention-page" }, [
        el("div", { className: "sl-lab-preview-label", text: "Podgląd · fikcyjni klienci" }),
        el("header", { className: "sl-attention-head" }, [el("div", {}, [
          el("p", { className: "sl-attention-eyebrow", text: "Uwaga trenera" }),
          el("h1", { id: "lab-heading", tabindex: "-1", text: "Sprawy, które potrzebują uwagi." }),
          el("p", { text: "Pytanie klienta, nowe zdarzenie lub otwarty kontakt — z kontekstem potrzebnym do decyzji." })
        ]), el("span", { className: "sl-attention-date", text: formatDate(LAB_DATE) })]),
        el("section", { className: "sl-lab-scenarios", "aria-label": "Przykłady do sprawdzenia" }, [
          el("p", { text: "Zobacz przykład · zmiana przykładu resetuje historię podglądu" }),
          el("div", {}, LAB_SCENARIOS.map(scenario => control(scenario.label, () => {
            state = createLabState(scenario.id); selectedClient = null; activeTab = "attention"; notice = ""; draw(`scenario-${scenario.id}`);
          }, { id: `lab-scenario-${scenario.id}`, "aria-pressed": String(state.scenario === scenario.id),
            className: `sl-attention-open${state.scenario === scenario.id ? " sl-lab-primary" : ""}` })))
        ]),
        el("section", { className: "sl-attention-overview", "aria-label": "Otwarte sprawy" }, [el("div", {}, [
          el("span", { text: "Do przejrzenia" }),
          el("strong", { id: "lab-count", text: `${model.counts.situations} ${model.counts.situations === 1 ? "sprawa" : "spraw"}` }),
          el("p", { text: model.counts.contacts ? "Kontakt pozostaje otwarty do potwierdzenia zakończenia." : "Kolejka zapisanych zdarzeń." })
        ]), model.counts.contacts ? el("div", { className: "sl-attention-overview-meta" }, [el("span", { text: `Otwarty kontakt: ${model.counts.contacts}` })]) : null]),
        el("p", { className: "sl-lab-notice", role: "status", "aria-live": "polite", text: notice }),
        el("div", { className: "sl-attention-grid" }, [mainPanel(model), el("aside", { className: "sl-attention-side" }, [contextPanel(model)])]),
        el("p", { className: "sl-attention-footnote", text: "Działania w tym podglądzie dotyczą wyłącznie danych przykładowych. Odświeżenie strony rozpoczyna podgląd od nowa." })
      ])
    ]));
    if (focus) document.getElementById(focus === "context" ? "lab-context" : `lab-${focus}`)?.focus();
  }
  draw();
}

if (typeof document !== "undefined") renderTrainerAttentionLab();
