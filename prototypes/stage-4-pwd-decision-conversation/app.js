import { fixtures } from "./fixtures.js";
import {
  DECISIONS,
  addManualConversationOption,
  assessComparability,
  conversationGate,
  createWorkspace,
  exactRef,
  makeFollowupDraft,
  makeHandoff,
  makeSimulatedSuggestions,
  makeTanitaPackage,
  materialHandoffChange,
  recordObservation,
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
    tanitaComparison: null,
    observations: [],
    reactions: [],
    interpretation: null,
    mode: null,
    suggestions: [],
    manualOptions: [],
    decision: null,
    followup: null,
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
  document.querySelector(`#screen-${name} h2`)?.focus?.();
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
    return;
  }
  const fieldset = node("fieldset", {}, [node("legend", { text: "Damian określa porównywalność" })]);
  for (const [value, label] of [
    ["comparable", "Comparable"], ["not_comparable", "Not comparable"], ["unknown", "Unknown"]
  ]) {
    fieldset.append(node("label", { className: "choice" }, [
      node("input", { type: "radio", name: "tanita-comparability", value }),
      document.createTextNode(label)
    ]));
  }
  const rationale = node("textarea", { rows: "3", id: "tanita-rationale" });
  root.append(
    fieldset,
    node("label", { text: "Uzasadnienie Damiana" }, rationale),
    button("Zapisz ocenę porównywalności", () => {
      try {
        const value = document.querySelector('input[name="tanita-comparability"]:checked')?.value;
        state.tanitaComparison = assessComparability({
          workspace: state.workspace,
          tanitaPackage: state.tanitaPackage,
          value,
          rationale: rationale.value
        });
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
    const existing = state.observations.find(item => item.candidateId === candidate.id);
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
      const reaction = state.reactions.find(item => item.id.endsWith(candidate.id));
      card.append(
        node("span", { className: "badge", text: existing.executionState }),
        node("p", { text: existing.content }),
        node("p", { className: "source-line", text: reaction ? `Reakcja klienta: ${reaction.content}` : "Brak zapisanej wypowiedzi klienta." })
      );
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

function renderSuggestions() {
  const root = byId("suggestion-list");
  root.replaceChildren();
  const latest = latestById(state.suggestions);
  for (const record of latest) {
    const card = node("article", { className: "suggestion-card" }, [
      node("span", { className: `badge ${record.reviewState === "needs_review" ? "pending" : ""}`, text: record.reviewState }),
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
      node("span", { className: "badge", text: "manual · approved" }),
      node("p", { text: record.content }),
      node("p", { className: "source-line", text: `${exactRef(record)} · Damian` })
    ]));
  }
  updateConversationGate();
}

function applyReview(record, action, content = "") {
  try {
    const transition = reviewSuggestion(record, action, content);
    state.suggestions = replaceTransition(state.suggestions, record, transition);
    renderSuggestions();
    announce("Zapisano jawną decyzję review dla sugestii.");
  } catch (error) { showError("conversation-error", error); }
}

function updateConversationGate() {
  if (!state.mode) return;
  const gate = conversationGate(latestById(state.suggestions));
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
  if (state.invalidation) {
    return [...state.invalidation.handoffs, ...state.invalidation.workspaces, ...state.invalidation.downstream];
  }
  return [
    ...state.handoffHistory,
    ...state.workspaceHistory,
    ...state.suggestions,
    ...state.manualOptions,
    state.tanitaComparison,
    ...state.observations,
    ...state.reactions,
    state.interpretation,
    state.decision,
    state.followup
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
  byId("reset-session").click();
  resetState();
  state.fixture = fixture;
  state.handoff = makeHandoff(fixture);
  state.workspace = createWorkspace({ fixture, handoff: state.handoff });
  state.handoffHistory = [state.handoff];
  state.workspaceHistory = [state.workspace];
  state.tanitaPackage = makeTanitaPackage({ fixture, handoff: state.handoff });
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
    state.interpretation = saveTrainerInterpretation({
      workspace: state.workspace,
      evidence: currentEvidence().filter(item => item !== state.interpretation),
      content: byId("interpretation-content").value,
      uncertainty: byId("interpretation-uncertainty").value
    });
    unlock("conversation");
    announce("Zapisano oddzielną interpretację Damiana.");
    setScreen("conversation");
  } catch (error) { showError("evidence-error", error); }
});

byId("prepare-conversation").addEventListener("click", () => {
  clearError("conversation-error");
  try {
    const mode = document.querySelector('input[name="conversation-mode"]:checked')?.value;
    if (!mode) throw new Error("Wybierz tryb przygotowania rozmowy.");
    state.mode = mode;
    state.suggestions = mode === "assisted"
      ? [...makeSimulatedSuggestions({ fixture: state.fixture, workspace: state.workspace, evidence: currentEvidence() })]
      : [];
    byId("manual-option").hidden = mode !== "manual";
    renderSuggestions();
    announce(mode === "manual" ? "Uruchomiono pełną ścieżkę ręczną bez AI." : "Utworzono deterministyczne sugestie needs_review.");
  } catch (error) { showError("conversation-error", error); }
});

byId("add-manual-option").addEventListener("click", () => {
  clearError("conversation-error");
  try {
    const option = addManualConversationOption({ workspace: state.workspace, content: byId("manual-option-content").value });
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
    state.decision = saveDecision({
      workspace: state.workspace,
      value,
      rationale: byId("decision-rationale").value,
      evidence,
      conditions
    });
    byId("decision-result").className = "panel";
    byId("decision-result").replaceChildren(
      node("span", { className: "badge", text: state.decision.value }),
      node("h3", { text: "Decyzja zapisana przez Damiana" }),
      node("p", { text: state.decision.rationale }),
      node("p", { className: "source-line", text: `${exactRef(state.decision)} · ${state.decision.derivedFrom.length - 1} dowodów · bez automatycznej kwalifikacji` })
    );
    byId("followup-panel").hidden = false;
    renderHistory();
    announce("Zapisano jawną decyzję Stage 4A.");
  } catch (error) { showError("decision-error", error); }
});

byId("save-followup").addEventListener("click", () => {
  clearError("followup-error");
  try {
    state.followup = makeFollowupDraft({ decision: state.decision, content: byId("followup-content").value });
    byId("followup-content").disabled = true;
    byId("save-followup").disabled = true;
    byId("followup-error").textContent = `${exactRef(state.followup)} · trainer-only · unpublished · zachowany wyłącznie w tej sesji`;
    renderHistory();
  } catch (error) { showError("followup-error", error); }
});

byId("material-change").addEventListener("click", () => {
  if (!state.workspace || state.invalidation) return;
  const downstream = [
    state.tanitaComparison,
    ...state.observations,
    ...state.reactions,
    state.interpretation,
    ...state.suggestions,
    ...state.manualOptions,
    state.decision,
    state.followup
  ].filter(Boolean);
  state.invalidation = materialHandoffChange({
    handoff: state.handoff,
    workspace: state.workspace,
    downstream,
    summary: "Materialnie skorygowany fikcyjny handoff wymaga nowego workspace."
  });
  state.handoff = state.invalidation.handoffs.at(-1);
  state.workspace = state.invalidation.workspaces.at(-1);
  byId("decision-fieldset").disabled = true;
  byId("save-decision").disabled = true;
  byId("material-change").disabled = true;
  renderHistory();
  announce("Workspace i decyzja zostały unieważnione; historia pozostała widoczna.");
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
