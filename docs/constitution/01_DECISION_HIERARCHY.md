# 01 Decision Hierarchy

## Purpose

This document defines the authority hierarchy for Studio Las and Studio Las OS.

It prevents lower layers from redefining higher layers.

It protects the project from accidental product drift through code, UI, website copy, migrations, reports, forms, or operational shortcuts.

## Authority hierarchy

All decisions must follow this hierarchy:

1. Mission
2. Constitution
3. Product
4. Architecture
5. PRD
6. Implementation
7. Code
8. Runtime
9. Public/client surfaces

Until the Mission layer exists as a separate document, Constitution protects the mission-level identity of Studio Las.

## Current constitutional authority

The Constitution owns:

- identity,
- non-negotiables,
- product boundaries,
- decision hierarchy,
- forbidden drift,
- governance rules,
- source-of-truth protection.

## Product authority

The Product layer owns the Studio Las Method.

Product defines:

- the client journey,
- the trainer-led method,
- coaching system,
- measurement system,
- report system,
- home guidance system.

Product must obey Constitution.

## Architecture authority

Architecture translates the Studio Las Method into system responsibilities and boundaries.

Architecture defines:

- architectural objects,
- client-safe surfaces,
- trainer workspace responsibilities,
- decision architecture,
- information flow,
- data model principles before schema.

Architecture must obey Product and Constitution.

## PRD authority

PRD will define scoped, approved behavior.

PRD may not redefine Product or Architecture.

PRD may not start until Constitution, Product, Architecture, and governance blockers are sufficiently stable.

## Implementation authority

Implementation chooses how approved behavior is built.

Implementation must not create product truth.

Implementation must not decide product meaning.

Implementation must not move faster than Architecture and PRD allow.

## Code authority

Code executes approved decisions.

Code comments, constants, filenames, UI labels, localStorage keys, demo data, SQL comments, migrations, and runtime behavior must not become doctrine.

If code conflicts with PRD, PRD wins.

If PRD conflicts with Architecture, Architecture wins.

If Architecture conflicts with Product, Product wins.

If Product conflicts with Constitution, Constitution wins.

## Website and public surface authority

Website pages, forms, blog posts, metadata, sitemap entries, and public copy are publication surfaces.

They may communicate approved truth.

They may not define truth independently.

A public page cannot become the owner of price, offer structure, method, report meaning, medical claims, privacy rules, or OS role.

## Data and migration authority

Database migrations, RLS policies, SQL views, RPC functions, seed data, importer scripts, and validation scripts implement approved architecture.

They must not create product doctrine.

A migration may not define the Studio Las Method.

A SQL comment may not become product authority.

## Conflict resolution

When two sources disagree:

1. Identify the concept.
2. Identify the correct owner from the source-of-truth registry.
3. Treat lower-layer copies as projections.
4. Correct the projection, not the owner, unless the owner has been intentionally changed.
5. Do not implement until ownership is clear.

## Decision test

Before any change, answer:

1. Which concept does this affect?
2. Which layer owns that concept?
3. Is this changing truth or projecting truth?
4. Has the higher layer been updated first?
5. Does this preserve trainer accountability and client-safe publication?
6. Is the chosen channel appropriate for this client and task, without unnecessary duplication or screen time?
7. Does this make the OS more central than the method?
8. Does this create duplicate truth?
9. Does this create client-safe, privacy, or medical-content risk?
10. Does this require PRD before implementation?

## Final rule

No lower layer may redefine Studio Las by being edited more recently than the correct owner of truth.
