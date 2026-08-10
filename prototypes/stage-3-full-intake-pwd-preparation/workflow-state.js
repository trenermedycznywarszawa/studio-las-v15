export const INFORMATION_TYPES = Object.freeze([
  "source_artifact", "source_fact", "extracted_fact", "trainer_observation", "ai_hypothesis",
  "ai_suggestion", "trainer_interpretation", "trainer_decision", "client_material"
]);
export const RESPONSE_STATES = Object.freeze(["answered", "unanswered", "declined", "not_applicable", "not_asked"]);
export const MODULE_STATES = Object.freeze(["not_applicable", "active_incomplete", "active_complete", "declined"]);
export const MODULE_IDS = Object.freeze(["pregnancy_postpartum", "oncology", "service_test", "pain_injury"]);
export const REVIEW_STATES = Object.freeze(["needs_review", "approved", "rejected"]);
export const READINESS_DECISIONS = Object.freeze(["READY_TO_PREPARE_PWD", "NEEDS_CLARIFICATION", "DEFER_OR_CONSULT_BEFORE_PWD"]);
export const CORE_QUESTION_IDS = Object.freeze([
  "A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "B5", "C1", "C2", "C3", "C4",
  "D1", "D2", "D3", "D4", "D5", "D6", "E1", "E2", "E3", "F1", "F2", "F3", "F4"
]);

export function assertInformationType(value) {
  if (!INFORMATION_TYPES.includes(value)) throw new Error(`Unapproved information_type: ${value}`);
  return value;
}

export function exactRef(object) {
  if (!object?.id || !Number.isInteger(object.version)) throw new Error("Exact reference requires id and integer version");
  return `${object.id}@v${object.version}`;
}

export function makeSubmission({ caseId, capturedAt, partial = false, author = "client" }) {
  if (!String(caseId).startsWith("fictional-")) throw new Error("Only fictional case scope is allowed");
  if (!capturedAt) throw new Error("Submission capture time is required");
  if (!["client", "unknown_source_author"].includes(author)) throw new Error("Unsupported source author");
  return Object.freeze({
    id: `intake-${caseId}`, version: 1, informationType: assertInformationType("source_artifact"),
    operationalRole: "intake_submission", caseId, capturedAt, author, partial: Boolean(partial), immutable: true
  });
}

export function makeResponse({ submission, questionId, state, content = "", version = 1, reviewState = "needs_review", reviewedBy = null, supersedes = null, supersededBy = null, correctedBy = null }) {
  if (!CORE_QUESTION_IDS.includes(questionId)) throw new Error(`Unknown core question: ${questionId}`);
  if (!RESPONSE_STATES.includes(state)) throw new Error(`Unsupported response state: ${state}`);
  if (state === "answered" && !String(content).trim()) throw new Error("Answered response requires content");
  if (state !== "answered" && String(content).trim()) throw new Error("Only answered responses may carry content");
  if (!REVIEW_STATES.includes(reviewState)) throw new Error("Unsupported review state");
  return Object.freeze({
    id: `${submission.id}-${questionId}`, version, informationType: assertInformationType("source_fact"),
    operationalRole: "intake_response", caseId: submission.caseId, questionRef: `stage3-core@v1#${questionId}`,
    submissionRef: exactRef(submission), state, content: String(content), author: "client", immutable: true,
    reviewState, reviewedBy, supersedes, supersededBy, correctedBy
  });
}

export function reviewResponse(response, reviewState, actor = "damian") {
  if (!["approved", "rejected"].includes(reviewState)) throw new Error("Response review must approve or reject");
  return Object.freeze({ ...response, reviewState, reviewedBy: actor });
}

export function correctResponse(response, { state, content = "", actor = "damian" }) {
  const [id, version] = response.submissionRef.split("@v");
  const submission = { id, version: Number(version), caseId: response.caseId };
  const current = makeResponse({ submission, questionId: response.questionRef.split("#")[1], state, content,
    version: response.version + 1, supersedes: exactRef(response), correctedBy: actor });
  return { previous: Object.freeze({ ...response, supersededBy: exactRef(current) }), current };
}

export function assertModuleState(value) {
  if (!MODULE_STATES.includes(value)) throw new Error(`Unsupported module state: ${value}`);
  return value;
}

function normalizeRefs(refs) {
  const values = [...new Set(refs || [])];
  if (!values.length) throw new Error("derived_from is required");
  return values;
}

export function assertExactLineage(caseId, sourceObjects, refs) {
  assertCaseIsolation(caseId, sourceObjects);
  const current = new Set(activeRecords(sourceObjects).map(exactRef));
  for (const ref of normalizeRefs(refs)) {
    if (!current.has(ref)) throw new Error(`Exact current source reference required: ${ref}`);
  }
  return true;
}

export function makeModuleRecord({ moduleId, caseId, state, source, reason, actor = "system_rule", eventType, version = 1, supersedes = null, supersededBy = null }) {
  if (!MODULE_IDS.includes(moduleId)) throw new Error("Unknown conditional module");
  assertModuleState(state);
  if (!source) throw new Error("Module source is required");
  assertCaseIsolation(caseId, [source]);
  if (!["module_activated", "module_deactivated", "module_reset"].includes(eventType)) throw new Error("Module event is required");
  if (!String(reason).trim()) throw new Error("Module activation reason is required");
  return Object.freeze({ id: `module-${caseId}-${moduleId}`, version, caseId, moduleId, state, sourceRef: exactRef(source),
    derivedFrom: [exactRef(source)], reason: String(reason).trim(), eventType, actor, supersedes, supersededBy });
}

export function transitionModule(record, { state, source, reason, actor = "damian", eventType }) {
  const current = makeModuleRecord({ moduleId: record.moduleId, caseId: record.caseId, state, source, reason, actor,
    eventType, version: record.version + 1, supersedes: exactRef(record) });
  return { previous: Object.freeze({ ...record, supersededBy: exactRef(current) }), current };
}

export function makeFixtureModuleRecords({ fixture, responses }) {
  const current = activeRecords(responses);
  return MODULE_IDS.map(moduleId => {
    const config = fixture.modules[moduleId];
    if (!config?.sourceQuestionId) throw new Error(`Module ${moduleId} has no source trigger`);
    const source = current.find(item => item.questionRef.endsWith(`#${config.sourceQuestionId}`));
    if (!source) throw new Error(`Module ${moduleId} source is missing`);
    if (config.state.startsWith("active") && source.state !== "answered") throw new Error(`Module ${moduleId} cannot activate without an answered source`);
    return makeModuleRecord({ moduleId, caseId: fixture.id, state: config.state, source, reason: config.reason,
      actor: config.actor || "system_rule", eventType: config.state.startsWith("active") ? "module_activated" : "module_deactivated" });
  });
}

export function makeDerivative({ id, content, author = "fictional_ai", informationType = "ai_suggestion", operationalRole, section, derivedFrom, sourceObjects, reviewState = "needs_review", version = 1, supersedes = null, uncertainty = null, fields = null, caseId, flagged = false, placeholder = false }) {
  if (informationType === null) {
    if (author !== "damian" || !operationalRole) throw new Error("Only a trainer-authored operational derivative may omit information_type");
  } else {
    assertInformationType(informationType);
  }
  if (!id || !String(content).trim()) throw new Error("Derivative requires id and content");
  if (!REVIEW_STATES.includes(reviewState)) throw new Error("Unsupported review state");
  if (!Array.isArray(sourceObjects) || sourceObjects.length === 0) throw new Error("Derivative source objects are required");
  const refs = normalizeRefs(derivedFrom);
  assertExactLineage(caseId, sourceObjects, refs);
  return Object.freeze({ id, version, content: String(content).trim(), author, informationType, operationalRole, section,
    derivedFrom: refs, reviewState, supersedes, supersededBy: null, uncertainty, fields, caseId,
    flagged: Boolean(flagged), placeholder: Boolean(placeholder), creationMode: author === "damian" ? "manual_or_edit" : "fictional_assisted" });
}

export function activeRecords(records) {
  const superseded = new Set(records.map(record => record.supersedes).filter(Boolean));
  return records.filter(record => !superseded.has(exactRef(record)));
}

export function transitionReview(record, reviewState) {
  if (!["approved", "rejected"].includes(reviewState)) throw new Error("Review transition must approve or reject");
  const current = Object.freeze({ ...record, version: record.version + 1, reviewState, supersedes: exactRef(record), supersededBy: null });
  return { previous: Object.freeze({ ...record, supersededBy: exactRef(current) }), current };
}

export function editDerivative(record, content, id = record.id) {
  if (!String(content).trim()) throw new Error("Edited content cannot be empty");
  if (record.flagged || record.invalidatedBy) throw new Error("Unieważniona pochodna wymaga odbudowy z dokładnych bieżących źródeł");
  const current = Object.freeze({ ...record, id, version: record.version + 1, content: String(content).trim(), author: "damian",
    informationType: record.informationType === "extracted_fact" ? "extracted_fact" : null,
    reviewState: "approved", derivedFrom: [...new Set([...record.derivedFrom, exactRef(record)])], supersedes: exactRef(record),
    supersededBy: null, flagged: false, placeholder: false, creationMode: "manual_or_edit" });
  return { previous: Object.freeze({ ...record, supersededBy: exactRef(current) }), current };
}

export function invalidateDerivative(record, changedRef) {
  const current = Object.freeze({ ...record, version: record.version + 1, reviewState: "needs_review", flagged: true,
    invalidatedBy: changedRef, supersedes: exactRef(record), supersededBy: null });
  return { previous: Object.freeze({ ...record, supersededBy: exactRef(current) }), current };
}

export function isCandidateDomainValid(record) {
  if (record.operationalRole !== "candidate_observation_domain") return true;
  const fields = record.fields || {};
  return ["purpose", "observe", "stopCriteria", "decisionImpact"].every(key => String(fields[key] || "").trim());
}

export function reviewGate({ records, moduleRecords }) {
  const active = activeRecords(records);
  const blockers = [];
  for (const record of active) {
    if (record.reviewState === "needs_review") blockers.push(`${exactRef(record)} wymaga przeglądu`);
    if (record.flagged) blockers.push(`${exactRef(record)} ma flagę`);
    if (record.placeholder) blockers.push(`${exactRef(record)} jest placeholderem`);
    if (!record.derivedFrom?.length) blockers.push(`${exactRef(record)} nie ma pochodzenia`);
    if (!isCandidateDomainValid(record)) blockers.push(`${exactRef(record)} nie ma pełnego kontraktu domeny`);
  }
  for (const module of activeRecords(moduleRecords || [])) {
    if (!module.sourceRef || !module.derivedFrom?.includes(module.sourceRef) || !module.reason || !module.eventType) {
      blockers.push(`Moduł ${module.moduleId} nie ma pełnego pochodzenia`);
    }
    if (module.state === "active_incomplete") blockers.push(`Moduł ${module.moduleId} jest aktywny i niekompletny`);
  }
  return { ready: blockers.length === 0, blockers };
}

export function makePreparationRecords({ fixture, responses, mode }) {
  if (!fixture?.fictional) throw new Error("Fictional fixture is required");
  if (!['fictional_assisted', 'manual_fallback'].includes(mode)) throw new Error("Unsupported preparation mode");
  assertCaseIsolation(fixture.id, responses);
  if (mode === "manual_fallback") return [];
  const responseById = new Map(activeRecords(responses).map(response => [response.questionRef.split("#")[1], response]));
  const refsFor = ids => ids.map(id => exactRef(responseById.get(id)));
  const sourcesFor = ids => ids.map(id => responseById.get(id));
  const records = [];
  for (const item of fixture.preparation.facts || []) records.push(makeDerivative({ id: item.id, content: item.content, informationType: "extracted_fact", operationalRole: "reviewed_fact", section: "facts", derivedFrom: refsFor(item.refs), sourceObjects: sourcesFor(item.refs), caseId: fixture.id }));
  for (const item of fixture.preparation.issues || []) records.push(makeDerivative({ id: item.id, content: item.content, operationalRole: item.role || "preparation_gap", section: "issues", derivedFrom: refsFor(item.refs), sourceObjects: sourcesFor(item.refs), caseId: fixture.id }));
  for (const item of fixture.preparation.hypotheses || []) records.push(makeDerivative({ id: item.id, content: item.content, informationType: "ai_hypothesis", operationalRole: "coaching_hypothesis", section: "hypotheses", derivedFrom: refsFor(item.refs), sourceObjects: sourcesFor(item.refs), uncertainty: item.uncertainty, caseId: fixture.id }));
  for (const item of fixture.preparation.questions || []) records.push(makeDerivative({ id: item.id, content: item.content, operationalRole: "pwd_question", section: "questions", derivedFrom: refsFor(item.refs), sourceObjects: sourcesFor(item.refs), caseId: fixture.id }));
  for (const item of fixture.preparation.domains || []) records.push(makeDerivative({ id: item.id, content: item.purpose, operationalRole: "candidate_observation_domain", section: "domains", derivedFrom: refsFor(item.refs), sourceObjects: sourcesFor(item.refs), fields: { purpose: item.purpose, observe: item.observe, stopCriteria: item.stopCriteria, decisionImpact: item.decisionImpact }, caseId: fixture.id }));
  return records;
}

export function addManualRecord({ id, content, section, role, caseId, derivedFrom, sourceObjects, actor = "damian" }) {
  const informationType = section === "facts" ? "extracted_fact" : section === "hypotheses" ? "trainer_interpretation" : null;
  return makeDerivative({ id, content, author: actor, informationType, operationalRole: role, section, derivedFrom,
    sourceObjects, reviewState: "approved", caseId });
}

export function assertCaseIsolation(caseId, objects) {
  const foreign = objects.filter(object => object.caseId !== caseId);
  if (foreign.length) throw new Error("Cross-case reference denied");
  return true;
}

export function assembleBrief({ id = "brief", previous = null, caseId, submission, responses, records, moduleRecords, now }) {
  const currentResponses = activeRecords(responses);
  const currentModules = activeRecords(moduleRecords || []);
  assertCaseIsolation(caseId, [submission, ...currentResponses, ...activeRecords(records), ...currentModules]);
  const gate = reviewGate({ records, moduleRecords });
  if (!gate.ready) throw new Error(`Brief blocked: ${gate.blockers.join("; ")}`);
  const active = activeRecords(records).filter(record => record.reviewState === "approved");
  const goal = currentResponses.find(response => response.questionRef.endsWith("#A1"));
  const version = previous ? previous.version + 1 : 1;
  return Object.freeze({ id, version, caseId, status: "active", author: "damian", operationalRole: "trainer_pwd_brief", assembledAt: now,
    submissionRef: exactRef(submission), inputRevision: version,
    derivedFrom: [exactRef(submission), ...currentResponses.map(exactRef), ...currentModules.map(exactRef), ...active.map(exactRef)],
    supersedes: previous ? exactRef(previous) : null, supersededBy: null,
    sections: Object.freeze({
      client_goal: goal?.state === "answered" ? [{ content: goal.content, refs: [exactRef(goal)] }] : [],
      reviewed_facts: active.filter(record => record.section === "facts"),
      gaps_and_conflicts: active.filter(record => record.section === "issues" && record.operationalRole !== "caution_signal"),
      caution_signals: active.filter(record => record.operationalRole === "caution_signal"),
      coaching_hypotheses: active.filter(record => record.section === "hypotheses"),
      pwd_questions: active.filter(record => record.section === "questions"),
      candidate_domains: active.filter(record => record.section === "domains"),
      trainer_decision_required: [{ content: "Damian wybiera gotowość; system nie wybiera decyzji." }],
      unknowns_and_limits: [{ content: "Brak odpowiedzi nie oznacza nie. Ankieta i brief nie diagnozują ani nie ustalają bezpieczeństwa." }]
    }) });
}

export function eligibleEvidence({ caseId, records, responses }) {
  const evidence = [
    ...activeRecords(responses).filter(response => response.state === "answered" && response.reviewState === "approved"),
    ...activeRecords(records).filter(record => record.reviewState === "approved" && !record.flagged && !record.invalidatedBy
      && ["extracted_fact", "trainer_observation", "trainer_interpretation"].includes(record.informationType))
  ];
  assertCaseIsolation(caseId, evidence);
  return evidence;
}

export function saveReadinessDecision({ id = "readiness-decision", previous = null, caseId, value, rationale, evidence, records, responses, brief, now }) {
  if (!READINESS_DECISIONS.includes(value)) throw new Error("Explicit readiness decision is required");
  if (!String(rationale).trim()) throw new Error("Decision rationale is required");
  if (!brief || brief.status !== "active") throw new Error("Active brief is required");
  assertCaseIsolation(caseId, [brief, ...(evidence || [])]);
  const eligible = new Set(eligibleEvidence({ caseId, records, responses }).map(exactRef));
  if (!evidence?.length) throw new Error("At least one reviewed evidence item is required");
  for (const item of evidence) {
    if (!eligible.has(exactRef(item))) throw new Error(`Evidence is not the exact current reviewed version: ${exactRef(item)}`);
  }
  const version = previous ? previous.version + 1 : 1;
  return Object.freeze({ id, version, caseId, value, rationale: String(rationale).trim(), author: "damian", informationType: assertInformationType("trainer_decision"),
    operationalRole: "pwd_readiness_decision", status: "active", createdAt: now, inputRevision: brief.inputRevision,
    evidenceRefs: evidence.map(exactRef), derivedFrom: [exactRef(brief), ...evidence.map(exactRef)],
    supersedes: previous ? exactRef(previous) : null, supersededBy: null });
}

export function invalidateDownstream({ brief, decision }, changedRef) {
  return {
    brief: brief ? Object.freeze({ ...brief, status: "invalidated", invalidatedBy: changedRef }) : null,
    decision: decision ? Object.freeze({ ...decision, status: "invalidated", invalidatedBy: changedRef }) : null
  };
}

export function createAuditEvent({ id, eventType, actor, object, related = [], outcome, time }) {
  if (!actor || !object) throw new Error("Audit actor and object are required");
  return Object.freeze({ id, eventType, actor, objectRef: exactRef(object), relatedRefs: related.map(exactRef), outcome, time });
}
