# Studio Las Constitution

This folder is the highest documentation layer for Studio Las and Studio Las OS.

Its job is to define document authority, product boundaries, and non-negotiable constraints.

## Current status

The constitution is currently distributed across the repository-level operating documents below:

1. `README.md`
2. `docs/STUDIO_LAS_OS_BLUEPRINT.md`
3. `docs/DATA_POLICY.md`
4. `docs/PAPER_FIRST_PROTOCOLS.md`
5. `docs/product/README.md`
6. `docs/product/00_PRODUCT_MODEL.md`

This file exists to make that authority explicit until the constitution is split into dedicated constitution documents.

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

## Non-negotiable rule

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

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
- a client-facing AI coach,
- a gamified motivation system,
- a wearable data platform,
- a product that increases screen time.

## How to use this folder

Before any architecture, PRD, implementation, database, UI, or code change, read this file first.

Then read the Product layer under `docs/product/`.

Only after that should lower-level architecture or implementation documents guide the work.
