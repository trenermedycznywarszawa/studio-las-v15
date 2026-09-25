const attention = [
  {
    client: "Anna K.",
    stage: "Prowadzenie · tydzień 6",
    level: "urgent",
    reason: "Kontakt nadal wymaga potwierdzenia",
    context: "Wcześniejszy przegląd sygnału zakończył się decyzją „kontakt wymagany”. Nie zapisano jeszcze, co ustalono po rozmowie.",
    question: "Co ustalono po kontakcie i czy zmienia to najbliższe prowadzenie?",
    source: "Przegląd sygnału · 24.09.2026"
  },
  {
    client: "Marek P.",
    stage: "Prowadzenie · tydzień 4",
    level: "pending",
    reason: "Nowa odpowiedź klienta do przeglądu",
    context: "Klient zapisał po zadaniu: „kolano spokojne w trakcie, wieczorem lekko sztywniejsze”.",
    question: "Czy ta informacja zmienia następne ustalenie?",
    source: "Odpowiedź klienta · 25.09.2026"
  },
  {
    client: "Ewa S.",
    stage: "Review",
    level: "review",
    reason: "Punkt Review przypada dziś",
    context: "W kalendarzu procesu zapisano dzisiejszą datę Review. System nie ocenia wyniku procesu.",
    question: "Jaka jest decyzja co dalej na podstawie całego kontekstu?",
    source: "Karta klienta · next_review_date · 25.09.2026"
  }
];

const quiet = [
  ["Piotr R.", "następna sesja 27.09"],
  ["Kasia W.", "brak otwartych sygnałów"],
  ["Tomasz L.", "następne Review 03.10"]
];

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

function attentionItem(item) {
  return el("article", { className: `sl-attention-item ${item.level}` }, [
    el("span", { className: "sl-attention-mark", "aria-hidden": "true" }),
    el("div", {}, [
      el("div", { className: "sl-attention-client" }, [
        el("strong", { text: item.client }),
        el("span", { text: item.stage })
      ]),
      el("p", { className: "sl-attention-reason", text: item.reason }),
      el("p", { className: "sl-attention-context", text: item.context }),
      el("p", { className: "sl-attention-question", text: `Pytanie dla trenera: ${item.question}` }),
      el("p", { className: "sl-attention-source", text: `Źródło: ${item.source}` })
    ]),
    el("button", { className: "sl-attention-open", type: "button", text: "Otwórz klienta" })
  ]);
}

function summaryCard(label, value, primary = false) {
  return el("article", { className: `sl-attention-summary-card${primary ? " primary" : ""}` }, [
    el("span", { text: label }),
    el("strong", { text: value })
  ]);
}

const root = document.getElementById("app");
root.append(
  el("div", { className: "sl-attention-shell" }, [
    el("aside", { className: "sl-attention-rail" }, [
      el("div", { className: "sl-attention-brand", text: "Studio Las" }, [
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
          el("h1", { text: "Kto wymaga uwagi?" }),
          el("p", { text: "Najpierw wyjątki i niedomknięte decyzje. Pełny kontekst klienta otwierasz dopiero wtedy, gdy jest potrzebny." })
        ]),
        el("span", { className: "sl-attention-date", text: "25 września 2026" })
      ]),
      el("section", { className: "sl-attention-summary", "aria-label": "Podsumowanie uwagi" }, [
        summaryCard("Najważniejsze teraz", "3 sytuacje wymagają spojrzenia trenera", true),
        summaryCard("Kontakt", "1"),
        summaryCard("Nowe sygnały", "1"),
        summaryCard("Review", "1")
      ]),
      el("div", { className: "sl-attention-grid" }, [
        el("section", { className: "sl-attention-panel" }, [
          el("div", { className: "sl-attention-panel-head" }, [
            el("h2", { text: "Wymaga spojrzenia" }),
            el("span", { text: "źródło + data + pytanie dla trenera" })
          ]),
          el("div", { className: "sl-attention-list" }, attention.map(attentionItem))
        ]),
        el("aside", { className: "sl-attention-side" }, [
          el("section", { className: "sl-attention-panel" }, [
            el("h3", { text: "Reszta może poczekać" }),
            el("p", { text: "Brak otwartego sygnału nie oznacza, że „wszystko jest dobrze”. Oznacza tylko, że system nie ma obecnie zapisanego wyjątku do przeglądu." }),
            el("div", { className: "sl-attention-quiet-list" }, quiet.map(([name, meta]) =>
              el("div", { className: "sl-attention-quiet-row" }, [el("span", { text: name }), el("span", { text: meta })])
            ))
          ]),
          el("section", { className: "sl-attention-panel" }, [
            el("h3", { text: "Granica odpowiedzialności" }),
            el("p", { text: "System może wskazać fakt wymagający przeglądu. Nie diagnozuje, nie interpretuje wyniku i nie wybiera zmiany planu. Decyzję zapisuje trener." })
          ])
        ])
      ]),
      el("p", { className: "sl-attention-footnote", text: "Trainer Attention Lab v1 · syntetyczne dane · żadnego dostępu do danych klientów" })
    ])
  ])
);
