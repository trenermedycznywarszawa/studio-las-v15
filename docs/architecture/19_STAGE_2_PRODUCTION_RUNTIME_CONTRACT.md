# 19 Stage 2 Production Runtime Contract

**Status:** OWNER-APPROVED DIRECTION — PRODUCTION CONTRACT CANDIDATE
**Authorization:** architecture and runtime contract only
**Implementation status:** NOT AUTHORIZED
**Schema status:** NOT AUTHORIZED
**Production data processing status:** NOT AUTHORIZED BY THIS DOCUMENT
**Supersedes:** no prior document; this is the production-successor contract to the fictional Stage 2 prototype

## Purpose

This contract defines the smallest production-safe runtime boundary between the public first-contact form and the existing Studio Las client/PWD architecture.

It converts the earlier fictional Stage 2 learning into a production architecture without turning Studio Las OS into a CRM, sales funnel, lead-scoring system, automation platform, or AI-led qualification product.

The runtime exists for one reason:

> preserve the first inquiry, help Damian conduct a calm human conversation, preserve his explicit decision, and create a deliberate bridge into the already-existing client/PWD process only when appropriate.

Canonical flow:

`public first-contact form → inquiry → trainer preparation → human call → trainer decision → optional explicit conversion → existing client/PWD architecture`

## Non-negotiable product invariants

1. The trainer is the product.
2. The first phone call remains a human conversation, not an automated qualification step.
3. The public form collects only low-sensitivity first-contact information.
4. Inquiry data is not client clinical/process data by default.
5. AI may prepare the trainer but cannot contact, qualify, diagnose, establish safety, decide, book, publish, or advance lifecycle state.
6. The final post-call decision belongs to Damian and requires an explicit action.
7. A person who submits the form is not automatically a `client`.
8. PWD recommendation and PWD conversion are separate states/actions.
9. Existing `clients`, PWD workflow, Guidance Release, client access and client-safe boundaries remain authoritative after conversion.
10. No new feature may increase screen time, create compliance pressure, gamification, scoring, sales pressure or dashboard-centric work.
11. The workflow must remain fully usable without AI.
12. The smallest safe implementation wins over a theoretically cleaner domain redesign.

## Architectural decision: domain model vs database model

Conceptually, Studio Las may reason about:

`Person → Inquiry → Service Relationship`

This does **not** authorize `people` or `service_episodes` tables.

The current production implementation already has `clients` as the identity/process root for a person who has entered the Studio Las 1:1 process. Replacing or wrapping that root now would create a second identity model and force unnecessary migration of working PWD, session, measurement, guidance, document and access-control relationships.

Therefore the approved runtime direction is:

`inquiry → explicit conversion → existing client`

`Person` and `Service Relationship` remain domain concepts until a future demonstrated need proves that persistence/history cannot be represented safely with the existing client architecture.

## Runtime boundary

### Before conversion

The person exists only in the inquiry context.

Allowed concerns:

- submitted contact data;
- submitted first-contact goal category;
- optional person-authored sentence;
- preferred contact window;
- source/version metadata;
- contact attempts and agreed next action;
- call preparation;
- client-authored statements during the call;
- trainer observation and interpretation;
- trainer decision and rationale.

Forbidden concerns:

- full medical history;
- diagnostic intake;
- PWD measurement data;
- training plan;
- Home Guidance;
- client portal access;
- automatic creation of `clients`;
- automatic booking;
- marketing profiling;
- conversion scoring.

### After explicit conversion

The existing Studio Las OS client/PWD architecture becomes authoritative.

The inquiry remains a historical source and conversion record. It must not become a competing second client record.

## Inquiry object contract

`Inquiry` represents one first-contact episode originating from a person before entry into the Studio Las client process.

Candidate persistent properties:

- stable opaque inquiry identifier;
- owner trainer identifier;
- source channel and exact source/version metadata;
- submitted name;
- submitted phone;
- submitted email when provided;
- preferred contact window;
- submitted goal category;
- optional person-authored first-contact sentence;
- optional travel-area category where still part of the approved public form;
- privacy/notice version accepted at submission;
- inquiry status;
- contact status;
- next-action type and due time when explicitly agreed or operationally required;
- closure metadata;
- nullable `converted_client_id` only after explicit conversion;
- created/updated timestamps;
- deletion/retention metadata where required by the later privacy implementation decision.

### Inquiry status candidate values

Keep the inquiry lifecycle deliberately small:

- `open`;
- `converted`;
- `closed`.

These values describe the inquiry record, not the person's suitability.

### Contact status candidate values

Contact status is operational and separate from trainer decision:

- `pending`;
- `contacting`;
- `completed`;
- `unreachable`.

`unreachable` must never be represented as a negative trainer decision.

## Source integrity

The original public submission is a source artifact.

Runtime rules:

1. Preserve the submitted wording/version as source evidence.
2. Do not silently overwrite the original inquiry when Damian later learns something different.
3. Corrections or clarified facts during the call become new records/versions with explicit authorship and context.
4. Missing information remains unknown; it must not become `false`, `no`, or a fabricated fact.
5. Machine extraction and trainer interpretation remain separate from the source.
6. Public-form labels may evolve, but each inquiry must retain enough source/version metadata to interpret what the submitted value meant at the time.

## Trainer preparation contract

The runtime may prepare a compact trainer-only Call Brief from the exact inquiry version.

The existing deterministic first-call brief is a valid low-risk preparation mode and should remain usable without AI.

A future AI-assisted mode, if separately approved, must obey the existing Stage 2 task boundary:

`Prepare the trainer for the first inquiry phone call.`

Allowed output:

- direct source facts;
- missing information;
- conflicts or ambiguity;
- five to eight optional questions;
- caution topics;
- short call outline;
- structured note prompts;
- possible next-step options for Damian's review.

Forbidden output/action:

- suitability score;
- conversion probability;
- diagnosis;
- safety determination;
- automatic qualification;
- trainer decision;
- automatic message;
- booking;
- publishing;
- process-state mutation.

Direct contact identifiers are not required for AI preparation and should stay outside any future model payload by default.

## During-call information contract

The runtime must preserve authorship and meaning boundaries.

Every recorded call item belongs to one of these semantic categories:

- `client_statement` — what the person said;
- `trainer_observation` — what Damian observed;
- `trainer_interpretation` — meaning Damian assigns to evidence/context;
- `client_reaction` — an explicitly observed/reported response to the conversation or proposed next step.

These categories must never be silently collapsed into one generic note or converted into a suitability score.

A correction or change in the person's account creates a superseding version rather than deleting history where that history supports the decision record.

## Post-call decision memo

The production runtime should close the call with the smallest useful trainer decision memo.

Required conceptual fields:

- goal in the person's own words;
- why now — optional unless it materially supports the decision;
- current barrier — short functional/contextual description;
- explicit trainer decision;
- short rationale;
- boundary/referral note only when relevant;
- next action type/time when relevant;
- author and timestamp;
- exact evidence references needed to support provenance.

This is a decision artifact, not a sales note.

## Trainer decision values

Production candidate values:

- `PWD` — PWD is the appropriate next step;
- `FOLLOW_UP` — another contact is needed before deciding;
- `NOT_NOW` — no active continuation now;
- `REFERRED` — another consultation/action should happen before Studio Las continues;
- `NOT_A_FIT` — Studio Las is not the right service at this point;
- `CLOSED_BY_PERSON` — the person explicitly chooses not to continue.

These values replace the prototype-only decision vocabulary at the user-facing/domain layer. Implementation mapping must be explicit and must not silently reinterpret historical fictional prototype values.

### Decision invariants

- no decision is preselected;
- Damian must choose it explicitly;
- a short rationale is required;
- no form answer can automatically choose `PWD`;
- no AI output can create or save the decision;
- `REFERRED`, `NOT_A_FIT`, and `NOT_NOW` have equal authority to `PWD`;
- `unreachable` is not a decision;
- changing material upstream evidence invalidates the active decision where provenance would otherwise become false;
- a changed decision is stored as a new version/superseding decision rather than silently overwritten.

## Inquiry decision history

A trainer decision needs history because a later conversation may legitimately change the next step.

Example:

`FOLLOW_UP → PWD`

Overwriting the original decision would destroy process provenance.

Therefore the production implementation must represent inquiry decisions append-only or versioned, even if the exact physical schema is decided later.

Minimum conceptual properties:

- decision identifier;
- inquiry identifier;
- decision value;
- goal/barrier/why-now fields used by the decision memo;
- rationale;
- optional boundary note;
- next action;
- actor/time;
- evidence version references;
- supersedes relation where applicable;
- active/invalidated/superseded state where necessary.

## PWD recommendation is not conversion

This distinction is mandatory.

### PWD recommended, not yet agreed

Result:

- inquiry remains `open`;
- active trainer decision may be `PWD`;
- next action may be arranging PWD;
- no `clients` row is created;
- no PWD record is created;
- no full intake is automatically sent.

### PWD agreed and conversion explicitly confirmed

Only a deliberate trainer action may start conversion.

Candidate action wording:

`Utwórz klienta do PWD`

The production implementation should perform conversion atomically or fail without partial state.

Conceptual successful result:

1. validate authenticated owner trainer and required security level;
2. validate active inquiry and current decision/context;
3. create exactly one existing `clients` record using only allowed confirmed identity/contact fields;
4. record the relationship from inquiry to new client;
5. mark inquiry `converted`;
6. preserve source and decision history;
7. return the new client identifier for the already-existing secure pre-PWD/PWD workflow.

Forbidden conversion side effects:

- no automatic Home Guidance;
- no automatic client account invitation;
- no automatic PWD findings;
- no automatic health fields copied from free-text call notes;
- no automatic diagnosis, plan or trainer interpretation;
- no automatic client-facing publication.

## Data copied at conversion

Default minimization rule:

Only confirmed identity/contact data necessary to establish the existing client record should cross the inquiry/client boundary automatically.

Do not copy the full inquiry or full call memo into `clients` fields as a convenience.

Goal, motivation, health context, observations and PWD-specific information must enter the existing secure intake/PWD flow through their proper semantics and explicit trainer/client actions.

The inquiry remains available as historical provenance where authorized; it is not flattened into the client table.

## Public submission boundary

The public form must remain low-sensitivity.

Allowed categories are limited to information necessary to request and organize first contact, such as:

- name;
- phone;
- optional email;
- preferred contact time;
- broad first-contact goal category;
- optional short sentence about what the person wants to return to/do again;
- optional broad travel-area category;
- contact/privacy acknowledgment.

Do not add pain scales, diagnoses, operation history, medical documents, treatment details, symptom inventories, red flags, full intake fields, PWD observations or long health narratives to the public inquiry form.

If a person voluntarily writes sensitive information despite the instruction, the production ingestion/privacy design must handle it lawfully and conservatively; this contract does not authorize sending that content to an AI provider.

## Formspree transition boundary

Formspree is currently a transport for the public first-contact form and is not the long-term Studio Las system of record.

Production runtime implementation must explicitly choose one of two separately reviewed paths:

1. keep Formspree as temporary transport and ingest/version inquiries through a bounded server-side integration; or
2. replace Formspree submission with a bounded Studio Las/Supabase public-write ingress.

This contract does not choose the transport implementation.

Whichever path is chosen must provide:

- spam/rate-abuse protection;
- payload validation and size limits;
- source/version metadata;
- no public read surface;
- no public access to trainer decisions;
- no service-role secret in the browser;
- no direct anonymous write to client/process tables;
- observable failure without false success;
- a manual fallback for the trainer when integration is unavailable.

## Security boundary

The production implementation must inherit existing Studio Las OS security principles instead of inventing a parallel security model.

Expected trainer-side controls:

- authenticated trainer only;
- owner-scoped access;
- AAL2 for sensitive write/decision/conversion operations where consistent with current trainer runtime;
- RLS/privilege minimization;
- server-side validated mutation boundary;
- fixed `search_path` for SECURITY DEFINER functions;
- explicit grants/revokes;
- no direct browser write to protected decision/conversion tables when a validated RPC boundary is required;
- cross-client/inquiry isolation tests;
- staging-first verification before production.

Public inquiry creation is a separate intentionally bounded ingress and must never inherit trainer or client privileges.

## Audit boundary

Inquiry and decision operations should reuse the existing metadata-only audit philosophy.

Audit may record:

- actor category/identifier;
- action;
- object/table/record identifier;
- occurred-at time;
- changed field names or outcome category;
- related object identifiers where required.

Audit must not duplicate:

- inquiry text;
- phone/email;
- call notes;
- decision rationale;
- health content;
- client material drafts.

## Retention and deletion

This contract establishes the need for a retention policy but does not set a legal retention period.

Implementation cannot proceed to production without an explicit decision covering at least:

- retention for abandoned/closed inquiries;
- retention for converted inquiries used as provenance;
- deletion/anonymization behavior;
- handling of spam/test submissions;
- lawful basis and privacy notice wording;
- processor/transfer implications for the selected ingress path;
- handling of voluntarily submitted sensitive data.

Do not retain non-converted inquiries indefinitely merely because storage is cheap.

## Trainer workspace UX contract

The trainer runtime must optimize for one decision, not for pipeline management.

### Inquiry view

Show only what helps the next human action:

- who requested contact;
- how/when to contact;
- what broad goal they selected;
- their optional own words;
- compact Call Brief;
- contact state;
- agreed next action.

Do not show:

- funnel charts;
- lead scores;
- conversion probability;
- streaks;
- sales KPIs;
- demographic scoring;
- urgency badges designed to create pressure.

### After-call view

Recommended order:

1. `Co ta osoba chce realnie odzyskać?`
2. `Dlaczego jest to ważne teraz?` — optional;
3. `Co dziś najbardziej utrudnia kolejny krok?`
4. `Jaki jest właściwy kolejny krok?`
5. decision-specific field only if needed;
6. `Decyzja i powód`;
7. `Następny krok`;
8. explicit save.

Progressive disclosure is preferred. Do not render every possible field for every decision.

## Decision-specific next actions

### `PWD`

Possible next actions:

- arrange PWD;
- confirm agreed PWD and explicitly convert to client.

### `FOLLOW_UP`

Capture only the agreed follow-up timing/channel needed to remember the next action.

### `NOT_NOW`

Default: close without creating a reminder unless the person explicitly agreed to a future contact point.

### `REFERRED`

Capture only the boundary/action that should happen before reconsidering Studio Las. Avoid diagnosis language.

### `NOT_A_FIT`

Capture a short trainer rationale and close.

### `CLOSED_BY_PERSON`

Close respectfully. No recovery sequence, nurturing campaign or automatic re-engagement.

## Notifications and automation boundary

Allowed future automation is limited to trainer-memory support, for example surfacing an explicitly agreed follow-up.

Forbidden automation:

- drip campaigns;
- automatic reactivation;
- repeated sales nudges;
- AI outreach;
- automatic SMS/email without explicit later communication architecture and trainer action;
- follow-up generated from inferred hesitation;
- automatic PWD conversion.

## Reporting boundary

Inquiry analytics are not a product requirement for v1.

Do not build a sales dashboard.

If future operational reporting is justified, it must answer a concrete owner decision such as whether the first-contact system is losing inquiries or whether response-time commitments are being met. It must not evolve into lead-performance surveillance by default.

## Compatibility with existing Stage 2 prototype

The fictional prototype remains historical evidence of reviewed interaction and information-separation principles.

This production contract preserves:

- immutable source;
- source/extraction/interpretation/decision separation;
- human authority;
- manual fallback;
- no scoring;
- decision history;
- metadata-only audit;
- no automatic sending/publishing.

It changes/clarifies:

- the real public form is now deliberately low-sensitivity;
- real inquiries need a pre-client persistent boundary;
- production-facing decision vocabulary is simplified to actual owner workflow;
- explicit conversion bridges into existing `clients` rather than inventing a new identity root;
- PWD recommendation is separated from client creation;
- Formspree is temporary transport, not canonical storage.

The fictional Stage 2 contract must not be treated as production schema authority.

## Explicitly rejected architecture for v1

Do not implement:

- `people` table;
- `service_episodes` table;
- generic CRM schema;
- prospect/lead/customer taxonomy as the core model;
- sales pipeline board;
- lead scoring;
- automatic qualification;
- transcription-by-default;
- full-call audio storage;
- marketing automation;
- automatic follow-up sending;
- public health intake inside inquiry;
- AI agent contacting the person;
- rebuild of existing `clients` root;
- duplication of PWD, Home Guidance or client access architecture.

A future proposal may revisit a rejected item only with evidence that the existing architecture cannot safely represent a real operational requirement.

## Implementation gates

This contract does not authorize implementation.

Before Codex receives an implementation task, the following must be completed:

1. read-only current schema/runtime audit against this contract;
2. identify exact gap between existing structures and required `Inquiry` / decision history semantics;
3. decide Formspree-temporary-ingestion vs bounded direct public-write ingress;
4. approve exact privacy/retention policy for inquiries;
5. define exact physical schema with proof that existing structures cannot safely represent the gap;
6. define trainer RLS/RPC/AAL2 mutation boundary;
7. define anonymous/public ingress abuse controls;
8. define deterministic/manual Call Brief behavior and separately gate any AI provider path;
9. define atomic conversion semantics and rollback tests;
10. define staging E2E protocol with synthetic inquiries only;
11. verify zero unintended mutations to PWD/Guidance/client access;
12. obtain explicit owner authorization for implementation and later separate authorization for production deployment.

## Minimum implementation acceptance criteria for the later task

The later implementation may be accepted only when automated evidence proves at least:

- anonymous user can create only the bounded inquiry payload and cannot read inquiries;
- invalid/oversized/spam-like payloads fail safely according to the approved ingress design;
- trainer can see only owned inquiries;
- unauthenticated/client/other-trainer access is denied;
- Call Brief cannot mutate source, decision or client state;
- decision save requires explicit trainer action and valid decision/rationale;
- `unreachable` is contact state, not a decision;
- decision history is preserved across supersession;
- choosing `PWD` alone does not create a client;
- explicit conversion creates exactly one existing client and links the inquiry atomically;
- failed conversion leaves no partial client/inquiry state;
- no Home Guidance, client account or PWD findings are created by conversion;
- inquiry/call content does not leak into metadata audit logs;
- existing PWD browser E2E still passes after conversion boundary changes;
- Guidance Release isolation still passes;
- cleanup removes all synthetic inquiry/client records from staging;
- no production mutation occurs during verification.

## Final rule

The first-contact runtime is not a CRM.

Its job is to remember just enough so Damian can have a better human conversation and make a deliberate next decision.

The person becomes a Studio Las client only when Damian deliberately crosses that boundary.

The runtime must make that boundary clearer, safer and easier to operate — never more automated than the method requires.
