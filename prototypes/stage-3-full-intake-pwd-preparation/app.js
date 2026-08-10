import { CORE_PROMPTS, FICTIONAL_NOTICE, fixtures } from "./fixtures.js";
import {
  activeRecords, addManualRecord, assembleBrief, assertCaseIsolation, correctResponse, createAuditEvent,
  editDerivative, eligibleEvidence, exactRef, invalidateDerivative, invalidateDownstream, makeFixtureModuleRecords,
  makePreparationRecords, makeResponse, makeSubmission, reviewGate, reviewResponse, saveReadinessDecision,
  transitionModule, transitionReview
} from "./workflow-state.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const now = () => new Date().toISOString();
const promptById = new Map(CORE_PROMPTS.map(prompt => [prompt.id, prompt]));

let state = freshState();
function freshState() {
  return { fixture: fixtures[0], submission: null, responses: [], moduleRecords: [], records: [], mode: null,
    briefHistory: [], decisionHistory: [], audit: [], manualCounter: 0, isolationDenial: "" };
}

function replaceVersion(history, change) {
  return [...history.map(item => exactRef(item) === exactRef(change.previous) ? change.previous : item), change.current];
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function polishError(error) {
  const message = error?.message || String(error);
  const translations = new Map([
    ["Explicit readiness decision is required", "Wybierz decyzję o gotowości."],
    ["Decision rationale is required", "Wpisz uzasadnienie decyzji."],
    ["At least one reviewed evidence item is required", "Wybierz co najmniej jedną dokładną przejrzaną wersję dowodu."],
    ["Active brief is required", "Najpierw złóż aktywną wersję briefu."],
    ["Cross-case reference denied", "Odmowa: twardo odrzucono referencję należącą do innej sprawy; stan nie został zmieniony."]
  ]);
  return translations.get(message) || message;
}

function activeBrief() { return [...state.briefHistory].reverse().find(item => item.status === "active") || null; }
function activeDecision() { return [...state.decisionHistory].reverse().find(item => item.status === "active") || null; }

function setScreen(name) {
  $$(".screen").forEach(screen => screen.classList.toggle("is-active", screen.id === `screen-${name}`));
  $$(".step").forEach(step => step.classList.toggle("is-active", step.dataset.screen === name));
  $(`#screen-${name}`).querySelector("h2")?.focus?.();
}

function enableScreen(name, enabled = true) { $(`.step[data-screen='${name}']`).disabled = !enabled; }

function renderFixtureOptions() {
  $("#fixture-select").innerHTML = fixtures.map(fixture => `<option value="${fixture.id}">${escapeHtml(fixture.title)}</option>`).join("");
}

function captureSource() {
  const fixture = fixtures.find(item => item.id === $("#fixture-select").value);
  state = { ...freshState(), fixture };
  state.submission = makeSubmission({ caseId: fixture.id, capturedAt: now(), partial: fixture.partial });
  state.responses = fixture.responses.map(response => makeResponse({ submission: state.submission, questionId: response.questionId, state: response.state, content: response.content }));
  state.moduleRecords = makeFixtureModuleRecords({ fixture, responses: state.responses });
  state.audit.push(createAuditEvent({ id: "event-source", eventType: "intake_captured", actor: "damian", object: state.submission, outcome: "fictional_session_only", time: now() }));
  for (const module of state.moduleRecords) state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`,
    eventType: module.eventType, actor: module.actor, object: module, related: [state.responses.find(item => exactRef(item) === module.sourceRef)],
    outcome: module.state, time: now() }));
  if (fixture.isolationAttempt) {
    try { assertCaseIsolation(fixture.id, [{ id: "foreign-source", version: 1, caseId: "fictional-01" }]); }
    catch (error) {
      state.isolationDenial = polishError(error);
      state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`, eventType: "cross_case_reference_denied",
        actor: "system_rule", object: state.submission, outcome: "state_unchanged", time: now() }));
    }
  }
  renderSource();
  enableScreen("review", false); enableScreen("brief", false); enableScreen("readiness", false);
}

function renderSource() {
  const hasSource = Boolean(state.submission);
  $("#source-content").hidden = !hasSource;
  $("#source-metadata").classList.toggle("empty-state", !hasSource);
  if (!hasSource) return;
  $("#source-metadata").innerHTML = `<strong>${FICTIONAL_NOTICE}</strong><br><span class="ref">${escapeHtml(exactRef(state.submission))}</span> · autor: klient · źródło niezmienne · ${state.fixture.partial ? "częściowe" : "kompletne"}`;
  const warnings = [];
  if (state.fixture.partial) warnings.push("Źródło jest częściowe. Brak odpowiedzi nie oznacza odpowiedzi przeczącej.");
  if (state.fixture.injection) warnings.push("Treść przypominająca instrukcję pozostaje nieufną odpowiedzią klienta; nie jest wykonywana.");
  if (state.isolationDenial) warnings.push(state.isolationDenial);
  $("#source-warning").hidden = warnings.length === 0;
  $("#source-warning").textContent = warnings.join(" ");
  $("#module-list").innerHTML = activeRecords(state.moduleRecords).map(module => `<div><span class="tag ${module.state === 'active_incomplete' ? 'pending' : ''}">${escapeHtml(module.state)}</span> <strong>${escapeHtml(module.moduleId)}</strong><br><span class="ref">${escapeHtml(exactRef(module))} · źródło ${escapeHtml(module.sourceRef)} · ${escapeHtml(module.eventType)} · ${escapeHtml(module.reason)}</span></div>`).join("");
  $("#response-table").innerHTML = activeRecords(state.responses).map(response => {
    const questionId = response.questionRef.split("#")[1];
    const controls = response.state === "answered" ? `<textarea rows="2" data-response-edit="${escapeHtml(exactRef(response))}">${escapeHtml(response.content)}</textarea>
      <div class="review-actions"><button type="button" class="button button-small" data-response-action="approve" data-ref="${escapeHtml(exactRef(response))}">Oznacz jako reviewed</button>
      <button type="button" class="button button-small button-quiet" data-response-action="correct" data-ref="${escapeHtml(exactRef(response))}">Zapisz korektę</button></div>` : "";
    return `<tr><td data-label="Pytanie"><strong>${questionId}</strong> — ${escapeHtml(promptById.get(questionId).label)}</td>
      <td data-label="Stan"><span class="tag ${response.state === 'answered' ? '' : 'pending'}">${escapeHtml(response.state)}</span><br><span class="tag ${response.reviewState === 'needs_review' ? 'pending' : response.reviewState}">${escapeHtml(response.reviewState)}</span></td>
      <td data-label="Treść">${controls || (response.content ? escapeHtml(response.content) : "—")}</td>
      <td data-label="Referencja"><span class="ref">${escapeHtml(exactRef(response))}</span></td></tr>`;
  }).join("");
  $("#source-error").textContent = "";
}

function invalidateDependencies(previous, current) {
  for (const record of activeRecords(state.records).filter(item => item.derivedFrom.includes(exactRef(previous)))) {
    state.records = replaceVersion(state.records, invalidateDerivative(record, exactRef(current)));
  }
  for (const module of activeRecords(state.moduleRecords).filter(item => item.sourceRef === exactRef(previous))) {
    const change = transitionModule(module, { state: module.state, source: current, reason: "Reset po korekcie dokładnej wersji źródła.",
      actor: "damian", eventType: "module_reset" });
    state.moduleRecords = replaceVersion(state.moduleRecords, change);
    state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`, eventType: "module_reset",
      actor: "damian", object: change.current, related: [current], outcome: change.current.state, time: now() }));
  }
  invalidateCurrent(exactRef(current));
  state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`, eventType: "response_corrected",
    actor: "damian", object: current, related: [previous], outcome: "needs_review", time: now() }));
}

function handleResponseAction(button) {
  const response = activeRecords(state.responses).find(item => exactRef(item) === button.dataset.ref);
  if (!response) return;
  if (button.dataset.responseAction === "approve") {
    const reviewed = reviewResponse(response, "approved");
    state.responses = state.responses.map(item => exactRef(item) === exactRef(response) ? reviewed : item);
    state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`, eventType: "response_reviewed",
      actor: "damian", object: reviewed, outcome: "approved", time: now() }));
  } else {
    const content = document.querySelector(`textarea[data-response-edit='${CSS.escape(exactRef(response))}']`).value.trim();
    if (!content) { $("#source-error").textContent = "Korekta odpowiedzi nie może być pusta."; return; }
    const change = correctResponse(response, { state: "answered", content });
    state.responses = replaceVersion(state.responses, change);
    invalidateDependencies(change.previous, change.current);
  }
  renderSource(); renderReview(); renderHistory();
}

function startPreparation() {
  const selected = $("input[name='preparation-mode']:checked")?.value;
  if (!selected) { $("#source-error").textContent = "Wybierz fikcyjny tryb wspomagany albo pełną ścieżkę ręczną."; return; }
  state.mode = state.fixture.scenario === "manual_fallback" ? "manual_fallback" : selected;
  state.records = makePreparationRecords({ fixture: state.fixture, responses: state.responses, mode: state.mode });
  enableScreen("review"); renderReview(); setScreen("review");
}

function invalidateCurrent(changedRef) {
  const brief = activeBrief(); const decision = activeDecision();
  if (!brief && !decision) return;
  const invalidated = invalidateDownstream({ brief, decision }, changedRef);
  if (brief) state.briefHistory = state.briefHistory.map(item => exactRef(item) === exactRef(brief) ? invalidated.brief : item);
  if (decision) state.decisionHistory = state.decisionHistory.map(item => exactRef(item) === exactRef(decision) ? invalidated.decision : item);
  enableScreen("brief", Boolean(state.briefHistory.length)); enableScreen("readiness", Boolean(state.decisionHistory.length));
}

const sectionLabels = { facts: "Fakt wydobyty", issues: "Brak / sprzeczność / uwaga", hypotheses: "Hipoteza coachingowa", questions: "Pytanie PWD", domains: "Kandydacka domena obserwacji" };

function renderReview() {
  $("#manual-composer").hidden = state.mode !== "manual_fallback";
  const active = activeRecords(state.records);
  if (!active.length) {
    $("#review-list").innerHTML = `<div class="panel empty-state">Ścieżka ręczna może złożyć brief bez sugestii AI. Możesz dodać własne fakty, pytania lub interpretacje.</div>`;
  } else {
    $("#review-list").innerHTML = active.map(record => {
      const fields = record.fields ? `<dl><dt>Cel</dt><dd>${escapeHtml(record.fields.purpose)}</dd><dt>Obserwuj</dt><dd>${escapeHtml(record.fields.observe)}</dd><dt>Przerwij/zmień</dt><dd>${escapeHtml(record.fields.stopCriteria)}</dd><dt>Wpływ na decyzję</dt><dd>${escapeHtml(record.fields.decisionImpact)}</dd></dl>` : "";
      const editable = record.reviewState !== "rejected";
      return `<article class="review-card" data-ref="${escapeHtml(exactRef(record))}">
        <header><div><p class="eyebrow">${escapeHtml(sectionLabels[record.section] || record.section)}</p><h3>${escapeHtml(record.content)}</h3></div><span class="tag ${record.reviewState === 'needs_review' ? 'pending' : record.reviewState}">${escapeHtml(record.reviewState)}</span></header>
        ${fields}<p class="ref">Autor: ${escapeHtml(record.author)} · ${escapeHtml(record.informationType ?? 'rola operacyjna')} · derived_from: ${escapeHtml(record.derivedFrom.join(', '))}</p>
        ${editable ? `<div class="edit-area"><label>Poprawiona treść<textarea data-edit-ref="${escapeHtml(exactRef(record))}" rows="2">${escapeHtml(record.content)}</textarea></label></div>` : ""}
        <div class="review-actions">
          ${record.reviewState === 'needs_review' ? `<button type="button" class="button button-small" data-action="approve" data-ref="${escapeHtml(exactRef(record))}">Zatwierdź</button>` : ""}
          ${editable ? `<button type="button" class="button button-small button-quiet" data-action="edit" data-ref="${escapeHtml(exactRef(record))}">Zapisz poprawioną wersję</button>` : ""}
          ${record.reviewState !== 'rejected' ? `<button type="button" class="button button-small button-danger" data-action="reject" data-ref="${escapeHtml(exactRef(record))}">Odrzuć</button>` : ""}
        </div></article>`;
    }).join("");
  }
  const gate = reviewGate({ records: state.records, moduleRecords: state.moduleRecords });
  $("#review-blockers").innerHTML = gate.ready ? "<li>Brak blokerów kontraktowych.</li>" : gate.blockers.map(blocker => `<li>${escapeHtml(blocker)}</li>`).join("");
  $("#assemble-brief").disabled = !gate.ready;
  $("#review-error").textContent = "";
}

function findActiveRecord(ref) { return activeRecords(state.records).find(record => exactRef(record) === ref); }

function handleReviewAction(button) {
  const record = findActiveRecord(button.dataset.ref); if (!record) return;
  let change;
  if (button.dataset.action === "approve") change = transitionReview(record, "approved");
  if (button.dataset.action === "reject") change = transitionReview(record, "rejected");
  if (button.dataset.action === "edit") {
    const content = $(`textarea[data-edit-ref='${CSS.escape(button.dataset.ref)}']`).value;
    try { change = editDerivative(record, content); } catch (error) { $("#review-error").textContent = error.message; return; }
  }
  if (!change) return;
  state.records = replaceVersion(state.records, change); invalidateCurrent(exactRef(change.current));
  state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`, eventType: `derivative_${button.dataset.action}`, actor: "damian", object: change.current, related: [record], outcome: change.current.reviewState, time: now() }));
  renderReview(); renderHistory();
}

function addManual() {
  const content = $("#manual-content").value.trim();
  if (!content) { $("#manual-error").textContent = "Wpisz treść ręcznej wersji."; return; }
  const section = $("#manual-section").value;
  const role = { facts: "reviewed_fact", issues: "preparation_gap", hypotheses: "trainer_interpretation", questions: "pwd_question" }[section];
  state.manualCounter += 1;
  const source = state.responses.find(response => response.state === "answered") || state.responses[0];
  const record = addManualRecord({ id: `manual-${state.manualCounter}`, content, section, role, caseId: state.fixture.id,
    derivedFrom: [exactRef(source)], sourceObjects: [source] });
  state.records.push(record); invalidateCurrent(exactRef(record));
  state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`, eventType: "manual_fallback_recorded",
    actor: "damian", object: record, related: [source], outcome: section, time: now() }));
  $("#manual-content").value = ""; $("#manual-error").textContent = ""; renderReview();
}

function assemble() {
  try {
    const previous = state.briefHistory.at(-1) || null;
    const brief = assembleBrief({ previous, caseId: state.fixture.id, submission: state.submission, responses: state.responses,
      records: state.records, moduleRecords: state.moduleRecords, now: now() });
    if (previous) state.briefHistory = state.briefHistory.map(item => exactRef(item) === exactRef(previous)
      ? Object.freeze({ ...item, supersededBy: exactRef(brief), status: "superseded" }) : item);
    state.briefHistory.push(brief);
    state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`, eventType: "brief_assembled", actor: "damian", object: brief, related: [state.submission], outcome: "active", time: now() }));
    enableScreen("brief"); renderBrief(); setScreen("brief");
  } catch (error) { $("#review-error").textContent = error.message; }
}

const briefLabels = {
  client_goal: "1. Cel klienta jego słowami", reviewed_facts: "2. Fakty istotne dla przygotowania", gaps_and_conflicts: "3. Braki i sprzeczności",
  caution_signals: "4. Sygnały wymagające decyzji Damiana", coaching_hypotheses: "5. Hipotezy coachingowe", pwd_questions: "6. Pytania na PWD",
  candidate_domains: "7. Kandydackie domeny obserwacji", trainer_decision_required: "8. Decyzja nadal należy do Damiana", unknowns_and_limits: "9. Czego nie wiemy i nie wolno wywnioskować"
};

function renderBrief() {
  const brief = activeBrief() || state.briefHistory.at(-1);
  if (!brief) return;
  $("#brief-status").className = `message ${brief.status === 'active' ? 'success' : 'danger'}`;
  $("#brief-status").textContent = `${exactRef(brief)} · ${brief.status}${brief.invalidatedBy ? ` · unieważniony przez ${brief.invalidatedBy}` : ""}`;
  $("#brief-content").innerHTML = Object.entries(brief.sections).map(([key, items]) => `<section class="brief-section"><h3>${briefLabels[key]}</h3>${items.length ? items.map(item => {
    const content = item.content || item.fields?.purpose || ""; const refs = item.refs || item.derivedFrom || [];
    return `<div class="brief-item"><p>${escapeHtml(content)}</p>${refs.length ? `<span class="ref">${escapeHtml(refs.join(', '))}</span>` : ""}</div>`;
  }).join("") : `<p class="muted">Brak aktywnych pozycji.</p>`}</section>`).join("");
  $("#open-readiness").disabled = brief.status !== "active";
}

function renderEvidence() {
  const evidence = eligibleEvidence({ caseId: state.fixture.id, records: state.records, responses: state.responses });
  $("#evidence-list").innerHTML = evidence.map(item => `<label class="evidence-item"><input type="checkbox" name="decision-evidence" value="${escapeHtml(exactRef(item))}"><span><span class="ref">${escapeHtml(exactRef(item))}</span> — ${escapeHtml(item.content || item.state)}</span></label>`).join("");
}

function openReadiness() { enableScreen("readiness"); renderEvidence(); renderHistory(); setScreen("readiness"); }

function saveDecision() {
  const brief = activeBrief();
  const value = $("input[name='readiness-decision']:checked")?.value;
  const rationale = $("#decision-rationale").value;
  const selectedRefs = new Set($$("input[name='decision-evidence']:checked").map(input => input.value));
  const evidence = eligibleEvidence({ caseId: state.fixture.id, records: state.records, responses: state.responses }).filter(item => selectedRefs.has(exactRef(item)));
  try {
    const previous = state.decisionHistory.at(-1) || null;
    const decision = saveReadinessDecision({ previous, caseId: state.fixture.id, value, rationale, evidence,
      records: state.records, responses: state.responses, brief, now: now() });
    if (previous) state.decisionHistory = state.decisionHistory.map(item => exactRef(item) === exactRef(previous)
      ? Object.freeze({ ...item, supersededBy: exactRef(decision), status: "superseded" }) : item);
    state.decisionHistory.push(decision);
    state.audit.push(createAuditEvent({ id: `event-${state.audit.length + 1}`, eventType: "readiness_decision_saved", actor: "damian", object: decision, related: [brief], outcome: value, time: now() }));
    $("#decision-error").textContent = ""; renderHistory();
  } catch (error) { $("#decision-error").textContent = polishError(error); }
}

function renderHistory() {
  const items = [
    ...state.responses.map(item => ({ ...item, kind: "odpowiedź" })),
    ...state.moduleRecords.map(item => ({ ...item, kind: "moduł" })),
    ...state.records.map(item => ({ ...item, kind: "pochodna" })),
    ...state.briefHistory.map(item => ({ ...item, kind: "brief" })),
    ...state.decisionHistory.map(item => ({ ...item, kind: "decyzja" }))
  ];
  $("#history-list").innerHTML = items.length ? items.map(item => `<div class="history-entry ${item.status || item.reviewState || item.state}">
    <strong>${escapeHtml(item.kind)} ${escapeHtml(exactRef(item))}</strong> · ${escapeHtml(item.status || item.reviewState || item.state)}
    ${item.supersedes ? `<br><span class="ref">zastępuje ${escapeHtml(item.supersedes)}</span>` : ""}
    ${item.supersededBy ? `<br><span class="ref">zastąpiony przez ${escapeHtml(item.supersededBy)}</span>` : ""}
    ${item.invalidatedBy ? `<br><span class="ref">unieważniony przez ${escapeHtml(item.invalidatedBy)}</span>` : ""}</div>`).join("") : "<p>Brak zapisanej wersji.</p>";
}

function resetSession() {
  const resetEvents = activeRecords(state.moduleRecords).map(module => createAuditEvent({
    id: `event-${state.audit.length + 1}-${module.moduleId}`, eventType: "module_reset", actor: "damian",
    object: module, outcome: "session_cleared", time: now()
  }));
  const audit = [...state.audit, ...resetEvents];
  state = freshState();
  state.audit = audit;
  $$("input[type='radio'], input[type='checkbox']").forEach(input => { input.checked = false; });
  $("#decision-rationale").value = ""; $("#source-metadata").textContent = "Wybierz przypadek i utwórz źródło.";
  $("#source-content").hidden = true; $("#source-warning").hidden = true;
  enableScreen("review", false); enableScreen("brief", false); enableScreen("readiness", false); setScreen("source");
}

renderFixtureOptions();
$("#fixture-select").value = state.fixture.id;
$("#capture-source").addEventListener("click", captureSource);
$("#start-preparation").addEventListener("click", startPreparation);
$("#add-manual-record").addEventListener("click", addManual);
$("#assemble-brief").addEventListener("click", assemble);
$("#open-readiness").addEventListener("click", openReadiness);
$("#save-decision").addEventListener("click", saveDecision);
$("#reset-session").addEventListener("click", resetSession);
$("#response-table").addEventListener("click", event => {
  const button = event.target.closest("button[data-response-action]");
  if (button) handleResponseAction(button);
});
$("#review-list").addEventListener("click", event => { const button = event.target.closest("button[data-action]"); if (button) handleReviewAction(button); });
$$(".step").forEach(step => step.addEventListener("click", () => { if (!step.disabled) { if (step.dataset.screen === "brief") renderBrief(); if (step.dataset.screen === "readiness") { renderEvidence(); renderHistory(); } setScreen(step.dataset.screen); } }));
