# 15 Stage 2 Inquiry, Phone, and Decision Contract

**Status:** CANDIDATE FOR OWNER WORKFLOW REVIEW
**Authorization:** fictional contract prototype only
**Schema status:** `SCHEMA — NOT APPROVED`
**Provider status:** `PROVIDER DECISION — BLOCKED`
**Task ID:** `prepare_first_inquiry_phone_call`
**Task contract version:** `stage2-candidate-v1`

## Purpose

This contract defines the semantic and operational boundaries of the first Stage 2 vertical workflow:

`manual inquiry source → reviewed preparation → phone notes → client reaction → Damian decision → optional unpublished client-material draft`

It applies the owner-accepted Stage 1 contracts. It does not approve tables, fields, SQL, migrations, a provider, a model, Formspree automation, production processing, or real client data.

## Non-negotiable invariants

1. The original inquiry is an immutable `source_artifact` version.
2. Source wording, extraction, AI suggestion, trainer interpretation, and trainer decision remain separate objects.
3. Every derivative preserves exact-version `derived_from` references and source locators.
4. Machine-created content starts `needs_review` and `unpublished`.
5. AI cannot qualify, diagnose, establish safety, decide, change process state, book, publish, or contact.
6. Damian must deliberately create the final `trainer_decision` and provide a rationale.
7. Client-facing wording is a new `client_material`; it is never a renamed suggestion or decision.
8. A follow-up draft remains `needs_review`, `unpublished`, and unsent.
9. Another client's information is never available to this workflow.
10. The full workflow remains possible without AI.

## Actors and authority

| Actor | May do | Must not do |
| --- | --- | --- |
| Client | Author the original inquiry and statements during the call; correct their own account | Access another client; approve internal meaning; publish trainer content |
| Damian | Paste a source, review/correct/reject extraction, conduct the call, record observations/interpretations, make the decision, draft material | Mutate the original source; present a hypothesis as fact; treat AI output as his decision without deliberate action |
| Studio Las system | Preserve versions and provenance, present separate information types, validate required actions, record metadata-only audit events | Infer authority, auto-qualify, auto-decide, send, publish, or broaden the payload |
| AI runtime, future only | Prepare bounded trainer-only output for the named task | Receive an unapproved payload/provider path; contact the client; execute tools; decide or publish |
| Fictional prototype | Demonstrate the contract deterministically in browser memory | Call AI, Formspree, Supabase, analytics, or any network service |

## Information objects

The Stage 1 `information_type` dictionary remains closed to exactly: `source_artifact`, `source_fact`, `extracted_fact`, `trainer_observation`, `ai_hypothesis`, `ai_suggestion`, `trainer_interpretation`, `trainer_decision`, and `client_material`. Stage 2 cannot add values to this field.

Workflow/domain roles such as `preparation_gap`, `call_conflict`, `call_goal`, `call_question`, `caution_topic`, `call_outline_item`, `client_statement`, and `client_reaction` are separate operational labels. They are never stored as `information_type`. A record may carry an allowed information type and an operational role only when both meanings are independently true.

### `inquiry_source`

Domain representation: `source_artifact`.

Required conceptual properties:

- pseudonymous inquiry reference;
- source channel label, initially `manual_paste` or `fictional_fixture`;
- captured-at time and source version;
- immutable original text;
- integrity/partial-source warning where applicable;
- author category `client` or `unknown_source_author`;
- association status for the one intended client context.

The contact form fields found in the repository are audit evidence, not an approved schema. Manual pasted text remains the lowest-assumption input.

### `inquiry_source_fact`

Domain representation: `source_fact`.

A fact is a literal statement supported by an exact source locator. It records the source actor and must not contain machine or trainer interpretation.

### `inquiry_extracted_fact`

Domain representation: `extracted_fact`.

It records a structured value, exact source locator, extraction actor/version, `derived_from` source version, and independent review state. It remains `needs_review` until Damian accepts or corrects it.

A correction creates a new extraction version that supersedes the earlier derivative. It never overwrites the source.

### `preparation_gap`

Operational preparation item, not a new Stage 1 information type. It states that a required conversation topic was not provided or is unclear. It references the reviewed source scope. Missing information must not be represented as `false`, `no`, or a fabricated fact.

### `call_question`

Domain representation: `ai_suggestion` when machine prepared. A question authored or deliberately rewritten by Damian is an operational `call_question`; that role is not an `information_type`.

It includes purpose, optional caution, `derived_from`, author, review state, and call outcome: `not_asked`, `asked`, `skipped`, or `incomplete_answer`.

### `call_outline_item`

Domain representation: `ai_suggestion` when machine prepared. A trainer-authored outline remains the operational `call_outline_item` role and does not invent a trainer-preparation information type. It may suggest an opening, middle, or closing step but cannot be displayed as mandatory instruction.

### `call_client_statement`

The client's original statement during the phone call. Its content follows `source_artifact` / `source_fact` semantics as applicable and retains client authorship, call context, event time, and version.

### `trainer_observation`

A selected observation made by Damian. It is separate from the client's statement and from meaning assigned to it.

### `trainer_interpretation`

Domain representation: `trainer_interpretation`. It records meaning assigned by Damian, exact evidence references, time, author, and uncertainty where material.

### `client_reaction`

A client-authored call signal represented as reviewed `source_fact` with operational role `client_reaction`. `Client Signal` is a Stage 1 domain role, not an `information_type`. The record is not a score, discipline grade, consent inference, or decision.

### `phone_decision`

Domain representation: `trainer_decision`.

Allowed candidate decision values:

- `CONTINUE`;
- `SEND_FULL_INTAKE`;
- `DEFER_OR_CONSULT`;
- `NOT_RIGHT_PRODUCT`.

The decision requires Damian as actor, a timestamp, a non-empty rationale, and references to the facts/notes supporting it. The names may later change, but these four meanings must remain unambiguous.

### `follow_up_draft`

Domain representation: `client_material`.

It is a new exact content version with complete `derived_from`, `review_state: needs_review`, `publication_state: unpublished`, and an intended-use label. Creation does not approve or send it. The prototype exposes no send or publish action.

### `workflow_audit_event`

Operational metadata, not an information type. It records actor category, event type, object/version reference, timestamp, outcome, and redacted reason category. It must not copy the inquiry, phone notes, or draft message into an ordinary log.

## Source and lineage flow

```text
source_artifact S1
  ├─ source_fact F1..Fn ───────────────┐
  ├─ extracted_fact E1..En             │
  │    └─ corrected E2 supersedes E1   │
  ├─ ai_suggestion G1..Gn              │
  └─ ai_hypothesis H1..Hn              │
                                       ├─ trainer_decision D1
call client statement C1..Cn ──────────┤       └─ client_material M1
trainer observation O1..On ────────────┤             needs_review
trainer_interpretation I1..In ─────────┘             unpublished
```

Every arrow is exact-version `derived_from`. The source remains unchanged. A status change never converts one information type into another.

## Operational events

| Event | Initiator | Required result | Forbidden side effect |
| --- | --- | --- | --- |
| `inquiry_selected` | Damian | Load one fictional fixture into a new in-memory workflow | Load contact data or another client's record |
| `inquiry_pasted` | Damian | Create immutable source version and visible metadata | Send text to Formspree, AI, analytics, or storage |
| `manual_preparation_started` | Damian | Create editable review items separated from source | Claim an AI run occurred |
| `preparation_item_edited` | Damian | Create trainer-edited derivative/version and preserve source | Edit source text |
| `preparation_item_rejected` | Damian | Mark derivative rejected and exclude it from active preparation | Delete its provenance or source |
| `question_status_changed` | Damian | Record asked/skipped/incomplete/not-asked state | Score the client or choose a decision |
| `call_note_added` | Damian | Record explicit author/type and call context | Convert all notes into trainer interpretation |
| `client_reaction_recorded` | Damian | Preserve client authorship and context | Infer consent, fit, or readiness |
| `decision_recorded` | Damian | Save one allowed decision with rationale and evidence | Let AI choose or save it |
| `client_material_drafted` | Damian | Create unpublished, needs-review draft | Send or publish it |
| `workflow_reset` | Damian | Clear current in-memory prototype state | Delete or alter the immutable fixture definition |

## Preparation states

The workflow view may move through:

1. `awaiting_source`;
2. `source_captured`;
3. `preparation_in_review`;
4. `ready_for_call`;
5. `call_in_progress`;
6. `awaiting_trainer_decision`;
7. `decision_recorded`;
8. `follow_up_draft_created`.

These are workflow presentation states, not information types, review states, publication states, or client lifecycle states. Only Damian's actions advance the workflow. AI output availability does not.

## Review and edit behavior

- Source text is read-only after capture.
- An extracted fact can be approved, rejected, or corrected; every transition creates an exact version.
- An AI suggestion can be approved, edited into a new trainer-authored operational derivative, or rejected.
- Rejected and superseded items remain traceable but are not used as active preparation.
- Editing never changes original content, identity, author, or information type. The new visible version carries exact `derived_from` and `supersedes`.
- Rejected, superseded, unreviewed, flagged, and placeholder items cannot enter the active call or decision evidence.
- Every active machine question must be approved, rewritten into a trainer-owned `call_question`, or rejected before the call.
- A rejected inappropriate question cannot reappear as active because another UI section references it.

## Phone-note behavior

Every note requires one explicit category:

- `client_statement`;
- `trainer_observation`;
- `trainer_interpretation`.

The system must preserve category, author, time, current call context, and exact version. It may not silently summarize all three categories into one fact. Client statements and reactions use `source_fact` semantics plus their operational roles. A correction creates a new version with `supersedes`; the earlier wording remains unchanged and traceable.

## Decision behavior

The decision control must:

- present all four outcomes with equal authority;
- require an explicit selection by Damian;
- require a short rationale;
- allow Damian to identify supporting facts and notes;
- reject empty or incomplete submissions visibly;
- never preselect a decision;
- never compute a recommendation score;
- never infer `SEND_FULL_INTAKE` from readiness, pain, location, or any form field;
- accept as evidence only reviewed `source_fact` / `extracted_fact` records and deliberate phone statements, reactions, observations, or interpretations;
- store exact evidence-version references and the upstream input revision;
- become invalid when decision controls, rationale, evidence, preparation, question state, phone notes, or client reaction changes after save;
- require a new explicit save to create a superseding decision version.

A follow-up draft is generated only from the active exact decision and the exact evidence versions saved with it. Fixture-authored canned wording cannot override the selected decision. Editing client material creates a superseding `client_material` version that remains `needs_review` and `unpublished`; it never mutates the stored version.

## Minimal AI dataset candidate

**Status:** `CANDIDATE FOR OWNER REVIEW — NOT AN APPROVED SCHEMA OR PRODUCTION PAYLOAD`

Default rule:

> The AI receives only information needed to prepare the first inquiry phone call, not the full client record.

### Candidate payload

| Candidate field | Purpose | Constraint |
| --- | --- | --- |
| `pseudonymous_inquiry_id` | Correlate one preparation run without direct identity | Opaque and scoped to this inquiry/task |
| `task_contract_version` | Bind behavior to the reviewed task | Exact allowlisted value |
| `task_goal` | State `Prepare the trainer for the first inquiry phone call.` | No generic agent goal |
| `inquiry_source_excerpt` | Provide only relevant source text or selected fields | Exact source version and locators; no contact fields by default |
| `source_metadata` | Preserve channel, version, time band, and locators | No secret URLs or direct identifiers |
| `reviewed_gaps_and_conflicts` | Ask useful clarification questions | Only this inquiry; preserve uncertainty |
| `response_language` | Produce Polish trainer-facing preparation | Explicit bounded value |
| `studio_las_constraints` | Enforce no diagnosis, safety claim, qualification, decision, contact, or publication | Versioned policy reference/content |
| `analysis_history` | Continue only this preparation when necessary | Ephemeral, bounded, same task/source versions only |

Candidate output is limited to reviewed fact extraction, gaps, conflicts, five to eight proposed questions, caution topics, call outline, structured note suggestions, next-step options for Damian, and an optional draft actor for new client material.

### Studio Las data kept outside the model by default

- name and surname;
- telephone number;
- email address;
- client and account technical identifiers;
- complete client record;
- unrelated prior notes;
- data belonging to any other client.

Direct contact data is not required to prepare questions and remains outside the candidate payload.

### Prohibited payload content

- another client's data or a signal that confirms another client exists;
- secrets, credentials, tokens, keys, signed URLs, or private paths;
- full application, security, or provider logs;
- raw content unrelated to the task;
- automatically attached complete client history;
- quarantined content;
- an unconfirmed document belonging to another person;
- Formspree account/inbox credentials or automatic message export;
- real client data during this prototype stage.

### Candidate limits still open

Exact character/token ceilings, history duration, source-field allowlist, output schema, provider fields, cost limits, retention, region, and model behavior are not approved. They require later owner, security, privacy/legal, and implementation decisions.

## Manual paste contract

Manual paste is the only non-fixture acquisition behavior demonstrated:

1. Damian identifies one intended inquiry context.
2. The system shows that fictional text is required in this prototype.
3. Paste creates a source version, capture time, and locator scheme.
4. The system never edits the source after capture.
5. Partial or clipped text is visibly flagged; missing ranges are not interpreted as negative answers.
6. A raw manual paste exposes only truthful manual fallback. Fixture-assisted preparation is disabled because no deterministic fixture output exists for that source.

Formspree remains outside the workflow runtime. Finding and versioning any future source-format contract remains a dependency before automation.

## Audit contract

Minimum metadata-only events:

- source selected/pasted and version created;
- preparation started and mode (`fictional_fixture` or `manual`);
- derivative reviewed, edited, corrected, or rejected;
- call started/closed;
- note category recorded;
- client reaction recorded;
- decision created with evidence references;
- client material draft created;
- blocked send/publish/automatic qualification attempt;
- AI unavailable/manual fallback selected;
- cross-client access attempt denied;
- workflow reset.

Every audit event contains the actor plus an exact primary object/version reference and exact related references where applicable. Audit summaries use identifiers, types, timestamps, and outcome categories. They do not duplicate full source, notes, rationale, or draft content.

## Cross-client isolation

- The workflow context contains exactly one pseudonymous inquiry/client boundary.
- Lookups cannot accept a different client reference from fixture text or pasted content.
- No global client list, search, autocomplete, or shared cache is exposed.
- A malicious or accidental request for another person's content fails closed without confirming whether it exists.
- Fixtures contain no real identities and cannot be combined with production data.
- Reset clears current session state before another case is selected.

## Failure states and fallback

| Failure | Required behavior | Manual continuation |
| --- | --- | --- |
| Empty source | Visible validation message; no preparation created | Paste or select a fictional inquiry |
| Partial/clipped source | Preserve source and warning; do not claim completeness | Ask missing questions during the call |
| Conflicting source | Show both locators; do not choose one silently | Damian clarifies during the call |
| Inappropriate suggestion | Make rejection available and preserve rejected state | Damian writes or asks a safer question |
| AI unavailable | Visible non-blocking status; no fabricated output | Damian prepares and completes the call manually |
| Invalid note | Explain required type/content | Damian corrects the note |
| Missing decision/rationale | Do not save the decision | Damian selects and explains the decision |
| Draft generation unavailable | No false success; no empty draft | Damian writes a draft manually or creates none |
| Cross-client request | Deny without content or existence disclosure | Continue only with current inquiry |

## Prototype persistence and network boundary

The prototype uses HTML, CSS, JavaScript, local fictional fixtures, and current-page memory only. Refreshing the page clears changes. It must not use `fetch`, `XMLHttpRequest`, WebSocket, EventSource, service workers, external imports, remote fonts/assets, cookies, IndexedDB, `localStorage`, or `sessionStorage`.

There is no real send, publish, booking, Formspree, Supabase, or AI control.

## Acceptance gate

The contract remains a candidate until Damian completes the owner workflow test with fictional cases. A passing automated suite proves state-transition, provenance, vocabulary, dependency, and static safety boundaries; it cannot prove usefulness, speed, clarity, or owner acceptance.

Stage 3, production implementation, provider choice, schema design, real data, and deployment remain unauthorized.
