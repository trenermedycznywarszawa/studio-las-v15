import { fixtures } from "./fixtures.js";
import {
  DECISIONS,
  addManualConversationOption,
  assessComparability,
  conversationGate,
  conversationRecordsForRun,
  createSessionAggregate,
  createWorkspace,
  exactRef,
  invalidateDependentRecords,
  makeFollowupDraft,
  makeHandoff,
  makeTanitaPackage,
  materialHandoffChange,
  prepareConversationRun,
  recordObservation,
  reviewSourceFact,
  reviewSuggestion,
  saveDecision,
  saveTrainerInterpretation
} from "./workflow-state.js";

const byId = id => document.getElementById(id);
const clean = value => String(value ?? "").trim();
const ERROR_MESSAGES = new Map([
  ["Explicit Tanita comparability required.", "Wybierz porównywalność Tanita."],
  ["Comparability rationale required.", "Wpisz uzasadnienie porównywalności."],
  ["Explicit observation execution state required.", "Wybierz stan wykonania obserwacji."],
  ["Observation or skip/stop reason required.", "Wpisz obserwację albo powód pominięcia lub przerwania."],
  ["Interpretation requires exact evidence.", "Interpretacja wymaga co najmniej jednego dokładnego dowodu."],
  ["Trainer interpretation required.", "Wpisz interpretację Damiana."],
  ["Uncertainty statement required.", "Wpisz, co pozostaje niepewne."],
  ["Edited conversation option required.", "Wpisz poprawioną treść rozmowy."],
  ["Manual conversation note required.", "Wpisz ręczną notatkę do rozmowy."],
  ["Explicit Stage 4A decision required.", "Wybierz jedną jawną decyzję Stage 4A."],
  ["Decision requires exact current evidence.", "Wybierz co najmniej jeden dokładny bieżący dowód."],
  ["Decision rationale required.", "Wpisz uzasadnienie decyzji."],
  ["START_CONDITIONAL requires complete Damian-authored conditions.", "START CONDITIONAL wymaga warunku Damiana i sposobu jego weryfikacji."],
  ["Conditions are allowed only for START_CONDITIONAL.", "Warunki są dozwolone wyłącznie dla START CONDITIONAL."],
  ["Follow-up draft content required.", "Wpisz treść niewysłanego szkicu."],
  ["Active workspace required.", "Workspace nie jest aktywny. Utwórz go ponownie z bieżącego handoffu."],
  ["Conversation records required for the domain decision gate.", "Brakuje pełnej historii rozmowy wymaganej przez bramkę domenową."],
  ["Conversation gate blocked by active needs_review suggestions.", "Aktywna sugestia needs_review blokuje zapis decyzji."],
  ["Tanita facts require one active exact-package comparability interpretation.", "Fakty Tanita wymagają aktywnej interpretacji porównywalności dokładnego bieżącego pakietu."],
  ["Cross-case reference denied before mutation.", "Odrzucono referencję do innego fikcyjnego przypadku przed zmianą stanu."]
]);

function userMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return ERROR_MESSAGES.get(message) || message;
}
const state = {};

function resetState() {
  Object.assign(state, {
    fixture: null,
    handoff: null,
    handoffHistory: [],
    workspace: null,
    workspaceHistory: [],
    tanitaPackage: null,
    tanitaPackageHistory: [],
    tanitaComparison: null,
    tanitaComparisonHistory: [],
    observations: [],
    reactions: [],
    interpretation: null,
    interpretationHistory: [],
    mode: null,
    conversationRun: null,
    conversationRuns: [],
    suggestions: [],
    manualOptions: [],
    decision: null,
    decisionHistory: [],
    followup: null,
    followupHistory: [],
    invalidation: null
  });
}

function node(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === "text") element.textContent = value;
    else if (key === "className") element.className = value;
    else if (key.startsWith("on") && typeof value === "function") element.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) element.setAttribute(key, value);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child) element.append(child);
  }
  return element;
}

function button(text, onClick, className = "button") {
  return node("button", { type: "button", className, text, onclick: onClick });
}

function announce(message) {
  document.querySelectorAll(".error").forEach(element => { element.textContent = ""; });
  byId("global-status").textContent = message;
}

function showError(id, error) {
  byId(id).textContent = userMessage(error);
}

function clearError(id) { byId(id).textContent = ""; }

function setScreen(name) {
  document.querySelectorAll(".screen").forEach(section => section.classList.toggle("is-active", section.id === `screen-${name}`));
  document.querySelectorAll(".step").forEach(item => {
    const active = item.dataset.screen === name;
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  const heading = document.querySelector(`#screen-${name} h2`);
  heading?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function unlock(screen) {
  const step = document.querySelector(`.step[data-screen="${screen}"]`);
  if (step) step.disabled = false;
}

function latestById(records) {
  const result = new Map();
  for (const record of records) {
    const current = result.get(record.id);
    if (!current || record.version > current.version) result.set(record.id, record);
  }
  return [...result.values()];
}

function replaceTransition(records, original, transition) {
  return records.filter(item => exactRef(item) !== exactRef(original)).concat(transition.previous, transition.current);
}

function appendTransition(records, transition) {
  return transition.previous
    ? replaceTransition(records, transition.previous, transition)
    : records.concat(transition.current);
}

const HISTORY_KEYS = [
  "tanitaPackageHistory", "tanitaComparisonHistory", "interpretationHistory", "conversationRuns",
  "suggestions", "manualOptions", "decisionHistory", "followupHistory",
  "observations", "reactions"
];

function applyRecordTransition(transition) {
  if (!transition) return;
  for (const key of HISTORY_KEYS) {
    if (state[key].some(item => exactRef(item) === exactRef(transition.previous))) {
      state[key] = replaceTransition(state[key], transition.previous, transition);
    }
  }
  for (const key of ["tanitaComparison", "interpretation", "conversationRun", "decision", "followup"]) {
    if (state[key] && exactRef(state[key]) === exactRef(transition.previous)) state[key] = transition.current;
  }
}

function sessionAggregate() {
  return createSessionAggregate({ caseId: state.fixture.id, records: allHistory() });
}

function currentConversationRecords() {
  if (!state.conversationRun) return [];
  return conversationRecordsForRun({ session: sessionAggregate(), run: state.conversationRun });
}

function invalidateDependents(changedRecord, invalidatedBy, session = sessionAggregate()) {
  if (!changedRecord) return [];
  const transitions = invalidateDependentRecords({
    session, changedRecords: [changedRecord], invalidatedBy
  });
  transitions.forEach(applyRecordTransition);
  if (state.conversationRun?.status !== "active") state.mode = null;
  return transitions;
}

function currentEvidence() {
  return [
    state.handoff,
    ...(state.tanitaPackage?.facts || []),
    state.tanitaComparison,
    ...state.observations,
    ...state.reactions,
    state.interpretation
  ].filter(item => item?.status === "active");
}

function renderHandoff() {
  const root = byId("handoff-content");
  root.replaceChildren();
  if (!state.handoff) {
    root.className = "panel empty-state";
    root.textContent = "Wybierz przypadek i utwórz workspace.";
    return;
  }
  root.className = "panel";
  root.append(
    node("p", { className: "meta-line", text: `${state.fixture.id} · ${exactRef(state.handoff)} · ${state.handoff.decision}` }),
    node("h3", { text: state.handoff.summary }),
    node("p", { text: state.handoff.sourceStatement }),
    node("p", { className: "source-line", text: "Treść źródłowa jest inertna. Handoff nie jest decyzją Stage 4A ani potwierdzeniem bezpieczeństwa." }),
    button("Przejdź do wybranych dowodów PWD", () => setScreen("evidence"), "button primary")
  );
}

function renderTanita() {
  const root = byId("tanita-panel");
  root.replaceChildren();
  root.append(node("h3", { id: "tanita-title", text: "Opcjonalny kontekst Tanita" }));
  if (!state.tanitaPackage) {
    root.append(
      node("p", { className: "empty-state", text: "Brak pakietu Tanita. Workflow pozostaje dostępny." }),
      node("p", { className: "source-line", text: "Brak źródła nie jest interpretowany jako brak zmiany ani wynik negatywny." })
    );
    return;
  }
  root.append(
    node("p", { className: "source-line", text: `${exactRef(state.tanitaPackage.source)} · ${state.tanitaPackage.source.sourceProfile}` }),
    node("p", { text: state.tanitaPackage.source.context }),
    node("div", { className: "stack" }, state.tanitaPackage.facts.map(fact => node("article", { className: "source-card" }, [
      node("strong", { text: fact.label }),
      node("p", { text: fact.value }),
      node("p", { className: "source-line", text: `${exactRef(fact)} · ${fact.sourceLocator}` })
    ])))
  );
  if (state.tanitaComparison) {
    root.append(node("div", { className: "source-card" }, [
      node("span", { className: "badge", text: state.tanitaComparison.value }),
      node("p", { text: state.tanitaComparison.rationale }),
      node("p", { className: "source-line", text: `${exactRef(state.tanitaComparison)} · interpretacja Damiana` })
    ]));
  }
  const fieldset = node("fieldset", {}, [node("legend", { text: "Damian określa porównywalność" })]);
  for (const [value, label] of [
    ["comparable", "Comparable"], ["not_comparable", "Not comparable"], ["unknown", "Unknown"]
  ]) {
    fieldset.append(node("label", { className: "choice" }, [
      node("input", { type: "radio", name: "tanita-comparability", value, checked: state.tanitaComparison?.value === value ? "" : null }),
      document.createTextNode(label)
    ]));
  }
  const rationale = node("textarea", { rows: "3", id: "tanita-rationale" });
  rationale.value = state.tanitaComparison?.rationale || "";
  root.append(
    fieldset,
    node("label", { text: "Uzasadnienie Damiana" }, rationale),
    button(state.tanitaComparison ? "Zapisz nową wersję oceny" : "Zapisz ocenę porównywalności", () => {
      try {
        const value = document.querySelector('input[name="tanita-comparability"]:checked')?.value;
        const previous = state.tanitaComparison?.status === "active" ? state.tanitaComparison : null;
        const session = sessionAggregate();
        const transition = assessComparability({
          session,
          workspace: state.workspace,
          tanitaPackage: state.tanitaPackage,
          value,
          rationale: rationale.value,
          previous
        });
        if (previous) invalidateDependents(previous, exactRef(transition.current), session);
        state.tanitaComparisonHistory = appendTransition(state.tanitaComparisonHistory, transition);
        state.tanitaComparison = transition.current;
        renderTanita();
        announce("Zapisano jawną ocenę porównywalności Damiana.");
      } catch (error) { showError("evidence-error", error); }
    })
  );
}

function renderCandidates() {
  const root = byId("candidate-list");
  root.replaceChildren();
  for (const candidate of state.handoff.candidates) {
    const existing = state.observations.find(item => item.status === "active" && item.candidateId === candidate.id);
    const card = node("article", { className: "candidate-card" });
    card.append(
      node("h3", { text: candidate.label }),
      node("div", { className: "candidate-details" }, [
        node("div", {}, [node("strong", { text: "Cel" }), node("span", { text: candidate.purpose })]),
        node("div", {}, [node("strong", { text: "Obserwuj" }), node("span", { text: candidate.observe })]),
        node("div", {}, [node("strong", { text: "Przerwij" }), node("span", { text: candidate.stopCriteria })]),
        node("div", {}, [node("strong", { text: "Wpływ na decyzję" }), node("span", { text: candidate.decisionImpact })])
      ])
    );
    if (existing) {
      const reaction = state.reactions.find(item => item.status === "active" && item.derivedFrom.includes(exactRef(existing)));
      card.append(
        node("span", { className: "badge", text: existing.executionState }),
        node("p", { text: existing.content }),
        node("p", { className: "source-line", text: reaction ? `Reakcja klienta: ${reaction.content}` : "Brak zapisanej wypowiedzi klienta." })
      );
      if (reaction?.reviewState === "needs_review") {
        card.append(
          node("span", { className: "badge pending", text: "source_fact · needs_review" }),
          button("Approve exact source_fact", () => applySourceReview(reaction, "approve")),
          button("Reject source_fact", () => applySourceReview(reaction, "reject"), "button danger")
        );
      }
      root.append(card);
      continue;
    }
    const selected = node("input", { type: "checkbox" });
    const entry = node("div", { className: "candidate-entry", hidden: "" });
    selected.addEventListener("change", () => { entry.hidden = !selected.checked; });
    const execution = node("select", {}, [
      node("option", { value: "", text: "Wybierz stan" }),
      node("option", { value: "performed", text: "Wykonano" }),
      node("option", { value: "skipped", text: "Pominięto" }),
      node("option", { value: "stopped", text: "Przerwano" })
    ]);
    const observation = node("textarea", { rows: "3" });
    const reaction = node("textarea", { rows: "2" });
    entry.append(
      node("label", { text: "Stan wykonania" }, execution),
      node("label", { text: "Obserwacja Damiana albo powód pominięcia/przerwania" }, observation),
      node("label", { text: "Wypowiedź lub reakcja fikcyjnego klienta — opcjonalnie" }, reaction),
      button("Zapisz odrębne rekordy", () => {
        try {
          const result = recordObservation({
            session: sessionAggregate(),
            workspace: state.workspace,
            handoff: state.handoff,
            candidateId: candidate.id,
            executionState: execution.value,
            observationText: observation.value,
            clientReaction: reaction.value
          });
          state.observations.push(result.observation);
          if (result.reaction) state.reactions.push(result.reaction);
          renderCandidates();
          announce("Zapisano oddzielnie obserwację i reakcję klienta.");
        } catch (error) { showError("evidence-error", error); }
      })
    );
    card.append(
      node("label", { className: "choice" }, [selected, document.createTextNode("Damian wybiera tę obserwację")]),
      entry
    );
    root.append(card);
  }
}

function applySourceReview(record, action) {
  try {
    const session = sessionAggregate();
    const transition = reviewSourceFact({ session, record, action });
    if (action === "reject") invalidateDependents(record, exactRef(transition.current), session);
    state.reactions = replaceTransition(state.reactions, record, transition);
    renderCandidates();
    announce(action === "approve"
      ? `Damian zatwierdził dokładną wersję ${transition.current.reviewedVersion}.`
      : `Damian odrzucił dokładną wersję ${transition.current.reviewedVersion}.`);
  } catch (error) { showError("evidence-error", error); }
}

function renderSuggestions() {
  const root = byId("suggestion-list");
  root.replaceChildren();
  const latest = latestById(state.suggestions);
  for (const record of latest) {
    const card = node("article", { className: "suggestion-card" }, [
      node("span", {
        className: `badge ${record.reviewState === "needs_review" ? "pending" : ""} ${record.status === "invalidated" ? "invalid" : ""}`,
        text: record.status === "active" ? record.reviewState : `${record.status} · ${record.reviewState}` }),
      node("p", { text: record.content }),
      node("p", { className: "source-line", text: `${exactRef(record)} · ${record.author} · trainer-only` })
    ]);
    if (record.status === "active" && record.reviewState === "needs_review") {
      const edit = node("textarea", { rows: "2" });
      card.append(edit, node("div", { className: "review-actions" }, [
        button("Approve", () => applyReview(record, "approve")),
        button("Edit jako Damian", () => applyReview(record, "edit", edit.value)),
        button("Reject", () => applyReview(record, "reject"), "button danger")
      ]));
    }
    root.append(card);
  }
  for (const record of state.manualOptions) {
    root.append(node("article", { className: "suggestion-card" }, [
      node("span", {
        className: `badge ${record.status === "invalidated" ? "invalid" : ""}`,
        text: `${record.status} · manual · ${record.reviewState}`
      }),
      node("p", { text: record.content }),
      node("p", { className: "source-line", text: `${exactRef(record)} · Damian` })
    ]));
  }
  updateConversationGate();
}

function applyReview(record, action, content = "") {
  try {
    const transition = reviewSuggestion({ session: sessionAggregate(), record, action, editedContent: content });
    state.suggestions = replaceTransition(state.suggestions, record, transition);
    renderSuggestions();
    announce("Zapisano jawną decyzję review dla sugestii.");
  } catch (error) { showError("conversation-error", error); }
}

function updateConversationGate() {
  if (!state.mode || state.conversationRun?.status !== "active") {
    byId("conversation-gate").textContent = "Najpierw przygotuj nowy przebieg rozmowy.";
    byId("open-decision").disabled = true;
    return;
  }
  const session = sessionAggregate();
  const records = currentConversationRecords();
  const gate = conversationGate({ session, workspace: state.workspace, run: state.conversationRun, conversationRecords: records });
  byId("conversation-gate").textContent = gate.ready
    ? "Gotowe. Żadna sugestia nie oczekuje na review."
    : `Do decyzji pozostało ${gate.pending.length} review.`;
  byId("open-decision").disabled = !gate.ready;
}

function renderDecisionEvidence() {
  const root = byId("decision-evidence");
  root.replaceChildren();
  for (const item of currentEvidence()) {
    const label = item.content || item.summary || item.rationale || item.label || item.operationalRole;
    root.append(node("label", { className: "evidence-choice" }, [
      node("input", { type: "checkbox", name: "decision-evidence", value: exactRef(item) }),
      node("span", { text: `${exactRef(item)} · ${item.informationType || item.operationalRole} · ${label}` })
    ]));
  }
}

function allHistory() {
  return [
    ...state.handoffHistory,
    ...state.workspaceHistory,
    ...state.tanitaPackageHistory,
    ...state.tanitaComparisonHistory,
    ...state.interpretationHistory,
    ...state.conversationRuns,
    ...state.suggestions,
    ...state.manualOptions,
    ...state.observations,
    ...state.reactions,
    ...state.decisionHistory,
    ...state.followupHistory
  ].filter(Boolean);
}

function renderHistory() {
  const root = byId("history-list");
  root.replaceChildren();
  const records = allHistory();
  if (!records.length) {
    root.append(node("p", { className: "empty-state", text: "Historia pojawi się po utworzeniu workspace." }));
    return;
  }
  for (const item of records) {
    root.append(node("article", { className: "history-card" }, [
      node("span", { className: `badge ${item.status === "invalidated" ? "invalid" : ""}`, text: item.status }),
      node("strong", { text: `${exactRef(item)} · ${item.operationalRole}` }),
      node("p", { className: "source-line", text: `author: ${item.author} · derived_from: ${(item.derivedFrom || []).join(", ") || "—"}` }),
      item.supersedes ? node("p", { className: "source-line", text: `supersedes: ${item.supersedes}` }) : null,
      item.supersededBy ? node("p", { className: "source-line", text: `superseded_by: ${item.supersededBy}` }) : null,
      item.invalidatedBy ? node("p", { text: `Unieważniono przez ${item.invalidatedBy}` }) : null
    ]));
  }
}

function initializeFixtureSelect() {
  const select = byId("fixture-select");
  select.replaceChildren(...fixtures.map(fixture => node("option", { value: fixture.id, text: fixture.label })));
}

byId("create-workspace").addEventListener("click", () => {
  const fixture = fixtures.find(item => item.id === byId("fixture-select").value);
  if (state.fixture === fixture && state.handoff?.status === "active" && state.workspace?.status === "invalidated") {
    const nextWorkspace = createWorkspace({
      fixture, handoff: state.handoff, previousWorkspace: state.workspace, session: sessionAggregate()
    });
    state.workspaceHistory.push(nextWorkspace);
    state.workspace = nextWorkspace;
    state.tanitaPackage = makeTanitaPackage({ fixture, handoff: state.handoff, workspace: state.workspace, session: sessionAggregate() });
    if (state.tanitaPackage) state.tanitaPackageHistory.push(state.tanitaPackage.source, ...state.tanitaPackage.facts);
    state.tanitaComparison = null;
    state.interpretation = null;
    state.conversationRun = null;
    state.mode = null;
    state.decision = null;
    state.followup = null;
    state.invalidation = null;
    document.querySelectorAll("input[type=radio], input[type=checkbox]").forEach(input => { input.checked = false; });
    byId("interpretation-content").value = "";
    byId("interpretation-uncertainty").value = "";
    byId("decision-rationale").value = "";
    byId("condition-statement").value = "";
    byId("condition-verification").value = "";
    byId("followup-content").value = "";
    byId("create-workspace").textContent = "Utwórz workspace w sesji";
    byId("decision-fieldset").disabled = false;
    byId("save-decision").disabled = false;
    byId("material-change").disabled = false;
    byId("followup-panel").hidden = true;
    unlock("evidence");
    renderHandoff();
    renderTanita();
    renderCandidates();
    renderSuggestions();
    renderHistory();
    announce(`Utworzono nowy workspace wyłącznie z ${exactRef(state.handoff)}.`);
    setScreen("evidence");
    return;
  }
  byId("reset-session").click();
  resetState();
  state.fixture = fixture;
  state.handoff = makeHandoff(fixture);
  state.handoffHistory = [state.handoff];
  state.workspace = createWorkspace({ fixture, handoff: state.handoff, session: sessionAggregate() });
  state.workspaceHistory = [state.workspace];
  state.tanitaPackage = makeTanitaPackage({ fixture, handoff: state.handoff, workspace: state.workspace, session: sessionAggregate() });
  if (state.tanitaPackage) {
    state.tanitaPackageHistory = [state.tanitaPackage.source, ...state.tanitaPackage.facts];
  }
  unlock("evidence");
  renderHandoff();
  renderTanita();
  renderCandidates();
  renderHistory();
  announce(`Utworzono odizolowany workspace ${fixture.id}.`);
});

document.querySelectorAll(".step").forEach(item => item.addEventListener("click", () => {
  if (!item.disabled) setScreen(item.dataset.screen);
}));

byId("save-interpretation").addEventListener("click", () => {
  clearError("evidence-error");
  try {
    const previous = state.interpretation?.status === "active" ? state.interpretation : null;
    const session = sessionAggregate();
    const transition = saveTrainerInterpretation({
      session,
      workspace: state.workspace,
      evidence: currentEvidence().filter(item => item !== state.interpretation),
      content: byId("interpretation-content").value,
      uncertainty: byId("interpretation-uncertainty").value,
      previous
    });
    if (previous) invalidateDependents(previous, exactRef(transition.current), session);
    state.interpretationHistory = appendTransition(state.interpretationHistory, transition);
    state.interpretation = transition.current;
    unlock("conversation");
    announce(`Zapisano ${exactRef(state.interpretation)}; zależne aktywne rekordy unieważniono.`);
    setScreen("conversation");
  } catch (error) { showError("evidence-error", error); }
});

byId("prepare-conversation").addEventListener("click", () => {
  clearError("conversation-error");
  try {
    const mode = document.querySelector('input[name="conversation-mode"]:checked')?.value;
    if (!mode) throw new Error("Wybierz tryb przygotowania rozmowy.");
    const prepared = prepareConversationRun({
      session: sessionAggregate(),
      fixture: state.fixture,
      workspace: state.workspace,
      evidence: currentEvidence(),
      mode,
      previousRun: state.conversationRun
    });
    prepared.invalidationTransitions.forEach(applyRecordTransition);
    state.conversationRuns = appendTransition(state.conversationRuns, prepared.runTransition);
    state.suggestions.push(...prepared.suggestions);
    state.conversationRun = prepared.runTransition.current;
    state.mode = mode;
    byId("manual-option").hidden = mode !== "manual";
    renderSuggestions();
    announce(mode === "manual" ? `Uruchomiono ręczny ${exactRef(state.conversationRun)} bez AI.` : `Utworzono ${exactRef(state.conversationRun)} z sugestiami needs_review.`);
  } catch (error) { showError("conversation-error", error); }
});

byId("add-manual-option").addEventListener("click", () => {
  clearError("conversation-error");
  try {
    const option = addManualConversationOption({
      session: sessionAggregate(),
      workspace: state.workspace,
      run: state.conversationRun,
      content: byId("manual-option-content").value
    });
    state.manualOptions.push(option);
    byId("manual-option-content").value = "";
    renderSuggestions();
  } catch (error) { showError("conversation-error", error); }
});

byId("open-decision").addEventListener("click", () => {
  unlock("decision");
  renderDecisionEvidence();
  renderHistory();
  setScreen("decision");
});

document.querySelectorAll('input[name="pwd-decision"]').forEach(input => input.addEventListener("change", () => {
  byId("condition-fields").hidden = input.value !== "START_CONDITIONAL";
}));

byId("save-decision").addEventListener("click", () => {
  clearError("decision-error");
  try {
    const value = document.querySelector('input[name="pwd-decision"]:checked')?.value;
    const refs = [...document.querySelectorAll('input[name="decision-evidence"]:checked')].map(item => item.value);
    const evidence = currentEvidence().filter(item => refs.includes(exactRef(item)));
    const conditions = value === "START_CONDITIONAL" ? [{
      statement: byId("condition-statement").value,
      verification: byId("condition-verification").value
    }] : [];
    const previous = state.decision;
    const session = sessionAggregate();
    const transition = saveDecision({
      session,
      workspace: state.workspace,
      conversationRun: state.conversationRun,
      value,
      rationale: byId("decision-rationale").value,
      evidence,
      conditions,
      conversationRecords: currentConversationRecords(),
      previous
    });
    state.decisionHistory = appendTransition(state.decisionHistory, transition);
    if (previous?.status === "active") invalidateDependents(previous, exactRef(transition.current), session);
    state.decision = transition.current;
    byId("decision-result").className = "panel";
    byId("decision-result").replaceChildren(
      node("span", { className: "badge", text: state.decision.value }),
      node("h3", { text: "Decyzja zapisana przez Damiana" }),
      node("p", { text: state.decision.rationale }),
      node("p", { className: "source-line", text: `${exactRef(state.decision)} · ${state.decision.derivedFrom.length - 1} dowodów · bez automatycznej kwalifikacji` })
    );
    byId("followup-panel").hidden = false;
    byId("followup-content").disabled = false;
    byId("save-followup").disabled = false;
    byId("followup-content").value = "";
    byId("followup-error").textContent = "";
    renderHistory();
    announce(`Zapisano ${exactRef(state.decision)} jako append-only decyzję Damiana.`);
  } catch (error) { showError("decision-error", error); }
});

byId("save-followup").addEventListener("click", () => {
  clearError("followup-error");
  try {
    state.followup = makeFollowupDraft({
      session: sessionAggregate(),
      decision: state.decision,
      content: byId("followup-content").value
    });
    state.followupHistory.push(state.followup);
    byId("followup-content").disabled = true;
    byId("save-followup").disabled = true;
    byId("followup-error").textContent = `${exactRef(state.followup)} · trainer-only · unpublished · zachowany wyłącznie w tej sesji`;
    renderHistory();
  } catch (error) { showError("followup-error", error); }
});

byId("material-change").addEventListener("click", () => {
  if (!state.workspace || state.invalidation) return;
  state.invalidation = materialHandoffChange({
    session: sessionAggregate(),
    handoff: state.handoff,
    workspace: state.workspace,
    summary: "Materialnie skorygowany fikcyjny handoff wymaga nowego workspace."
  });
  state.handoffHistory = replaceTransition(state.handoffHistory, state.handoff, {
    previous: state.invalidation.handoffs[0], current: state.invalidation.handoffs[1]
  });
  state.workspaceHistory = replaceTransition(state.workspaceHistory, state.workspace, state.invalidation.workspaceTransition);
  state.invalidation.downstreamTransitions.forEach(applyRecordTransition);
  state.handoff = state.invalidation.handoffs.at(-1);
  state.workspace = state.invalidation.workspaceTransition.current;
  state.tanitaPackage = null;
  byId("decision-fieldset").disabled = true;
  byId("save-decision").disabled = true;
  byId("material-change").disabled = true;
  byId("create-workspace").textContent = `Utwórz workspace z ${exactRef(state.handoff)}`;
  renderHistory();
  announce(`Workspace unieważniono. Nowy może powstać wyłącznie z ${exactRef(state.handoff)}; historia pozostała widoczna.`);
});

byId("reset-session").addEventListener("click", () => {
  resetState();
  document.querySelectorAll(".step").forEach((item, index) => { item.disabled = index > 0; });
  document.querySelectorAll("input[type=radio], input[type=checkbox]").forEach(input => { input.checked = false; });
  for (const id of ["interpretation-content", "interpretation-uncertainty", "decision-rationale", "condition-statement", "condition-verification", "followup-content"]) {
    byId(id).value = "";
  }
  byId("condition-fields").hidden = true;
  byId("followup-panel").hidden = true;
  byId("manual-option").hidden = true;
  byId("suggestion-list").replaceChildren();
  byId("conversation-gate").textContent = "Najpierw wybierz tryb.";
  byId("open-decision").disabled = true;
  byId("decision-fieldset").disabled = false;
  byId("save-decision").disabled = false;
  byId("material-change").disabled = false;
  byId("create-workspace").textContent = "Utwórz workspace w sesji";
  byId("followup-content").disabled = false;
  byId("save-followup").disabled = false;
  byId("decision-result").className = "panel empty-state";
  byId("decision-result").textContent = "Decyzja nie została zapisana.";
  renderHandoff();
  renderHistory();
  setScreen("handoff");
  announce("Wyczyszczono wyłącznie pamięć bieżącej sesji prototypu.");
});

initializeFixtureSelect();
resetState();
