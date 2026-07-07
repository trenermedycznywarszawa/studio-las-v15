# 05 Trainer Workspace

## Purpose

This document defines the architectural role of the trainer workspace in Studio Las OS.

It does not define screens.

It does not define UI layout.

It does not define database tables.

It defines what the workspace must help the trainer understand, decide, and preserve.

## Core principle

The trainer workspace is not a dashboard.

The trainer workspace is the place where selected signals become trainer-owned decisions.

It should reduce memory burden, preserve continuity, and prepare the trainer for the next meaningful action.

It must not compete with the live 1:1 relationship.

## Authority

This document is subordinate to:

1. `docs/constitution/README.md`
2. `docs/product/README.md`
3. `docs/product/02_STUDIO_LAS_METHOD.md`
4. `docs/product/04_COACHING_SYSTEM.md`
5. `docs/product/05_MEASUREMENT_SYSTEM.md`
6. `docs/product/07_REPORT_SYSTEM.md`
7. `docs/architecture/00_ARCHITECTURE_PRINCIPLES.md`
8. `docs/architecture/01_METHOD_TO_OS_MAPPING.md`
9. `docs/architecture/03_ARCHITECTURAL_OBJECTS.md`
10. `docs/architecture/04_CLIENT_SAFE_SURFACES.md`

## Workspace job

The trainer workspace exists to help the trainer answer:

> What does this client need next, based on the current process, selected signals, trainer observations, and previous decisions?

It should support:

- remembering client context,
- reviewing process phase,
- seeing selected changes over time,
- preserving trainer hypotheses,
- preparing or adjusting home guidance,
- preparing reports,
- recording the next decision.

It should not optimize for:

- more screen time,
- more fields,
- visual density,
- live coaching through the interface,
- client comparison,
- performance ranking,
- automated progression.

## Trainer workspace is decision support

Every workspace element must connect to a trainer decision.

If an element only displays information but does not improve a trainer decision, it is architectural noise.

If an element encourages the trainer to collect more data without changing the decision quality, it should not be built.

## Core trainer decisions supported

### 1. Process orientation

Question:

> Where is this client in the guided process?

The workspace may support this through:

- current process phase,
- current focus,
- last meaningful decision,
- next review point,
- report cycle status.

The workspace must not turn the process into a rigid program template.

### 2. Session preparation

Question:

> What should the trainer remember before the next session?

The workspace may surface:

- recent client signals,
- relevant prior observations,
- current hypothesis,
- current home guidance,
- warnings or constraints,
- unfinished trainer decisions.

The workspace must not create a screen that dominates the session.

### 3. Hypothesis review

Question:

> Is the current working interpretation still useful?

The workspace may preserve:

- current hypothesis,
- supporting observations,
- contradicting observations,
- status,
- review date,
- trainer-only reasoning.

The workspace must not present hypotheses as diagnosis or client-facing truth.

### 4. Guidance adjustment

Question:

> What should change in the client's paper-first home guidance?

The workspace may show:

- assigned guidance,
- recent completion signal,
- pain/confidence response,
- trainer note,
- need to reduce, continue, or progress.

The workspace must not turn home guidance into an app-first habit loop.

### 5. Report preparation

Question:

> What pattern is becoming visible?

The workspace may support:

- selected measurements,
- process milestones,
- repeated observations,
- changes in confidence or function,
- trainer decisions over time,
- candidate report patterns.

The workspace must not auto-generate final meaning for the client.

### 6. Next decision

Question:

> What is the next safest and most useful step?

The workspace may record:

- continue,
- reduce,
- progress,
- change focus,
- pause,
- refer out,
- prepare report,
- end phase,
- start next phase.

The workspace must not auto-progress the client.

## Information priority

The trainer workspace should prioritize information in this order:

1. Safety and constraints.
2. Current process focus.
3. Last trainer decision.
4. Recent client signals.
5. Relevant observations.
6. Current guidance.
7. Report-relevant patterns.
8. Administrative details.

Administrative details must not dominate method decisions.

## Trainer-only by default

The workspace is trainer-facing by default.

It may contain:

- private notes,
- hypotheses,
- uncertainty,
- risk reasoning,
- draft report content,
- internal interpretation,
- data quality notes.

None of this becomes client-facing unless intentionally rewritten, approved, and published through a client-safe surface.

## Quiet workspace rule

The workspace should make the trainer calmer and better prepared.

It should not create pressure to document everything.

It should not make the trainer feel that the system is the real authority.

The trainer remains the product.

## Workspace anti-patterns

Do not build the trainer workspace as:

- a KPI dashboard,
- a CRM dashboard,
- a medical record clone,
- a fitness coaching panel,
- a quantified-self analysis tool,
- an AI command center,
- a compliance scoreboard,
- a live session control panel.

## Minimum viable workspace architecture

A first version should support only:

1. One client context view.
2. One current process focus.
3. One current hypothesis or trainer note area.
4. Recent selected signals.
5. Current home guidance state.
6. A place to record the next trainer decision.
7. Report preparation notes.

Anything more must prove that it improves a trainer decision.

## Architecture test

Before implementing any trainer workspace element, answer:

1. Which trainer decision does this support?
2. What signal or context is needed?
3. Is this trainer-only or client-safe?
4. Does this belong before, during, or after the session?
5. Does this reduce or increase trainer cognitive load?
6. Does this support a future report pattern?
7. Can an existing object represent it?
8. What should not be shown here?
9. What is the smallest quiet version?

## Final rule

The trainer workspace should not make Studio Las OS feel more important than the trainer.

It should help the trainer see enough, remember enough, and decide better.