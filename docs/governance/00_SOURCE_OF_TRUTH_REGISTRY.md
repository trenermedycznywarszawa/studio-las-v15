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

## Core rule

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

Every source of truth must preserve this order.

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
| Paper-first morning | Product | Home Guidance Product docs | Architecture, paper guides, OS signal recording | Client app, check-in UI, notifications | High | Paper guides; app records later. |
| Home Guidance | Product | Home Guidance Product docs | Architecture, paper materials, OS assigned guidance | Migrations, client check-in mechanics | High | Implementation must not convert guidance into habit tracking. |
| Client signal | Architecture + PRD | Architecture decision docs, future PRD | OS, Supabase, reports | Migrations alone, UI alone | High | Signal definition must be approved before production implementation. |
| Trainer decision | Architecture | `docs/architecture/07_DECISION_ARCHITECTURE.md` | Trainer workspace, reports, PRD | Automation, AI, scoring logic | Low | OS may support decisions but must not own them. |
| Client-safe boundary | Architecture | `docs/architecture/04_CLIENT_SAFE_SURFACES.md` | SQL views, OS client surfaces, reports | Raw tables, localStorage, shared static app | High | Client visibility must be explicit and intentional. |
| Report meaning | Product | Report System Product doc | Architecture, PRD, final client reports | Website promises, dashboard UI, raw metrics | High | Report shows pattern after trainer meaning. |
| Report generation | Architecture | Report Generation Architecture doc | PRD, OS report workflow | Automatic report output | Medium | System may organize evidence; trainer approves meaning. |
| Measurements | Product + Architecture | Measurement System Product doc | Reports, trainer workspace | Public marketing proof, dashboards | Medium | Measurements exist to support decisions and patterns, not self-optimization. |
| Pricing | Offer/Pricing Governance | Future offer/pricing governance document | Website, forms, README summaries | Individual HTML pages | Critical | One confirmed price must be owned by one document before public cleanup. |
| Packages | Offer/Pricing Governance | Future offer/pricing governance document | Website, sales materials | Old offer pages | High | Packages must not be redefined independently by pages. |
| Diagnostic visit | Offer/Pricing Governance + Product | Future offer/pricing governance document | Website, forms, onboarding | Individual page copy | High | Scope and price must be canonical before PRD and public cleanup. |
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
- client app becomes morning guide,
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

1. Diagnostic visit price: 300 PLN vs 400 PLN.
2. Constitution references vs actual Constitution files.
3. Privacy/Formspree processor wording.
4. Report as pattern vs report as proof/dashboard.
5. Website offer pages defining packages independently.
6. Medical/oncology claims without clear governance owner.
7. Paper-first check-in implementation advancing ahead of PRD.
8. OS/client portal behavior existing before final client-safe production boundary.
9. v14/v15 public metadata and canonical drift.

## PRD entry rule

PRD may not begin until the following are resolved:

1. Constitution state is verified and corrected.
2. Pricing owner and canonical price are decided.
3. Privacy/RODO governance owner is defined.
4. Medical content governance owner is defined.
5. Client-safe publication boundary is confirmed.
6. Report meaning and report publication boundary are confirmed.
7. Website content ownership is defined.
8. Supabase/RLS audit path is defined.

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
5. Does this violate Paper -> Trainer -> App -> Report?
6. Does this create duplicate truth?
7. Does this create client-safe or privacy risk?
8. Does this require PRD before implementation?

If ownership is unclear, do not implement.

## Final rule

Studio Las must not be governed by whichever file was edited most recently.

Studio Las must be governed by explicit ownership of truth.

The repository may grow.

The source of truth must stay small, clear, and protected.