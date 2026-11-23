# Stage 2 Production Runtime Contract — Independent Consistency Review

**Date:** 2026-09-01
**Reviewed candidate:** `docs/architecture/19_STAGE_2_PRODUCTION_RUNTIME_CONTRACT.md`
**Branch:** `architecture/stage2-production-runtime-contract`
**Review type:** architecture/governance consistency review only
**Production/runtime authorization:** NONE

## Verdict

**PASS WITH REQUIRED GOVERNANCE CLARIFICATIONS BEFORE OWNER MERGE DECISION.**

The candidate contract is directionally coherent with the Studio Las architecture and correctly fills the pre-client persistence gap without rebuilding the existing client/PWD root. It must remain architecture-only until the separate implementation gates in the contract are completed.

## What the candidate gets right

### 1. Preserves the human authority boundary

The contract keeps the first phone call as a human conversation and the final next-step decision as Damian's explicit action. This preserves the earlier Stage 2 invariant that AI may prepare but may not qualify, diagnose, decide, contact, book, publish, or advance workflow state.

### 2. Preserves information provenance

The original inquiry remains source evidence and is not silently overwritten by later call information. Client statements, trainer observations, trainer interpretations and decisions remain semantically separate. This is compatible with the existing Stage 1/2 information-provenance architecture.

### 3. Avoids a premature identity-model rewrite

The candidate correctly treats `Person` and `Service Relationship` as domain concepts rather than immediately creating `people` and `service_episodes` tables. Existing `clients` remains the process root after deliberate conversion. This follows the repository rule that architectural objects are not automatically database tables and that new structures require a demonstrated semantic gap.

### 4. Defines the missing pre-client boundary

The current schema is client-centric and the public first-contact form now intentionally collects only low-sensitivity contact/goal information. The new `Inquiry` concept gives that information a proper pre-client lifecycle instead of forcing public submissions directly into `clients`.

### 5. Separates recommendation from conversion

The candidate makes `PWD` a trainer decision but does not let that decision itself create a client. A separate explicit conversion action is required. This protects the existing PWD workflow from hidden lifecycle side effects and supports atomic conversion semantics later.

### 6. Keeps the implementation small

The candidate explicitly rejects CRM, funnel, scoring, marketing automation, transcription-by-default, public health intake, AI outreach and rebuilding the existing client root. This is consistent with Studio Las product boundaries.

## Risks and required clarifications

### R1 — Decision vocabulary is a production candidate, not yet physical schema

The production-facing values `PWD`, `FOLLOW_UP`, `NOT_NOW`, `REFERRED`, `NOT_A_FIT`, and `CLOSED_BY_PERSON` are appropriate for the real workflow, but they must not silently mutate or reinterpret the historical fictional Stage 2 values (`CONTINUE`, `SEND_FULL_INTAKE`, `DEFER_OR_CONSULT`, `NOT_RIGHT_PRODUCT`).

**Required clarification:** implementation must define an explicit migration/mapping policy and must not rewrite historical prototype evidence.

**Status in candidate:** addressed.

### R2 — `Inquiry` persistence is justified, physical tables are not yet approved

The candidate is correct to identify a semantic gap, but the exact physical model (`inquiries`, `inquiry_decisions`, one table plus append-only events, or another small representation) still requires a read-only current-schema gap audit.

**Required clarification:** no table name or field list in the contract is implementation authority.

**Status in candidate:** addressed by `Schema status: NOT AUTHORIZED` and implementation gates.

### R3 — Formspree cannot be treated as canonical storage

The public form currently uses Formspree transport. The production runtime must explicitly choose whether Formspree remains temporary ingress or is replaced by a bounded Studio Las public-write endpoint. Both paths require abuse controls, validation and privacy review.

**Required clarification:** the architecture contract must not authorize Formspree API/webhook ingestion merely by mentioning it.

**Status in candidate:** addressed.

### R4 — Voluntarily submitted sensitive data

Even a low-sensitivity form can receive unexpected medical information in a free-text field.

**Required clarification:** any future ingestion path must safely retain/handle such content under the approved privacy basis and must not automatically send it to AI.

**Status in candidate:** addressed.

### R5 — Retention is a blocker, not a cleanup detail

A pre-client store creates a new retention class distinct from the active client process.

**Required clarification:** production deployment is blocked until the owner/legal/privacy decision defines closed/non-converted inquiry retention and converted-source retention.

**Status in candidate:** addressed.

### R6 — Atomic conversion must not broaden data copying

A convenience implementation could incorrectly copy the entire inquiry/call memo into `clients.goal`, `motivation`, `health_status`, or other process fields.

**Required clarification:** automatic conversion copies only confirmed identity/contact data required to establish the existing client record; process/health data enters through proper intake/PWD semantics.

**Status in candidate:** addressed.

### R7 — Existing metadata-only audit philosophy must be inherited

The current security audit deliberately stores metadata rather than sensitive content. Inquiry runtime must not create a parallel content log.

**Required clarification:** later implementation must include inquiry/decision objects in the same metadata-only audit philosophy or justify an equivalent bounded mechanism.

**Status in candidate:** addressed.

## Relationship to existing canonical documents

### Existing fictional Stage 2

`docs/architecture/15_STAGE_2_INQUIRY_PHONE_DECISION_CONTRACT.md` remains historical/canonical evidence for the fictional prototype and its information-separation rules. It is not production schema authority.

The new production contract is a successor for real-runtime design, not a silent rewrite of the historical prototype.

### Stage 3 / PWD

The production Stage 2 contract ends at explicit conversion into the existing client/PWD boundary. It must not create PWD observations, PWD decisions, Home Guidance or client-facing material as a conversion side effect.

### Data-model architecture

The contract follows the rule that persistence is the last decision and that domain objects do not automatically become database tables.

## Required next gate

Before any implementation task is written for Codex, perform a **read-only Stage 2 Production Gap Audit** covering:

1. current Supabase schema and privileges;
2. existing trainer runtime and AAL2 write patterns;
3. current public form payload and transport;
4. current deterministic first-call brief implementation;
5. exact missing persistence/provenance semantics;
6. ingress options and abuse controls;
7. retention/privacy decision points;
8. atomic inquiry→client conversion dependencies;
9. regression boundaries for PWD, Guidance Release and client access;
10. smallest reversible implementation proposal.

The audit must end with one of:

- `NO NEW SCHEMA REQUIRED`;
- `MINIMAL NEW SCHEMA JUSTIFIED`;
- `CONTRACT REQUIRES REVISION`.

It must not create migrations, tables, policies, functions, production data or runtime changes.

## Merge recommendation

**READY FOR OWNER MERGE DECISION after confirming that the contract is intentionally architecture-only.**

Merging this documentation PR must not be interpreted as approval to implement, deploy, process real inquiries in Studio Las OS, or select an AI provider.
