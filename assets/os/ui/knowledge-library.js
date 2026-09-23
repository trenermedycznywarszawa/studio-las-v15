import { button, create, panel, statusBox } from "./common.js";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .trim();
}

function searchableText(card) {
  return normalize([
    card.slk_id,
    card.title,
    card.author,
    card.source_name,
    card.category,
    ...(Array.isArray(card.tags) ? card.tags : []),
    card.summary,
    card.key_concepts,
    card.studio_usefulness,
    card.limitations
  ].filter(Boolean).join(" "));
}

function cardScore(card, query) {
  const q = normalize(query);
  const title = normalize(card.title);
  const tags = normalize((card.tags || []).join(" "));
  const category = normalize(card.category);
  let score = 0;
  if (title.includes(q)) score += 8;
  if (tags.includes(q)) score += 5;
  if (category.includes(q)) score += 4;
  if (searchableText(card).includes(q)) score += 1;
  return score;
}

export function searchKnowledgeCards(cards, query, limit = 8) {
  const q = normalize(query);
  if (q.length < 2) return [];
  return (Array.isArray(cards) ? cards : [])
    .map(card => ({ card, score: cardScore(card, q) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.card.slk_id.localeCompare(b.card.slk_id))
    .slice(0, limit)
    .map(item => item.card);
}

function reviewLabel(card) {
  if (card.review_state === "approved") return "Zatwierdzona";
  if (card.review_state === "rejected") return "Odrzucona";
  if (card.review_state === "superseded") return "Zastąpiona";
  if (card.review_state === "draft") return "Szkic";
  return "Do weryfikacji";
}

function knowledgeCard(card) {
  const sourceVersion = `${card.slk_id} · v${card.card_version} · SHA ${String(card.source_sha256).slice(0, 10)}…`;
  return create("article", { className: "knowledge-card" }, [
    create("div", { className: "knowledge-card-head" }, [
      create("div", {}, [
        create("p", { className: "eyebrow", text: `${card.category} · ${card.evidence_strength}` }),
        create("h3", { text: card.title })
      ]),
      create("span", {
        className: `knowledge-review ${card.review_state === "approved" ? "approved" : ""}`,
        text: reviewLabel(card)
      })
    ]),
    create("p", { className: "knowledge-source", text: `Źródło: ${card.source_name || "brak nazwy"}` }),
    create("p", { text: card.summary || "Brak streszczenia." }),
    create("div", { className: "knowledge-use" }, [
      create("strong", { text: "Możliwe użycie w Studio Las" }),
      create("p", { text: card.studio_usefulness || "Nie opisano." })
    ]),
    create("div", { className: "knowledge-limit" }, [
      create("strong", { text: "Ograniczenia" }),
      create("p", { text: card.limitations || "Brak opisanych ograniczeń nie oznacza ich braku." })
    ]),
    create("details", { className: "knowledge-details" }, [
      create("summary", { text: "Pokaż ocenę źródła i wersję" }),
      create("p", { text: card.source_assessment || "Brak oceny źródła." }),
      card.extraction_note ? create("p", { className: "muted", text: `Ekstrakcja: ${card.extraction_note}` }) : null,
      create("p", { className: "brief-source", text: sourceVersion })
    ])
  ]);
}

export function knowledgeLibraryPanel(model) {
  const cards = Array.isArray(model.knowledgeCards) ? model.knowledgeCards : [];
  const query = String(model.knowledgeQuery || "").trim();
  const form = create("form", { className: "knowledge-search" }, [
    create("label", { className: "field" }, [
      create("span", { text: "Czego szukasz przed decyzją?" }),
      create("input", {
        name: "knowledgeQuery",
        type: "search",
        value: query,
        minlength: 2,
        maxlength: 120,
        placeholder: "np. ból i obawa przed ruchem, powrót do biegania, cel 12 tygodni"
      })
    ]),
    create("div", { className: "form-actions" }, [
      button("Szukaj", { className: "button primary", type: "submit" }),
      query ? button("Wyczyść", { onclick: () => model.onKnowledgeQuery("") }) : null
    ])
  ]);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    model.onKnowledgeQuery(new FormData(form).get("knowledgeQuery"));
  });

  const body = create("div", { className: "knowledge-library" }, [
    create("p", {
      className: "brief-intro",
      text: "Materiały pomocnicze dla trenera. Karta nie jest diagnozą ani decyzją. Sprawdź źródło i ograniczenia, a własną interpretację zapisz osobno."
    }),
    form
  ]);

  if (model.knowledgeLoading) body.append(statusBox("Ładowanie biblioteki wiedzy…", "info"));
  else if (model.knowledgeError) {
    body.append(statusBox(model.knowledgeError, "error"));
    body.append(button("Spróbuj ponownie", { onclick: model.onReloadKnowledge }));
  } else if (!query) {
    body.append(create("p", {
      className: "muted",
      text: `Biblioteka zawiera ${cards.length} kart. Wpisz pytanie lub temat; wyniki pozostają wyłącznie w panelu trenera.`
    }));
  } else {
    const results = searchKnowledgeCards(cards, query);
    body.append(create("p", {
      className: "knowledge-result-count",
      text: results.length
        ? `Najtrafniejsze wyniki: ${results.length} z ${cards.length} kart.`
        : "Nie znaleziono karty dla tego tematu. Spróbuj krótszego albo ogólniejszego hasła."
    }));
    if (results.length) body.append(create("div", { className: "knowledge-results" }, results.map(knowledgeCard)));
  }

  return panel("Biblioteka wiedzy", body, "Tylko trener · źródła wymagają oceny");
}
