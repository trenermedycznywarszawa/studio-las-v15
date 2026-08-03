export const INFORMATION_TYPES = Object.freeze([
  "source_artifact",
  "source_fact",
  "extracted_fact",
  "trainer_observation",
  "ai_hypothesis",
  "ai_suggestion",
  "trainer_interpretation",
  "trainer_decision",
  "client_material"
]);

export const OPERATIONAL_ROLES = Object.freeze([
  "preparation_gap",
  "call_conflict",
  "call_goal",
  "call_question",
  "caution_topic",
  "call_outline_item",
  "client_statement",
  "client_reaction"
]);

export const DECISIONS = Object.freeze([
  "CONTINUE",
  "SEND_FULL_INTAKE",
  "DEFER_OR_CONSULT",
  "NOT_RIGHT_PRODUCT"
]);

const decisionCopy = Object.freeze({
  CONTINUE: "Dziękuję za rozmowę. Damian zapisał decyzję o kontynuacji kontaktu i uzgodnieniu kolejnego kroku.",
  SEND_FULL_INTAKE: "Dziękuję za rozmowę. Damian zapisał decyzję, że kolejnym krokiem może być pełna ankieta w osobnym procesie.",
  DEFER_OR_CONSULT: "Dziękuję za rozmowę. Damian zapisał decyzję o odłożeniu dalszego kroku lub wcześniejszej konsultacji.",
  NOT_RIGHT_PRODUCT: "Dziękuję za rozmowę. Damian zapisał decyzję, że Studio Las nie jest teraz właściwym produktem."
});

export function exactRef(record) {
  return `${record.id}@v${record.version}`;
}

export function assertInformationType(value) {
  if (value !== null && value !== undefined && !INFORMATION_TYPES.includes(value)) {
    throw new Error(`Unapproved information_type: ${value}`);
  }
  return value ?? null;
}

export function assertOperationalRole(value) {
  if (value !== null && value !== undefined && !OPERATIONAL_ROLES.includes(value)) {
    throw new Error(`Unapproved operational role: ${value}`);
  }
  return value ?? null;
}

export function makeRecord(input) {
  const record = {
    id: input.id,
    version: input.version ?? 1,
    content: input.content,
    author: input.author,
    informationType: assertInformationType(input.informationType),
    operationalRole: assertOperationalRole(input.operationalRole),
    section: input.section ?? null,
    locator: input.locator ?? null,
    derivedFrom: [...(input.derivedFrom ?? [])],
    supersedes: input.supersedes ?? null,
    reviewState: input.reviewState ?? "needs_review",
    publicationState: input.publicationState ?? null,
    flagged: Boolean(input.flagged),
    isPlaceholder: Boolean(input.isPlaceholder),
    status: input.status ?? "active"
  };
  if (!record.id || !record.content || !record.author) throw new Error("Record identity, content and author are required");
  return Object.freeze(record);
}

export function activeRecords(records) {
  const superseded = new Set(records.map(record => record.supersedes).filter(Boolean));
  return records.filter(record => !superseded.has(exactRef(record)) && record.status === "active");
}

export function resolvePreparationMode({ requested, hasFixture, aiAvailable }) {
  return requested === "assisted" && hasFixture && aiAvailable !== false
    ? "fictional_assisted"
    : "manual_fallback";
}

export function deriveEditedRecord(original, content, id) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Edited content cannot be empty");
  const isFact = original.section === "facts";
  return makeRecord({
    id,
    content: trimmed,
    author: "damian",
    informationType: isFact ? original.informationType : null,
    operationalRole: isFact ? null : original.operationalRole,
    section: original.section,
    locator: original.locator,
    derivedFrom: [...original.derivedFrom, exactRef(original)],
    supersedes: exactRef(original),
    reviewState: "needs_review",
    flagged: false,
    isPlaceholder: false
  });
}

export function transitionReview(record, reviewState) {
  if (!['approved', 'rejected'].includes(reviewState)) throw new Error("Unsupported review transition");
  return makeRecord({
    ...record,
    version: record.version + 1,
    supersedes: exactRef(record),
    derivedFrom: [...record.derivedFrom],
    reviewState
  });
}

export function callReadiness(records) {
  const active = activeRecords(records);
  const questions = active.filter(record => record.operationalRole === "call_question" && record.reviewState !== "rejected");
  const unresolved = active.filter(record =>
    record.reviewState !== "rejected" &&
    (record.isPlaceholder || record.flagged || (["source_fact", "extracted_fact"].includes(record.informationType) && record.reviewState !== "approved") || (record.author === "fictional_ai" && record.reviewState !== "approved"))
  );
  if (!questions.length) return { ready: false, reason: "Brak aktywnego pytania do rozmowy." };
  if (unresolved.length) return { ready: false, reason: "Najpierw sprawdź, popraw albo odrzuć wszystkie aktywne sugestie i placeholdery.", unresolved };
  return { ready: true, questions };
}

export function makePhoneRecord({ id, role, content, author = "damian", previous = null }) {
  const informationType = role === "client_statement" || role === "client_reaction"
    ? "source_fact"
    : role;
  const operationalRole = role === "client_statement" || role === "client_reaction" ? role : null;
  return makeRecord({
    id: previous?.id ?? id,
    version: previous ? previous.version + 1 : 1,
    content: content.trim(),
    author: role === "client_statement" || role === "client_reaction" ? "client" : author,
    informationType,
    operationalRole,
    derivedFrom: previous ? [exactRef(previous)] : ["phone-call-context@v1"],
    supersedes: previous ? exactRef(previous) : null,
    reviewState: "approved"
  });
}

export function eligibleEvidence(records, phoneRecords) {
  const allowedTypes = new Set(["source_fact", "extracted_fact", "trainer_observation", "trainer_interpretation"]);
  return activeRecords([...records, ...phoneRecords]).filter(record =>
    allowedTypes.has(record.informationType) &&
    record.reviewState === "approved" &&
    !record.isPlaceholder &&
    record.status === "active"
  );
}

export function invalidateDependents({ decision, draft }, causeRef) {
  return {
    decision: decision?.status === "active" ? { ...decision, status: "invalidated", invalidatedBy: causeRef } : decision,
    draft: draft?.status === "active" ? { ...draft, status: "invalidated", invalidatedBy: causeRef } : draft
  };
}

export function saveDecisionVersion({ id, previous = null, value, rationale, evidence, inputRevision, now }) {
  if (!DECISIONS.includes(value)) throw new Error("Unsupported decision");
  if (!rationale.trim()) throw new Error("Decision rationale is required");
  if (!evidence.length) throw new Error("Decision evidence is required");
  const allowedEvidence = new Set(["source_fact", "extracted_fact", "trainer_observation", "trainer_interpretation"]);
  if (evidence.some(record => !allowedEvidence.has(record.informationType) || record.reviewState !== "approved" || record.isPlaceholder || record.status !== "active")) {
    throw new Error("Decision evidence must be reviewed, eligible, and active");
  }
  return Object.freeze({
    id: previous?.id ?? id,
    version: previous ? previous.version + 1 : 1,
    informationType: "trainer_decision",
    value,
    rationale: rationale.trim(),
    evidenceRefs: evidence.map(exactRef),
    actor: "damian",
    inputRevision,
    recordedAt: now,
    supersedes: previous ? exactRef(previous) : null,
    status: "active"
  });
}

export function createDraftVersion({ id, previous = null, decision, evidence, now }) {
  if (!decision || decision.status !== "active") throw new Error("An active exact decision version is required");
  const evidenceRefs = evidence.map(exactRef);
  if (evidenceRefs.join("|") !== decision.evidenceRefs.join("|")) throw new Error("Evidence versions do not match the saved decision");
  return Object.freeze({
    id: previous?.id ?? id,
    version: previous ? previous.version + 1 : 1,
    content: decisionCopy[decision.value],
    informationType: "client_material",
    reviewState: "needs_review",
    publicationState: "unpublished",
    derivedFrom: [exactRef(decision), ...evidenceRefs],
    supersedes: previous ? exactRef(previous) : null,
    status: "active",
    createdAt: now
  });
}

export function editDraftVersion({ draft, content, now }) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Draft content cannot be empty");
  return Object.freeze({
    ...draft,
    version: draft.version + 1,
    content: trimmed,
    reviewState: "needs_review",
    publicationState: "unpublished",
    derivedFrom: [...draft.derivedFrom, exactRef(draft)],
    supersedes: exactRef(draft),
    status: "active",
    createdAt: now
  });
}

export function createAuditEvent({ id, eventType, actor, object, related = [], outcome, time }) {
  if (!actor || !object?.id || !object?.version) throw new Error("Audit actor and exact object version are required");
  return Object.freeze({
    id,
    eventType,
    actor,
    objectRef: exactRef(object),
    relatedRefs: related.map(exactRef),
    outcome,
    time
  });
}
