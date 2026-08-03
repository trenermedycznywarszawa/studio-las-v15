import { FICTIONAL_NOTICE, fixtures } from "./fixtures.js";
import {
  activeRecords, callReadiness, createAuditEvent, createDraftVersion,
  deriveEditedRecord, editDraftVersion, eligibleEvidence, exactRef,
  invalidateDependents, makePhoneRecord, makeRecord, resolvePreparationMode,
  saveDecisionVersion, transitionReview
} from "./workflow-state.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const nowIso = () => new Date().toISOString();
const nowLabel = () => new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const makeId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const sections = [
  ["facts", "Co wiemy"], ["gaps", "Czego nie wiemy"],
  ["conflicts", "Co jest sprzeczne lub niejasne"], ["goal", "Cel rozmowy"],
  ["questions", "Proponowane pytania", true], ["caution", "Tematy wymagające ostrożności"],
  ["outline", "Proponowany przebieg rozmowy"]
];
const semantics = {
  facts: ["extracted_fact", null], gaps: [null, "preparation_gap"],
  conflicts: ["ai_hypothesis", "call_conflict"], goal: ["ai_suggestion", "call_goal"],
  questions: ["ai_suggestion", "call_question"], caution: ["ai_suggestion", "caution_topic"],
  outline: ["ai_suggestion", "call_outline_item"]
};
const labels = {
  client_statement: "Wypowiedź klienta · source_fact", client_reaction: "Reakcja klienta · source_fact",
  trainer_observation: "Obserwacja Damiana · trainer_observation",
  trainer_interpretation: "Interpretacja Damiana · trainer_interpretation"
};
const state = {
  currentStep: "source", source: null, fixture: null, preparationMode: null, preparation: [],
  callStarted: false, questionStates: new Map(), phoneRecords: [], inputRevision: 0,
  controlVersion: 0, decision: null, decisionHistory: [], draft: null, draftHistory: [], audit: []
};

function setMessage(element, text, visible = true) { element.textContent = text; element.hidden = !visible; }
function clearMessage(element) { setMessage(element, "", false); }
function tag(text) { const node = document.createElement("span"); node.className = "meta-tag"; node.textContent = text; return node; }
function authorLabel(author) { return { fictional_ai: "fikcyjne AI", damian: "Damian", client: "klient" }[author] || author; }

function replaceHistoryVersion(history, record) {
  const index = history.findIndex(item => exactRef(item) === exactRef(record));
  if (index >= 0) history[index] = record;
  else history.push(record);
}

function addAudit(eventType, actor, object, outcome = "ok", related = []) {
  state.audit.push(createAuditEvent({ id: makeId("audit"), eventType, actor, object, related, outcome, time: nowLabel() }));
  renderAudit();
}

function invalidateAfter(object, eventType) {
  state.inputRevision += 1;
  const priorDecision = state.decision;
  const priorDraft = state.draft;
  const next = invalidateDependents({ decision: priorDecision, draft: priorDraft }, exactRef(object));
  state.decision = next.decision;
  state.draft = next.draft;
  if (priorDecision?.status === "active") {
    replaceHistoryVersion(state.decisionHistory, state.decision);
    setMessage($("#decision-confirmation"), `Decyzja ${exactRef(priorDecision)} została unieważniona przez ${exactRef(object)}. Zapisz nową wersję.`);
  }
  if (priorDraft?.status === "active") {
    replaceHistoryVersion(state.draftHistory, state.draft);
    setMessage($("#draft-state"), `Projekt ${exactRef(priorDraft)} został unieważniony przez zmianę upstream.`);
  }
  $("#create-draft").disabled = !state.decision || state.decision.status !== "active";
  addAudit(eventType, "damian", object, priorDecision?.status === "active" ? "downstream_invalidated" : "recorded");
  renderDraftHistory();
}

function updateFixtureDescription() {
  const fixture = fixtures.find(item => item.id === $("#fixture-select").value);
  $("#fixture-description").textContent = fixture ? `${fixture.testPurpose} ${FICTIONAL_NOTICE}` : "Każdy przypadek jest jawnie fikcyjny i ma odrębny cel testowy.";
}

function captureSource({ text, label, fixture = null, partial = false }) {
  state.source = Object.freeze({ id: makeId("INQ-FIC"), version: 1, text: text.trim(), label, informationType: "source_artifact", capturedAt: nowIso(), partial });
  Object.assign(state, { fixture, preparationMode: null, preparation: [], callStarted: false, phoneRecords: [], inputRevision: 0, controlVersion: 0, decision: null, decisionHistory: [], draft: null, draftHistory: [], audit: [] });
  state.questionStates.clear();
  addAudit("source_version_created", "damian", state.source, partial ? "warning_partial" : "ok");
  if (fixture?.crossClientAttempt) addAudit("cross_client_request_denied", "system", state.source, "denied_no_disclosure");
  if (fixture?.blockedAutomaticQualification) addAudit("automatic_qualification_attempt_blocked", "system", state.source, "denied");
  renderSource(); unlockStep("prepare", false); showStep("source");
}

function renderSource() {
  const preview = $("#source-preview");
  if (!state.source) { preview.hidden = true; return; }
  preview.hidden = false;
  $("#source-text").textContent = state.source.text;
  const metadata = [["ID", state.source.id], ["Źródło", state.source.label], ["Wersja", exactRef(state.source)], ["Czas", new Date(state.source.capturedAt).toLocaleString("pl-PL")]];
  $("#source-metadata").replaceChildren(...metadata.map(([term, value]) => {
    const wrapper = document.createElement("div"); const dt = document.createElement("dt"); const dd = document.createElement("dd");
    dt.textContent = term; dd.textContent = value; wrapper.append(dt, dd); return wrapper;
  }));
  const warning = $("#source-warning");
  if (state.source.partial) setMessage(warning, "Źródło jest częściowe lub ucięte. Brak nie jest odpowiedzią negatywną.");
  else if (state.fixture?.crossClientAttempt) setMessage(warning, "Żądanie danych innej osoby zablokowano bez ujawniania, czy dane istnieją.");
  else if (state.fixture?.blockedAutomaticQualification) setMessage(warning, "Automatyczna kwalifikacja jest zablokowana. Decyzję zapisuje wyłącznie Damian.");
  else clearMessage(warning);
  const assisted = $("#start-assisted");
  assisted.disabled = !state.fixture || state.fixture.aiAvailable === false;
  assisted.textContent = !state.fixture ? "Tryb sugestii niedostępny dla ręcznego źródła" : state.fixture.aiAvailable === false ? "Fikcyjne AI niedostępne — użyj trybu ręcznego" : "Przygotuj na fikcyjnych sugestiach";
}

function prepItem(section, content, index, options = {}) {
  const [informationType, operationalRole] = semantics[section];
  return makeRecord({
    id: makeId(`prep-${section}-${index}`), content, author: options.author ?? "fictional_ai",
    informationType: options.informationType === undefined ? informationType : options.informationType,
    operationalRole, section, locator: options.locator ?? `${exactRef(state.source)}:whole-source`,
    derivedFrom: [exactRef(state.source)], reviewState: "needs_review",
    flagged: options.flagged, isPlaceholder: options.isPlaceholder
  });
}

function assistedPreparation() {
  const fixture = state.fixture; const items = [];
  fixture.facts.forEach(([content, locator], index) => items.push(prepItem("facts", content, index, { locator })));
  fixture.gaps.forEach((content, index) => items.push(prepItem("gaps", content, index)));
  fixture.conflicts.forEach((content, index) => items.push(prepItem("conflicts", content, index)));
  if (fixture.goal) items.push(prepItem("goal", fixture.goal, 0));
  fixture.questions.forEach((content, index) => items.push(prepItem("questions", content, index, { flagged: fixture.inappropriateQuestionIndexes?.includes(index) })));
  fixture.caution.forEach((content, index) => items.push(prepItem("caution", content, index)));
  fixture.outline.forEach((content, index) => items.push(prepItem("outline", content, index)));
  return items;
}

function manualPreparation() {
  const templates = {
    facts: ["Wpisz ręcznie fakt wynikający ze źródła i sprawdź lokalizator."], gaps: ["Wpisz ręcznie informację, której brakuje."],
    conflicts: ["Wpisz sprzeczność lub niejasność albo odrzuć ten element."], goal: ["Wpisz własny cel pierwszej rozmowy."],
    questions: [1, 2, 3, 4, 5].map(number => `Uzupełnij pytanie ręczne ${number}.`), caution: ["Wpisz ręcznie temat wymagający ostrożności."],
    outline: ["Wpisz ręcznie otwarcie, prowadzenie lub zamknięcie rozmowy."]
  };
  return Object.entries(templates).flatMap(([section, values]) => values.map((content, index) => prepItem(section, content, index, { author: "damian", informationType: section === "facts" ? "extracted_fact" : null, isPlaceholder: true })));
}

function startPreparation(requested) {
  if (!state.source) return setMessage($("#source-error"), "Najpierw wybierz lub zapisz fikcyjne źródło.");
  clearMessage($("#source-error"));
  state.preparationMode = resolvePreparationMode({ requested, hasFixture: Boolean(state.fixture), aiAvailable: state.fixture?.aiAvailable });
  state.preparation = state.preparationMode === "fictional_assisted" ? assistedPreparation() : manualPreparation();
  addAudit("preparation_started", "damian", state.source, state.preparationMode);
  unlockStep("prepare", true); renderPreparation(); showStep("prepare");
}

function renderPreparationItem(item, active) {
  const article = document.createElement("article");
  article.className = `prep-item${!active ? " is-superseded" : ""}${item.reviewState === "rejected" ? " is-rejected" : ""}${item.isPlaceholder ? " is-unresolved" : ""}`;
  if (item.informationType) article.dataset.informationType = item.informationType;
  if (item.operationalRole) article.dataset.operationalRole = item.operationalRole;
  const meta = document.createElement("div"); meta.className = "prep-meta";
  meta.append(tag(exactRef(item)), tag(item.informationType ? `information_type: ${item.informationType}` : `rola operacyjna: ${item.operationalRole}`), tag(`autor: ${authorLabel(item.author)}`), tag(item.reviewState), tag(active ? "wersja aktywna" : "wersja historyczna"));
  if (item.supersedes) meta.append(tag(`supersedes: ${item.supersedes}`));
  if (item.derivedFrom.length) meta.append(tag(`derived_from: ${item.derivedFrom.join(", ")}`));
  if (item.isPlaceholder) meta.append(tag("PLACEHOLDER — NIE UŻYWAJ"));
  if (item.flagged) meta.append(tag("CELOWO NIEODPOWIEDNIA SUGESTIA — ODRZUĆ"));
  const textarea = document.createElement("textarea"); textarea.className = "prep-content"; textarea.value = item.content; textarea.readOnly = true;
  textarea.setAttribute("aria-label", `${item.operationalRole ?? item.informationType}: ${item.content}`);
  const actions = document.createElement("div"); actions.className = "prep-actions";
  if (active) {
    const edit = document.createElement("button"); edit.className = "small-button"; edit.type = "button"; edit.textContent = "Utwórz wersję po korekcie";
    edit.addEventListener("click", () => {
      if (textarea.readOnly) { textarea.readOnly = false; edit.textContent = "Zapisz nową wersję"; textarea.focus(); return; }
      try { const derivative = deriveEditedRecord(item, textarea.value, makeId(`edit-${item.section}`)); state.preparation.push(derivative); invalidateAfter(derivative, "preparation_derivative_created"); clearMessage($("#preparation-error")); renderPreparation(); }
      catch (error) { setMessage($("#preparation-error"), error.message); }
    });
    const review = document.createElement("button"); review.className = "small-button"; review.type = "button"; review.textContent = "Oznacz sprawdzone";
    review.disabled = item.reviewState === "approved" || item.reviewState === "rejected" || item.isPlaceholder;
    review.addEventListener("click", () => { const version = transitionReview(item, "approved"); state.preparation.push(version); invalidateAfter(version, "preparation_item_reviewed"); renderPreparation(); });
    const reject = document.createElement("button"); reject.className = "small-button reject"; reject.type = "button"; reject.textContent = "Odrzuć"; reject.disabled = item.reviewState === "rejected";
    reject.addEventListener("click", () => { const version = transitionReview(item, "rejected"); state.preparation.push(version); invalidateAfter(version, "preparation_item_rejected"); renderPreparation(); });
    actions.append(edit, review, reject);
  }
  article.append(meta, textarea, actions); return article;
}

function renderPreparation() {
  $("#preparation-mode").textContent = state.preparationMode === "fictional_assisted" ? "fikcyjne sugestie · każda needs_review" : "manual fallback · placeholdery blokują rozmowę";
  $("#source-reminder").textContent = `Niezmienne ${exactRef(state.source)} · ${state.source.label}\n${state.source.text}`;
  const activeRefs = new Set(activeRecords(state.preparation).map(exactRef));
  $("#preparation-sections").replaceChildren(...sections.map(([key, titleText, wide]) => {
    const panel = document.createElement("section"); panel.className = `panel preparation-section${wide ? " is-wide" : ""}`;
    const title = document.createElement("h3"); title.textContent = titleText;
    const list = document.createElement("div"); list.className = "prep-list";
    const items = state.preparation.filter(item => item.section === key);
    if (items.length) list.append(...items.map(item => renderPreparationItem(item, activeRefs.has(exactRef(item)))));
    else { const empty = document.createElement("div"); empty.className = "empty-state"; empty.textContent = "Brak elementów w tej sekcji."; list.append(empty); }
    panel.append(title, list); return panel;
  }));
}

function beginCall() {
  const gate = callReadiness(state.preparation);
  if (!gate.ready) return setMessage($("#preparation-error"), gate.reason);
  clearMessage($("#preparation-error")); state.callStarted = true;
  gate.questions.forEach(question => { if (!state.questionStates.has(exactRef(question))) state.questionStates.set(exactRef(question), "not_asked"); });
  addAudit("call_started", "damian", state.source, "trainer_action", gate.questions);
  unlockStep("call", true); renderCall(); showStep("call");
}

function renderCall() {
  const questions = activeRecords(state.preparation).filter(item => item.operationalRole === "call_question" && (item.reviewState === "approved" || (item.author === "damian" && !item.isPlaceholder)));
  $("#call-questions").replaceChildren(...questions.map(question => {
    const row = document.createElement("div"); row.className = "question-item";
    const text = document.createElement("span"); text.textContent = question.content;
    const select = document.createElement("select"); select.setAttribute("aria-label", `Status pytania: ${question.content}`);
    [["not_asked", "Nie zadano"], ["asked", "Zadane"], ["skipped", "Pominięte"], ["incomplete_answer", "Odpowiedź niepełna"]].forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; select.append(option); });
    select.value = state.questionStates.get(exactRef(question)) ?? "not_asked";
    select.addEventListener("change", () => { state.questionStates.set(exactRef(question), select.value); invalidateAfter(question, "question_status_changed"); });
    row.append(text, select); return row;
  }));
  renderPhoneRecords();
}

function addNote() {
  const role = $("#note-type").value; const content = $("#note-text").value.trim();
  if (!content) return setMessage($("#note-error"), "Wpisz treść notatki i zachowaj wybrany rodzaj informacji.");
  clearMessage($("#note-error")); const record = makePhoneRecord({ id: makeId("note"), role, content });
  state.phoneRecords.push(record); $("#note-text").value = ""; invalidateAfter(record, "call_note_recorded"); renderPhoneRecords();
}

function renderPhoneRecord(record, active) {
  const article = document.createElement("article"); article.className = `note-item${active ? "" : " is-superseded"}${record.reviewState === "rejected" ? " is-rejected" : ""}`;
  const meta = document.createElement("div"); meta.className = "prep-meta";
  meta.append(tag(labels[record.operationalRole ?? record.informationType]), tag(exactRef(record)), tag(`autor: ${authorLabel(record.author)}`), tag(active ? "wersja aktywna" : "wersja historyczna"));
  if (record.supersedes) meta.append(tag(`supersedes: ${record.supersedes}`));
  const textarea = document.createElement("textarea"); textarea.className = "prep-content"; textarea.value = record.content; textarea.readOnly = true;
  article.append(meta, textarea);
  if (active) {
    const button = document.createElement("button"); button.className = "small-button"; button.type = "button"; button.textContent = "Skoryguj jako nową wersję";
    button.addEventListener("click", () => {
      if (textarea.readOnly) { textarea.readOnly = false; button.textContent = "Zapisz korektę"; textarea.focus(); return; }
      if (!textarea.value.trim()) return;
      const role = record.operationalRole ?? record.informationType;
      const version = makePhoneRecord({ id: record.id, role, content: textarea.value, previous: record });
      state.phoneRecords.push(version); invalidateAfter(version, "phone_record_corrected"); renderPhoneRecords();
    });
    article.append(button);
  }
  return article;
}

function renderPhoneRecords() {
  const list = $("#notes-list");
  if (!state.phoneRecords.length) { list.className = "note-list empty-state"; list.textContent = "Nie zapisano jeszcze żadnej notatki."; return; }
  list.className = "note-list"; const activeRefs = new Set(activeRecords(state.phoneRecords).map(exactRef));
  list.replaceChildren(...state.phoneRecords.map(record => renderPhoneRecord(record, activeRefs.has(exactRef(record)))));
}

function finishCall() {
  const content = $("#client-reaction").value.trim();
  const previous = activeRecords(state.phoneRecords).find(record => record.operationalRole === "client_reaction") ?? null;
  if (content && content !== previous?.content) {
    const reaction = makePhoneRecord({ id: makeId("reaction"), role: "client_reaction", content, previous });
    state.phoneRecords.push(reaction); invalidateAfter(reaction, previous ? "client_reaction_corrected" : "client_reaction_recorded");
  } else if (!content && previous) {
    const withdrawn = transitionReview(previous, "rejected");
    state.phoneRecords.push(withdrawn); invalidateAfter(withdrawn, "client_reaction_withdrawn");
  }
  addAudit("call_closed", "damian", state.source, "trainer_action"); unlockStep("close", true); renderClosure(); showStep("close");
}

function evidenceCandidates() {
  return eligibleEvidence(state.preparation, state.phoneRecords).map(record => ({ record, label: `${record.operationalRole ? labels[record.operationalRole] ?? record.operationalRole : record.informationType}: ${record.content}` }));
}

function renderClosure() {
  const root = $("#decision-evidence"); const candidates = evidenceCandidates();
  if (!candidates.length) { root.className = "evidence-list empty-state"; root.textContent = "Brak sprawdzonych faktów lub celowo zapisanych notatek. Niesprawdzone treści i placeholdery nie mogą być dowodem."; }
  else {
    root.className = "evidence-list";
    root.replaceChildren(...candidates.map(candidate => {
      const label = document.createElement("label"); label.className = "evidence-item";
      const input = document.createElement("input"); input.type = "checkbox"; input.name = "decision-evidence"; input.value = exactRef(candidate.record); input.addEventListener("change", decisionInputChanged);
      const span = document.createElement("span"); span.textContent = `${candidate.label} · ${exactRef(candidate.record)}`; label.append(input, span); return label;
    }));
  }
  $("#create-draft").disabled = !state.decision || state.decision.status !== "active"; renderDraftHistory(); renderAudit();
}

function decisionInputChanged() {
  if (!state.decision || state.decision.status !== "active") return;
  state.controlVersion += 1; invalidateAfter({ id: "decision-controls", version: state.controlVersion }, "decision_inputs_changed");
}

function saveDecision() {
  const selected = $("input[name='decision']:checked"); const rationale = $("#decision-rationale").value.trim();
  const evidenceRefs = $$("input[name='decision-evidence']:checked").map(input => input.value);
  if (!selected) return setMessage($("#decision-error"), "Wybierz świadomie jedną z czterech decyzji. Żadna nie jest wybierana automatycznie.");
  if (!rationale) return setMessage($("#decision-error"), "Wpisz krótkie uzasadnienie decyzji Damiana.");
  if (!evidenceRefs.length) return setMessage($("#decision-error"), "Wskaż co najmniej jeden sprawdzony fakt lub celowo zapisaną notatkę.");
  const records = [...state.preparation, ...state.phoneRecords];
  const evidence = evidenceRefs.map(reference => records.find(record => exactRef(record) === reference)).filter(Boolean);
  if (evidence.length !== evidenceRefs.length) return setMessage($("#decision-error"), "Jedna z wersji dowodu nie jest już dostępna. Odśwież wybór.");
  clearMessage($("#decision-error")); const previous = state.decision;
  const decision = saveDecisionVersion({ id: makeId("decision"), previous, value: selected.value, rationale, evidence, inputRevision: state.inputRevision, now: nowIso() });
  state.decision = decision; state.decisionHistory.push(decision);
  if (state.draft?.status === "active") { state.draft = { ...state.draft, status: "invalidated", invalidatedBy: exactRef(decision) }; replaceHistoryVersion(state.draftHistory, state.draft); }
  addAudit("trainer_decision_recorded", "damian", decision, selected.value, evidence);
  setMessage($("#decision-confirmation"), `Zapisano aktywną decyzję ${exactRef(decision)} Damiana. Każda zmiana upstream wymaga nowej wersji.`);
  $("#create-draft").disabled = false; renderDraftHistory();
}

function decisionEvidenceVersions() {
  const records = [...state.preparation, ...state.phoneRecords];
  return state.decision.evidenceRefs.map(reference => records.find(record => exactRef(record) === reference)).filter(Boolean);
}

function createDraft() {
  try {
    const evidence = decisionEvidenceVersions();
    const draft = createDraftVersion({ id: makeId("material"), previous: state.draft, decision: state.decision, evidence, now: nowIso() });
    state.draft = draft; state.draftHistory.push(draft); $("#draft-field").hidden = false; $("#save-draft-version").hidden = false; $("#draft-text").value = draft.content;
    setMessage($("#draft-state"), `${exactRef(draft)} · DO SPRAWDZENIA — NIE WYSŁANO · client_material · needs_review · unpublished.`);
    addAudit("client_material_draft_created", "damian", draft, "unpublished_needs_review", [state.decision, ...evidence]); renderDraftHistory();
  } catch (error) { setMessage($("#draft-state"), error.message); }
}

function saveDraftEdit() {
  if (!state.draft || state.draft.status !== "active") return setMessage($("#draft-state"), "Brak aktywnego projektu do wersjonowania.");
  try {
    const previous = state.draft;
    const draft = editDraftVersion({ draft: previous, content: $("#draft-text").value, now: nowIso() });
    state.draft = draft; state.draftHistory.push(draft);
    setMessage($("#draft-state"), `${exactRef(draft)} · nowa wersja · DO SPRAWDZENIA — NIE WYSŁANO · unpublished.`);
    addAudit("client_material_version_created", "damian", draft, "unpublished_needs_review", [previous, state.decision, ...decisionEvidenceVersions()]); renderDraftHistory();
  } catch (error) { setMessage($("#draft-state"), error.message); }
}

function renderDraftHistory() {
  const root = $("#draft-history"); if (!root) return;
  const superseded = new Set(state.draftHistory.map(draft => draft.supersedes).filter(Boolean));
  root.replaceChildren(...state.draftHistory.map(draft => { const item = document.createElement("li"); const status = superseded.has(exactRef(draft)) ? "superseded" : draft.status; item.textContent = `${exactRef(draft)} · ${status} · derived_from: ${draft.derivedFrom.join(", ")}`; return item; }));
}

function renderAudit() {
  const list = $("#audit-list"); if (!list) return;
  list.replaceChildren(...state.audit.map(event => {
    const li = document.createElement("li"); const text = document.createElement("span"); const time = document.createElement("time");
    text.textContent = `${event.eventType} · actor:${event.actor} · object:${event.objectRef} · refs:${event.relatedRefs.join(",") || "—"} · ${event.outcome} `;
    time.textContent = event.time; li.append(text, time); return li;
  }));
}

function stepIndex(step) { return ["source", "prepare", "call", "close"].indexOf(step); }
function unlockStep(step, enabled) { const button = $(`[data-step-target="${step}"]`); button.disabled = !enabled; if (enabled) button.classList.add("is-complete"); }
function showStep(step) {
  state.currentStep = step;
  $$('[data-screen]').forEach(screen => { const active = screen.dataset.screen === step; screen.hidden = !active; screen.classList.toggle("is-active", active); });
  $$('[data-step-target]').forEach(button => { const active = button.dataset.stepTarget === step; button.classList.toggle("is-current", active); if (active) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current"); if (stepIndex(button.dataset.stepTarget) < stepIndex(step)) button.classList.add("is-complete"); });
  $("#workspace").focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetWorkflow() {
  Object.assign(state, { currentStep: "source", source: null, fixture: null, preparationMode: null, preparation: [], callStarted: false, phoneRecords: [], inputRevision: 0, controlVersion: 0, decision: null, decisionHistory: [], draft: null, draftHistory: [], audit: [] });
  state.questionStates.clear(); $("#fixture-select").value = ""; $("#manual-source").value = ""; $("#fictional-confirmation").checked = false;
  $("#note-text").value = ""; $("#client-reaction").value = ""; $("#decision-rationale").value = ""; $$("input[name='decision']").forEach(input => { input.checked = false; });
  $("#draft-field").hidden = true; $("#save-draft-version").hidden = true; $("#draft-text").value = "";
  ["source-error", "preparation-error", "note-error", "decision-error", "decision-confirmation", "draft-state"].forEach(id => clearMessage($(`#${id}`)));
  ["prepare", "call", "close"].forEach(step => unlockStep(step, false)); renderSource(); renderAudit(); renderDraftHistory(); updateFixtureDescription(); showStep("source");
}

function initialize() {
  const fixtureSelect = $("#fixture-select");
  fixtures.forEach(fixture => { const option = document.createElement("option"); option.value = fixture.id; option.textContent = fixture.title; fixtureSelect.append(option); });
  fixtureSelect.addEventListener("change", updateFixtureDescription);
  $("#load-fixture").addEventListener("click", () => { const fixture = fixtures.find(item => item.id === fixtureSelect.value); if (!fixture) return setMessage($("#source-error"), "Wybierz jeden z jawnie fikcyjnych przypadków."); captureSource({ text: fixture.source, label: `fictional_fixture:${fixture.id}`, fixture, partial: fixture.partial }); });
  $("#capture-manual").addEventListener("click", () => { const text = $("#manual-source").value.trim(); if (!text) return setMessage($("#source-error"), "Wklej fikcyjny tekst zgłoszenia albo wybierz gotowy przypadek."); if (!$("#fictional-confirmation").checked) return setMessage($("#source-error"), "Potwierdź, że tekst jest fikcyjny i nie zawiera danych prawdziwego klienta."); captureSource({ text: `${FICTIONAL_NOTICE}\n${text}`, label: "manual_paste:fictional" }); });
  $("#start-assisted").addEventListener("click", () => startPreparation("assisted")); $("#start-manual").addEventListener("click", () => startPreparation("manual"));
  $("#begin-call").addEventListener("click", beginCall); $("#add-note").addEventListener("click", addNote); $("#finish-call").addEventListener("click", finishCall);
  $("#save-decision").addEventListener("click", saveDecision); $("#create-draft").addEventListener("click", createDraft); $("#save-draft-version").addEventListener("click", saveDraftEdit);
  $("#draft-text").addEventListener("input", () => { if (state.draft?.status === "active") setMessage($("#draft-state"), `Edycja robocza nie zmieniła ${exactRef(state.draft)}. Zapisz ją jako nową wersję.`); });
  $$("input[name='decision']").forEach(input => input.addEventListener("change", decisionInputChanged)); $("#decision-rationale").addEventListener("input", decisionInputChanged);
  $("#reset-workflow").addEventListener("click", resetWorkflow);
  $$('[data-step-target]').forEach(button => button.addEventListener("click", () => { if (!button.disabled) showStep(button.dataset.stepTarget); }));
  $$('[data-go-step]').forEach(button => button.addEventListener("click", () => showStep(button.dataset.goStep))); resetWorkflow();
}

initialize();
