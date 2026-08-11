# Studio Las OS Architecture

This folder defines the Architecture layer for Studio Las OS.

Architecture translates the Studio Las Method into OS decisions.

It does not define the product.

It does not define UI first.

It does not define database tables first.

It explains how Studio Las OS should support the trainer-led method without becoming the product.

## Authority

This layer is subordinate to:

1. `docs/constitution/README.md`
2. `docs/product/README.md`
3. `docs/product/00_PRODUCT_MODEL.md`
4. `docs/product/02_STUDIO_LAS_METHOD.md`

All architecture decisions must preserve the intent of this design heuristic:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

The heuristic is not a fixed interface sequence. Architecture may support paper, app, or hybrid guidance. It must preserve trainer accountability, purposeful data, one authoritative instruction source, and trainer-approved publication.

## Reading order

1. `00_ARCHITECTURE_PRINCIPLES.md` — architectural boundaries and non-negotiable design principles.
2. `01_METHOD_TO_OS_MAPPING.md` — translation from Studio Las Method to OS responsibilities.
3. `02_DATA_MODEL_DECISIONS.md` — data model principles before schema changes.
4. `03_ARCHITECTURAL_OBJECTS.md` — stable domain-level architectural objects before implementation.
5. `04_CLIENT_SAFE_SURFACES.md` — what clients may see and what must stay trainer-only.
6. `05_TRAINER_WORKSPACE.md` — trainer workspace logic as decision support, not a dashboard.
7. `06_REPORT_GENERATION_ARCHITECTURE.md` — how report architecture supports pattern recognition and next decisions.
8. `07_DECISION_ARCHITECTURE.md` — trainer-owned decisions, decision boundaries, and automation limits.
9. `08_INFORMATION_FLOW.md` — how context, observations, signals, decisions, guidance, and reports move through the method.
10. `09_SECURITY_RUNTIME_ARCHITECTURE.md` — runtime trust boundaries and the existing deterministic module boundary.
11. `10_INFORMATION_PROVENANCE_AND_APPROVAL_CONTRACT.md` — closed information types, review, publication, provenance, and version rules.
12. `11_AI_RUNTIME_AND_PROVIDER_CONTRACT.md` — provider-neutral AI boundary and blocked provider decision.
13. `12_FILE_INGESTION_AND_SOURCE_INTEGRITY_CONTRACT.md` — immutable source, parser, attachment, and prompt-injection boundaries.
14. `13_DATA_LIFECYCLE_ACCESS_AUDIT_AND_DELETION_CONTRACT.md` — lifecycle, access, audit, deletion, and legal-review boundaries.
15. `14_STAGE_1_DOMAIN_MAPPING_AND_ACCEPTANCE.md` — domain mapping and Stage 1 acceptance cases.
16. `15_STAGE_2_INQUIRY_PHONE_DECISION_CONTRACT.md` — first inquiry, phone notes, client reaction, and trainer decision.
17. `16_STAGE_3_FULL_INTAKE_PWD_PREPARATION_CONTRACT.md` — adaptive intake, traceable PWD brief, observation candidates, and trainer readiness decision.

## Architecture rule

Do not design screens first.

Do not design tables first.

Start with the trainer decision.

Then define the minimum signal.

Then define where that signal belongs:

- paper,
- conversation,
- app record,
- trainer note,
- report.

Only after that should UI, database, or implementation decisions be made.

## Forbidden architecture drift

Architecture must not pull Studio Las OS toward:

- a fitness app,
- a wellness app,
- a habit tracker,
- a SaaS product,
- a quantified-self dashboard,
- wearable integration architecture,
- client-facing AI coaching,
- gamified engagement loops,
- database-first product thinking,
- screen-first product thinking.

## Architecture completion rule

The Architecture layer is ready for PRD only after all documents in the reading order have been reviewed together for:

- consistency with Constitution,
- consistency with Product,
- absence of screen-first thinking,
- absence of database-first thinking,
- clear decision ownership,
- clear client-safe boundaries,
- clear information flow,
- clear implementation constraints.

Until that review is complete, do not move into PRD, schema design, UI design, or application code.
