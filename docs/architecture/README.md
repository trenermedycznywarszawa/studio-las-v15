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

All architecture decisions must preserve the core rule:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

## Reading order

1. `00_ARCHITECTURE_PRINCIPLES.md` — architectural boundaries and non-negotiable design principles.
2. `01_METHOD_TO_OS_MAPPING.md` — translation from Studio Las Method to OS responsibilities.
3. `02_DATA_MODEL_DECISIONS.md` — data model principles before schema changes.
4. `03_CLIENT_SAFE_SURFACES.md` — what clients may see and what must stay trainer-only.
5. `04_TRAINER_WORKSPACE.md` — trainer workspace logic and decision support.
6. `05_REPORT_GENERATION_ARCHITECTURE.md` — how report architecture supports pattern recognition and next decisions.

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
