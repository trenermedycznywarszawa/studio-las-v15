# 00 Source of Truth Registry

## Purpose

This document defines where truth lives in the Studio Las project.

It exists to prevent lower layers from redefining higher layers.

It protects Studio Las from product drift, implementation drift, website drift, pricing drift, privacy drift, and documentation drift.

This document does not define the Studio Las Method.

This document does not define features.

This document does not define UI.

This document does not define database schema.

It defines ownership of truth.

## Core invariant

The trainer remains accountable for interpretation, decisions, and client-safe publication. Guidance uses the channel selected for the client and task. Technology may support analysis, guidance, records, and drafts, but it may not silently become the authority.

## Design heuristic

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

Every source of truth must preserve this intent. The sentence is not a mandatory interface order and does not prohibit digital guidance.

No website page, code file, migration, form, blog post, README, test fixture, or runtime behavior may redefine this rule.

## Authority hierarchy

The intended hierarchy of truth is:

1. Mission
2. Constitution
3. Product
4. Architecture
5. PRD
6. Implementation
7. Code
8. Runtime
9. Public/client surfaces

Lower layers may project higher-layer truth.

Lower layers may implement higher-layer truth.

Lower layers may not redefine higher-layer truth.

## Registry rule

Every important concept must have exactly one correct owner of truth.

Other files may reference, explain, publish, or implement that truth, but they must not become independent truth sources.

If two places define the same concept differently, the registry determines which layer owns the decision.

## Source of Truth Matrix

| Concept | Correct owner of truth | Primary source | Allowed projections | Must not become truth | Current risk | Governance rule |
| --- | --- | --- | --- | --- | --- | --- |
| Mission | Mission layer | Future mission document | Product, website, brand copy | Code, README, blog, OS copy | Medium | Mission must be explicit before long-term PRD work. |
| Constitution | Constitution | `docs/constitution/` | Product, Architecture, PRD | Website, OS, migrations | High | Constitution owns non-negotiables and decision hierarchy. |
| Product identity | Product | `docs/product/00_PRODUCT_MODEL.md` | Website, onboarding, sales copy | App screens, README, pricing pages | Medium | Website may communicate identity but may not redefine it. |
| Studio Las Method | Product | `docs/product/02_STUDIO_LAS_METHOD.md` | Architecture, PRD, OS behavior, website explanations | Code, migrations, blog | Low | Method changes require Product-layer decision. |
| Trainer role | Product | Product docs | Architecture, OS trainer workspace | AI, automation, client app | Low | Trainer remains product owner of meaning. |
| Client role | Product | Product docs | Client journey, website, client-safe surfaces | App behavior alone | Medium | Client is a guided person, not a SaaS user first. |
| OS role | Product + Architecture | Product docs, Architecture docs | PRD, implementation, code | Runtime behavior, dev helpers | High | OS supports method; OS is not product. |
| Guidance channel | Product | `docs/product/06_HOME_GUIDANCE_SYSTEM.md` | Architecture, paper materials, OS guidance and signal recording | UI, migrations, historical `PAPER_FIRST_*` files | High | Trainer selects paper, app, or deliberate hybrid; one instruction source remains authoritative. |
| Home Guidance | Product | Home Guidance Product docs | Architecture, paper materials, OS assigned guidance | Migrations, client check-in mechanics | High | Implementation must not convert guidance into habit tracking. |
| Client signal | Architecture + PRD | Architecture decision docs, future PRD | OS, Supabase, reports | Migrations alone, UI alone | High | Signal definition must be approved before production implementation. |
| Trainer decision | Architecture | `docs/architecture/07_DECISION_ARCHITECTURE.md` | Trainer workspace, reports, PRD | Automation, AI, scoring logic | Low | OS may support decisions but must not own them. |
| Client-safe boundary | Architecture | `docs/architecture/04_CLIENT_SAFE_SURFACES.md` | SQL views, OS client surfaces, reports | Raw tables, localStorage, shared static app | High | Client visibility must be explicit and intentional. |
| Information provenance and approval | Architecture | `docs/architecture/10_INFORMATION_PROVENANCE_AND_APPROVAL_CONTRACT.md` | PRD, ingestion, AI tasks, trainer workspace, client-safe projections | Generic status fields, AI output, UI labels, migrations | Critical | Information type, review state, and publication state remain independent; `client_material` is the only client-content type and every derivative preserves `derived_from`. |
| AI runtime and provider | Architecture | `docs/architecture/11_AI_RUNTIME_AND_PROVIDER_CONTRACT.md` | Future server-side AI PRD, security and provider ADR after owner authorization | Browser calls, provider defaults, SDK examples, consumer-chat settings | Critical | AI is server-side, minimum-data, trainer-facing, auditable, and optional; provider selection remains blocked until explicit legal, security, technical, and owner decisions. |
| File ingestion and source integrity | Architecture | `docs/architecture/12_FILE_INGESTION_AND_SOURCE_INTEGRITY_CONTRACT.md` | Source-specific PRDs, private storage, import and extraction workflows | File extension, parser output, model confidence, upload UI | Critical | Preserve the immutable source separately, fail closed on wrong-person and untrusted content, and never publish unverified extraction. |
| Data lifecycle, access, audit, and deletion | Architecture + future Privacy Governance | `docs/architecture/13_DATA_LIFECYCLE_ACCESS_AUDIT_AND_DELETION_CONTRACT.md` | Privacy/RODO review, PRD, security operations, processors, backups | `deleted_at` alone, UI removal, arbitrary retention constants | Critical | Lifecycle is purpose-bound and cross-system; exact periods and legal conclusions require qualified review. |
| Stage 1 domain and schema mapping | Architecture | `docs/architecture/14_STAGE_1_DOMAIN_MAPPING_AND_ACCEPTANCE.md` | Scoped ADR/PRD and fictional acceptance tests | Existing tables, field names, migrations, prototypes | Critical | Current structures are audit evidence and reuse candidates only; `SCHEMA — NOT APPROVED`. |
| Report meaning | Product | Report System Product doc | Architecture, PRD, final client reports | Website promises, dashboard UI, raw metrics | High | Report shows pattern after trainer meaning. |
| Report generation | Architecture | Report Generation Architecture doc | PRD, OS report workflow | Automatic report output | Medium | System may organize evidence; trainer approves meaning. |
| Measurements | Product + Architecture | Measurement System Product doc | Reports, trainer workspace | Public marketing proof, dashboards | Medium | Measurements exist to support decisions and patterns, not self-optimization. |
| Pricing | Offer/Pricing Governance | `docs/governance/02_OFFER_AND_PRICING_GOVERNANCE.md` | Website, forms, README summaries | Individual HTML pages | Critical | Canonical diagnostic visit price is 300 PLN; stale projections must be cleaned. |
| Packages | Offer/Pricing Governance | `docs/governance/02_OFFER_AND_PRICING_GOVERNANCE.md` | Website, sales materials | Old offer pages | High | Packages must not be redefined independently by pages. |
| Diagnostic visit | Offer/Pricing Governance + Product | `docs/governance/02_OFFER_AND_PRICING_GOVERNANCE.md` | Website, forms, onboarding | Individual page copy | High | Diagnostic visit price is 300 PLN; scope and projections must match governance. |
| Website copy | Website Content Governance | Future website content governance document | HTML pages, metadata, sitemap | Old pages, blog posts, redirect stubs | High | Website publishes truth; it does not own doctrine. |
| Blog/education | Content Governance | Future medical/content governance document | Blog pages, educational posts | Product doctrine, medical promises | High | Blog is educational projection, not product authority. |
| Medical/health claims | Medical Content Governance | Future medical content governance document | Website, blog, forms | Unreviewed page copy | Critical | Any medical/oncology claim requires explicit review authority. |
| Privacy/RODO | Privacy Governance | Future privacy/RODO governance document | Forms, footer links, policy pages | Form comments, Formspree copy, DATA_POLICY draft | Critical | Privacy copy must match actual processors and data flow. |
| Forms/intake | Privacy Governance + Product | Future privacy/RODO + intake governance | `ankieta-*`, onboarding | Form HTML alone | High | Forms may collect only approved data with approved legal copy. |
| Supabase schema | Architecture + PRD + Data Governance | Future PRD/data governance | migrations, SQL, RLS | migrations as doctrine | High | SQL implements approved truth; SQL does not create product rules. |
| RLS/security | Security/Data Governance | Future Supabase/RLS governance | migrations, tests, views | assumptions in app code | High | Security rules must be independently reviewed before production. |
| Dev/demo data | Data Governance | Future test-data governance | seeds, demo paths, importer tests | Production behavior | Medium | Demo data must never become product truth. |
| Runtime config/auth | Security Governance | Future deployment/security governance | config JS, auth helpers | public code comments | High | Runtime helpers must not define security model. |
| Deployment/release | Deployment Governance | Future release governance | GitHub Pages, sitemap, robots, metadata | local notes, old READMEs | High | Public surfaces require release ownership. |
| PRD | PRD layer | Future PRD documents | implementation tasks, tests | Architecture, code, migrations | High | PRD may start only after governance blockers are resolved. |

## Layer responsibilities

### Mission

Owns why Studio Las exists.

Mission is currently implied by Product and brand language, but should become explicit before long-term PRD work.

### Constitution

Owns non-negotiables, decision hierarchy, boundaries, and governance principles.

Constitution must remain above Product, Architecture, PRD, implementation, and code.

### Product

Owns the Studio Las Method.

Product defines:

- what the product is,
- who the trainer is,
- who the client is,
- how the client journey works,
- how coaching works,
- why measurements exist,
- why reports exist,
- why home guidance exists,
- why the OS is subordinate.

Product does not define UI, schema, or code.

### Architecture

Owns translation from method to system boundaries.

Architecture defines:

- responsibilities,
- flows,
- client-safe boundaries,
- decision ownership,
- information flow,
- report generation boundaries,
- data model principles before schema.

Architecture does not define final PRD behavior, UI, database tables, or implementation tasks.

### PRD

Will own scoped, approved product behavior.

PRD must not start until governance blockers are resolved.

### Implementation

Owns how approved behavior is built.

Implementation cannot create product truth.

### Code

Owns executable behavior only after PRD approval.

Code comments, constants, demo data, localStorage keys, and UI labels must not become doctrine.

### Runtime and public/client surfaces

Website, forms, OS, reports, sitemap, robots, metadata, and public pages are projections of truth.

They must be governed by upstream documents.

They are not independent truth sources.

## Governance violations to prevent

The following are violations:

- website page defines price independently,
- migration defines a product rule before PRD,
- OS behavior defines client journey before Architecture/PRD,
- blog post makes medical claim without content governance,
- form copy defines privacy practice without privacy governance,
- README points to missing authority files,
- demo/test data shapes real product decisions,
- report UI turns trainer meaning into raw dashboard,
- client app or paper becomes a universal channel regardless of client need,
- AI or automation owns interpretation.

## Classification of repository knowledge

Every file that influences Studio Las should be classified as one of:

1. Authoritative source
2. Subordinate explanation
3. Publication surface
4. Implementation artifact
5. Test/demo artifact
6. Historical artifact
7. Stale artifact
8. Dangerous duplicate truth

Files should not remain ambiguous.

## Current known high-risk duplicate truth

The following areas require cleanup after this registry is accepted:

1. Diagnostic visit price: canonical value is now 300 PLN, but stale 400 PLN projections still exist.
2. Constitution references vs actual Constitution files.
3. Privacy/Formspree processor wording.
4. Report as pattern vs report as proof/dashboard.
5. Website offer pages defining packages independently.
6. Medical/oncology claims without clear governance owner.
7. Historical paper-first implementation documents conflicting with channel-neutral Home Guidance v2.0.
8. OS/client portal behavior existing before final client-safe production boundary.
9. v14/v15 public metadata and canonical drift.

## PRD entry rule

PRD may not begin until the following are resolved:

1. Constitution state is verified and corrected.
2. Pricing owner and canonical price are decided; public projections must still be cleaned.
3. Privacy/RODO governance owner is defined.
4. Medical content governance owner is defined.
5. Client-safe publication boundary is confirmed.
6. Report meaning and report publication boundary are confirmed.
7. Website content ownership is defined.
8. Supabase/RLS audit path is defined.

### Narrow Product Recovery prototype exception

**Decision date:** 2026-08-10
**Decision owner:** Damian

> Akceptuję, że PRD 002 i PRD 003 mogą funkcjonować jako odizolowane kontrakty fikcyjnych prototypów w ramach Product Recovery mimo ogólnej PRD entry rule. Decyzja nie zatwierdza produkcji, schematu danych, Supabase, AI runtime, prawdziwych danych klientów, publikacji ani Etapu 4. Registry i statusy mają zostać skorygowane jawnie, bez przepisywania historii.

This is an exception only for the isolated, fictional contract prototypes described by PRD 002 and PRD 003. The general PRD entry rule above remains in force and the exception does not extend to later PRDs.

The decision does not accept Stage 3, PR #23, a merge, production architecture, real data, Supabase, an AI runtime, publication, or Stage 4. Stage 2 had already been owner accepted and merged; its earlier candidate statuses remain historical records rather than being rewritten as if this exception predated them.

### Stage 3 owner acceptance and merge

**Decision date:** 2026-08-11
**Decision owner:** Damian

> Zatwierdzam zmianę PR #23 z Draft na Ready for review oraz kontrolowane scalenie dokładnego headu 00412a73e8faeb5187d8fa797e768a8bdb7cbb64 do gałęzi product-recovery.

The separate read-only audit completed with `PASS` on 2026-08-10 for exact commit `00412a73e8faeb5187d8fa797e768a8bdb7cbb64` and tree `5f30c4392d191bb88bddf8ee49f928f3d9e0c430`. On 2026-08-11 PR #23 was marked Ready for review and merged into `product-recovery` as merge commit `0d9a8e89623ebc7cc9db3edf53fa9550c31f4de3`.

This later decision accepts and closes Stage 3 only as the isolated fictional prototype contract defined by PRD 003. The controlled source archive P2 was closed on 2026-08-11 by private controlled-repository package/evidence commit `8b290cdb2c665077905c77d91cca7500255a3bb2`; package SHA-256, wrong-password filename privacy, checksum, clean restore, restored hashes, encrypted backup, and cleanup are recorded in `docs/product/STAGE_3_SOURCE_ARTIFACT_MANIFEST.md`, with controlled access governed by the private repository's `stage-3/ACCESS_PROCEDURE.md`. This does not authorize deployment, production, staging, Supabase, Auth, MFA, RLS, Storage, Edge Functions, schema, SQL, migrations, an AI runtime, real client data, PR #18, or Stage 4. Starting Stage 4 requires a separate explicit owner decision.

### Narrow Stage 4A fictional prototype exception

**Decision date:** 2026-08-11
**Decision owner:** Damian

> Zatwierdzam rozpoczęcie Etapu 4 wyłącznie jako odizolowany fikcyjny prototyp: Stage 4A — fictional PWD decision conversation. Akceptuję task `conduct_pwd_and_record_trainer_decision`, wersja `stage4-v1`.

PRD 004 may exist only as the contract for the isolated, deterministic, fictional Stage 4A prototype. This is a narrow exception to the general PRD entry rule; it does not change that rule and does not extend to a real runtime, later PRDs, a canonical test catalogue, production architecture, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, a real AI provider or model, real Tanita ingestion, real client data, staging, production, deployment, publication, sending, pricing, payment, or booking.

Stage 4A may use only pseudonymous fictional fixtures, a pre-prepared fictional Tanita package, deterministic simulated AI suggestions marked `needs_review`, and session-memory state without network or persistence. Tanita is optional. Its absence and AI unavailability must not block the manual workflow. The four decisions are equal and unselected by default: `START`, `START_CONDITIONAL`, `DEFER_CONSULT`, and `NOT_THIS_PRODUCT`. Only Damian may create the decision and any conditions.

The implementation was required to start directly from `product-recovery@65a65f192225fb4f30dc658dd02aa750ec8eab69` in a clean separate worktree. PR #18 and its branch were not an implementation base and remained untouched. The Stage 4A pull request was required to stay Draft until an independent read-only audit and a separate owner merge decision.

### Stage 4A owner acceptance and merge

**Decision date:** 2026-08-16
**Decision owner:** Damian

> Zatwierdzam Stage 4A wyłącznie jako scalony kontrakt odizolowanego fikcyjnego prototypu. Akceptuję dokładny head `ad101c87e4eca13ce18517ec9cc8b9277392756b`, tree `41747abd450c60e6f9a2b8c85fb41dae04a1efca` oraz kontrolowany merge PR #25 do `product-recovery`.

The independent read-only audit reported `0 P0 / 0 P1`, and the Stage 4A suite completed with `52/52 PASS`. On 2026-08-16 PR #25 was marked Ready for review as a technical merge step and merged through merge commit `149fb9538a2491bed5cbf71c6885fe789247d541`.

Current Stage 4A status is `OWNER ACCEPTED AND MERGED — FICTITIOUS PROTOTYPE CONTRACT ONLY`. This later, separate decision accepts and closes only the isolated Stage 4A contract; it preserves the earlier decision that authorized its start without rewriting that history.

Neither the audit, acceptance, nor merge authorizes runtime, real AI, real Tanita ingestion, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, real data, staging, production, deployment, publication, or Stage 5. The canonical plan defines no Stage 4B. Any next stage requires a separate explicit owner decision.

### Stage 4 completion decision

**Decision date:** 2026-08-16
**Decision owner:** Damian

The owner directed completion of the Stage 4 Completion Gate and autonomous recording of its evidence-based result. The gate maps the complete roadmap Stage 4 scope and exit gate to the accepted Stage 4A contract, prototype, audit, and `52/52 PASS` regression evidence.

Stage 4A demonstrates the exact Stage 3 interview handoff, optional Tanita comparability context, selected performed/skipped/stopped observations, separate client reaction and trainer interpretation, reviewed conversation support with a complete manual fallback, all four explicit trainer decisions, and an unpublished unsendable follow-up. The interface passed the independent professional-conversation, no-sales-pressure, no-diagnosis, responsive, keyboard, provenance, and fail-closed checks.

The only literal ambiguity is the earlier phrase `Tanita PDF ingestion`. It is not a missing Stage 4 product capability: the Execution Plan assigns approved document-ingestion automation and Tanita import-reliability evaluation to Stage 8, only after manual flows work. Requiring real upload, parser, OCR, Storage, or runtime in Stage 4 would reverse the canonical sequence and expand risk before product value is proven.

Therefore Stage 4 is `OWNER ACCEPTED, MERGED AND CLOSED — BOUNDED FICTIONAL PROTOTYPE CONTRACT ONLY`. Stage 4A remains the delivery-slice and evidence name; it satisfies the whole Stage 4 product contract. No Stage 4B exists or is required.

This decision does not authorize runtime, real AI, real Tanita ingestion, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, real data, staging, production, deployment, publication, integration with `main`, or Stage 5. Starting Stage 5 requires a separate explicit owner decision.

### Stage 5 product-planning authorization

**Decision date:** 2026-08-17
**Decision owner:** Damian

Damian agreed with the recommended Stage 5 direction and authorized autonomous preparation of the Stage 5 Product Decision Brief.

The authorized product-planning problem is the twelve-week guidance and adaptation loop: exact eligible Stage 4 decision → current trainer focus → one authoritative trainer-approved guidance version → client action → optional minimum decision-relevant signal or contextual question → trainer interpretation and explicit next decision → versioned guidance change → selected report-ready evidence.

The portal is subordinate to this loop and is not mandatory for every client. Twelve weeks is a commercial and review envelope, not a fixed curriculum. Paper, app, and deliberate hybrid remain equal trainer-selected channels, with exactly one authoritative instruction source. Stage 5 must prove the complete manual path before AI or automation; weekly AI preparation remains Stage 6.

This decision authorizes only the Draft product document `docs/product/10_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP.md` and the minimum Registry, Product index, and Execution Plan projections required to keep canonical truth consistent.

It does not accept the resulting Draft, authorize a Stage 5 Architecture Contract, create an exception for PRD 005, or permit a prototype, HTML, CSS, JavaScript, tests, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, real AI, simulated AI, real client data, staging, production, deployment, publication, integration with `main`, Stage 6, Stage 7, or Stage 8 implementation. Each later layer requires a separate owner decision after the higher layer passes review.

PR #18 remains frozen implementation evidence and is not a product or implementation base for Stage 5.

### Stage 5 Product Decision Brief owner acceptance and merge

**Decision date:** 2026-08-17
**Decision owner:** Damian

Damian explicitly owner accepted the Stage 5 Product Decision Brief at exact head `c16ac756af35b3977fc344babcb374fb29e2afe5` and tree `5d51ce05a9945f67eb259419d0f69ea4e6caa780` after the independent read-only audit returned `READY FOR OWNER ACCEPTANCE DECISION` with `0 P0 / 0 P1 / 1 P2`. The single P2 concerned the stale commit count in the PR description and was corrected before merge without changing the accepted head or tree.

PR #27 was marked Ready for review and merged into `product-recovery` as merge commit `f2ef7c9d07c7e8b9fb88eff723ebc5b74f56c145`. Current status is `OWNER ACCEPTED, MERGED AND CLOSED — PRODUCT DECISION BRIEF ONLY`.

This decision accepts and closes only the Product Decision Brief. It changes no Stage 5 product truth and does not authorize a Stage 5 Architecture Contract, PRD 005, a prototype, HTML, CSS, JavaScript, tests, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, real or simulated AI, real client data, staging, production, deployment, publication, integration with `main`, Stage 6, Stage 7, Stage 8, or implementation. Every later layer requires a separate explicit owner decision.

PR #18 remains frozen implementation evidence and is not a product or implementation base for Stage 5.

### Stage 5 Architecture Contract authorization

**Decision date:** 2026-08-17
**Decision owner:** Damian

> Autoryzuję autonomiczne przygotowanie jednego Stage 5 Architecture Contract na bazie `product-recovery@3298cbf45ad38f5789b93381bb308c5a46fc3329`. Bez PRD, prototypu, UI, schematu, Supabase, runtime’u, realnych danych i implementacji. Dokument ma pozostać Draftem do niezależnego audytu i mojej osobnej decyzji.

This decision authorizes exactly one Draft architecture contract at `docs/architecture/18_STAGE_5_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP_CONTRACT.md` plus the minimum Architecture index, Registry, and Execution Plan projections required to preserve canonical status. The contract may define domain responsibilities, exact-version lineage, publication and withdrawal behavior, channel authority, client-safe projections, trainer decisions, failure states, and a bounded fictional acceptance model.

The Draft must start from exact base `product-recovery@3298cbf45ad38f5789b93381bb308c5a46fc3329`, remain Draft, and undergo an independent read-only audit on one frozen HEAD/tree before any later owner acceptance decision.

This authorization does not accept the resulting Draft, mark it Ready, authorize merge, create PRD 005 or an exception to the general PRD entry rule, or permit a prototype, UI, HTML, CSS, JavaScript, tests, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, runtime, real or simulated AI, real client data, staging, production, deployment, publication, integration with `main`, Stage 6, Stage 7, Stage 8, or implementation.

PR #18 remains frozen implementation evidence and is not a product or implementation base for Stage 5.

### Stage 5 Architecture Contract owner acceptance and merge

**Decision date:** 2026-08-17
**Decision owner:** Damian

> Akceptuję Stage 5 Architecture Contract na HEAD `02fcb175460b340d13cf4fc0833081a0ae071706`, tree `34c24a4880ca7543550cd51d912250a28e0b691d`, po dwóch audytach `0 P0 / 0 P1 / 0 P2`. Autoryzuję Ready, merge PR #28 do `product-recovery` oraz jeden status-only governance commit zapisujący akceptację i merge. Bez PRD, prototypu, UI, schematu, Supabase, runtime’u, realnych danych i implementacji.

Damian explicitly owner accepted the Stage 5 Architecture Contract at exact head `02fcb175460b340d13cf4fc0833081a0ae071706` and tree `34c24a4880ca7543550cd51d912250a28e0b691d` after two independent final read-only audits each reported `READY FOR OWNER ACCEPTANCE DECISION` with `0 P0 / 0 P1 / 0 P2`.

PR #28 was marked Ready for review and merged into `product-recovery` as merge commit `37613418cc25ba46bb1f31237d54cc6c113750bd`. Current status is `OWNER ACCEPTED, MERGED AND CLOSED — ARCHITECTURE CONTRACT ONLY`.

This decision accepts and closes only the Stage 5 Architecture Contract. It changes no Stage 5 product truth and does not authorize PRD 005, a prototype, UI, HTML, CSS, JavaScript, tests, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, runtime, real or simulated AI, real client data, staging, production, deployment, publication, integration with `main`, Stage 6, Stage 7, Stage 8, or implementation. Every later layer requires a separate explicit owner decision.

PR #18 remains frozen implementation evidence and is not a product or implementation base for Stage 5.

## Production entry rule

Production may not proceed until:

1. Public offer truth is consistent.
2. Sensitive form data flow is legally reviewed.
3. Privacy copy matches actual processors.
4. Client-safe data surfaces are verified.
5. Dev/demo/auth helpers are isolated or removed from production surfaces.
6. Supabase RLS and views are audited.
7. Public metadata, sitemap, robots, and canonical URLs are consistent.
8. Test/demo data cannot be confused with real product truth.

## Future governance documents

The recommended order is:

1. `docs/governance/00_SOURCE_OF_TRUTH_REGISTRY.md`
2. `docs/governance/01_MISSION.md`
3. `docs/governance/02_OFFER_AND_PRICING_GOVERNANCE.md`
4. `docs/governance/03_WEBSITE_CONTENT_GOVERNANCE.md`
5. `docs/governance/04_PRIVACY_AND_RODO_GOVERNANCE.md`
6. `docs/governance/05_MEDICAL_CONTENT_GOVERNANCE.md`
7. `docs/governance/06_REPORT_PUBLICATION_GOVERNANCE.md`
8. `docs/governance/07_CLIENT_SAFE_PUBLICATION_BOUNDARY.md`
9. `docs/governance/08_SUPABASE_RLS_GOVERNANCE.md`
10. `docs/governance/09_DEPLOYMENT_AND_RELEASE_GOVERNANCE.md`
11. `docs/governance/10_TEST_DATA_AND_DEMO_GOVERNANCE.md`
12. `docs/governance/11_PRD_ENTRY_CRITERIA.md`

These documents should be created only when needed.

Do not create governance documents speculatively if the decision can remain in this registry.

## Decision rule

When a future change is proposed, ask:

1. Which concept does this affect?
2. Who owns the truth for this concept?
3. Is this changing truth or projecting truth?
4. Is the correct owner being updated first?
5. Does this violate trainer accountability, deliberate channel choice, or client-safe publication?
6. Does this create duplicate truth?
7. Does this create client-safe or privacy risk?
8. Does this require PRD before implementation?

If ownership is unclear, do not implement.

## Final rule

Studio Las must not be governed by whichever file was edited most recently.

Studio Las must be governed by explicit ownership of truth.

The repository may grow.

The source of truth must stay small, clear, and protected.
