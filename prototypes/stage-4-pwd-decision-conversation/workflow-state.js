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

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createSessionAggregate({ caseId, records }) {
  requireValue(caseId, "Session aggregate case id required.");
  if (!Array.isArray(records)) throw new Error("Session aggregate records required.");
  assertCaseIsolation(caseId, records);
  const byRef = Object.create(null);
  for (const record of records.filter(Boolean)) {
    const reference = exactRef(record);
    if (byRef[reference] && stableSerialize(byRef[reference]) !== stableSerialize(record)) {
      throw new Error(`Conflicting canonical record for ${reference}.`);
    }
    byRef[reference] = record;
  }
  const canonicalRecords = Object.values(byRef);
  const lineages = new Map();
  for (const record of canonicalRecords) {
    if (!lineages.has(record.id)) lineages.set(record.id, []);
    lineages.get(record.id).push(record);
  }
  const currentById = Object.create(null);
  for (const [id, lineage] of lineages) {
    lineage.sort((left, right) => left.version - right.version);
    for (let index = 0; index < lineage.length; index += 1) {
      const record = lineage[index];
      const expectedVersion = index + 1;
      if (record.version !== expectedVersion) {
        throw new Error(`Canonical lineage must be continuous for ${id}: expected v${expectedVersion}, received v${record.version}.`);
      }
      if (index === 0) {
        if (record.supersedes) throw new Error(`First canonical version cannot supersede another record: ${exactRef(record)}.`);
      } else {
        const previous = lineage[index - 1];
        const expectedPrevious = exactRef(previous);
        if (record.supersedes !== expectedPrevious) {
          throw new Error(`Canonical lineage has invalid supersedes for ${exactRef(record)}; expected ${expectedPrevious}.`);
        }
        if (!["superseded", "invalidated"].includes(previous.status)) {
          throw new Error(`Canonical predecessor must be superseded or invalidated before ${exactRef(record)}.`);
        }
        if (previous.status === "superseded" && previous.supersededBy !== exactRef(record)) {
          throw new Error(`Canonical lineage has inconsistent supersededBy for ${exactRef(previous)}.`);
        }
        if (previous.status === "invalidated" && previous.supersededBy && previous.supersededBy !== exactRef(record)) {
          throw new Error(`Invalidated predecessor has inconsistent supersededBy for ${exactRef(previous)}.`);
        }
      }
      if (record.status === "superseded" && !lineage[index + 1]) {
        throw new Error(`Superseded canonical record has no next version: ${exactRef(record)}.`);
      }
    }
    currentById[id] = lineage[lineage.length - 1];
  }
  return immutable({
    kind: "stage4a_session_aggregate",
    caseId,
    records: canonicalRecords,
    byRef,
    currentById
  });
}

export function resolveExactReference(session, objectOrReference, { current = false, role = null } = {}) {
  if (session?.kind !== "stage4a_session_aggregate") throw new Error("Canonical session aggregate required.");
  const reference = typeof objectOrReference === "string" ? objectOrReference : exactRef(objectOrReference);
  const canonical = session.byRef[reference];
  if (!canonical) throw new Error(`Exact reference is not present in the canonical session: ${reference}.`);
  if (typeof objectOrReference !== "string" && stableSerialize(canonical) !== stableSerialize(objectOrReference)) {
    throw new Error(`Passed object conflicts with canonical session record: ${reference}.`);
  }
  if (role && canonical.operationalRole !== role) throw new Error(`Exact reference has unexpected role: ${reference}.`);
  if (current) {
    const lineageTip = session.currentById[canonical.id];
    if (!lineageTip || exactRef(lineageTip) !== reference || canonical.status !== "active") {
      throw new Error(`Exact reference is not the active canonical lineage tip: ${reference}.`);
    }
  }
  return canonical;
}

function resolveLineageTip(session, objectOrReference, { statuses = ["active"], role = null } = {}) {
  const canonical = resolveExactReference(session, objectOrReference, { role });
  const tip = session.currentById[canonical.id];
  if (!tip || exactRef(tip) !== exactRef(canonical) || !statuses.includes(canonical.status)) {
    throw new Error(`Exact reference is not an allowed canonical lineage tip: ${exactRef(canonical)}.`);
  }
  return canonical;
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
  if (!["active", "invalidated", "rejected"].includes(previous.status)) {
    throw new Error("Only an active, invalidated, or rejected lineage tip can receive a new version.");
  }
}

function resolveAppendLineageTip(session, suppliedPrevious, {
  id, caseId, operationalRole, statuses = ["active"], requirePreviousWhenExisting = false
}) {
  if (session?.kind !== "stage4a_session_aggregate") throw new Error("Canonical session aggregate required.");
  const aggregateTip = session.currentById[id] || null;
  if (!aggregateTip) {
    if (suppliedPrevious) throw new Error("Previous version does not match an existing canonical lineage.");
    return null;
  }
  const canonicalTip = resolveLineageTip(session, aggregateTip, { statuses, role: operationalRole });
  assertAppendable(canonicalTip, { id, caseId, operationalRole });
  if (!suppliedPrevious) {
    if (requirePreviousWhenExisting) throw new Error("Exact previous canonical lineage tip required.");
    return canonicalTip;
  }
  const supplied = resolveExactReference(session, suppliedPrevious, { role: operationalRole });
  if (exactRef(supplied) !== exactRef(canonicalTip)) {
    throw new Error("Previous version does not match the exact current canonical lineage tip.");
  }
  return canonicalTip;
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

function resolveImmutableIdentitySet(session, records, label) {
  if (session?.kind !== "stage4a_session_aggregate") throw new Error("Canonical session aggregate required.");
  const existing = records.map(record => session.byRef[exactRef(record)] || null);
  if (!existing.some(Boolean)) return records;
  if (!existing.every(Boolean)) throw new Error(`${label} identity is incomplete in the canonical session.`);
  return records.map((record, index) => {
    if (stableSerialize(existing[index]) !== stableSerialize(record)) {
      throw new Error(`${label} identity already exists with different immutable content: ${exactRef(record)}.`);
    }
    return existing[index];
  });
}

export function makeHandoff(fixture, session) {
  const candidates = fixture.candidates.map(item => immutable({ ...item }));
  const proposed = immutable({
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
  return resolveImmutableIdentitySet(session, [proposed], "Stage 3 handoff")[0];
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

export function createWorkspace({ fixture, handoff, previousWorkspace = null, session }) {
  const operationalRole = "pwd_decision_workspace";
  const canonicalHandoff = resolveLineageTip(session, handoff, {
    statuses: ["active"], role: "stage3_pwd_readiness_handoff"
  });
  assertHandoff(canonicalHandoff, fixture.id);
  const id = `${fixture.id}-stage4a-workspace`;
  if (canonicalHandoff.version > 1) {
    if (!previousWorkspace) throw new Error("A later handoff requires the exact invalidated predecessor workspace.");
    const predecessor = resolveExactReference(session, canonicalHandoff.supersedes);
    if (predecessor.status !== "superseded" || predecessor.supersededBy !== exactRef(canonicalHandoff)) {
      throw new Error("Later handoff chain is incomplete in the canonical session.");
    }
  }
  previousWorkspace = resolveAppendLineageTip(session, previousWorkspace, {
    id, caseId: fixture.id, operationalRole, statuses: ["invalidated"], requirePreviousWhenExisting: true
  });
  if (previousWorkspace) {
    if (previousWorkspace.invalidatedBy !== exactRef(canonicalHandoff)) {
      throw new Error("New workspace must use the exact handoff that invalidated the previous workspace.");
    }
  }
  const version = previousWorkspace ? previousWorkspace.version + 1 : 1;
  return immutable({
    ...base({
      id,
      caseId: fixture.id,
      version,
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(canonicalHandoff)]
    }),
    taskId: "conduct_pwd_and_record_trainer_decision",
    contractVersion: "stage4-v1",
    currentHandoffRef: exactRef(canonicalHandoff),
    ...(previousWorkspace ? { supersedes: exactRef(previousWorkspace) } : {})
  });
}

export function makeTanitaPackage({ fixture, handoff, workspace, session }) {
  const canonicalHandoff = resolveLineageTip(session, handoff, {
    statuses: ["active"], role: "stage3_pwd_readiness_handoff"
  });
  const canonicalWorkspace = resolveLineageTip(session, workspace, {
    statuses: ["active"], role: "pwd_decision_workspace"
  });
  assertHandoff(canonicalHandoff, fixture.id);
  if (canonicalWorkspace.currentHandoffRef !== exactRef(canonicalHandoff)) {
    throw new Error("Tanita package requires the exact current workspace handoff.");
  }
  if (!fixture.tanita) return null;
  if (!fixture.tanita.fictional) throw new Error("Only a fictional prepared Tanita package is allowed.");
  const packagePrefix = `${fixture.id}-${fixture.tanita.id}-workspace-${canonicalWorkspace.version}`;
  const source = immutable({
    ...base({
      id: `${packagePrefix}-source`,
      caseId: fixture.id,
      informationType: "source_artifact",
      operationalRole: "prepared_fictional_tanita_package",
      author: "fictional_fixture",
      derivedFrom: [exactRef(canonicalHandoff), exactRef(canonicalWorkspace)]
    }),
    fictional: true,
    immutable: true,
    sourceProfile: fixture.tanita.profile,
    manifestHash: fixture.tanita.manifestHash,
    context: fixture.tanita.context,
    handoffRef: exactRef(canonicalHandoff),
    workspaceRef: exactRef(canonicalWorkspace)
  });
  const facts = fixture.tanita.fields.map((field, index) => immutable({
    ...base({
      id: `${packagePrefix}-fact-${index + 1}`,
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
  const canonical = resolveImmutableIdentitySet(
    session, [source, ...facts], "Prepared fictional Tanita package"
  );
  return immutable({ source: canonical[0], facts: canonical.slice(1) });
}

export function assessComparability({ workspace, tanitaPackage, value, rationale, previous = null, session }) {
  if (!tanitaPackage?.source) throw new Error("No Tanita package to assess.");
  const canonicalWorkspace = resolveLineageTip(session, workspace, {
    statuses: ["active"], role: "pwd_decision_workspace"
  });
  const source = resolveLineageTip(session, tanitaPackage.source, {
    statuses: ["active"], role: "prepared_fictional_tanita_package"
  });
  const facts = tanitaPackage.facts.map(fact => resolveLineageTip(session, fact, {
    statuses: ["active"], role: "prepared_fictional_tanita_fact"
  }));
  assertCaseIsolation(canonicalWorkspace.caseId, [canonicalWorkspace, source, ...facts]);
  if (source.workspaceRef !== exactRef(canonicalWorkspace) || source.handoffRef !== canonicalWorkspace.currentHandoffRef) {
    throw new Error("Tanita package does not belong to the exact current handoff and workspace.");
  }
  oneOf(value, COMPARABILITY, "Explicit Tanita comparability required.");
  const id = `${canonicalWorkspace.caseId}-workspace-${canonicalWorkspace.version}-tanita-comparability`;
  const operationalRole = "tanita_comparability_assessment";
  previous = resolveAppendLineageTip(session, previous, {
    id, caseId: canonicalWorkspace.caseId, operationalRole, statuses: ["active", "invalidated"]
  });
  const version = previous ? previous.version + 1 : 1;
  const current = immutable({
    ...base({
      id,
      caseId: canonicalWorkspace.caseId,
      version,
      informationType: "trainer_interpretation",
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(canonicalWorkspace), exactRef(source), ...facts.map(exactRef)]
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

export function recordObservation({ workspace, handoff, candidateId, executionState, observationText, clientReaction, session }) {
  const canonicalWorkspace = resolveLineageTip(session, workspace, {
    statuses: ["active"], role: "pwd_decision_workspace"
  });
  const canonicalHandoff = resolveLineageTip(session, handoff, {
    statuses: ["active"], role: "stage3_pwd_readiness_handoff"
  });
  assertCaseIsolation(canonicalWorkspace.caseId, [canonicalWorkspace, canonicalHandoff]);
  if (canonicalWorkspace.currentHandoffRef !== exactRef(canonicalHandoff)) throw new Error("Workspace handoff is stale.");
  oneOf(executionState, OBSERVATION_STATES, "Explicit observation execution state required.");
  const candidate = findCandidate(canonicalHandoff, candidateId);
  const candidateRef = `${exactRef(canonicalHandoff)}#candidate:${candidate.id}`;
  const entityPrefix = `${canonicalWorkspace.caseId}-workspace-${canonicalWorkspace.version}`;
  const observationId = `${entityPrefix}-observation-${candidate.id}`;
  const observationRole = "selected_pwd_observation";
  const previousObservation = resolveAppendLineageTip(session, null, {
    id: observationId, caseId: canonicalWorkspace.caseId, operationalRole: observationRole,
    statuses: ["active", "invalidated"]
  });
  const observation = immutable({
    ...base({
      id: observationId,
      caseId: canonicalWorkspace.caseId,
      version: previousObservation ? previousObservation.version + 1 : 1,
      informationType: "trainer_observation",
      operationalRole: observationRole,
      author: "damian",
      derivedFrom: [exactRef(canonicalWorkspace), exactRef(canonicalHandoff), candidateRef]
    }),
    candidateId,
    candidateLabel: candidate.label,
    executionState,
    content: requireValue(observationText, "Observation or skip/stop reason required."),
    reviewState: "approved",
    ...(previousObservation ? { supersedes: exactRef(previousObservation) } : {})
  });
  const observationTransition = appendTransition(previousObservation, observation);
  const reactionText = clean(clientReaction);
  const reactionId = `${entityPrefix}-reaction-${candidate.id}`;
  const reactionRole = "client_reaction_during_pwd";
  const previousReaction = reactionText ? resolveAppendLineageTip(session, null, {
    id: reactionId, caseId: canonicalWorkspace.caseId, operationalRole: reactionRole,
    statuses: ["active", "invalidated", "rejected"]
  }) : null;
  const reaction = reactionText ? immutable({
    ...base({
      id: reactionId,
      caseId: canonicalWorkspace.caseId,
      version: previousReaction ? previousReaction.version + 1 : 1,
      informationType: "source_fact",
      operationalRole: reactionRole,
      author: "fictional_client",
      derivedFrom: [exactRef(canonicalWorkspace), exactRef(observation)]
    }),
    content: reactionText,
    reviewState: "needs_review",
    ...(previousReaction ? { supersedes: exactRef(previousReaction) } : {})
  }) : null;
  const reactionTransition = reaction ? appendTransition(previousReaction, reaction) : null;
  return immutable({ observationTransition, reactionTransition, observation, reaction });
}

export function reviewSourceFact({ session, record, action }) {
  oneOf(action, ["approve", "reject"], "Unsupported source fact review action.");
  const canonical = resolveLineageTip(session, record, { statuses: ["active"] });
  if (canonical.informationType !== "source_fact" || canonical.reviewState !== "needs_review") {
    throw new Error("Only an active needs_review source_fact can be reviewed.");
  }
  const nextRef = `${canonical.id}@v${canonical.version + 1}`;
  const previous = immutable({ ...canonical, status: "superseded", supersededBy: nextRef });
  const current = immutable({
    ...canonical,
    version: canonical.version + 1,
    status: action === "approve" ? "active" : "rejected",
    reviewState: action === "approve" ? "approved" : "rejected",
    reviewedBy: "damian",
    reviewedVersion: exactRef(canonical),
    supersedes: exactRef(canonical)
  });
  return immutable({ previous, current });
}

const EXACT_OBJECT_REFERENCE = /^.+@v[1-9]\d*$/;
const CANDIDATE_LOCATOR = /^(.+@v[1-9]\d*)#candidate:([^#]+)$/;

function resolveProvenanceObject(session, reference) {
  if (typeof reference !== "string") throw new Error("Provenance reference must be a string.");
  const candidate = reference.match(CANDIDATE_LOCATOR);
  if (candidate) {
    const handoff = resolveExactReference(session, candidate[1], { role: "stage3_pwd_readiness_handoff" });
    if (!(handoff.candidates || []).some(item => item.id === candidate[2])) {
      throw new Error(`Candidate locator is not present in the exact handoff: ${reference}.`);
    }
    return handoff;
  }
  if (!EXACT_OBJECT_REFERENCE.test(reference)) {
    throw new Error(`Unsupported provenance reference: ${reference}.`);
  }
  return resolveExactReference(session, reference);
}

function completeProvenanceGraph(session, roots) {
  const pending = [...roots.map(exactRef)];
  const visited = new Set();
  const graph = [];
  while (pending.length) {
    const reference = pending.pop();
    if (visited.has(reference)) continue;
    visited.add(reference);
    const object = resolveExactReference(session, reference);
    graph.push(object);
    for (const derivedReference of object.derivedFrom || []) {
      pending.push(exactRef(resolveProvenanceObject(session, derivedReference)));
    }
  }
  return graph;
}

function assertReviewedSourceFactGraph(session, evidence) {
  for (const object of completeProvenanceGraph(session, evidence)) {
    if (object.informationType === "source_fact" &&
      (object.status !== "active" || object.reviewState !== "approved" || object.reviewedBy !== "damian")) {
      throw new Error(`source_fact requires Damian review of the exact version: ${exactRef(object)}.`);
    }
  }
}

export function saveTrainerInterpretation({ workspace, evidence, content, uncertainty, previous = null, session }) {
  const canonicalWorkspace = resolveLineageTip(session, workspace, {
    statuses: ["active"], role: "pwd_decision_workspace"
  });
  const canonicalEvidence = evidence.map(object => resolveLineageTip(session, object, { statuses: ["active"] }));
  assertCaseIsolation(canonicalWorkspace.caseId, [canonicalWorkspace, ...canonicalEvidence]);
  if (!evidence.length) throw new Error("Interpretation requires exact evidence.");
  assertReviewedSourceFactGraph(session, [canonicalWorkspace, ...canonicalEvidence]);
  const id = `${canonicalWorkspace.caseId}-workspace-${canonicalWorkspace.version}-trainer-interpretation`;
  const operationalRole = "pwd_trainer_interpretation";
  previous = resolveAppendLineageTip(session, previous, {
    id, caseId: canonicalWorkspace.caseId, operationalRole, statuses: ["active", "invalidated"]
  });
  const version = previous ? previous.version + 1 : 1;
  const current = immutable({
    ...base({
      id,
      caseId: canonicalWorkspace.caseId,
      version,
      informationType: "trainer_interpretation",
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(canonicalWorkspace), ...canonicalEvidence.map(exactRef)]
    }),
    content: requireValue(content, "Trainer interpretation required."),
    uncertainty: requireValue(uncertainty, "Uncertainty statement required."),
    reviewState: "approved",
    ...(previous ? { supersedes: exactRef(previous) } : {})
  });
  return appendTransition(previous, current);
}

const forbiddenSuggestion = /\b(START|START_CONDITIONAL|DEFER_CONSULT|NOT_THIS_PRODUCT)\b|warunek rozpoczęcia|powinien rozpocząć|kwalifikuje|diagnoz|sprzeda|kup/i;

function makeSimulatedSuggestions({ fixture, workspace, evidence, run }) {
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

export function prepareConversationRun({ fixture, workspace, evidence, mode, previousRun = null, session }) {
  const canonicalWorkspace = resolveLineageTip(session, workspace, {
    statuses: ["active"], role: "pwd_decision_workspace"
  });
  const canonicalEvidence = evidence.map(object => resolveLineageTip(session, object, { statuses: ["active"] }));
  oneOf(mode, CONVERSATION_MODES, "Explicit conversation preparation mode required.");
  assertCaseIsolation(canonicalWorkspace.caseId, [canonicalWorkspace, ...canonicalEvidence]);
  assertReviewedSourceFactGraph(session, [canonicalWorkspace, ...canonicalEvidence]);
  const id = `${canonicalWorkspace.caseId}-workspace-${canonicalWorkspace.version}-conversation-run`;
  const operationalRole = "conversation_preparation_run";
  previousRun = resolveAppendLineageTip(session, previousRun, {
    id, caseId: canonicalWorkspace.caseId, operationalRole, statuses: ["active", "invalidated"]
  });
  const version = previousRun ? previousRun.version + 1 : 1;
  const provisionalRun = immutable({
    ...base({
      id,
      caseId: canonicalWorkspace.caseId,
      version,
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(canonicalWorkspace), ...canonicalEvidence.map(exactRef)]
    }),
    mode,
    reviewState: "approved",
    ...(previousRun ? { supersedes: exactRef(previousRun) } : {})
  });
  const suggestions = mode === "assisted"
    ? makeSimulatedSuggestions({ fixture, workspace: canonicalWorkspace, evidence: canonicalEvidence, run: provisionalRun })
    : immutable([]);
  const current = immutable({
    ...provisionalRun,
    expectedConversationOptionIds: suggestions.map(item => item.id)
  });
  const runTransition = appendTransition(previousRun, current);
  const invalidationTransitions = previousRun
    ? invalidateDependentRecords({ session, changedRecords: [previousRun], invalidatedBy: exactRef(current) })
    : immutable([]);
  return immutable({
    runTransition,
    suggestionTransitions: invalidationTransitions.filter(item => item.previous.operationalRole === "conversation_option"),
    dependentTransitions: invalidationTransitions.filter(item => item.previous.operationalRole !== "conversation_option"),
    invalidationTransitions,
    suggestions
  });
}

export function reviewSuggestion({ session, record, action, editedContent = "" }) {
  oneOf(action, REVIEW_ACTIONS, "Unsupported suggestion review action.");
  record = resolveLineageTip(session, record, { statuses: ["active"], role: "conversation_option" });
  if (record.reviewState !== "needs_review" || record.informationType !== "ai_suggestion") {
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

export function conversationRecordsForRun({ session, run }) {
  const canonicalRun = resolveExactReference(session, run, { role: "conversation_preparation_run" });
  const runRef = exactRef(canonicalRun);
  const ids = new Set(session.records
    .filter(item => item.operationalRole === "conversation_option" && item.conversationRunRef === runRef)
    .map(item => item.id));
  return immutable([...ids].map(id => session.currentById[id]).filter(Boolean));
}

export function addManualConversationOption({ workspace, run, content, session }) {
  const canonicalWorkspace = resolveLineageTip(session, workspace, {
    statuses: ["active"], role: "pwd_decision_workspace"
  });
  const canonicalRun = resolveLineageTip(session, run, {
    statuses: ["active"], role: "conversation_preparation_run"
  });
  if (canonicalRun.mode !== "manual" || !canonicalRun.derivedFrom.includes(exactRef(canonicalWorkspace))) {
    throw new Error("Manual conversation option requires the exact active manual run.");
  }
  const normalized = requireValue(content, "Manual conversation note required.");
  const existingRecords = conversationRecordsForRun({ session, run: canonicalRun });
  const sequence = existingRecords.filter(item => item.creationMode === "manual").length + 1;
  return immutable({
    ...base({
      id: `${canonicalWorkspace.caseId}-workspace-${canonicalWorkspace.version}-run-${canonicalRun.version}-manual-${sequence}-${deterministicHash(normalized)}`,
      caseId: canonicalWorkspace.caseId,
      operationalRole: "conversation_option",
      author: "damian",
      derivedFrom: [exactRef(canonicalWorkspace), exactRef(canonicalRun)]
    }),
    content: normalized,
    reviewState: "approved",
    creationMode: "manual",
    conversationRunRef: exactRef(canonicalRun),
    sequence
  });
}

export function conversationGate({ session, workspace, run, conversationRecords }) {
  const canonicalWorkspace = resolveLineageTip(session, workspace, {
    statuses: ["active"], role: "pwd_decision_workspace"
  });
  const canonicalRun = resolveLineageTip(session, run, {
    statuses: ["active"], role: "conversation_preparation_run"
  });
  if (!canonicalRun.derivedFrom.includes(exactRef(canonicalWorkspace))) {
    throw new Error("Conversation run does not belong to the exact active workspace.");
  }
  if (!Array.isArray(conversationRecords)) throw new Error("Conversation records required for the domain decision gate.");
  const canonicalRecords = conversationRecordsForRun({ session, run: canonicalRun });
  const suppliedRefs = [...new Set(conversationRecords.map(item => exactRef(item)))].sort();
  const canonicalRefs = canonicalRecords.map(exactRef).sort();
  if (stableSerialize(suppliedRefs) !== stableSerialize(canonicalRefs)) {
    throw new Error("Conversation records do not match the complete canonical run set.");
  }
  for (const record of conversationRecords) resolveExactReference(session, record);
  const expectedIds = canonicalRun.expectedConversationOptionIds || [];
  if (canonicalRun.mode === "assisted") {
    const presentIds = new Set(canonicalRecords.map(item => item.id));
    if (!expectedIds.length || expectedIds.some(id => !presentIds.has(id))) {
      throw new Error("Assisted run is missing a canonical generated conversation record.");
    }
  } else if (canonicalRecords.some(item => item.informationType === "ai_suggestion")) {
    throw new Error("Manual run cannot contain AI conversation records.");
  }
  const pending = canonicalRecords.filter(item => item.status === "active" && item.informationType === "ai_suggestion" && item.reviewState === "needs_review");
  return immutable({ ready: pending.length === 0, pending: pending.map(exactRef), records: canonicalRefs });
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

function assertTanitaEvidence(session, workspace, evidence) {
  const graph = completeProvenanceGraph(session, evidence);
  const facts = graph.filter(item => item.operationalRole === "prepared_fictional_tanita_fact");
  if (!facts.length) return;
  const comparisons = graph.filter(item => item.operationalRole === "tanita_comparability_assessment" && item.status === "active");
  if (comparisons.length !== 1) {
    throw new Error("Tanita facts require one active exact-package comparability interpretation.");
  }
  const comparison = comparisons[0];
  if (!comparison.derivedFrom.includes(exactRef(workspace))) {
    throw new Error("Tanita comparability does not belong to the current workspace.");
  }
  for (const fact of facts) {
    const sourceRef = fact.derivedFrom[0];
    const source = resolveLineageTip(session, sourceRef, {
      statuses: ["active"], role: "prepared_fictional_tanita_package"
    });
    if (source.workspaceRef !== exactRef(workspace) || source.handoffRef !== workspace.currentHandoffRef) {
      throw new Error("Tanita fact does not belong to the exact current handoff and workspace.");
    }
    if (!comparison.derivedFrom.includes(exactRef(fact)) || !comparison.derivedFrom.includes(sourceRef)) {
      throw new Error("Tanita facts require one active exact-package comparability interpretation.");
    }
  }
}

export function saveDecision({ session, workspace, conversationRun, value, rationale, evidence, conditions = [], conversationRecords, previous = null }) {
  const canonicalWorkspace = resolveLineageTip(session, workspace, {
    statuses: ["active"], role: "pwd_decision_workspace"
  });
  const canonicalRun = resolveLineageTip(session, conversationRun, {
    statuses: ["active"], role: "conversation_preparation_run"
  });
  oneOf(value, DECISIONS, "Explicit Stage 4A decision required.");
  const gate = conversationGate({
    session, workspace: canonicalWorkspace, run: canonicalRun, conversationRecords
  });
  if (!gate.ready) throw new Error("Conversation gate blocked by active needs_review suggestions.");
  if (!evidence.length) throw new Error("Decision requires exact current evidence.");
  const canonicalEvidence = evidence.map(object => resolveLineageTip(session, object, { statuses: ["active"] }));
  const canonicalConversationRecords = conversationRecordsForRun({ session, run: canonicalRun });
  assertCaseIsolation(canonicalWorkspace.caseId, [canonicalWorkspace, canonicalRun, ...canonicalConversationRecords, ...canonicalEvidence]);
  const decisionRoots = [canonicalWorkspace, canonicalRun, ...canonicalConversationRecords, ...canonicalEvidence];
  assertReviewedSourceFactGraph(session, decisionRoots);
  assertTanitaEvidence(session, canonicalWorkspace, decisionRoots);
  const id = `${canonicalWorkspace.caseId}-workspace-${canonicalWorkspace.version}-stage4a-decision`;
  const operationalRole = "pwd_outcome";
  previous = resolveAppendLineageTip(session, previous, {
    id, caseId: canonicalWorkspace.caseId, operationalRole, statuses: ["active", "invalidated"]
  });
  const version = previous ? previous.version + 1 : 1;
  const provenance = [...new Set([
    exactRef(canonicalWorkspace), exactRef(canonicalRun),
    ...canonicalConversationRecords.map(exactRef), ...canonicalEvidence.map(exactRef)
  ])];
  const current = immutable({
    ...base({
      id,
      caseId: canonicalWorkspace.caseId,
      version,
      informationType: "trainer_decision",
      operationalRole,
      author: "damian",
      derivedFrom: provenance
    }),
    conversationRunRef: exactRef(canonicalRun),
    value,
    rationale: requireValue(rationale, "Decision rationale required."),
    conditions: normalizeConditions(value, conditions),
    reviewState: "approved",
    ...(previous ? { supersedes: exactRef(previous) } : {})
  });
  return appendTransition(previous, current);
}

export function makeFollowupDraft({ session, decision, content }) {
  decision = resolveLineageTip(session, decision, { statuses: ["active"], role: "pwd_outcome" });
  const id = `${decision.id}-v${decision.version}-followup-draft`;
  const operationalRole = "unsent_followup_draft";
  const previous = resolveAppendLineageTip(session, null, {
    id, caseId: decision.caseId, operationalRole, statuses: ["active", "invalidated", "rejected"]
  });
  const current = immutable({
    ...base({
      id,
      caseId: decision.caseId,
      version: previous ? previous.version + 1 : 1,
      informationType: "client_material",
      operationalRole,
      author: "damian",
      derivedFrom: [exactRef(decision)]
    }),
    content: requireValue(content, "Follow-up draft content required."),
    reviewState: "needs_review",
    publicationState: "unpublished",
    visibility: "trainer_only",
    sendCapability: "none",
    ...(previous ? { supersedes: exactRef(previous) } : {})
  });
  return appendTransition(previous, current);
}

function transitionInvalidated(object, invalidatedBy) {
  if (!object || object.status !== "active") return null;
  const nextRef = `${object.id}@v${object.version + 1}`;
  return immutable({
    previous: immutable({ ...object, status: "superseded", supersededBy: nextRef }),
    current: immutable({ ...object, version: object.version + 1, status: "invalidated", invalidatedBy, supersedes: exactRef(object) })
  });
}

export function invalidateDependentRecords({ session, changedRecords, invalidatedBy }) {
  if (session?.kind !== "stage4a_session_aggregate") throw new Error("Canonical session aggregate required.");
  const canonicalChanged = changedRecords.map(item => resolveExactReference(session, item));
  const roots = new Set(canonicalChanged.map(exactRef));
  const active = session.records.filter(item =>
    item.status === "active" && exactRef(session.currentById[item.id]) === exactRef(item)
  );
  assertCaseIsolation(session.caseId, [...active, ...canonicalChanged]);
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

export function materialHandoffChange({ session, handoff, workspace, summary }) {
  handoff = resolveLineageTip(session, handoff, { statuses: ["active"], role: "stage3_pwd_readiness_handoff" });
  workspace = resolveLineageTip(session, workspace, { statuses: ["active"], role: "pwd_decision_workspace" });
  assertCaseIsolation(handoff.caseId, [handoff, workspace]);
  const nextHandoff = immutable({
    ...handoff,
    version: handoff.version + 1,
    status: "active",
    summary: requireValue(summary, "Material handoff change summary required."),
    supersedes: exactRef(handoff)
  });
  const previousHandoff = immutable({ ...handoff, status: "superseded", supersededBy: exactRef(nextHandoff) });
  const invalidatedBy = exactRef(nextHandoff);
  const allTransitions = invalidateDependentRecords({
    session, changedRecords: [handoff], invalidatedBy
  });
  const workspaceTransition = allTransitions.find(item => exactRef(item.previous) === exactRef(workspace));
  if (!workspaceTransition) throw new Error("Current workspace is not resolved as a handoff dependent.");
  const downstreamTransitions = allTransitions.filter(item => item !== workspaceTransition);
  return immutable({
    handoffs: [previousHandoff, nextHandoff],
    workspaceTransition,
    downstreamTransitions,
    workspaces: [workspaceTransition.previous, workspaceTransition.current],
    downstream: downstreamTransitions.flatMap(item => [item.previous, item.current])
  });
}
