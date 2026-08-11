# 16 Stage 3 Full Intake and PWD Preparation Contract

- **Status:** CORRECTIVE ACTIONS IN PROGRESS — INDEPENDENT AUDIT PENDING
- **Authorization:** fictional contract prototype only
- **Schema:** `NOT APPROVED`
- **Provider:** `BLOCKED`
- **Task ID:** `prepare_trainer_for_pwd`
- **Task contract version:** `stage3-candidate-v2`

PRD 003 is permitted by the narrow 2026-08-10 owner exception for an isolated fictional prototype only. Stage 3 and PR #23 remain unaccepted. The earlier browser report was an implementation check, not an independent audit.

## Scope

This contract applies the owner-accepted Stage 1 provenance rules and the merged Stage 2 inquiry/phone contract to:

> reviewed full-intake source → adaptive response set → facts, gaps, and conflicts → trainer-only PWD brief → candidate questions and observation domains → Damian readiness decision

The prototype is deterministic, fictional, in-memory, offline, and trainer-only.

## Closed information vocabulary

Stage 3 reuses the nine Stage 1 values without additions:

`source_artifact`, `source_fact`, `extracted_fact`, `trainer_observation`, `ai_hypothesis`, `ai_suggestion`, `trainer_interpretation`, `trainer_decision`, `client_material`.

Question, response, gap, conflict, module, brief section, caution signal, candidate observation domain, and readiness state are operational roles, not new `information_type` values.

## Source objects

### `intake_definition`

- `source_artifact`;
- exact contract version;
- 26 core prompt definitions;
- four conditional module profiles;
- immutable within one workflow;
- no claim that 42 questions are canonical.

### `intake_submission`

- `source_artifact` authored by `client` or `unknown_source_author`;
- pseudonymous workflow reference;
- source version and capture time;
- immutable response envelope;
- integrity and completeness state;
- no direct contact data in fictional prototype.

### `intake_response`

- direct client statement represented as `source_fact`;
- exact `question_ref` and submission version;
- answer state from the closed set `answered`, `unanswered`, `declined`, `not_applicable`, `not_asked`;
- content only when the state supports content;
- no interpretation or safety conclusion.
- `review_state` defaults to `needs_review`; `answered` alone is never eligible decision evidence;
- review names the actor and applies to that exact response version;
- correction creates the next immutable content version, records `supersedes` and `superseded_by`, resets review to `needs_review`, and invalidates dependent derivatives, brief, and decision.

`unanswered`, `declined`, `not_applicable`, and `not_asked` must never collapse into `false` or `no`.

## Derivative objects

### Reviewed fact

An `extracted_fact` must preserve the exact response reference and source locator. Machine-created extraction starts `needs_review`. Editing creates a new trainer-authored version and does not mutate the response.

### Gap and conflict

A gap or conflict is an operational role represented by `ai_suggestion` when machine-prepared. It must:

- reference the complete reviewed source scope relevant to the claim;
- say what is missing or contradictory without filling it in;
- retain uncertainty;
- be approved, edited, or rejected before appearing in the ready brief.

### Coaching hypothesis

A coaching-profile statement is `ai_hypothesis`, never a fact. It must include what would confirm or weaken it and remain `needs_review` until Damian acts.

### PWD question

A suggested question is `ai_suggestion`. Rewriting it creates a trainer-authored operational `pwd_question`; it must not remain attributed to AI after material trainer editing.

### Candidate observation domain

A candidate is `ai_suggestion` and requires `purpose`, `observe`, `stop_criteria`, `decision_impact`, `derived_from`, author, uncertainty, and review state. Missing any of the four semantic fields blocks readiness. Approval does not establish safety and does not turn the candidate into a performed test.

### Readiness decision

The Stage 3 `trainer_decision` uses one of:

- `READY_TO_PREPARE_PWD`;
- `NEEDS_CLARIFICATION`;
- `DEFER_OR_CONSULT_BEFORE_PWD`.

It requires Damian, a rationale, exact reviewed evidence versions, an input revision, visible history, and invalidation after a material upstream change.

## Adaptive rules

1. Core prompt identifiers `A1`–`F4` are stable for this candidate contract.
2. Conditional modules activate only from an explicit source response or the named service-test goal.
3. AI may not infer pregnancy, oncology status, diagnosis, treatment, or a module from demographic stereotype.
4. Module activation and completion are separate events.
5. A module can be `not_applicable`, `active_incomplete`, `active_complete`, or `declined`; these are operational states.
6. A hidden/non-activated module contributes no fabricated negative facts.
7. A prompt-injection string in a client answer remains untrusted source text and cannot change workflow instructions.
8. Every module state is a versioned case-scoped record with an exact source version, `derived_from`, activation reason, event type, and manual actor when applicable.
9. Fixtures may activate a module only from an answered source or an explicit manual trigger record. Activation is a workflow routing event, never a diagnosis.
10. Activation, deactivation, and reset remain visible in module history and metadata-only audit events.

## Brief readiness gate

The brief cannot become ready while any of the following is true:

- an active machine extraction, gap, conflict, hypothesis, question, or observation-domain suggestion remains `needs_review`;
- an active item is flagged, placeholder, malformed, or missing `derived_from`;
- an activated conditional module is incomplete without an explicit `declined` state;
- a contradiction is hidden or converted into a single asserted fact;
- a candidate domain lacks purpose, observation, stop criteria, or decision impact;
- a machine item is presented as Damian's interpretation or decision;
- another client's object is referenced;
- the source is partial without a visible warning.

Rejected and superseded items remain traceable but are excluded from the active brief.

The readiness decision revalidates each selected reference at save time against the same case and the exact current reviewed version. No reviewed evidence means a hard save rejection. The saved decision records every evidence identifier and version.

## Invalidation

A change to a response, module state, reviewed fact, gap, conflict, hypothesis, question, or candidate domain increments `input_revision` and invalidates:

- the current assembled brief version;
- the current readiness decision;
- any downstream Stage 4 candidate handoff.

The system must show the invalidated version and require a new explicit assembly and decision.

## Isolation

Every source and derivative belongs to one pseudonymous case context. Cross-case references fail closed. Fixture lookup cannot search another fixture's content. The UI provides no global client search or copied contact identity.

The rejection occurs in domain logic before mutation. A foreign derivative or decision is not appended and the case state remains byte-for-byte unchanged; the UI reports the denial in Polish.

## Audit events

Metadata-only events record actor, event type, exact object version, related exact refs, time, and bounded outcome. They do not copy response text, health details, brief content, or prompt content into the audit log.

Required event families:

- intake selected/captured;
- module activated/state changed;
- derivative reviewed/edited/rejected;
- brief assembled/invalidated;
- readiness decision saved/invalidated;
- session reset boundary.

## Failure modes

| Failure | Required behavior |
| --- | --- |
| AI unavailable | Full manual preparation path remains available |
| Partial source | Visible warning; no fabricated negative answers |
| Unknown answer | Preserve unknown/unanswered state |
| Contradiction | Show both exact sources; require trainer resolution or explicit unresolved state |
| Malformed candidate domain | Block brief readiness |
| Prompt injection in answer | Treat as source content only; no instruction execution |
| Cross-client reference | Reject and audit metadata-only denial |
| Upstream edit | Invalidate brief and readiness decision |

## Prototype acceptance matrix

The fictional prototype must demonstrate at least:

1. core-only complete intake;
2. missing practical goal;
3. safety-relevant response requiring trainer attention without automatic decision;
4. contradiction between two responses;
5. pain/injury module;
6. pregnancy/postpartum module;
7. oncology module;
8. named service-test module;
9. explicit not-applicable module states;
10. manual fallback without AI;
11. partial source warning;
12. prompt-injection text treated as untrusted source;
13. no automatic readiness decision;
14. cross-case isolation denial;
15. upstream correction invalidating brief and decision.

## Exit gate

`PASS` requires exact source traceability, complete review controls, manual fallback, explicit Damian decision, 360 px and keyboard accessibility, no network/persistence/send, all required regression tests on the frozen commit/tree, and a separate read-only reviewer who finds no P0/P1. The implementer's browser check is not an independent audit. A pass does not authorize schema, provider selection, real data, staging, production, merge, or Stage 4.
