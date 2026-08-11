# Studio Las Product

This folder defines the Studio Las product layer.

It does not describe screens, features, database tables, or app behavior.

It describes the Studio Las Method: the private trainer-led method for helping a person recover functional capacity, trust in the body, and long-term independence.

Design heuristic:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

This heuristic protects the trainer-led method; it does not require paper for every client or task. Home guidance may use paper, the app, or a deliberate hybrid. The trainer remains accountable for meaning and publication.

## Reading order

1. `00_PRODUCT_MODEL.md` — what the product is and what it is not.
2. `01_CLIENT_JOURNEY.md` — the real human journey, not app UX.
3. `02_STUDIO_LAS_METHOD.md` — how the method works and how decisions are made.
4. `03_COACHING_SYSTEM.md` — the trainer-led operating cycle.
5. `04_MEASUREMENT_SYSTEM.md` — what is measured, why, when, and what is intentionally not measured.
6. `05_REPORT_SYSTEM.md` — how reports turn process history into the next decision.
7. `06_HOME_GUIDANCE_SYSTEM.md` — how the trainer selects paper, app, or hybrid guidance without creating duplicate truth or engagement pressure.
8. `07_INQUIRY_TO_PHONE_DECISION_SYSTEM.md` — how an inquiry becomes a trainer-owned phone decision without automatic qualification.
9. `08_FULL_INTAKE_AND_PWD_PREPARATION_SYSTEM.md` — how the adaptive full intake becomes a traceable trainer brief and explicit PWD-readiness decision.
10. `STAGE_3_SOURCE_ARTIFACT_MANIFEST.md` — private-source filenames, SHA-256 verification, bounded access procedure, and the unresolved controlled-archive owner action.

## Boundary

Studio Las OS supports this product layer.

Studio Las OS is not the product.

If an app feature conflicts with this folder, the product layer wins.

## Decision hierarchy

All future decisions must follow this hierarchy:

1. Constitution
2. Product
3. Architecture
4. PRD
5. Implementation
6. Code

A lower layer must never redefine a higher layer.

If implementation conflicts with Product, Product wins.

If Product conflicts with Constitution, Constitution wins.

## Relationship to Constitution

The Product layer is subordinate to `docs/constitution/README.md`.

The Product layer defines the Studio Las Method.

The Constitution defines the non-negotiable boundaries that the method and OS must preserve.
