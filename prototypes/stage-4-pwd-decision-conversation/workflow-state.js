export const INFORMATION_TYPES = Object.freeze([
  "source_artifact", "source_fact", "extracted_fact", "trainer_observation",
  "ai_hypothesis", "ai_suggestion", "trainer_interpretation", "trainer_decision", "client_material"
]);
export const DECISIONS = Object.freeze(["START", "START_CONDITIONAL", "DEFER_CONSULT", "NOT_THIS_PRODUCT"]);
export const COMPARABILITY = Object.freeze(["comparable", "not_comparable", "unknown"]);
export const OBSERVATION_STATES = Object.freeze(["performed", "skipped", "stopped"]);
export const REVIEW_ACTIONS = Object.freeze(["approve", "edit", "reject"]);

const clean = value => String(value ?? "").trim();
const immutable = value => Object.freeze(value);

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
    candidates: Object.freeze(candidates),
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

export function createWorkspace({ fixture, handoff }) {
  assertHandoff(handoff, fixture.id);
  return immutable({
    ...base({
      id: `${fixture.id}-stage4a-workspace`,
      caseId: fixture.id,
      operationalRole: "pwd_decision_workspace",
      author: "damian",
      derivedFrom: [exactRef(handoff)]
    }),
    taskId: "conduct_pwd_and_record_trainer_decision",
    contractVersion: "stage4-v1",
    currentHandoffRef: exactRef(handoff)
  });
}

export function makeTanitaPackage({ fixture, handoff }) {
  assertHandoff(handoff, fixture.id);
  if (!fixture.tanita) return null;
  if (!fixture.tanita.fictional) throw new Error("Only a fictional prepared Tanita package is allowed.");
  const source = immutable({
    ...base({
      id: `${fixture.id}-${fixture.tanita.id}-source`,
      caseId: fixture.id,
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
  return immutable({ source, facts: Object.freeze(facts) });
}

export function assessComparability({ workspace, tanitaPackage, value, rationale }) {
  if (!tanitaPackage?.source) throw new Error("No Tanita package to assess.");
  assertCaseIsolation(workspace.caseId, [workspace, tanitaPackage.source, ...tanitaPackage.facts]);
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  oneOf(value, COMPARABILITY, "Explicit Tanita comparability required.");
  return immutable({
    ...base({
      id: `${workspace.caseId}-tanita-comparability`,
      caseId: workspace.caseId,
      informationType: "trainer_interpretation",
      operationalRole: "tanita_comparability_assessment",
      author: "damian",
      derivedFrom: [exactRef(workspace), exactRef(tanitaPackage.source), ...tanitaPackage.facts.map(exactRef)]
    }),
    value,
    rationale: requireValue(rationale, "Comparability rationale required."),
    reviewState: "approved"
  });
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
  const observation = immutable({
    ...base({
      id: `${workspace.caseId}-observation-${candidate.id}`,
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
      id: `${workspace.caseId}-reaction-${candidate.id}`,
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

export function saveTrainerInterpretation({ workspace, evidence, content, uncertainty }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  assertCaseIsolation(workspace.caseId, [workspace, ...evidence]);
  if (!evidence.length) throw new Error("Interpretation requires exact evidence.");
  return immutable({
    ...base({
      id: `${workspace.caseId}-trainer-interpretation`,
      caseId: workspace.caseId,
      informationType: "trainer_interpretation",
      operationalRole: "pwd_trainer_interpretation",
      author: "damian",
      derivedFrom: [exactRef(workspace), ...evidence.map(exactRef)]
    }),
    content: requireValue(content, "Trainer interpretation required."),
    uncertainty: requireValue(uncertainty, "Uncertainty statement required."),
    reviewState: "approved"
  });
}

const forbiddenSuggestion = /\b(START|START_CONDITIONAL|DEFER_CONSULT|NOT_THIS_PRODUCT)\b|warunek rozpoczęcia|powinien rozpocząć|kwalifikuje|diagnoz|sprzeda|kup/i;

export function makeSimulatedSuggestions({ fixture, workspace, evidence }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  assertCaseIsolation(workspace.caseId, [workspace, ...evidence]);
  return Object.freeze((fixture.suggestions || []).map((content, index) => {
    if (forbiddenSuggestion.test(content)) throw new Error("Simulated AI may not suggest a decision, condition, diagnosis, or sale.");
    return immutable({
      ...base({
        id: `${workspace.caseId}-conversation-suggestion-${index + 1}`,
        caseId: workspace.caseId,
        informationType: "ai_suggestion",
        operationalRole: "conversation_option",
        author: "fictional_ai",
        derivedFrom: [exactRef(workspace), ...evidence.map(exactRef)]
      }),
      content,
      reviewState: "needs_review",
      creationMode: "deterministic_fixture"
    });
  }));
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

export function addManualConversationOption({ workspace, content }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  return immutable({
    ...base({
      id: `${workspace.caseId}-manual-conversation-${Math.abs(clean(content).length)}`,
      caseId: workspace.caseId,
      operationalRole: "conversation_option",
      author: "damian",
      derivedFrom: [exactRef(workspace)]
    }),
    content: requireValue(content, "Manual conversation note required."),
    reviewState: "approved",
    creationMode: "manual"
  });
}

export function conversationGate(records) {
  const pending = records.filter(item => item.status === "active" && item.informationType === "ai_suggestion" && item.reviewState === "needs_review");
  return immutable({ ready: pending.length === 0, pending: Object.freeze(pending.map(exactRef)) });
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
  return Object.freeze(supplied.map(immutable));
}

export function saveDecision({ workspace, value, rationale, evidence, conditions = [] }) {
  if (workspace.status !== "active") throw new Error("Active workspace required.");
  oneOf(value, DECISIONS, "Explicit Stage 4A decision required.");
  if (!evidence.length) throw new Error("Decision requires exact current evidence.");
  assertCaseIsolation(workspace.caseId, [workspace, ...evidence]);
  for (const object of evidence) {
    if (object.status !== "active") throw new Error("Decision evidence must be current and active.");
  }
  return immutable({
    ...base({
      id: `${workspace.caseId}-stage4a-decision`,
      caseId: workspace.caseId,
      informationType: "trainer_decision",
      operationalRole: "pwd_outcome",
      author: "damian",
      derivedFrom: [exactRef(workspace), ...evidence.map(exactRef)]
    }),
    value,
    rationale: requireValue(rationale, "Decision rationale required."),
    conditions: normalizeConditions(value, conditions),
    reviewState: "approved"
  });
}

export function makeFollowupDraft({ decision, content }) {
  if (decision.status !== "active") throw new Error("Active decision required before a follow-up draft.");
  return immutable({
    ...base({
      id: `${decision.caseId}-followup-draft`,
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
  if (!object || object.status !== "active") return object ? [object] : [];
  const nextRef = `${object.id}@v${object.version + 1}`;
  return [
    immutable({ ...object, status: "superseded", supersededBy: nextRef }),
    immutable({ ...object, version: object.version + 1, status: "invalidated", invalidatedBy, supersedes: exactRef(object) })
  ];
}

export function materialHandoffChange({ handoff, workspace, downstream = [], summary }) {
  assertCaseIsolation(handoff.caseId, [handoff, workspace, ...downstream]);
  const nextHandoff = immutable({
    ...handoff,
    version: handoff.version + 1,
    status: "active",
    summary: requireValue(summary, "Material handoff change summary required."),
    supersedes: exactRef(handoff)
  });
  const previousHandoff = immutable({ ...handoff, status: "superseded", supersededBy: exactRef(nextHandoff) });
  const invalidatedBy = exactRef(nextHandoff);
  return immutable({
    handoffs: Object.freeze([previousHandoff, nextHandoff]),
    workspaces: Object.freeze(transitionInvalidated(workspace, invalidatedBy)),
    downstream: Object.freeze(downstream.flatMap(item => transitionInvalidated(item, invalidatedBy)))
  });
}
