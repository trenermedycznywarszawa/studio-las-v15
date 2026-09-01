# Stage 2 Production Gap Audit

**Date:** 2026-09-01
**Mode:** READ-ONLY ARCHITECTURE AUDIT
**Production mutation:** NONE
**Schema/migration authorization:** NONE
**Candidate contract:** `docs/architecture/19_STAGE_2_PRODUCTION_RUNTIME_CONTRACT.md`

## Executive verdict

**MINIMAL NEW SCHEMA JUSTIFIED — but only for the pre-client inquiry boundary and versioned trainer decision history.**

The current Studio Las OS schema is intentionally client-centric. It has no canonical pre-client persistence object that can safely represent a public first-contact submission before the person becomes a `client`. Reusing `clients` for inquiries would collapse a meaningful lifecycle boundary and would expose inquiry capture to client-process fields, access rules and downstream relationships that do not yet apply.

At the same time, the existing schema already provides the process root and all major post-conversion structures. Therefore the correct architecture is a narrow extension, not a redesign:

`bounded public ingress → inquiry persistence → trainer decision history → explicit atomic conversion → existing clients/PWD`

## 1. Current schema boundary

The initial Supabase schema establishes `clients` as the central root for active Studio Las process data. `clients` already carries identity/contact fields plus process fields such as goal, motivation, health context, working hypothesis, status and stage. Downstream structures including intake, sessions, measurements, assessments, documents and home guidance reference `client_id`.

### Finding

A first-contact submission cannot be safely represented as an ordinary `clients` row without pretending that the person has already entered the Studio Las process.

### Consequence

Do not reuse `clients` as the public inquiry store.

Do not add `prospect` or similar values to the existing client status/stage fields merely to avoid a new object. That would turn the client process root into a sales lifecycle root and broaden many downstream semantics.

## 2. Existing security/runtime patterns that should be reused

The repository already contains mature security patterns that the Stage 2 runtime should inherit:

- Supabase Auth and role-based profiles;
- owner-trainer relationships;
- RLS plus helper functions;
- explicit grant/revoke boundaries;
- SECURITY DEFINER functions with fixed `search_path` where needed;
- trainer AAL2/TOTP requirements for sensitive trainer operations;
- metadata-only audit events that deliberately exclude health/content payloads;
- staging-first browser E2E patterns;
- synthetic-record cleanup for staging tests.

### Finding

No parallel auth, audit or trainer permission system is justified.

### Consequence

New inquiry/decision persistence should join the existing trainer security model. Public creation is the only deliberately separate ingress surface.

## 3. Current public first-contact surface

The current public first-contact form has already been reduced from diagnostic intake to a low-sensitivity contact request. Its purpose is to gather enough information to arrange a human first conversation, not to collect medical history or pre-diagnose the person.

The approved form semantics include:

- name;
- phone;
- optional email;
- preferred contact time;
- one broad goal category;
- optional short sentence about what the person wants to return to/do again;
- optional broad travel area;
- contact/privacy acknowledgment.

The transport remains Formspree.

### Finding

The public form now matches the intended Inquiry boundary semantically, but Formspree email delivery is not a canonical Studio Las OS source of truth and does not provide the versioned internal lifecycle needed for call/decision continuity.

### Consequence

A production ingress decision is required. The form itself does not need to become a diagnostic or authenticated client surface.

## 4. Current deterministic first-call brief

The repository now contains a deterministic first-call brief attached to the existing Formspree submission path. It provides one of five bounded trainer preparation templates from the selected broad goal category and does not mutate Studio Las OS, contact the person, diagnose or decide.

### Finding

The deterministic brief is a useful low-risk preparation primitive and should be preserved as the default/fallback preparation layer.

### Consequence

Do not make AI a prerequisite for Stage 2 production. A future AI-assisted preparation mode can be added only behind the already-defined task contract and provider/privacy gate.

## 5. Exact persistence gap

The current schema lacks a place to persist, before client conversion:

- exact first-contact submission/source metadata;
- inquiry lifecycle state;
- contact state and agreed next action;
- versioned client statements from the call where persistence is justified;
- selected trainer observation/interpretation needed to support the decision;
- append-only/versioned trainer decision memo;
- inquiry→client conversion provenance.

### Finding

This is a real semantic and persistence gap. It cannot be represented safely by the existing `clients`, `client_intakes`, `sessions`, `client_tasks` or audit table without distorting their meanings.

### Consequence

Minimal new persistence is justified.

## 6. Smallest physical model candidate

The audit supports **two small logical persistence objects**. Exact SQL remains unapproved.

### A. `inquiries`

Purpose: one pre-client first-contact episode and its operational lifecycle.

Candidate fields only:

- `id`;
- `owner_trainer_id`;
- `source_channel`;
- `source_version` / form-contract version;
- submitted name/phone/email;
- preferred contact time;
- selected broad goal;
- optional person-authored sentence;
- optional broad travel area;
- privacy notice/consent version metadata;
- inquiry status `open|converted|closed`;
- contact status `pending|contacting|completed|unreachable`;
- next action type/time where needed;
- `converted_client_id` nullable;
- created/updated/closed/deletion-retention metadata.

### B. `inquiry_decisions`

Purpose: append-only/versioned trainer decision memo.

Candidate fields only:

- `id`;
- `inquiry_id`;
- decision value;
- goal in person's own words;
- optional why-now;
- current barrier;
- rationale;
- optional boundary note;
- next action type/time;
- actor/time;
- evidence/version references;
- supersedes/invalidated/active state where needed.

### Why two objects rather than one

`inquiries` contains mutable operational state such as contact attempts and next action. Trainer decisions need history. Combining them into one mutable row would encourage silent decision overwrites and destroy provenance.

### Why not more objects now

Separate persistent tables for call questions, all notes, source facts, AI suggestions or call-outline items are not yet justified for v1. They may remain ephemeral/derived unless a decision or future report genuinely requires persistence.

This is an important reduction from the fictional Stage 2 prototype, which intentionally modeled more information types to test provenance semantics.

## 7. Ingress options

Two realistic production paths remain.

### Option A — Formspree remains temporary transport

Flow:

`public form → Formspree → bounded server-side ingestion → inquiries`

Advantages:

- smallest change to public page;
- retains already-tested delivery fallback;
- easier incremental transition.

Risks:

- third-party processor remains in the path;
- requires trustworthy source-format/versioning strategy;
- webhook/API ingestion security and replay/idempotency must be designed;
- availability/retention/processor terms become dependencies.

### Option B — bounded direct Studio Las public-write ingress

Flow:

`public form → bounded server endpoint/RPC/Edge Function → inquiries`

Advantages:

- one canonical write path;
- cleaner source identity/versioning;
- easier idempotency and direct success/failure handling;
- removes Formspree from long-term system-of-record path.

Risks:

- creates a public attack surface;
- requires anti-spam/rate-abuse strategy;
- requires careful anonymous privilege isolation;
- must never expose service-role credentials in the browser.

## Ingress recommendation

**Prefer Option B for the long-term architecture, but implement it only after a focused security/privacy design.**

Reason: Formspree solved notification delivery, not canonical inquiry persistence. Keeping a third-party email-form service permanently between the public website and the Studio Las source of truth creates avoidable source/version/idempotency complexity.

However, do not remove Formspree first. The migration should be reversible and preserve the current working path until staging verifies the replacement.

## 8. Public-write security candidate

The smallest safe direct-ingress design should use a dedicated bounded server-side mutation surface rather than anonymous direct table writes.

Candidate shape:

`public page → dedicated Edge Function or narrowly exposed validated RPC → inquiries`

Required protections:

- exact allowlisted payload fields;
- field length/type validation;
- phone/email normalization only as needed;
- no arbitrary JSON/raw payload persistence by default;
- honeypot and server-side abuse checks;
- rate limiting / replay control appropriate to the chosen runtime;
- idempotency key or bounded duplicate strategy;
- no public SELECT;
- no anonymous UPDATE/DELETE;
- no access to decisions or clients;
- no service-role secret in browser;
- generic public error responses;
- structured internal failure metadata without copying inquiry content into logs.

Exact mechanism remains an implementation/security decision.

## 9. Trainer mutation boundary

Candidate trainer-side writes:

- mark contact state;
- set agreed next action;
- save/supersede trainer decision memo;
- explicitly convert inquiry to client;
- close inquiry.

### Recommendation

Use validated trainer RPCs/SECURITY DEFINER functions consistent with current AAL2 patterns rather than scattered browser writes.

The conversion RPC is the highest-risk operation and should require:

- authenticated trainer;
- AAL2;
- inquiry ownership;
- current non-converted inquiry;
- allowed current decision/context;
- uniqueness/idempotency guard;
- transactionality;
- exact allowed data-copy list;
- zero PWD/Guidance/client-access side effects.

## 10. Atomic conversion dependencies

A correct conversion must bridge into the existing `clients` root without changing the rest of the domain architecture.

### Success path candidate

1. lock/validate inquiry;
2. reject already-converted inquiry or return the existing conversion idempotently;
3. create one `clients` row with confirmed identity/contact fields only;
4. associate owner trainer using existing client ownership semantics;
5. write `converted_client_id` and `converted` inquiry status;
6. preserve active decision/version relationship;
7. commit;
8. return new client id.

### Forbidden conversion behavior

- copy full call notes into health/process fields;
- create intake answers;
- create PWD session/assessment observations;
- create Home Guidance;
- invite/create client auth account;
- publish client material;
- create automatic future decisions.

## 11. Privacy and retention blockers

Production rollout requires an explicit owner/privacy decision before implementation reaches real data.

Open decisions:

- legal basis for first-contact storage;
- handling of accidentally submitted sensitive information;
- privacy-notice wording/versioning;
- non-converted inquiry retention;
- converted inquiry/source retention;
- deletion/anonymization behavior;
- spam/test submission retention;
- whether Formspree remains a processor during transition;
- if/when direct ingress replaces Formspree.

### Architectural recommendation

Keep non-converted inquiry retention short and purpose-bound. Do not create indefinite prospect history.

Exact duration is not decided by this audit.

## 12. UX gap

The current OS has no production pre-client workspace. The fictional Stage 2 prototype is too rich to copy directly into production.

### Minimum trainer UI slice

Only two focused views are justified:

1. **Inquiry / przed rozmową**
   - submitted contact data;
   - broad goal + own words;
   - preferred contact time;
   - deterministic Call Brief;
   - contact status / agreed next action.

2. **Po rozmowie**
   - goal in person's words;
   - optional why-now;
   - barrier;
   - one explicit trainer decision;
   - short rationale;
   - decision-specific next action;
   - explicit save;
   - explicit `Utwórz klienta do PWD` only when PWD is agreed.

No kanban, funnel, dashboard or pipeline is needed.

## 13. Regression boundaries

The Stage 2 implementation must prove it does not change:

- public client login/access behavior;
- one account ↔ one client mapping;
- PWD atomic save semantics;
- PWD guidance isolation;
- generic assessment exclusion rules;
- Home Guidance publish/withdraw/delivery semantics;
- client check-in RPC;
- client-safe views/projections;
- metadata-only security audit behavior.

Existing browser E2E for PWD should be extended rather than replaced.

## 14. Smallest reversible implementation sequence

Recommended implementation sequence after owner approval:

1. architecture/schema ADR for `inquiries` + versioned `inquiry_decisions`;
2. migration + RLS/grants + metadata-only audit coverage;
3. trainer-only read/write RPCs and atomic conversion RPC;
4. synthetic SQL/security tests;
5. minimal trainer UI using synthetic/staging data;
6. direct public ingress on staging behind exact allowlist and abuse controls;
7. staging E2E from public synthetic submission → trainer view → decision → explicit conversion → existing PWD workflow;
8. regression run for PWD/Guidance/client access;
9. cleanup proof;
10. only then owner production deploy decision;
11. remove or demote Formspree only after the replacement path has proven stable.

## 15. What Codex must not change in the later implementation

- existing `clients` meaning/root;
- existing PWD RPC semantics except the minimum integration needed to accept a newly converted client;
- Home Guidance tables/RPCs;
- client access/auth lifecycle;
- public health/intake boundary;
- AI runtime/provider architecture;
- `main` public deployment branch unless separately instructed;
- production Supabase before staging evidence and owner approval;
- historical Stage 2 prototype artifacts.

## Final verdict

**MINIMAL NEW SCHEMA JUSTIFIED.**

Justified new semantics:

- one pre-client inquiry lifecycle object;
- one versioned/append-only inquiry decision object.

Not justified:

- `people`;
- `service_episodes`;
- CRM/pipeline objects;
- persistent AI suggestion/question tables for v1;
- sales scoring/analytics;
- restructuring the client/PWD root.

The recommended next deliverable is an implementation-ready ADR and Codex task for the **staging-only minimal Stage 2 slice**, but only after the owner explicitly accepts this gap-audit verdict and chooses the long-term ingress direction (recommended: bounded direct Studio Las ingress, with Formspree retained temporarily until replacement verification passes).
