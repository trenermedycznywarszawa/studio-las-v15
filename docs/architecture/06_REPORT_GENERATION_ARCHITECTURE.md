# 06 Report Generation Architecture

## Purpose

This document defines how Studio Las OS should support report generation.

It does not define report design.

It does not define PDF layout.

It does not define automatic report generation.

It defines how selected signals, trainer interpretation, and process history may become a client-safe report.

## Core principle

The report shows the pattern.

The trainer gives meaning.

Studio Las OS may prepare structure, preserve source material, and help assemble evidence.

Studio Las OS must not replace trainer interpretation.

## Authority

This document is subordinate to:

1. `docs/constitution/README.md`
2. `docs/product/README.md`
3. `docs/product/02_STUDIO_LAS_METHOD.md`
4. `docs/product/04_MEASUREMENT_SYSTEM.md`
5. `docs/product/05_REPORT_SYSTEM.md`
6. `docs/architecture/00_ARCHITECTURE_PRINCIPLES.md`
7. `docs/architecture/01_METHOD_TO_OS_MAPPING.md`
8. `docs/architecture/03_ARCHITECTURAL_OBJECTS.md`
9. `docs/architecture/04_CLIENT_SAFE_SURFACES.md`
10. `docs/architecture/05_TRAINER_WORKSPACE.md`

## Report architecture job

Report architecture exists to help the trainer answer:

> What changed, what pattern became visible, and what decision should guide the next phase?

The report is not a data export.

The report is not a dashboard snapshot.

The report is not a verdict generated from metrics.

It is a client-safe synthesis of the process.

## Source material categories

Studio Las OS may support reports using selected material from:

1. Client starting context.
2. Trainer hypotheses.
3. Session observations.
4. Home guidance signals.
5. Measurements.
6. Client-safe milestones.
7. Trainer decisions.
8. Process changes.
9. Final trainer interpretation.
10. Next recommendation.

Not every category must appear in every report.

The trainer decides what is relevant.

## Pattern before output

Report generation must follow this order:

1. Select relevant source material.
2. Identify possible patterns.
3. Trainer reviews and interprets.
4. Trainer decides what is client-safe.
5. Client-safe report working version is prepared.
6. Trainer approves or edits.
7. Report crosses the client-safe publication boundary.
8. Report becomes part of process history.

The system must not release raw pattern detection as final report meaning.

## Report pattern types

The architecture may support the following pattern types.

### 1. Functional pattern

Example question:

> What daily-life movement became easier, safer, or more trusted?

Possible sources:

- movement observations,
- session notes,
- client statements,
- repeated functional tasks,
- trainer interpretation.

Boundary:

Do not reduce function to isolated scores only.

### 2. Confidence pattern

Example question:

> Has the client changed their relationship with movement or their own body?

Possible sources:

- client language,
- confidence signals,
- fear reduction,
- willingness to attempt tasks,
- trainer observation.

Boundary:

Do not make psychological or therapeutic claims beyond the scope of Studio Las.

### 3. Capacity pattern

Example question:

> What changed in strength, conditioning, tolerance, or recovery?

Possible sources:

- RPE,
- HR observations,
- session tolerance,
- recovery notes,
- selected measurements.

Boundary:

Do not turn capacity into a performance scoreboard.

### 4. Consistency pattern

Example question:

> What became more stable across the process?

Possible sources:

- repeated home guidance signals,
- fewer flare-ups,
- improved readiness,
- stable execution,
- trainer notes.

Boundary:

Do not create streaks, rankings, or shame-based compliance language.

### 5. Decision pattern

Example question:

> How did trainer decisions change as the client changed?

Possible sources:

- previous decisions,
- hypothesis changes,
- guidance changes,
- progression or regression decisions,
- referral/pause decisions.

Boundary:

The report should explain the process without exposing private trainer reasoning unnecessarily.

## Client-safe report rule

A report is client-safe only after trainer review.

Raw notes are not report content.

Raw measurements are not meaning.

AI draft output is not client-safe by default.

The report must be rewritten into calm, useful, non-shaming language.

## Automation boundary

Studio Las OS may later assist with:

- collecting candidate source material,
- grouping signals by theme,
- detecting missing report sections,
- preparing trainer-facing summaries,
- checking whether report claims have source support.

Studio Las OS must not:

- generate final report meaning automatically,
- release reports without trainer approval,
- diagnose,
- promise outcomes,
- compare clients,
- create performance rankings,
- present certainty where the trainer has uncertainty.

## Report architecture states

Architecturally, a report may pass through these states:

1. Not started.
2. Source material gathering.
3. Trainer review.
4. Working version.
5. Trainer approved.
6. Released through the client-safe publication boundary.
7. Archived as process history.

These are architecture states, not database status values or workflow requirements.

## Report visibility

### Trainer may see

- source material,
- raw notes,
- hypotheses,
- uncertainties,
- working interpretations,
- data quality concerns,
- report working versions before client-safe release.

### Client may see

Only the final client-safe report released by the trainer.

The client should not see working report versions, raw reasoning, hidden uncertainty notes, or technical source material.

## Report should support next decision

A report is not only retrospective.

It should help decide:

- continue current direction,
- enter a new phase,
- reduce complexity,
- change focus,
- maintain independently,
- schedule future review,
- refer out where appropriate.

The report closes one loop and opens the next decision.

## First architecture slice: report generation

The first architecture slice should define only these responsibilities:

1. Selecting report-relevant observations.
2. Organizing candidate patterns for trainer review.
3. Preserving trainer interpretation.
4. Preserving a client-safe preparation boundary.
5. Requiring trainer approval before client-safe release.
6. Preserving the final report as process history.

Anything beyond this must prove that it improves trainer interpretation or client clarity.

## Architecture test

Before defining any report capability, answer:

1. What pattern does this help reveal?
2. Which source material supports it?
3. Who interprets it?
4. What remains trainer-only?
5. What becomes client-safe?
6. Does it support the next decision?
7. Does it risk becoming a dashboard export?
8. Does it risk automated judgment?
9. What is the smallest safe version?

## Final rule

Report generation architecture must protect the meaning-making role of the trainer.

The system may organize evidence.

The trainer writes the meaning.

The report shows the pattern.