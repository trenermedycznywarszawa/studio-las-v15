# Studio Las Constitution

**Version:** 1.1
**Last intentional review:** 2026-08-01

This folder is the highest active documentation layer for Studio Las and Studio Las OS.

Its job is to define identity, authority, non-negotiables, product boundaries, and governance constraints.

The Constitution exists to protect Studio Las from being redefined by implementation, website copy, migrations, forms, reports, tests, or runtime behavior.

## Core constitutional invariant

The trainer remains accountable for interpretation, decisions, and client-safe publication.

Technology may analyze, organize, suggest, draft, guide, and record. It may not silently become the decision-maker or publish a decision without trainer approval.

The client and the quality of the process come before loyalty to a medium. Paper, the app, or a deliberate hybrid may carry guidance when that choice serves the person and the task.

## Design heuristic

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

This sentence remains a useful design heuristic, not a mandatory technical sequence. Lower layers must preserve its intent: embodied action before unnecessary tracking, trainer authority over meaning, purposeful data, and a trainer-approved report.

## Reading order

1. `00_IDENTITY_AND_MISSION.md` — constitutional identity of Studio Las and Studio Las OS.
2. `01_DECISION_HIERARCHY.md` — authority hierarchy and conflict resolution.
3. `02_NON_NEGOTIABLES.md` — constraints that cannot be overridden by lower layers.
4. `03_PRODUCT_BOUNDARIES.md` — what Studio Las OS may and may not become.
5. `04_CONSTITUTION_GOVERNANCE.md` — how Constitution is protected and changed.

## Authority hierarchy

All future decisions must follow this hierarchy:

1. Mission
2. Constitution
3. Product
4. Architecture
5. PRD
6. Implementation
7. Code
8. Runtime
9. Public/client surfaces

Until a separate Mission layer exists, Constitution protects the mission-level identity of Studio Las.

A lower layer must never redefine a higher layer.

If implementation conflicts with Product, Product wins.

If Product conflicts with Constitution, Constitution wins.

## What Constitution owns

Constitution owns:

- identity,
- decision hierarchy,
- non-negotiables,
- product boundaries,
- forbidden drift,
- governance rules.

Constitution does not own:

- pricing details,
- package details,
- page copy,
- UI layouts,
- database tables,
- migrations,
- implementation tasks,
- deployment instructions.

Those lower-level decisions must happen inside constitutional boundaries.

## Product boundary

Studio Las OS is not the product.

The product is the trainer-led Studio Las Method.

Studio Las OS is an internal support system for the method.

## Forbidden drift

Do not turn Studio Las OS into:

- a fitness app,
- a wellness app,
- a habit tracker,
- a quantified-self dashboard,
- a SaaS product,
- an autonomous client-facing AI coach,
- a gamified motivation system,
- a wearable data platform,
- an engagement product that maximizes screen time instead of improving the client process.

## Relationship to Source of Truth Registry

The Source of Truth Registry defines ownership of project concepts across the repository.

The registry lives at:

`docs/governance/00_SOURCE_OF_TRUTH_REGISTRY.md`

Governance documents may clarify operational ownership.

They may not override Constitution.

## How to use this folder

Before any architecture, PRD, implementation, database, UI, website, form, report, migration, or code change:

1. Read this README.
2. Read the Constitution documents in order.
3. Read the Source of Truth Registry if the change affects ownership of truth.
4. Read the Product layer under `docs/product/`.
5. Read the relevant Architecture documents.
6. Only then move to PRD or implementation.

## Final rule

Studio Las must not be governed by whichever file was edited most recently.

Studio Las must be governed by explicit constitutional authority.

### Version 1.1 decision

Version 1.1 separates permanent product boundaries from an implementation preference. Paper-first is no longer a constitutional ban on digital guidance. The non-negotiable boundary is trainer accountability, client benefit, deliberate channel choice, and protection from scoring, pressure, and autonomous publication.
