# 19 Stage 6A — Damian-Only Implementation Foundation Contract

**Status:** DRAFT — OWNER AUTHORIZED FOR SYNTHETIC-DATA FOUNDATION ONLY  
**Decision owner:** Damian  
**Branch purpose:** define one bounded implementation foundation before any production client access.

## 1. Purpose

Stage 6A converts the accepted Stage 5 guidance-loop contract into one small trainer-facing implementation foundation.

The result is not a client portal, production release, or live service. It is a Damian-only workspace operating exclusively on synthetic data. Its purpose is to verify that Damian can create, publish, replace, withdraw, and trace one current guidance release without creating a second source of truth.

Stage 6A must reuse existing Studio Las concepts only after inspection. Existing code, tables, migrations, and security artifacts are evidence and reuse candidates; none is automatically approved by this document.

## 2. In scope

The implementation foundation may provide only:

1. a Damian-only authenticated workspace;
2. synthetic client records;
3. creation of one guidance release for one synthetic client;
4. explicit publish, replace, and withdraw decisions;
5. exactly one current actionable release per synthetic client;
6. trainer-only history of releases and decision events;
7. a channel decision of `app` or `paper`;
8. an explicit recorded delivery outcome that distinguishes:
   - published;
   - delivery pending;
   - delivery recorded;
   - paper retirement unresolved;
9. append-only, metadata-minimised audit events for material state changes;
10. deterministic fail-closed states.

## 3. Out of scope

Stage 6A does not authorize:

- real clients, client accounts, client access, login links, messages, signals, questions, concerns, notifications, email, SMS, WhatsApp integration, or client-visible surfaces;
- real health, contact, session, intake, measurement, payment, calendar, report, file, or other personal data;
- production, staging, public deployment, data import, processor selection, or runtime release;
- a final database schema, SQL, migration, RLS policy, API contract, storage layout, or provider decision;
- AI, automated trainer decisions, automated publication, automated safety advice, scoring, streaks, rankings, or chat;
- multi-trainer roles, delegation, marketplace, billing, booking, exercise library, or 12-week report generation.

A static prototype remains a prototype. It must not be connected to a data store or relabelled as production.

## 4. Non-negotiable invariants

1. Damian remains the sole owner of meaning, interpretation, guidance change, and publication.
2. A synthetic client has zero or one current actionable guidance release. A missing or conflicting current release is a fail-closed state.
3. Replacement is atomic: a successor cannot become current unless predecessor disposition is recorded.
4. Withdrawal removes the release from any future actionable projection; history remains trainer-only.
5. Paper is a deliberate channel. A publication record is not evidence of physical handover or retirement of earlier paper.
6. An audit event records actor, action, target, time, and non-sensitive linkage metadata. It must not copy guidance content, trainer rationale, or future personal data into ordinary logs.
7. The implementation must never infer a trainer decision from elapsed time, release version, completion, silence, or a system rule.
8. Client-safe projection, if later authorized, must be a separate boundary. No trainer workspace component is a client surface by default.

## 5. Required workflow

For one synthetic client, Damian must be able to perform this exact sequence:

1. open the synthetic-client workspace;
2. draft guidance with: action, purpose, dose, stop/reduce boundary, selected channel, and intended validity or review context;
3. make an explicit publish decision;
4. see the current release and its version;
5. replace it with a new release, with an explicit predecessor outcome;
6. withdraw the current release;
7. record a delivery outcome for the selected channel;
8. inspect trainer-only release and audit history.

Every action above must either complete as a durable, traceable transition or leave the prior valid state unchanged.

## 6. Bounded reuse decision before implementation

The reuse decision is not a broad audit of historical branches or prototypes. It answers only these questions against the current `product-recovery` tree:

1. Does the current tree contain a reachable, tested trainer AAL2/MFA foundation?
2. Does the current tree contain a metadata-minimised security-audit foundation?
3. Can the Stage 6A synthetic workspace use that foundation without production configuration, real data, client access, or a weaker parallel authentication path?
4. Can candidate domain structures preserve the Stage 6A invariants without collapsing trainer-only and future client-safe data?

The verified PR #13 MFA commit is reachable from `product-recovery`; this makes it a **reuse candidate**, not a production approval. PR #9 remaining Draft against `main` does not by itself make a reachable, merged security commit unusable for this synthetic Stage 6A branch.

For every examined candidate, record exactly one outcome:

- `reuse candidate — requires scoped design`;
- `not suitable for Stage 6A`;
- `requires adaptation`;
- `blocked by privacy, security, or owner decision`.

## 6.1 Selection rule

Stage 6A may use the existing trainer-security foundation only if all of the following are demonstrated on the current branch:

- the trainer AAL2 boundary is present and passes its existing regression checks;
- no production endpoint, secret, real account, or real data is required;
- the synthetic workspace does not weaken or bypass the existing boundary;
- the selected persistence path can make publish, replace, withdraw, channel, and delivery events durable and auditable.

Otherwise implementation stops for a scoped security decision. It must **not** create a throwaway SQLite, frontend-only login, simulated MFA, or weaker parallel authentication layer merely to continue.

No existing artifact becomes an implementation dependency merely because its name appears compatible.

## 6.2 Synthetic-data boundary

Synthetic data permits implementation and critical-path testing. It does not permit claims that any of the following are complete:

- RODO rights, retention, deletion, export, or processor compliance;
- client authentication, client isolation, or client-safe access;
- production backup, incident response, deployment, or release readiness;
- delivery in the real world.

A recorded delivery outcome is valid in Stage 6A only as a durable, actor-attributed audit event in the selected synthetic persistence layer. A frontend checkbox, browser memory, or local-storage flag is not delivery evidence.

## 7. Quality gates

Stage 6A is eligible for a later owner decision only when all gates pass:

1. **Access boundary:** unauthenticated access to the Damian workspace fails closed.
2. **One-current invariant:** a test proves zero-or-one current release for each synthetic client; conflicting state is rejected.
3. **Replacement and withdrawal:** a test proves no partially current successor, no hidden predecessor reactivation, and trainer-only history preservation.
4. **Audit trail:** every publish, replace, withdraw, channel, and delivery-state action yields an append-only metadata-minimised audit event.
5. **No scope leak:** static checks and browser review find no client access, personal data, network integration, AI, notification, or production deployment behavior.

The required tests are proportionate critical-path tests. This contract does not require artificial “100% coverage” or a production penetration-test claim.

## 8. Exit and stop conditions

**Exit:** a frozen, synthetic-data Damian workspace demonstrates the workflow in section 5 and passes all section 7 gates.

**Stop immediately if:**

- real data or client access becomes necessary to continue;
- a required privacy, retention, provider, or security decision is missing;
- one-current, atomic replacement, withdrawal, or audit invariants cannot be enforced;
- an existing structure would collapse trainer-only and client-safe data;
- implementation pressure proposes automatic decision-making or a second mutable channel of guidance.

## 9. Later decision boundary

Only after Stage 6A is frozen and independently audited may Damian decide whether to authorize a separate client-access contract. That future decision must separately cover:

- lawful basis, special-category-data assessment where applicable, transparency, retention, deletion, processors, and real-data authorization;
- client authentication and client-specific access isolation;
- client-safe projection, current-guidance visibility, optional signal/question handling, and non-emergency contact boundary;
- release, deployment, operational support, and incident handling.

Stage 6A neither implies nor authorizes that decision.
