export const INFORMATION_TYPES = Object.freeze([
  "source_artifact", "source_fact", "extracted_fact", "trainer_observation",
  "ai_hypothesis", "ai_suggestion", "trainer_interpretation", "trainer_decision", "client_material"
]);
export const DECISIONS = Object.freeze(["START", "START_CONDITIONAL", "DEFER_CONSULT", "NOT_THIS_PRODUCT"]);
export const COMPARABILITY = Object.freeze(["comparable", "not_comparable", "unknown"]);
export const OBSERVATION_STATES = Object.freeze(["performed", "skipped", "stopped"]);
export const REVIEW_ACTIONS = Object.freeze(["approve", "edit", "reject"]);
export const CONVERSATION_MODES = Object.freeze(["assisted", "manual"]);

const clean = value => String(value ?? "").trim();

function immutable(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) immutable(nested);
  return Object.freeze(value);
}

function requireValue(value, message) {
  if (!clean(value)) throw new Error(message);
  return clean(value);
}

function oneOf(value, allowed, message) {
  if (!allowed.includes(value)) throw new Error(message);
  return value;
}

export function exactRef(object) {
  if (!object?.id || !Number.isInteger(object?.version)) throw new Error("Exact versioned object required.");
  return `${object.id}@v${object.version}`;
}

export function assertInformationType(value) {
  return oneOf(value, INFORMATION_TYPES, `Unapproved information_type: ${value}`);
}

export function assertCaseIsolation(caseId, objects) {
  for (const object of objects.filter(Boolean)) {
    if (object.caseId !== caseId) throw new Error("Cross-case reference denied before mutation.");
  }
  return true;
}

function base({ id, caseId, version = 1, informationType = null, operationalRole, author, derivedFrom = [] }) {
  if (informationType) assertInformationType(informationType);
  if (!Number.isInteger(version) || version < 1) throw new Error("Positive object version required.");
  return {
    id: requireValue(id, "Object id required."),
    caseId: requireValue(caseId, "Case id required."),
    version,
    informationType,
    operationalRole: requireValue(operationalRole, "Operational role required."),
    author: requireValue(author, "Author required."),
    derivedFrom: [...derivedFrom],
    status: "active",
    visibility: "trainer_only",
    publicationState: "unpublished"
  };
}

function assertAppendable(previous, { id, caseId, operationalRole }) {
  if (!previous) return;
  assertCaseIsolation(caseId, [previous]);
  if (previous.id !== id || previous.operationalRole !== operationalRole) {
    throw new Error("Previous version does not belong to this record lineage.");
  }
  if (!["active", "invalidated"].includes(previous.status)) {
    throw new Error("Only an active or invalidated lineage tip can receive a new version.");
  }
}

function appendTransition(previous, current) {
  if (!previous) return immutable({ previous: null, current });
  const priorRef = exactRef(previous);
  if (current.supersedes !== priorRef || current.version !== previous.version + 1) {
    throw new Error("Append-only version chain is incomplete.");
  }
  if (previous.status === "invalidated") {
    return immutable({ previous: null, current, lineageFrom: priorRef });
  }
  return immutable({
    previous: immutable({ ...previous, status: "superseded", supersededBy: exactRef(current) }),
    current
  });
}

export function makeHandoff(fixture) {
  const candidates = fixture.candidates.map(item => immutable({ ...item }));
  return immutable({
    ...base({
      id: `${fixture.id}-stage3-handoff`,
      caseId: fixture.id,
      informationType: "trainer_decision",
      operationalRole: "stage3_pwd_readiness_handoff",
      author: "damian"
    }),
    decision: "READY_TO_PREPARE_PWD",
    summary: fixture.handoffSummary,
    sourceStatement: fixture.sourceStatement,
    candidates,
    reviewState: "approved"
  });
}

function assertHandoff(handoff, caseId) {
  assertCaseIsolation(caseId, [handoff]);
  if (handoff.status !== "active" || handoff.decision !== "READY_TO_PREPARE_PWD") {
    throw new Error("Active READY_TO_PREPARE_PWD handoff required.");
  }
  for (const candidate of handoff.candidates || []) {
    for (const key of ["purpose", "observe", "stopCriteria", "decisionImpact"]) {
      requireValue(candidate[key], `Candidate ${candidate.id} missing ${key}.`);
    }
  }
}

export function createWorkspace({ fixture, handoff, previousWorkspace = null }) {
  assertHandoff(handoff, fixture.id);
  const id = `${fixture.id}-stage4a-workspace`;
  if (previousWorkspace) {
    assertCaseIsolation(fixture.id, [previousWorkspace]);
    if (previousWorkspace.id !== id || previousWorkspace.status !== "invalidated") {
      throw new Error("A new workspace requires the invalidated previous workspace.");
    }
    if (previousWorkspace.invalidatedBy !== exactRef(handoff)) {
      throw new Error("New workspace must use the exact handoff that invalidated the previous workspace.");
    }
  }
  const version = previousWorkspace ? previousWorkspace.version + 1 : 1;
  return immutable({
    ...base({
      id,
      caseId: fixture.id,
      version,
      operationalRole: "pwd_decision_workspace",
      author: "damian",
      derivedFrom: [exactRef(handoff)]
    }),
    taskId: "conduct_pwd_and_record_trainer_decision",
    contractVersion: "stage4-v1",
    currentHandoffRef: exactRef(handoff),
    ...(previousWorkspace ? { supersedes: exactRef(previousWorkspace) } : {})
  });
}

export function makeTanitaPackage({ fixture, handoff }) {
  assertHandoff(handoff, fixture.id);
  if (!fixture.tanita) return null;
  if (!fixture.tanita.fictional) throw new Error("Only a fictional prepared Tanita package is allowed.");
  const version = handoff.version;
  const source = immutable({
    ...base({
      id: `${fixture.id}-${fixture.tanita.id}-source`,
      caseId: fixture.id,
      version,
      informationType: "source_artifact",
      operationalRole: "prepared_fictional_tanita_package",
      author: "fictional_fixture",
      derivedFrom: [exactRef(handoff)]
    }),
    fictional: true,
    immutable: true,
    sourceProfile: fixture.tanita.profile,
    manifestHash: fixture.tanita.manifestHash,
    context: fixture.tanita.context
  });
  const facts = fixture.tanita.fields.map((field, index) => immutable({
    ...base({
      id: `${fixture.id}-tanita-fact-${index + 1}`,
      caseId: fixture.id,
      version,
      informationType: "extracted_fact",
      operationalRole: "prepared_fictional_tanita_fact",
      author: "fictional_fixture",
      derivedFrom: [exactRef(source)]
    }),
    key: field.key,
    label: field.label,
    value: field.value,
    sourceLocator: field.locator,
    reviewState: "approved"
  }));
  return immutable({ source, facts });
}

export function assessComparability({ workspace, tanitaPackage, value, rationale, previous = null }) {
  if (!tanitaPackage?.source) throw new Error("No Tanita package to assess.");
  assertCaseIsolation(workspace.caseId, [workspace, tanitaPackage.source, ...tanitaPackage.facts]);
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  oneOf(value, COMPARABILITY, "Explicit Tanita comparability required.");
  const id = `${workspace.caseId}-workspace-${workspace.version}-tanita-comparability`;
  const operationalRole = "tanita_comparability_assessment";
  assertAppendable(previous, { id, caseId: workspace.caseId, operationalRole });
  const version = previous ? previous.version + 1 : 1;
  const current = immutable({
    ...base({
      id,
      caseId: workspace.caseId,
      version,
      informationType: "trainer_interpretation",
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(workspace), exactRef(tanitaPackage.source), ...tanitaPackage.facts.map(exactRef)]
    }),
    value,
    rationale: requireValue(rationale, "Comparability rationale required."),
    reviewState: "approved",
    ...(previous ? { supersedes: exactRef(previous) } : {})
  });
  return appendTransition(previous, current);
}

function findCandidate(handoff, candidateId) {
  const candidate = (handoff.candidates || []).find(item => item.id === candidateId);
  if (!candidate) throw new Error("Candidate is not present in the current handoff.");
  return candidate;
}

export function recordObservation({ workspace, handoff, candidateId, executionState, observationText, clientReaction }) {
  assertCaseIsolation(workspace.caseId, [workspace, handoff]);
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  if (workspace.currentHandoffRef !== exactRef(handoff)) throw new Error("Workspace handoff is stale.");
  oneOf(executionState, OBSERVATION_STATES, "Explicit observation execution state required.");
  const candidate = findCandidate(handoff, candidateId);
  const candidateRef = `${exactRef(handoff)}#candidate:${candidate.id}`;
  const entityPrefix = `${workspace.caseId}-workspace-${workspace.version}`;
  const observation = immutable({
    ...base({
      id: `${entityPrefix}-observation-${candidate.id}`,
      caseId: workspace.caseId,
      informationType: "trainer_observation",
      operationalRole: "selected_pwd_observation",
      author: "damian",
      derivedFrom: [exactRef(workspace), exactRef(handoff), candidateRef]
    }),
    candidateId,
    candidateLabel: candidate.label,
    executionState,
    content: requireValue(observationText, "Observation or skip/stop reason required."),
    reviewState: "approved"
  });
  const reactionText = clean(clientReaction);
  const reaction = reactionText ? immutable({
    ...base({
      id: `${entityPrefix}-reaction-${candidate.id}`,
      caseId: workspace.caseId,
      informationType: "source_fact",
      operationalRole: "client_reaction_during_pwd",
      author: "fictional_client",
      derivedFrom: [exactRef(workspace), exactRef(observation)]
    }),
    content: reactionText,
    reviewState: "needs_review"
  }) : null;
  return immutable({ observation, reaction });
}

export function saveTrainerInterpretation({ workspace, evidence, content, uncertainty, previous = null }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  assertCaseIsolation(workspace.caseId, [workspace, ...evidence]);
  if (!evidence.length) throw new Error("Interpretation requires exact evidence.");
  for (const object of evidence) {
    if (object.status !== "active") throw new Error("Interpretation evidence must be current and active.");
  }
  const id = `${workspace.caseId}-workspace-${workspace.version}-trainer-interpretation`;
  const operationalRole = "pwd_trainer_interpretation";
  assertAppendable(previous, { id, caseId: workspace.caseId, operationalRole });
  const version = previous ? previous.version + 1 : 1;
  const current = immutable({
    ...base({
      id,
      caseId: workspace.caseId,
      version,
      informationType: "trainer_interpretation",
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(workspace), ...evidence.map(exactRef)]
    }),
    content: requireValue(content, "Trainer interpretation required."),
    uncertainty: requireValue(uncertainty, "Uncertainty statement required."),
    reviewState: "approved",
    ...(previous ? { supersedes: exactRef(previous) } : {})
  });
  return appendTransition(previous, current);
}

const forbiddenSuggestion = /\b(START|START_CONDITIONAL|DEFER_CONSULT|NOT_THIS_PRODUCT)\b|warunek rozpoczęcia|powinien rozpocząć|kwalifikuje|diagnoz|sprzeda|kup/i;

export function makeSimulatedSuggestions({ fixture, workspace, evidence, run }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  assertCaseIsolation(workspace.caseId, [workspace, run, ...evidence]);
  if (!run || run.status !== "active" || run.mode !== "assisted") {
    throw new Error("Active assisted conversation run required.");
  }
  return immutable((fixture.suggestions || []).map((content, index) => {
    if (forbiddenSuggestion.test(content)) throw new Error("Simulated AI may not suggest a decision, condition, diagnosis, or sale.");
    return immutable({
      ...base({
        id: `${workspace.caseId}-workspace-${workspace.version}-run-${run.version}-suggestion-${index + 1}`,
        caseId: workspace.caseId,
        informationType: "ai_suggestion",
        operationalRole: "conversation_option",
        author: "fictional_ai",
        derivedFrom: [exactRef(workspace), exactRef(run), ...evidence.map(exactRef)]
      }),
      content,
      reviewState: "needs_review",
      creationMode: "deterministic_fixture",
      conversationRunRef: exactRef(run)
    });
  }));
}

export function prepareConversationRun({ fixture, workspace, evidence, mode, previousRun = null, activeSuggestions = [] }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  oneOf(mode, CONVERSATION_MODES, "Explicit conversation preparation mode required.");
  assertCaseIsolation(workspace.caseId, [workspace, previousRun, ...evidence, ...activeSuggestions]);
  const id = `${workspace.caseId}-workspace-${workspace.version}-conversation-run`;
  const operationalRole = "conversation_preparation_run";
  assertAppendable(previousRun, { id, caseId: workspace.caseId, operationalRole });
  const version = previousRun ? previousRun.version + 1 : 1;
  const current = immutable({
    ...base({
      id,
      caseId: workspace.caseId,
      version,
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(workspace), ...evidence.map(exactRef)]
    }),
    mode,
    reviewState: "approved",
    ...(previousRun ? { supersedes: exactRef(previousRun) } : {})
  });
  const runTransition = appendTransition(previousRun, current);
  const suggestionTransitions = activeSuggestions
    .filter(item => item.status === "active")
    .map(item => transitionInvalidated(item, exactRef(current)));
  const suggestions = mode === "assisted"
    ? makeSimulatedSuggestions({ fixture, workspace, evidence, run: current })
    : immutable([]);
  return immutable({ runTransition, suggestionTransitions, suggestions });
}

export function reviewSuggestion(record, action, editedContent = "") {
  oneOf(action, REVIEW_ACTIONS, "Unsupported suggestion review action.");
  if (record.status !== "active" || record.reviewState !== "needs_review") {
    throw new Error("Only an active needs_review suggestion can be reviewed.");
  }
  const nextRef = `${record.id}@v${record.version + 1}`;
  const previous = immutable({ ...record, status: "superseded", supersededBy: nextRef });
  if (action === "edit") {
    const current = immutable({
      ...record,
      version: record.version + 1,
      informationType: null,
      author: "damian",
      content: requireValue(editedContent, "Edited conversation option required."),
      reviewState: "approved",
      creationMode: "trainer_edit",
      derivedFrom: [...record.derivedFrom, exactRef(record)],
      supersedes: exactRef(record)
    });
    return immutable({ previous, current });
  }
  const current = immutable({
    ...record,
    version: record.version + 1,
    reviewState: action === "approve" ? "approved" : "rejected",
    status: action === "reject" ? "rejected" : "active",
    reviewedBy: "damian",
    supersedes: exactRef(record)
  });
  return immutable({ previous, current });
}

function deterministicHash(content) {
  let hash = 2166136261;
  for (const character of content) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function addManualConversationOption({ workspace, content, existingRecords = [] }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  assertCaseIsolation(workspace.caseId, [workspace, ...existingRecords]);
  const normalized = requireValue(content, "Manual conversation note required.");
  const sequence = existingRecords.filter(item => item.operationalRole === "conversation_option" && item.creationMode === "manual").length + 1;
  return immutable({
    ...base({
      id: `${workspace.caseId}-workspace-${workspace.version}-manual-${sequence}-${deterministicHash(normalized)}`,
      caseId: workspace.caseId,
      operationalRole: "conversation_option",
      author: "damian",
      derivedFrom: [exactRef(workspace)]
    }),
    content: normalized,
    reviewState: "approved",
    creationMode: "manual",
    sequence
  });
}

export function conversationGate(records) {
  const pending = records.filter(item => item.status === "active" && item.informationType === "ai_suggestion" && item.reviewState === "needs_review");
  return immutable({ ready: pending.length === 0, pending: pending.map(exactRef) });
}

function normalizeConditions(value, conditions) {
  const supplied = (conditions || []).map(item => ({
    statement: clean(item.statement),
    verification: clean(item.verification),
    author: "damian"
  })).filter(item => item.statement || item.verification);
  if (value === "START_CONDITIONAL") {
    if (!supplied.length || supplied.some(item => !item.statement || !item.verification)) {
      throw new Error("START_CONDITIONAL requires complete Damian-authored conditions.");
    }
  } else if (supplied.length) {
    throw new Error("Conditions are allowed only for START_CONDITIONAL.");
  }
  return immutable(supplied);
}

function assertTanitaEvidence(workspace, evidence) {
  const facts = evidence.filter(item => item.operationalRole === "prepared_fictional_tanita_fact");
  if (!facts.length) return;
  const comparisons = evidence.filter(item => item.operationalRole === "tanita_comparability_assessment" && item.status === "active");
  if (comparisons.length !== 1) {
    throw new Error("Tanita facts require one active exact-package comparability interpretation.");
  }
  const comparison = comparisons[0];
  if (!comparison.derivedFrom.includes(exactRef(workspace))) {
    throw new Error("Tanita comparability does not belong to the current workspace.");
  }
  for (const fact of facts) {
    const sourceRef = fact.derivedFrom[0];
    if (!comparison.derivedFrom.includes(exactRef(fact)) || !comparison.derivedFrom.includes(sourceRef)) {
      throw new Error("Tanita facts require one active exact-package comparability interpretation.");
    }
  }
}

export function saveDecision({ workspace, value, rationale, evidence, conditions = [], conversationRecords, previous = null }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  oneOf(value, DECISIONS, "Explicit Stage 4A decision required.");
  if (!Array.isArray(conversationRecords)) throw new Error("Conversation records required for the domain decision gate.");
  assertCaseIsolation(workspace.caseId, [workspace, ...conversationRecords]);
  const gate = conversationGate(conversationRecords);
  if (!gate.ready) throw new Error("Conversation gate blocked by active needs_review suggestions.");
  if (!evidence.length) throw new Error("Decision requires exact current evidence.");
  assertCaseIsolation(workspace.caseId, [workspace, ...evidence]);
  for (const object of evidence) {
    if (object.status !== "active") throw new Error("Decision evidence must be current and active.");
  }
  assertTanitaEvidence(workspace, evidence);
  const id = `${workspace.caseId}-workspace-${workspace.version}-stage4a-decision`;
  const operationalRole = "pwd_outcome";
  assertAppendable(previous, { id, caseId: workspace.caseId, operationalRole });
  const version = previous ? previous.version + 1 : 1;
  const current = immutable({
    ...base({
      id,
      caseId: workspace.caseId,
      version,
      informationType: "trainer_decision",
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(workspace), ...evidence.map(exactRef)]
    }),
    value,
    rationale: requireValue(rationale, "Decision rationale required."),
    conditions: normalizeConditions(value, conditions),
    reviewState: "approved",
    ...(previous ? { supersedes: exactRef(previous) } : {})
  });
  return appendTransition(previous, current);
}

export function makeFollowupDraft({ decision, content }) {
  if (decision.status !== "active") throw new Error("Active decision required before a follow-up draft.");
  return immutable({
    ...base({
      id: `${decision.id}-v${decision.version}-followup-draft`,
      caseId: decision.caseId,
      informationType: "client_material",
      operationalRole: "unsent_followup_draft",
      author: "damian",
      derivedFrom: [exactRef(decision)]
    }),
    content: requireValue(content, "Follow-up draft content required."),
    reviewState: "needs_review",
    publicationState: "unpublished",
    visibility: "trainer_only",
    sendCapability: "none"
  });
}

function transitionInvalidated(object, invalidatedBy) {
  if (!object || object.status !== "active") return null;
  const nextRef = `${object.id}@v${object.version + 1}`;
  return immutable({
    previous: immutable({ ...object, status: "superseded", supersededBy: nextRef }),
    current: immutable({ ...object, version: object.version + 1, status: "invalidated", invalidatedBy, supersedes: exactRef(object) })
  });
}

export function invalidateDependentRecords({ changedRecords, records, invalidatedBy }) {
  const roots = new Set(changedRecords.map(item => typeof item === "string" ? item : exactRef(item)));
  const active = records.filter(item => item?.status === "active");
  const caseIds = new Set(active.concat(changedRecords.filter(item => typeof item !== "string")).map(item => item.caseId));
  if (caseIds.size > 1) throw new Error("Cross-case reference denied before mutation.");
  const transitions = [];
  let found = true;
  while (found) {
    found = false;
    for (const record of active) {
      if (transitions.some(item => exactRef(item.previous) === exactRef(record))) continue;
      if ((record.derivedFrom || []).some(reference => roots.has(reference))) {
        const transition = transitionInvalidated(record, invalidatedBy);
        if (transition) {
          transitions.push(transition);
          roots.add(exactRef(record));
          found = true;
        }
      }
    }
  }
  return immutable(transitions);
}

export function materialHandoffChange({ handoff, workspace, downstream = [], summary }) {
  assertCaseIsolation(handoff.caseId, [handoff, workspace, ...downstream]);
  if (handoff.status !== "active" || workspace.status !== "active") throw new Error("Active handoff and workspace required.");
  const nextHandoff = immutable({
    ...handoff,
    version: handoff.version + 1,
    status: "active",
    summary: requireValue(summary, "Material handoff change summary required."),
    supersedes: exactRef(handoff)
  });
  const previousHandoff = immutable({ ...handoff, status: "superseded", supersededBy: exactRef(nextHandoff) });
  const invalidatedBy = exactRef(nextHandoff);
  const workspaceTransition = transitionInvalidated(workspace, invalidatedBy);
  const downstreamTransitions = downstream.filter(item => item.status === "active").map(item => transitionInvalidated(item, invalidatedBy));
  return immutable({
    handoffs: [previousHandoff, nextHandoff],
    workspaceTransition,
    downstreamTransitions,
    workspaces: [workspaceTransition.previous, workspaceTransition.current],
    downstream: downstreamTransitions.flatMap(item => [item.previous, item.current])
  });
}
