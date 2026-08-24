export const INFORMATION_TYPES = Object.freeze([
  "source_artifact", "source_fact", "extracted_fact", "trainer_observation",
  "ai_hypothesis", "ai_suggestion", "trainer_interpretation", "trainer_decision", "client_material"
]);

export const CHANNELS = Object.freeze(["paper", "app", "deliberate_hybrid"]);
export const EXECUTION_RESPONSES = Object.freeze([
  "done_as_planned", "changed_or_partial", "stopped", "not_done"
]);
export const TRAINER_DECISIONS = Object.freeze([
  "continue", "simplify", "progress", "regress", "replace", "pause",
  "change_channel", "change_signal", "refer", "close"
]);

const clean = value => String(value ?? "").trim();
const clone = value => globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const canonicalEntryLedgers = new WeakSet();

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function required(value, message) {
  const result = clean(value);
  if (!result) throw new Error(message);
  return result;
}

function oneOf(value, allowed, message) {
  if (!allowed.includes(value)) throw new Error(message);
  return value;
}

function iso(value, message) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(message);
  return new Date(timestamp).toISOString();
}

export function exactRef(record) {
  if (!record?.id || !Number.isInteger(record?.version) || record.version < 1) {
    throw new Error("Exact versioned record required.");
  }
  return `${record.id}@v${record.version}`;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function recordBase({ id, caseId, version = 1, informationType = null, operationalRole, author = "damian" }) {
  if (informationType) oneOf(informationType, INFORMATION_TYPES, `Unapproved information type: ${informationType}`);
  return {
    id: required(id, "Record id required."),
    caseId: required(caseId, "Case id required."),
    version,
    informationType,
    operationalRole: required(operationalRole, "Operational role required."),
    author: required(author, "Author required.")
  };
}

function ensureSameCase(caseId, records) {
  for (const record of records.filter(Boolean)) {
    if (record.caseId !== caseId) throw new Error("Wrong-client reference denied before mutation.");
  }
}

function guidanceContent(item) {
  return {
    key: required(item.key, "Guidance item key required."),
    instruction: required(item.instruction, "Clear instruction required."),
    purpose: required(item.purpose, "Purpose required."),
    dose: required(item.dose, "Dose or completion condition required."),
    stopCriteria: required(item.stopCriteria, "Stop or reduction criteria required."),
    signalDecision: item.signalDecision ? required(item.signalDecision, "Signal decision required.") : null
  };
}

function makeGuidanceItem(caseId, source, previous = null) {
  const content = guidanceContent(source);
  const version = previous ? previous.version + 1 : 1;
  return deepFreeze({
    ...recordBase({
      id: previous?.id || `${caseId}-guidance-${content.key}`,
      caseId,
      version,
      informationType: "client_material",
      operationalRole: "guidance_item"
    }),
    ...content,
    version,
    status: "draft",
    supersedes: previous ? exactRef(previous) : null,
    reviewState: "needs_review",
    publicationState: "unpublished"
  });
}

export class GuidanceLoop {
  constructor({ caseId, now = "2026-08-24T09:00:00.000Z" }) {
    this.caseId = required(caseId, "Case id required.");
    this.now = iso(now, "Valid workflow time required.");
    this.records = [];
    this.currentCycleRef = null;
    this.currentFocusRef = null;
    this.currentReleaseRef = null;
    this.audit = [];
  }

  snapshot() {
    return deepFreeze(clone({
      caseId: this.caseId,
      now: this.now,
      records: this.records,
      currentCycleRef: this.currentCycleRef,
      currentFocusRef: this.currentFocusRef,
      currentReleaseRef: this.currentReleaseRef,
      audit: this.audit
    }));
  }

  all(role) {
    return this.records.filter(record => !role || record.operationalRole === role);
  }

  resolve(recordOrRef, { role = null } = {}) {
    const ref = typeof recordOrRef === "string" ? recordOrRef : exactRef(recordOrRef);
    const canonical = this.records.find(item => exactRef(item) === ref);
    if (!canonical) throw new Error(`Exact reference is not canonical: ${ref}.`);
    if (typeof recordOrRef !== "string" && stable(canonical) !== stable(recordOrRef)) {
      throw new Error(`Passed record conflicts with canonical exact reference: ${ref}.`);
    }
    if (role && canonical.operationalRole !== role) throw new Error(`Unexpected role for ${ref}.`);
    ensureSameCase(this.caseId, [canonical]);
    return canonical;
  }

  add(record, action, related = []) {
    ensureSameCase(this.caseId, [record, ...related]);
    const ref = exactRef(record);
    const existing = this.records.find(item => exactRef(item) === ref);
    if (existing) {
      if (stable(existing) !== stable(record)) throw new Error(`Conflicting canonical record: ${ref}.`);
      return existing;
    }
    const frozen = deepFreeze(clone(record));
    this.records.push(frozen);
    this.audit.push(deepFreeze({
      action,
      actorId: "damian",
      actorType: "trainer",
      eventTime: this.now,
      caseId: this.caseId,
      sourceChannel: "local_fictional_prototype",
      authority: "accepted_stage5_prd_005",
      primaryRef: ref,
      relatedRefs: related.map(exactRef),
      outcome: "recorded",
      correlationId: `${this.caseId}-${this.audit.length + 1}`
    }));
    return frozen;
  }

  replace(record, replacement, action) {
    const canonical = this.resolve(record);
    if (exactRef(canonical) !== exactRef(replacement)) throw new Error("Transition must preserve exact record identity.");
    ensureSameCase(this.caseId, [replacement]);
    const index = this.records.indexOf(canonical);
    const frozen = deepFreeze(clone(replacement));
    this.records[index] = frozen;
    this.audit.push(deepFreeze({
      action,
      actorId: "damian",
      actorType: "trainer",
      eventTime: this.now,
      caseId: this.caseId,
      sourceChannel: "local_fictional_prototype",
      authority: "accepted_stage5_prd_005",
      primaryRef: exactRef(frozen),
      relatedRefs: [],
      outcome: "transitioned",
      correlationId: `${this.caseId}-${this.audit.length + 1}`
    }));
    return frozen;
  }

  advanceTime(now) {
    this.now = iso(now, "Valid workflow time required.");
    return this.reviewEvents();
  }

  start(entryLedger, entryRef = entryLedger?.currentRef) {
    if (!canonicalEntryLedgers.has(entryLedger) || entryLedger.caseId !== this.caseId) {
      throw new Error("Canonical same-client Stage 4 decision ledger required.");
    }
    if (!entryRef || entryRef !== entryLedger.currentRef) throw new Error("Exact current Stage 4 decision reference required.");
    const entryDecision = entryLedger.byRef[entryRef];
    if (!entryDecision) throw new Error("Exact Stage 4 decision is not present in the canonical ledger.");
    ensureSameCase(this.caseId, [entryDecision]);
    if (
      entryDecision.informationType !== "trainer_decision" ||
      entryDecision.operationalRole !== "stage4_decision" ||
      entryDecision.author !== "damian" ||
      entryDecision.value !== "START" ||
      entryDecision.status !== "active" ||
      entryDecision.current !== true
    ) throw new Error("Stage 5 requires exact current same-client Damian-authored START.");

    const entry = this.add(entryDecision, "bind_stage4_entry");
    const cycle = this.add({
      ...recordBase({ id: `${this.caseId}-cycle`, caseId: this.caseId, operationalRole: "stage5_cycle" }),
      version: 1,
      status: "active",
      entryDecisionRef: exactRef(entry),
      startedAt: this.now,
      reviewAnchors: ["start", "week_4", "week_8", "week_12"]
    }, "start_stage5_cycle", [entry]);
    this.currentCycleRef = exactRef(cycle);
    return cycle;
  }

  currentCycle() {
    const cycle = this.resolve(this.currentCycleRef, { role: "stage5_cycle" });
    if (cycle.status !== "active") throw new Error("Stage 5 cycle is not active.");
    const entry = this.resolve(cycle.entryDecisionRef, { role: "stage4_decision" });
    if (entry.status !== "active" || entry.current !== true || entry.value !== "START") {
      throw new Error("Bound START is no longer eligible; actionable guidance fails closed.");
    }
    return cycle;
  }

  invalidateEntry(reason = "Material entry change") {
    const cycle = this.resolve(this.currentCycleRef);
    const entry = this.resolve(cycle.entryDecisionRef);
    this.replace(entry, { ...entry, status: "invalidated", current: false, invalidationReason: required(reason, "Reason required.") }, "invalidate_stage4_entry");
    if (this.currentReleaseRef) {
      const release = this.resolve(this.currentReleaseRef);
      this.replace(release, { ...release, status: "non_actionable", invalidationReason: "entry_ineligible" }, "fail_guidance_closed");
      this.currentReleaseRef = null;
    }
  }

  setFocus(text, previousRef = null) {
    const cycle = this.currentCycle();
    const previous = previousRef ? this.resolve(previousRef, { role: "current_focus" }) : null;
    if (this.currentFocusRef && !previous) throw new Error("Exact previous focus required for a material focus change.");
    if (previous && exactRef(previous) !== this.currentFocusRef) throw new Error("Only exact current focus can be superseded.");
    const version = previous ? previous.version + 1 : 1;
    const id = `${this.caseId}-focus`;
    if (previous) this.replace(previous, { ...previous, status: "superseded", supersededBy: `${id}@v${version}` }, "supersede_focus");
    const focus = this.add({
      ...recordBase({ id, caseId: this.caseId, version, informationType: "trainer_decision", operationalRole: "current_focus" }),
      version,
      status: "active",
      text: required(text, "One trainer-owned focus required."),
      cycleRef: exactRef(cycle),
      supersedes: previous ? exactRef(previous) : null
    }, "set_current_focus", [cycle]);
    this.currentFocusRef = exactRef(focus);
    return focus;
  }

  draftRelease({ items, channel, authoritativeChannel = null, secondaryRole = null, reviewAt, validUntil = null, responseRequest = null, predecessorRef = null, predecessorMap = null }) {
    const cycle = this.currentCycle();
    const focus = this.resolve(this.currentFocusRef, { role: "current_focus" });
    if (focus.status !== "active") throw new Error("Exact current focus required.");
    oneOf(channel, CHANNELS, "Explicit paper, app, or deliberate_hybrid channel required.");
    if (!Array.isArray(items) || items.length < 1) throw new Error("At least one guidance item required.");
    if (channel === "deliberate_hybrid") {
      if (!['paper', 'app'].includes(authoritativeChannel)) throw new Error("Hybrid requires one authoritative channel.");
      required(secondaryRole, "Hybrid requires a bounded secondary role.");
    } else if (authoritativeChannel && authoritativeChannel !== channel) {
      throw new Error("Non-hybrid authority must match its channel.");
    }

    const sourceItems = items.map((item, index) => guidanceContent({ ...item, key: item.key ?? `item-${index + 1}` }));
    const inputByKey = new Map(sourceItems.map(item => [item.key, item]));
    if (inputByKey.size !== sourceItems.length) throw new Error("Guidance item keys must be unique within a release.");
    if (responseRequest && !required(responseRequest.decisionImpact, "Requested response must name decision impact.")) {
      throw new Error("Requested response must be decision-relevant.");
    }

    const predecessor = predecessorRef ? this.resolve(predecessorRef, { role: "guidance_release" }) : null;
    if (predecessor && exactRef(predecessor) !== this.currentReleaseRef) throw new Error("Only exact current release can receive a successor.");
    if (predecessor) {
      const expected = predecessor.items.map(item => item.key).sort();
      const mapped = Object.keys(predecessorMap || {}).sort();
      if (stable(expected) !== stable(mapped)) throw new Error("Every predecessor item requires retain, replace, or remove mapping.");
      for (const outcome of Object.values(predecessorMap)) oneOf(outcome, ["retain", "replace", "remove"], "Invalid predecessor outcome.");
    }
    const version = predecessor ? predecessor.version + 1 : 1;
    let normalizedItems;
    if (!predecessor) {
      normalizedItems = sourceItems.map(item => makeGuidanceItem(this.caseId, item));
    } else {
      normalizedItems = [];
      for (const previousItem of predecessor.items) {
        const outcome = predecessorMap[previousItem.key];
        const supplied = inputByKey.get(previousItem.key);
        if (outcome === "retain") {
          if (supplied && stable(guidanceContent(supplied)) !== stable(guidanceContent(previousItem))) {
            throw new Error("Retained item must reuse the same exact approved content.");
          }
          normalizedItems.push(previousItem);
          inputByKey.delete(previousItem.key);
        } else if (outcome === "replace") {
          if (!supplied) throw new Error("Replacement item content required.");
          normalizedItems.push(makeGuidanceItem(this.caseId, supplied, previousItem));
          inputByKey.delete(previousItem.key);
        } else if (outcome === "remove") {
          if (supplied) throw new Error("Removed predecessor item cannot be supplied as current content.");
        }
      }
      for (const newItem of inputByKey.values()) normalizedItems.push(makeGuidanceItem(this.caseId, newItem));
    }
    if (normalizedItems.length < 1) throw new Error("A client expected to act requires at least one current guidance item.");
    const normalizedRequest = responseRequest ? deepFreeze({
      ...recordBase({ id: `${this.caseId}-response-request`, caseId: this.caseId, version, operationalRole: "response_request" }),
      version,
      prompt: required(responseRequest.prompt, "Response request prompt required."),
      decisionImpact: required(responseRequest.decisionImpact, "Requested response must name decision impact."),
      status: "active"
    }) : null;
    const release = this.add({
      ...recordBase({ id: `${this.caseId}-release`, caseId: this.caseId, version, operationalRole: "guidance_release" }),
      version,
      status: "draft",
      cycleRef: exactRef(cycle),
      focusRef: exactRef(focus),
      channel,
      authoritativeChannel: channel === "deliberate_hybrid" ? authoritativeChannel : channel,
      secondaryRole: channel === "deliberate_hybrid" ? secondaryRole : null,
      reviewAt: iso(reviewAt, "Soft review point required."),
      validUntil: validUntil ? iso(validUntil, "Valid hard boundary required.") : null,
      responseRequest: normalizedRequest,
      items: normalizedItems,
      predecessorRef: predecessor ? exactRef(predecessor) : null,
      predecessorMap: predecessor ? clone(predecessorMap) : null,
      reviewState: "needs_review",
      publicationState: "unpublished",
      createdAt: this.now
    }, "draft_guidance_release", [cycle, focus, predecessor].filter(Boolean));
    return release;
  }

  approveAndPublish(releaseRef) {
    const release = this.resolve(releaseRef, { role: "guidance_release" });
    if (release.status !== "draft") throw new Error("Only exact draft release can be approved and published.");
    const approved = {
      ...release,
      status: "ready",
      reviewState: "approved",
      publicationState: "published",
      items: release.items.map(item => item.reviewState === "approved" && item.publicationState === "published" ? item : ({
        ...item,
        status: "active",
        reviewState: "approved",
        publicationState: "published",
        approvedBy: "damian",
        approvedAt: this.now,
        publishedAt: this.now
      })),
      approvedBy: "damian",
      approvedAt: this.now,
      publishedAt: this.now
    };
    return this.replace(release, approved, "approve_and_publish_release");
  }

  activate(releaseRef, { paperRetirement = null } = {}) {
    const release = this.resolve(releaseRef, { role: "guidance_release" });
    if (release.status !== "ready" || release.reviewState !== "approved" || release.publicationState !== "published") {
      throw new Error("Release must be exactly approved and published before activation.");
    }
    const current = this.currentReleaseRef ? this.resolve(this.currentReleaseRef) : null;
    if (current && release.predecessorRef !== exactRef(current)) throw new Error("Successor must bind exact current predecessor.");
    if (current && ["paper", "deliberate_hybrid"].includes(current.channel)) {
      if (paperRetirement === "unresolved_risk") {
        const issue = this.add({
          ...recordBase({ id: `${this.caseId}-paper-retirement-issue-${this.all("paper_retirement_issue").length + 1}`, caseId: this.caseId, operationalRole: "paper_retirement_issue" }),
          version: 1,
          status: "requires_human_contact",
          predecessorReleaseRef: exactRef(current),
          successorReleaseRef: exactRef(release),
          approvedHumanPathRequired: true,
          resolved: false
        }, "record_risky_paper_ambiguity", [current, release]);
        this.replace(current, {
          ...current,
          status: "non_actionable",
          nonActionableReason: "risky_unretired_paper",
          paperRetirementIssueRef: exactRef(issue)
        }, "pause_guidance_for_paper_ambiguity");
        this.currentReleaseRef = null;
        throw new Error("Risky paper ambiguity: successor remains non-current, affected guidance is non-actionable, and Damian must use the approved human contact path.");
      }
      if (paperRetirement !== "confirmed") throw new Error("Real paper retirement outcome required before successor activation.");
    }
    if (current) {
      const retiredItems = current.items.map(item => {
        const outcome = release.predecessorMap[item.key];
        if (outcome === "retain") return item;
        const replacement = outcome === "replace" ? release.items.find(candidate => candidate.id === item.id && candidate.version === item.version + 1) : null;
        return {
          ...item,
          status: outcome === "replace" ? "superseded" : "withdrawn",
          reviewState: outcome === "replace" ? "superseded" : item.reviewState,
          publicationState: "withdrawn",
          supersededBy: replacement ? exactRef(replacement) : null
        };
      });
      this.replace(current, { ...current, items: retiredItems, status: "withdrawn", publicationState: "withdrawn", supersededBy: exactRef(release) }, "withdraw_predecessor_release");
    }
    const active = this.replace(release, { ...release, status: "active", activatedAt: this.now }, "activate_guidance_release");
    this.currentReleaseRef = exactRef(active);
    return active;
  }

  currentRelease() {
    this.currentCycle();
    if (!this.currentReleaseRef) throw new Error("No current actionable release.");
    const release = this.resolve(this.currentReleaseRef, { role: "guidance_release" });
    if (release.status !== "active") throw new Error("Current release is not actionable.");
    if (release.validUntil && Date.parse(this.now) >= Date.parse(release.validUntil)) {
      throw new Error("Hard validity expired; guidance is non-actionable.");
    }
    return release;
  }

  recordClientInteraction({ releaseRef, itemKey, executionResponse = null, question = null }) {
    const release = this.resolve(releaseRef, { role: "guidance_release" });
    const item = release.items.find(candidate => candidate.key === itemKey);
    if (!item) throw new Error("Exact guidance item context required.");
    if (executionResponse) oneOf(executionResponse, EXECUTION_RESPONSES, "Unsupported execution response.");
    if (!executionResponse && !clean(question)) throw new Error("Execution response or contextual question required.");
    if (executionResponse && !release.responseRequest) throw new Error("Execution response was not requested for this release.");
    const sequence = this.all("client_interaction").length + 1;
    return this.add({
      ...recordBase({ id: `${this.caseId}-interaction-${sequence}`, caseId: this.caseId, informationType: "source_fact", operationalRole: "client_interaction", author: "fictional_client" }),
      version: 1,
      status: "active",
      releaseRef: exactRef(release),
      itemKey,
      guidanceItemRef: exactRef(item),
      responseRequestRef: executionResponse ? exactRef(release.responseRequest) : null,
      executionResponse,
      question: clean(question) || null,
      questionState: clean(question) ? "unresolved" : null,
      reviewState: "needs_review",
      publicationState: "unpublished",
      recordedAt: this.now
    }, "record_client_interaction", [release, item]);
  }

  reviewEvents() {
    const events = [];
    for (const interaction of this.all("client_interaction")) {
      if (interaction.reviewState === "needs_review" && (interaction.question || ["changed_or_partial", "stopped"].includes(interaction.executionResponse))) {
        events.push({ kind: interaction.question ? "question" : interaction.executionResponse, ref: exactRef(interaction) });
      }
    }
    if (this.currentReleaseRef) {
      const release = this.resolve(this.currentReleaseRef);
      if (release.status === "active" && Date.parse(this.now) >= Date.parse(release.reviewAt)) events.push({ kind: "review_due", ref: exactRef(release) });
      if (release.validUntil && Date.parse(this.now) >= Date.parse(release.validUntil)) events.push({ kind: "hard_expired", ref: exactRef(release) });
    }
    return deepFreeze(events);
  }

  reviewInteraction(interactionRef, { resolution = null } = {}) {
    const interaction = this.resolve(interactionRef, { role: "client_interaction" });
    const reviewed = {
      ...interaction,
      reviewState: "approved",
      reviewedBy: "damian",
      reviewedAt: this.now,
      questionState: interaction.question ? oneOf(resolution, ["unresolved", "resolved"], "Question resolution state required.") : null
    };
    return this.replace(interaction, reviewed, "review_client_interaction");
  }

  decide({ value, rationale, evidenceRefs = [] }) {
    const cycle = this.currentCycle();
    oneOf(value, TRAINER_DECISIONS, "Explicit trainer decision required.");
    required(rationale, "Trainer rationale required.");
    const evidence = evidenceRefs.map(ref => this.resolve(ref));
    ensureSameCase(this.caseId, evidence);
    if (evidence.some(record => record.operationalRole === "client_interaction" && record.reviewState !== "approved")) {
      throw new Error("Exact client interaction requires explicit Damian review before decision use.");
    }
    const version = this.all("adaptation_decision").length + 1;
    return this.add({
      ...recordBase({ id: `${this.caseId}-adaptation`, caseId: this.caseId, version, informationType: "trainer_decision", operationalRole: "adaptation_decision" }),
      version,
      status: "active",
      cycleRef: exactRef(cycle),
      value,
      rationale: clean(rationale),
      evidenceRefs: evidence.map(exactRef),
      decidedAt: this.now
    }, "record_adaptation_decision", [cycle, ...evidence]);
  }

  selectReportEvidence(recordRefs, purpose) {
    const cycle = this.currentCycle();
    const records = recordRefs.map(ref => this.resolve(ref));
    ensureSameCase(this.caseId, records);
    const selection = this.add({
      ...recordBase({ id: `${this.caseId}-report-evidence-${this.all("report_evidence_selection").length + 1}`, caseId: this.caseId, operationalRole: "report_evidence_selection" }),
      version: 1,
      status: "active",
      cycleRef: exactRef(cycle),
      selectedRefs: records.map(exactRef),
      purpose: required(purpose, "Evidence selection purpose required."),
      reportGenerated: false,
      visibility: "trainer_only"
    }, "select_report_evidence", [cycle, ...records]);
    return selection;
  }

  clientProjection() {
    const release = this.currentRelease();
    return deepFreeze({
      caseId: this.caseId,
      currentReleaseRef: exactRef(release),
      authoritativeChannel: release.authoritativeChannel,
      items: release.items
        .filter(item => item.reviewState === "approved" && item.publicationState === "published")
        .map(({ key, instruction, purpose, dose, stopCriteria }) => ({ key, instruction, purpose, dose, stopCriteria })),
      trainerOnlyRecordsExposed: false,
      priorReleasesExposed: false
    });
  }
}

export function makeEntryDecision({ caseId, value = "START", status = "active", current = true, author = "damian", version = 1, supersedes = null }) {
  return deepFreeze({
    ...recordBase({ id: `${caseId}-stage4-decision`, caseId, version, informationType: "trainer_decision", operationalRole: "stage4_decision", author }),
    version,
    value,
    status,
    current,
    supersedes
  });
}

export function createEntryLedger({ caseId, decisions }) {
  required(caseId, "Entry ledger case id required.");
  if (!Array.isArray(decisions) || decisions.length < 1) throw new Error("Stage 4 decision history required.");
  ensureSameCase(caseId, decisions);
  const sorted = [...decisions].sort((left, right) => left.version - right.version);
  const id = sorted[0].id;
  const byRef = Object.create(null);
  sorted.forEach((decision, index) => {
    if (decision.id !== id || decision.version !== index + 1) throw new Error("Canonical Stage 4 decision lineage must be continuous.");
    if (index > 0 && decision.supersedes !== exactRef(sorted[index - 1])) throw new Error("Canonical Stage 4 decision supersedes lineage is invalid.");
    byRef[exactRef(decision)] = decision;
  });
  const active = sorted.filter(decision => decision.status === "active" && decision.current === true);
  if (active.length > 1) throw new Error("Canonical Stage 4 ledger cannot contain multiple current decisions.");
  const currentRef = active.length === 1 ? exactRef(active[0]) : null;
  if (currentRef && currentRef !== exactRef(sorted.at(-1))) throw new Error("Only the canonical lineage tip may be current.");
  const ledger = deepFreeze({ kind: "stage4_decision_ledger", caseId, records: sorted, byRef, currentRef });
  canonicalEntryLedgers.add(ledger);
  return ledger;
}
