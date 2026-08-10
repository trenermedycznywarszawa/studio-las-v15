# PRD 002 — Inquiry to Phone Decision v1

**Status:** CANDIDATE FOR INDEPENDENT DELEGATED PROTOTYPE RE-AUDIT
**Stage:** 2 — contract and fictional workflow prototype only
**Base:** `product-recovery@8ecfe2620ec658a1a3c6dbef90694274a3b12082`

## Problem

An initial inquiry may contain useful context, missing information, ambiguity, and sensitive health-related statements in one unstructured message. Before calling, Damian needs a fast way to separate what the person actually wrote from extraction and optional preparation suggestions. During and after the call he needs to preserve client statements, his own observations and interpretations, and his final decision without collapsing them into one note.

Today the public repository exposes a Formspree-backed contact form and a smaller simple-contact form, but Stage 2 has no approved automated ingestion, AI runtime, production schema, or client-data flow. A fictional prototype is needed to test the workflow before any of those implementation decisions.

## Primary user

Damian is the only primary user of v1. The client does not use this prototype and receives no content from it.

The client's interest is represented by the product boundaries: calm contact, accurate use of their words, no automated judgment, no sales pressure, and no unreviewed message.

## Job to be done

When Damian receives a first inquiry, he wants to prepare and close the first phone call while preserving provenance and uncertainty, so that he can choose an explicit next step without losing context or outsourcing judgment to AI.

## Approved first AI task

`Prepare the trainer for the first inquiry phone call.`

The task may prepare facts, gaps, conflicts, five to eight questions, caution topics, a short call outline, structured post-call notes, possible next-step options, and an optional follow-up draft for review.

It may not qualify, diagnose, establish safety, decide, plan, book, send, publish, contact, or advance workflow state.

The prototype does not execute AI. It uses deterministic fictional preparation to demonstrate the future output boundary.

## Happy path

1. Damian opens the isolated prototype and sees the fictional-data/no-network boundary.
2. He selects a fictional fixture or pastes fictional inquiry text.
3. The system freezes a visible source artifact with version, time, and source label.
4. Damian starts preparation in fixture-assisted or fully manual mode.
5. He reviews known facts, missing information, conflicts, call goal, five to eight questions, caution topics, and call outline.
6. He edits or rejects at least one derivative if needed and marks reviewed items.
7. He starts the simulated call.
8. He records client statements, trainer observations, and trainer interpretations as separate notes.
9. He marks question outcomes and records the client's reaction.
10. He selects one of four decisions, writes a rationale, and selects supporting items.
11. If useful, he creates a follow-up `client_material` draft.
12. The draft remains `DO SPRAWDZENIA — NIE WYSŁANO`, `needs_review`, and `unpublished` with no send control.
13. The audit summary shows metadata-only events.

## Alternative paths

### Manual-only preparation

Damian selects `AI unavailable / manual fallback`, writes preparation himself, and completes the call and decision without loss of functionality.

### Very short or incomplete inquiry

The source remains valid. Missing areas are visible and may become questions. The system does not fabricate negative facts.

### Conflicting inquiry

Both statements and locators remain visible. Damian may clarify during the call; the system does not silently choose a version.

### Inappropriate suggested question

Damian rejects it. The item remains traceable as rejected and cannot control the call or decision.

### Client changes an answer

A new client statement is recorded with time and context. The earlier statement remains in history and may be marked contradicted; it is not overwritten.

### Consultation or product mismatch

`DEFER_OR_CONSULT` and `NOT_RIGHT_PRODUCT` are first-class outcomes with the same visual authority as continuation.

### No follow-up message needed

The workflow may close with a decision and no `client_material`.

### Invalid or cross-client content

The workflow rejects another-client requests and warns on partial or suspicious source content without revealing or importing external information.

## Functional requirements

### Source

- FR-01: Allow selection of at least 12 clearly fictional cases.
- FR-02: Allow manual paste only when the user acknowledges fictional-data use.
- FR-03: Present source text read-only after capture.
- FR-04: Show source label, explicit source-author category, capture time, pseudonymous inquiry ID, and version.
- FR-05: Reset in-memory state deliberately without changing fixture definitions.

### Preparation

- FR-06: Present separate sections for known, unknown, conflicting/unclear, goal, questions, caution, and outline.
- FR-07: Show the allowed information type when present, separate operational role, author, exact version, source locator, lineage, and review state for each preparation item.
- FR-08: Visually distinguish source-derived facts from AI suggestions and hypotheses.
- FR-09: Editing creates a new exact derivative/version with `derived_from` and `supersedes`; it never mutates the source or earlier derivative.
- FR-10: Provide five to eight optional questions for fixture-assisted cases.
- FR-11: Support a complete manual preparation fallback and disable fixture-assisted labeling for a raw manual paste.

### Call

- FR-12: Add notes as client statement, Damian observation, or Damian interpretation.
- FR-13: Record every question outcome as a versioned bounded operational record with an exact question-version reference: not asked, asked, skipped, or incomplete answer.
- FR-14: Record client reaction separately.
- FR-15: Preserve note author, time, context, local identifier, exact version, and correction/supersession chain.
- FR-16: Never show scoring, discipline, compliance, conversion probability, or automatic qualification.

### Close

- FR-17: Present `CONTINUE`, `SEND_FULL_INTAKE`, `DEFER_OR_CONSULT`, and `NOT_RIGHT_PRODUCT` without preselection.
- FR-18: Require a non-empty rationale.
- FR-19: Let Damian select only reviewed source/extracted facts and deliberately recorded phone records, always by exact version.
- FR-20: Record the decision only after explicit Damian action.
- FR-20a: Store canonical exact-version `derived_from` on every decision and visibly preserve active, invalidated, and superseded decision versions.
- FR-21: Optionally create a follow-up draft solely from the active exact decision version and its exact evidence versions.
- FR-22: Mark every created or edited draft version `DO SPRAWDZENIA — NIE WYSŁANO`, `needs_review`, and `unpublished`; preserve explicit drafting actor/author and intended use; editing creates a superseding version.
- FR-23: Provide no send, publish, booking, or Formspree action.

### Audit and failure

- FR-24: Show metadata-only audit events with actor and exact primary/related object-version references, without repeating source, notes, rationale, or draft.
- FR-25: Display actionable empty and invalid-state messages.
- FR-26: Keep the prototype usable at 360 px without horizontal overflow.
- FR-27: Keep primary controls keyboard reachable with visible focus.
- FR-28: Reject every `information_type` outside the closed nine-value Stage 1 dictionary and store workflow roles separately.
- FR-29: Block placeholders, flagged items, and unreviewed machine content from the call and decision evidence.
- FR-30: Invalidate dependent decisions and drafts after every material upstream change; require an explicit superseding decision save.
- FR-31: Preserve historical and current active versions visibly.

## Safety requirements

- SR-01: No diagnosis, medical certainty, or training-safety determination.
- SR-02: No automatic qualification or decision.
- SR-03: No scoring or pressure mechanics.
- SR-04: No hidden preference for continuation outcomes.
- SR-05: AI-origin content remains advisory, trainer-only, reviewable, and unpublished.
- SR-06: An inappropriate question can be rejected before the call.
- SR-07: Missing information stays unknown.
- SR-08: Conflicts remain visible until Damian resolves or preserves uncertainty.
- SR-09: AI unavailability fails to the full manual workflow.
- SR-10: No client-facing material exists without creation of a separate draft object.

## Privacy requirements

- PR-01: All included fixtures are explicit fiction and use no real-client identifiers.
- PR-02: Direct contact fields stay outside the candidate AI payload by default.
- PR-03: No other-client data can enter the active context.
- PR-04: No network, API, remote asset, analytics, external library, or real AI call.
- PR-05: No `localStorage`, `sessionStorage`, IndexedDB, cookie, or persistent browser source of truth.
- PR-06: No Supabase, Formspree automation, SQL, or production data flow.
- PR-07: Audit records metadata only and does not copy content.
- PR-08: Refresh clears session changes.

## Minimal dataset candidate

**Candidate for owner review; not an approved schema or production payload.**

The candidate input contains only:

- a pseudonymous inquiry identifier;
- task contract version;
- exact task goal;
- relevant inquiry excerpt or selected fields with exact source locators;
- bounded source metadata;
- reviewed gaps and conflicts;
- response language;
- versioned Studio Las constraints;
- bounded history of this analysis only, if necessary.

Name, surname, phone, email, technical client identifiers, full record, unrelated notes, and other-client data remain outside the model by default.

Secrets, credentials, full logs, unrelated raw data, complete client history, quarantine content, unconfirmed other-person documents, and any real client data in Stage 2 are forbidden.

Exact limits, provider fields, schema, retention, region, cost, model, and runtime controls remain open. The normative candidate is detailed in `docs/architecture/15_STAGE_2_INQUIRY_PHONE_DECISION_CONTRACT.md`.

## Acceptance criteria

- AC-01: The current repository form fields and Formspree behavior are documented as audit evidence, not automated.
- AC-02: An immutable source remains visible beside editable derivatives.
- AC-03: The nine allowed information types remain closed, while source facts, extracted facts, AI suggestions/hypotheses, trainer records, decisions, client material, and operational roles are visibly distinct.
- AC-04: Every derivative displays or conceptually preserves exact `derived_from`.
- AC-05: At least 12 fictional cases cover happy, ambiguous, unsafe, failure, and isolation paths.
- AC-06: Five to eight questions are available in assisted preparation and can be edited/rejected.
- AC-07: Notes and reactions preserve explicit authorship, allowed type, operational role, exact version, and supersession.
- AC-07a: Each source version preserves an explicit source-author category, and each `client_material` version preserves its drafting actor/author and intended use.
- AC-08: No score or automatic qualification is present.
- AC-09: All four decisions require Damian's action and rationale.
- AC-10: A follow-up draft matches its exact saved decision/evidence, and every edit remains a new visibly unsent and unpublished version.
- AC-11: The complete workflow works in manual fallback mode.
- AC-12: No external requests, secrets, storage, real AI, or real client data are present.
- AC-13: Automated behavioral/state-transition test and inherited seven tests pass on the final tree.
- AC-14: `git diff --check` passes.
- AC-15: An independent ChatGPT audit, separate from the implementation pass, executes the fictional prototype protocol and records `PASS`, `PASS WITH CORRECTIONS`, or `FAIL` before delegated prototype acceptance.

## Fictional prototype scope

In scope:

- one independent browser prototype;
- current-page JavaScript state;
- local CSS and local fixtures;
- manual fictional text capture;
- deterministic fixture preparation simulating bounded AI output;
- review/edit/reject interactions;
- simulated call notes and question status;
- explicit trainer decision;
- optional unsent follow-up draft;
- metadata-only audit summary;
- independent delegated audit protocol and result form;
- static automated contract test.

## Outside prototype scope

- production application changes;
- client or trainer production screens;
- Formspree integration or inbox access;
- AI provider, model, endpoint, API, prompt execution, or tool use;
- Supabase, auth, RLS, Storage, MFA, Edge Functions, tables, SQL, migrations, or schema;
- real clients or real inquiries;
- persistent storage or synchronization;
- sending email/SMS, booking, publishing, or client access;
- full intake, PWD, medical assessment, training plan, staging, or production;
- workflow/CI modification;
- Stage 3.

## Blocked and deferred decisions

- `PROVIDER DECISION — BLOCKED`;
- provider/model/endpoint, region, transfers, retention, DPA, subprocessors, and cost;
- exact production payload and input/output limits;
- production schema and storage mapping;
- legal basis, Article 9 condition, notices, DPIA, retention, deletion, and processor wording;
- Formspree automation and source-format versioning;
- real client data authorization;
- exact full-intake/PWD transition and delivery process;
- approval/publication/sending runtime for follow-up material;
- staging, production, and Stage 3 authorization.

## Later transition from prototype to runtime

Prototype completion does not authorize implementation. A later, separately instructed transition must:

1. record the independent delegated prototype-audit result and corrections;
2. approve the exact task contract and minimum dataset;
3. complete privacy/legal and security review;
4. decide whether and how Formspree content becomes a versioned source;
5. select and approve a provider/model only after the blocked decision gate;
6. define bounded server-side runtime, authentication, AAL2, isolation, redaction, audit, timeouts, cost, and fallback;
7. propose schema/storage separately without treating this PRD as schema approval;
8. test cross-client isolation, prompt injection, provenance, failure, and exact-version publication with fictional data;
9. obtain explicit authorization before any real data, staging, production, or client contact.

## Product acceptance rule

Damian delegated fictional-prototype QA to ChatGPT while retaining exclusive authority over product direction and all later schema, provider, real-data, staging, production, merge, and Stage 3 gates. Automated tests support but do not replace an independent delegated audit. Until that audit is recorded, the correct status is:

`STAGE 2 — READY FOR INDEPENDENT DELEGATED PROTOTYPE RE-AUDIT`
