# 04 Constitution Governance

## Purpose

This document defines how the Constitution is governed.

It protects the highest layer from being changed casually, indirectly, or accidentally by lower layers.

## Constitution role

The Constitution is the highest active documentation layer until a separate Mission layer is created.

It owns:

- identity,
- authority hierarchy,
- non-negotiables,
- product boundaries,
- forbidden drift,
- governance rules.

It does not own every operational decision.

It does not own pricing details, UI behavior, database schema, copywriting, implementation plans, or release steps.

It owns the boundaries within which those decisions must happen.

## Change rule

Any Constitution change must be intentional.

Do not change Constitution as part of implementation cleanup.

Do not change Constitution as part of UI work.

Do not change Constitution as part of database work.

Do not change Constitution because code is inconvenient.

Do not change Constitution to justify an already-built feature.

## Constitution change requirements

Before changing Constitution, answer:

1. What constitutional truth is changing?
2. Why is the current Constitution insufficient?
3. Which Product documents would be affected?
4. Which Architecture documents would be affected?
5. Which public surfaces would become stale?
6. Which implementation assumptions would need review?
7. Does the change preserve trainer accountability, deliberate channel choice, and client-safe publication?
8. Does the change increase product drift risk?
9. Is this truly constitutional, or does it belong in Product, Architecture, PRD, or Governance?

## What belongs in Constitution

Constitution may define:

- what Studio Las is,
- what Studio Las OS is,
- what the product is not,
- what cannot be built,
- who owns meaning,
- how decisions are ordered,
- what lower layers cannot do,
- how source-of-truth conflicts are resolved.

## What does not belong in Constitution

Do not put the following in Constitution unless they define a permanent boundary:

- prices,
- package details,
- page copy,
- UI layouts,
- database table names,
- Supabase policy names,
- migration plans,
- implementation tasks,
- deployment instructions,
- temporary testing notes,
- marketing experiments.

## Relationship to governance registry

The Source of Truth Registry maps ownership of project concepts.

Constitution defines the highest boundaries.

Governance documents may define ownership of specific operational areas such as pricing, privacy, website content, medical claims, deployment, or test data.

Governance documents may not override Constitution.

## Relationship to Product

Product defines the Studio Las Method.

If Product needs to evolve, it must remain inside constitutional boundaries.

If Product contradicts Constitution, Constitution wins.

## Relationship to Architecture

Architecture translates Product into system responsibilities.

Architecture may refine boundaries, but may not weaken Constitution.

If Architecture contradicts Constitution, Constitution wins.

## Relationship to PRD and implementation

PRD and implementation may only define approved behavior under Constitution, Product, and Architecture.

Implementation pressure is not a valid reason to change Constitution.

## Review cadence

Constitution should be reviewed:

- before PRD begins,
- before production launch,
- before adding new client-facing OS capabilities,
- before adding AI/automation to trainer workflows,
- before changing the offer model,
- before making the app more central to the client experience.

## Version 1.1 decision record — 2026-08-01

1. **Truth changed:** paper-first stopped being a permanent channel prohibition; trainer accountability and deliberate channel choice became the permanent boundary.
2. **Why v1.0 was insufficient:** it confused protection from engagement pressure with a ban on useful digital guidance and unnecessarily weakened a legitimate trainer-facing AI assistant.
3. **Product impact:** Product Model, Studio Las Method, Coaching System, Home Guidance System, and Report System required aligned projections.
4. **Architecture impact:** Architecture Principles, Method-to-OS Mapping, Information Flow, and related guidance references required aligned projections.
5. **Public-surface impact:** none is authorized by this change; website and client runtime remain unchanged.
6. **Implementation impact:** historical paper-first documents remain evidence but no longer define channel choice; runtime and Supabase require later scoped contracts.
7. **Protected invariant:** Damian remains accountable for interpretation, decisions, and client-safe publication.
8. **Drift control:** one authoritative instruction source, no autonomous publication, no scoring, no gamification, and no unnecessary screen-time optimization remain binding.
9. **Layer decision:** trainer authority is constitutional; paper/app/hybrid selection belongs to Product and the trainer workflow.

## Governance failure examples

The Constitution is being violated if:

- a website page changes the product definition,
- an app screen changes the method,
- a migration creates a product rule,
- a report template creates meaning without trainer approval,
- a form creates privacy promises without privacy governance,
- a README becomes more authoritative than Constitution,
- a feature is kept because it already exists despite violating boundaries.

## Constitution readiness rule

Before PRD may begin, Constitution must be:

- explicit,
- readable,
- internally consistent,
- referenced by Product and Architecture,
- protected from stale distributed authority,
- aligned with the Source of Truth Registry.

## Final rule

The Constitution exists to make Studio Las harder to corrupt by convenience.
