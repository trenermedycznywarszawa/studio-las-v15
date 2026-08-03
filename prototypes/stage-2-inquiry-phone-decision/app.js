import { FICTIONAL_NOTICE, fixtures } from "./fixtures.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const sectionDefinitions = [
  { key: "facts", title: "Co wiemy", wide: false },
  { key: "gaps", title: "Czego nie wiemy", wide: false },
  { key: "conflicts", title: "Co jest sprzeczne lub niejasne", wide: false },
  { key: "goal", title: "Cel rozmowy", wide: false },
  { key: "questions", title: "Proponowane pytania", wide: true },
  { key: "caution", title: "Tematy wymagające ostrożności", wide: false },
  { key: "outline", title: "Proponowany przebieg rozmowy", wide: false }
];

const noteLabels = {
  client_statement: "Wypowiedź klienta",
  trainer_observation: "Obserwacja Damiana",
  trainer_interpretation: "Interpretacja Damiana"
};

const state = {
  currentStep: "source",
  source: null,
  fixture: null,
  preparationMode: null,
  preparation: [],
  callStarted: false,
  questionStates: new Map(),
  notes: [],
  clientReaction: "",
  decision: null,
  draft: null,
  audit: []
};

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowLabel() {
  return new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function addAudit(eventType, outcome = "ok") {
  state.audit.push({ id: makeId("audit"), eventType, outcome, time: nowLabel() });
  renderAudit();
}

function setMessage(element, text, visible = true) {
  element.textContent = text;
  element.hidden = !visible;
}

function clearMessage(element) {
  setMessage(element, "", false);
}

function updateFixtureDescription() {
  const fixture = fixtures.find(item => item.id === $("#fixture-select").value);
  $("#fixture-description").textContent = fixture
    ? `${fixture.testPurpose} ${FICTIONAL_NOTICE}`
    : "Każdy przypadek jest jawnie fikcyjny i ma odrębny cel testowy.";
}

function captureSource({ text, label, fixture = null, partial = false }) {
  state.source = {
    id: makeId("INQ-FIC"),
    text: text.trim(),
    label,
    version: "S1-v1",
    capturedAt: new Date().toISOString(),
    partial
  };
  state.fixture = fixture;
  state.preparationMode = null;
  state.preparation = [];
  state.callStarted = false;
  state.questionStates.clear();
  state.notes = [];
  state.clientReaction = "";
  state.decision = null;
  state.draft = null;
  state.audit = [];

  addAudit("source_version_created", partial ? "warning_partial" : "ok");
  if (fixture?.crossClientAttempt) addAudit("cross_client_request_denied", "denied_no_disclosure");
  if (fixture?.blockedAutomaticQualification) addAudit("automatic_qualification_attempt_blocked", "denied");

  renderSource();
  unlockStep("prepare", false);
  showStep("source");
}

function renderSource() {
  const preview = $("#source-preview");
  if (!state.source) {
    preview.hidden = true;
    return;
  }

  preview.hidden = false;
  $("#source-text").textContent = state.source.text;
  const metadata = [
    ["ID", state.source.id],
    ["Źródło", state.source.label],
    ["Wersja", state.source.version],
    ["Czas", new Date(state.source.capturedAt).toLocaleString("pl-PL")]
  ];
  $("#source-metadata").replaceChildren(...metadata.map(([term, value]) => {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    wrapper.append(dt, dd);
    return wrapper;
  }));

  const warning = $("#source-warning");
  if (state.source.partial) {
    setMessage(warning, "Źródło jest częściowe lub ucięte. Nie traktuj przygotowania jako kompletnego i nie interpretuj braków jako odpowiedzi negatywnych.");
  } else if (state.fixture?.crossClientAttempt) {
    setMessage(warning, "Żądanie danych innej osoby zostało zablokowane bez ujawnienia, czy takie dane istnieją. Proces może używać wyłącznie bieżącego fikcyjnego źródła.");
  } else if (state.fixture?.blockedAutomaticQualification) {
    setMessage(warning, "Próba automatycznej kwalifikacji została zablokowana. Decyzję może zapisać wyłącznie Damian po rozmowie.");
  } else {
    clearMessage(warning);
  }

  const assisted = $("#start-assisted");
  assisted.disabled = state.fixture?.aiAvailable === false;
  assisted.textContent = state.fixture?.aiAvailable === false
    ? "Fikcyjne AI niedostępne — użyj trybu ręcznego"
    : "Przygotuj na fikcyjnych sugestiach";
}

function createPreparationItem(section, content, index, options = {}) {
  const defaultTypes = {
    facts: "extracted_fact",
    gaps: "preparation_gap",
    conflicts: "ai_hypothesis",
    goal: "ai_suggestion",
    questions: "ai_suggestion",
    caution: "ai_suggestion",
    outline: "ai_suggestion"
  };
  return {
    id: makeId(`prep-${section}-${index}`),
    section,
    content,
    originalContent: content,
    informationType: options.informationType || defaultTypes[section],
    author: options.author || "fictional_ai",
    locator: options.locator || `${state.source.version}:whole-source`,
    derivedFrom: state.source.version,
    reviewState: "needs_review",
    flagged: Boolean(options.flagged)
  };
}

function buildAssistedPreparation() {
  const fixture = state.fixture;
  if (!fixture || fixture.aiAvailable === false) return buildManualPreparation();

  const items = [];
  fixture.facts.forEach(([content, locator], index) => {
    items.push(createPreparationItem("facts", content, index, { locator }));
  });
  fixture.gaps.forEach((content, index) => items.push(createPreparationItem("gaps", content, index)));
  fixture.conflicts.forEach((content, index) => items.push(createPreparationItem("conflicts", content, index)));
  if (fixture.goal) items.push(createPreparationItem("goal", fixture.goal, 0));
  fixture.questions.forEach((content, index) => items.push(createPreparationItem("questions", content, index, {
    flagged: fixture.inappropriateQuestionIndexes?.includes(index)
  })));
  fixture.caution.forEach((content, index) => items.push(createPreparationItem("caution", content, index)));
  fixture.outline.forEach((content, index) => items.push(createPreparationItem("outline", content, index)));
  return items;
}

function buildManualPreparation() {
  const manualTemplates = {
    facts: ["Wpisz ręcznie fakt wynikający ze źródła i sprawdź lokalizator."],
    gaps: ["Wpisz ręcznie informację, której brakuje."],
    conflicts: ["Wpisz sprzeczność lub niejasność albo usuń ten element."],
    goal: ["Wpisz własny cel pierwszej rozmowy."],
    questions: [
      "Uzupełnij pytanie ręczne 1.",
      "Uzupełnij pytanie ręczne 2.",
      "Uzupełnij pytanie ręczne 3.",
      "Uzupełnij pytanie ręczne 4.",
      "Uzupełnij pytanie ręczne 5."
    ],
    caution: ["Wpisz ręcznie temat wymagający ostrożności."],
    outline: ["Wpisz ręcznie otwarcie, prowadzenie lub zamknięcie rozmowy."]
  };
  return Object.entries(manualTemplates).flatMap(([section, values]) => values.map((content, index) =>
    createPreparationItem(section, content, index, {
      author: "damian",
      informationType: section === "facts" ? "extracted_fact" : "trainer_preparation"
    })
  ));
}

function startPreparation(mode) {
  if (!state.source) {
    setMessage($("#source-error"), "Najpierw wybierz lub zapisz fikcyjne źródło.");
    return;
  }
  clearMessage($("#source-error"));
  state.preparationMode = mode === "assisted" && state.fixture?.aiAvailable !== false ? "fictional_assisted" : "manual_fallback";
  state.preparation = state.preparationMode === "fictional_assisted"
    ? buildAssistedPreparation()
    : buildManualPreparation();
  addAudit("preparation_started", state.preparationMode);
  unlockStep("prepare", true);
  renderPreparation();
  showStep("prepare");
}

function authorLabel(author) {
  return {
    fictional_ai: "fikcyjne AI",
    source: "źródło",
    damian: "Damian"
  }[author] || author;
}

function buildMetaTag(text) {
  const tag = document.createElement("span");
  tag.className = "meta-tag";
  tag.textContent = text;
  return tag;
}

function renderPreparationItem(item) {
  const article = document.createElement("article");
  article.className = `prep-item${item.reviewState === "rejected" ? " is-rejected" : ""}`;
  article.dataset.author = item.author;
  article.dataset.informationType = item.informationType;
  article.dataset.reviewState = item.reviewState;

  const meta = document.createElement("div");
  meta.className = "prep-meta";
  meta.append(
    buildMetaTag(item.informationType),
    buildMetaTag(`autor: ${authorLabel(item.author)}`),
    buildMetaTag(`źródło: ${item.locator}`),
    buildMetaTag(item.reviewState)
  );
  if (item.flagged) meta.append(buildMetaTag("CELOWO NIEODPOWIEDNIA SUGESTIA — ODRZUĆ"));

  const textarea = document.createElement("textarea");
  textarea.className = "prep-content";
  textarea.value = item.content;
  textarea.readOnly = true;
  textarea.setAttribute("aria-label", `${item.informationType}: ${item.content}`);

  const actions = document.createElement("div");
  actions.className = "prep-actions";
  const edit = document.createElement("button");
  edit.className = "small-button";
  edit.type = "button";
  edit.textContent = "Edytuj";
  edit.addEventListener("click", () => {
    if (textarea.readOnly) {
      textarea.readOnly = false;
      edit.textContent = "Zapisz zmianę";
      textarea.focus();
      return;
    }
    const value = textarea.value.trim();
    if (!value) {
      setMessage($("#preparation-error"), "Element przygotowania nie może być pusty. Odrzuć go albo wpisz treść.");
      return;
    }
    clearMessage($("#preparation-error"));
    item.content = value;
    item.author = "damian";
    item.reviewState = "needs_review";
    textarea.readOnly = true;
    edit.textContent = "Edytuj";
    addAudit("preparation_item_edited", item.informationType);
    renderPreparation();
  });

  const review = document.createElement("button");
  review.className = "small-button";
  review.type = "button";
  review.textContent = "Oznacz sprawdzone";
  review.disabled = item.reviewState === "approved" || item.reviewState === "rejected";
  review.addEventListener("click", () => {
    item.reviewState = "approved";
    addAudit("preparation_item_reviewed", item.informationType);
    renderPreparation();
  });

  const reject = document.createElement("button");
  reject.className = "small-button reject";
  reject.type = "button";
  reject.textContent = item.reviewState === "rejected" ? "Odrzucono" : "Odrzuć";
  reject.disabled = item.reviewState === "rejected";
  reject.addEventListener("click", () => {
    item.reviewState = "rejected";
    addAudit("preparation_item_rejected", item.informationType);
    renderPreparation();
  });

  actions.append(edit, review, reject);
  article.append(meta, textarea, actions);
  return article;
}

function renderPreparation() {
  $("#preparation-mode").textContent = state.preparationMode === "fictional_assisted"
    ? "fikcyjne sugestie · needs_review"
    : "manual fallback · bez AI";
  $("#source-reminder").textContent = `Niezmienne ${state.source.version} · ${state.source.label}\n${state.source.text}`;

  const root = $("#preparation-sections");
  root.replaceChildren(...sectionDefinitions.map(definition => {
    const panel = document.createElement("section");
    panel.className = `panel preparation-section${definition.wide ? " is-wide" : ""}`;
    const title = document.createElement("h3");
    title.textContent = definition.title;
    const list = document.createElement("div");
    list.className = "prep-list";
    const items = state.preparation.filter(item => item.section === definition.key);
    if (items.length) {
      list.append(...items.map(renderPreparationItem));
    } else {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = definition.key === "conflicts"
        ? "Nie wskazano sprzeczności. To nie dowodzi, że ich nie ma."
        : "Brak elementów w tej sekcji.";
      list.append(empty);
    }
    panel.append(title, list);
    return panel;
  }));
}

function beginCall() {
  const activeQuestions = state.preparation.filter(item => item.section === "questions" && item.reviewState !== "rejected");
  if (!activeQuestions.length) {
    setMessage($("#preparation-error"), "Pozostaw co najmniej jedno pytanie albo przygotuj je ręcznie przed rozpoczęciem rozmowy.");
    return;
  }
  if (activeQuestions.some(item => item.flagged && item.reviewState !== "rejected")) {
    setMessage($("#preparation-error"), "Celowo nieodpowiednia sugestia nadal jest aktywna. Odrzuć ją przed rozmową.");
    return;
  }
  clearMessage($("#preparation-error"));
  state.callStarted = true;
  activeQuestions.forEach(question => {
    if (!state.questionStates.has(question.id)) state.questionStates.set(question.id, "not_asked");
  });
  addAudit("call_started", "trainer_action");
  unlockStep("call", true);
  renderCall();
  showStep("call");
}

function renderCall() {
  const questions = state.preparation.filter(item => item.section === "questions" && item.reviewState !== "rejected");
  $("#call-questions").replaceChildren(...questions.map(question => {
    const row = document.createElement("div");
    row.className = "question-item";
    const text = document.createElement("span");
    text.textContent = question.content;
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Status pytania: ${question.content}`);
    [
      ["not_asked", "Nie zadano"],
      ["asked", "Zadane"],
      ["skipped", "Pominięte"],
      ["incomplete_answer", "Odpowiedź niepełna"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    });
    select.value = state.questionStates.get(question.id) || "not_asked";
    select.addEventListener("change", () => {
      state.questionStates.set(question.id, select.value);
      addAudit("question_status_changed", select.value);
    });
    row.append(text, select);
    return row;
  }));
  renderNotes();
}

function addNote() {
  const type = $("#note-type").value;
  const content = $("#note-text").value.trim();
  if (!content) {
    setMessage($("#note-error"), "Wpisz treść notatki i zachowaj wybrany rodzaj informacji.");
    return;
  }
  clearMessage($("#note-error"));
  state.notes.push({
    id: makeId("note"),
    type,
    content,
    author: type === "client_statement" ? "client" : "damian",
    recordedAt: new Date().toISOString(),
    derivedFrom: type === "client_statement" ? "phone-call-context" : state.source.version
  });
  $("#note-text").value = "";
  addAudit("call_note_recorded", type);
  renderNotes();
}

function renderNotes() {
  const list = $("#notes-list");
  if (!state.notes.length) {
    list.className = "note-list empty-state";
    list.textContent = "Nie zapisano jeszcze żadnej notatki.";
    return;
  }
  list.className = "note-list";
  list.replaceChildren(...state.notes.map(note => {
    const article = document.createElement("article");
    article.className = "note-item";
    article.dataset.noteType = note.type;
    const meta = document.createElement("div");
    meta.className = "prep-meta";
    meta.append(
      buildMetaTag(noteLabels[note.type]),
      buildMetaTag(`autor: ${note.author === "client" ? "klient" : "Damian"}`),
      buildMetaTag(`czas: ${new Date(note.recordedAt).toLocaleTimeString("pl-PL")}`)
    );
    const content = document.createElement("p");
    content.textContent = note.content;
    article.append(meta, content);
    return article;
  }));
}

function finishCall() {
  state.clientReaction = $("#client-reaction").value.trim();
  if (state.clientReaction) addAudit("client_reaction_recorded", "client_authorship_preserved");
  addAudit("call_closed", "trainer_action");
  unlockStep("close", true);
  renderClosure();
  showStep("close");
}

function evidenceCandidates() {
  const facts = state.preparation
    .filter(item => item.section === "facts" && item.reviewState !== "rejected")
    .map(item => ({ id: item.id, label: `Fakt/przygotowanie: ${item.content}`, type: item.informationType }));
  const notes = state.notes.map(note => ({ id: note.id, label: `${noteLabels[note.type]}: ${note.content}`, type: note.type }));
  if (state.clientReaction) {
    notes.push({ id: "client-reaction", label: `Reakcja klienta: ${state.clientReaction}`, type: "client_signal" });
  }
  return [...facts, ...notes];
}

function renderClosure() {
  const root = $("#decision-evidence");
  const candidates = evidenceCandidates();
  if (!candidates.length) {
    root.className = "evidence-list empty-state";
    root.textContent = "Brak faktów lub notatek. Wróć do przygotowania albo rozmowy i dodaj podstawę decyzji.";
  } else {
    root.className = "evidence-list";
    root.replaceChildren(...candidates.map(candidate => {
      const label = document.createElement("label");
      label.className = "evidence-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "decision-evidence";
      input.value = candidate.id;
      const span = document.createElement("span");
      span.textContent = candidate.label;
      label.append(input, span);
      return label;
    }));
  }
  renderAudit();
}

function saveDecision() {
  const selected = $("input[name='decision']:checked");
  const rationale = $("#decision-rationale").value.trim();
  const evidence = $$("input[name='decision-evidence']:checked").map(input => input.value);
  if (!selected) {
    setMessage($("#decision-error"), "Wybierz świadomie jedną z czterech decyzji. Żadna nie jest wybierana automatycznie.");
    return;
  }
  if (!rationale) {
    setMessage($("#decision-error"), "Wpisz krótkie uzasadnienie decyzji Damiana.");
    return;
  }
  if (!evidence.length) {
    setMessage($("#decision-error"), "Wskaż co najmniej jeden fakt lub notatkę wspierającą decyzję.");
    return;
  }
  clearMessage($("#decision-error"));
  state.decision = {
    id: makeId("decision"),
    value: selected.value,
    rationale,
    evidence,
    actor: "damian",
    recordedAt: new Date().toISOString()
  };
  addAudit("trainer_decision_recorded", selected.value);
  setMessage($("#decision-confirmation"), `Zapisano decyzję Damiana: ${selected.value}. Nie wykonano żadnej wysyłki ani zmiany poza pamięcią tej karty.`);
  $("#create-draft").disabled = false;
}

function createDraft() {
  if (!state.decision) {
    setMessage($("#draft-state"), "Najpierw zapisz decyzję Damiana.");
    return;
  }
  state.draft = {
    id: makeId("material"),
    content: state.fixture?.draft || `Dziękuję za rozmowę. Damian zapisał następny krok: ${state.decision.value}. Ten tekst jest fikcyjnym projektem do sprawdzenia.`,
    informationType: "client_material",
    reviewState: "needs_review",
    publicationState: "unpublished",
    derivedFrom: [state.source.version, state.decision.id]
  };
  $("#draft-field").hidden = false;
  $("#draft-text").value = state.draft.content;
  setMessage($("#draft-state"), "DO SPRAWDZENIA — NIE WYSŁANO · client_material · needs_review · unpublished. Brak przycisku wysyłki i publikacji.");
  addAudit("client_material_draft_created", "unpublished_needs_review");
}

function renderAudit() {
  const list = $("#audit-list");
  if (!list) return;
  list.replaceChildren(...state.audit.map(event => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = `${event.eventType} · ${event.outcome} `;
    const time = document.createElement("time");
    time.textContent = event.time;
    li.append(text, time);
    return li;
  }));
}

function stepIndex(step) {
  return ["source", "prepare", "call", "close"].indexOf(step);
}

function unlockStep(step, focusable) {
  const button = $(`[data-step-target="${step}"]`);
  button.disabled = !focusable;
  if (focusable) button.classList.add("is-complete");
}

function showStep(step) {
  state.currentStep = step;
  $$('[data-screen]').forEach(screen => {
    const active = screen.dataset.screen === step;
    screen.hidden = !active;
    screen.classList.toggle("is-active", active);
  });
  $$("[data-step-target]").forEach(button => {
    const active = button.dataset.stepTarget === step;
    button.classList.toggle("is-current", active);
    if (active) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
    if (stepIndex(button.dataset.stepTarget) < stepIndex(step)) button.classList.add("is-complete");
  });
  $("#workspace").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetWorkflow() {
  state.currentStep = "source";
  state.source = null;
  state.fixture = null;
  state.preparationMode = null;
  state.preparation = [];
  state.callStarted = false;
  state.questionStates.clear();
  state.notes = [];
  state.clientReaction = "";
  state.decision = null;
  state.draft = null;
  state.audit = [];
  $("#fixture-select").value = "";
  $("#manual-source").value = "";
  $("#fictional-confirmation").checked = false;
  $("#note-text").value = "";
  $("#client-reaction").value = "";
  $("#decision-rationale").value = "";
  $$("input[name='decision']").forEach(input => { input.checked = false; });
  $("#draft-field").hidden = true;
  $("#draft-text").value = "";
  clearMessage($("#source-error"));
  clearMessage($("#preparation-error"));
  clearMessage($("#note-error"));
  clearMessage($("#decision-error"));
  clearMessage($("#decision-confirmation"));
  clearMessage($("#draft-state"));
  ["prepare", "call", "close"].forEach(step => unlockStep(step, false));
  renderSource();
  updateFixtureDescription();
  showStep("source");
}

function initialize() {
  const fixtureSelect = $("#fixture-select");
  fixtures.forEach(fixture => {
    const option = document.createElement("option");
    option.value = fixture.id;
    option.textContent = fixture.title;
    fixtureSelect.append(option);
  });

  fixtureSelect.addEventListener("change", updateFixtureDescription);
  $("#load-fixture").addEventListener("click", () => {
    const fixture = fixtures.find(item => item.id === fixtureSelect.value);
    if (!fixture) {
      setMessage($("#source-error"), "Wybierz jeden z jawnie fikcyjnych przypadków.");
      return;
    }
    clearMessage($("#source-error"));
    captureSource({ text: fixture.source, label: `fictional_fixture:${fixture.id}`, fixture, partial: fixture.partial });
  });

  $("#capture-manual").addEventListener("click", () => {
    const text = $("#manual-source").value.trim();
    if (!text) {
      setMessage($("#source-error"), "Wklej fikcyjny tekst zgłoszenia albo wybierz gotowy przypadek.");
      return;
    }
    if (!$("#fictional-confirmation").checked) {
      setMessage($("#source-error"), "Potwierdź, że tekst jest fikcyjny i nie zawiera danych prawdziwego klienta.");
      return;
    }
    clearMessage($("#source-error"));
    captureSource({ text: `${FICTIONAL_NOTICE}\n${text}`, label: "manual_paste:fictional", partial: false });
  });

  $("#start-assisted").addEventListener("click", () => startPreparation("assisted"));
  $("#start-manual").addEventListener("click", () => startPreparation("manual"));
  $("#begin-call").addEventListener("click", beginCall);
  $("#add-note").addEventListener("click", addNote);
  $("#finish-call").addEventListener("click", finishCall);
  $("#save-decision").addEventListener("click", saveDecision);
  $("#create-draft").addEventListener("click", createDraft);
  $("#reset-workflow").addEventListener("click", resetWorkflow);

  $$("[data-step-target]").forEach(button => {
    button.addEventListener("click", () => {
      if (!button.disabled) showStep(button.dataset.stepTarget);
    });
  });
  $$("[data-go-step]").forEach(button => {
    button.addEventListener("click", () => showStep(button.dataset.goStep));
  });

  resetWorkflow();
}

initialize();
