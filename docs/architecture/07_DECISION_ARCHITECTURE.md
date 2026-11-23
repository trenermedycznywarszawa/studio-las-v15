# 07 Decision Architecture

## Purpose

This document defines how decisions exist in Studio Las OS architecture.

It does not define database schema.

It does not define interface actions.

It does not define automation rules.

It defines what decisions belong to the trainer, what information supports them, and what Studio Las OS must never decide on its own.

## Core principle

Studio Las OS may support decisions.

Studio Las OS must not own decisions.

The trainer owns meaning, interpretation, progression, regression, client-safe report release, and next-step judgment.

## Authority

This document is subordinate to:

1. `docs/constitution/README.md`
2. `docs/product/README.md`
3. `docs/product/02_STUDIO_LAS_METHOD.md`
4. `docs/product/03_COACHING_SYSTEM.md`
5. `docs/product/04_MEASUREMENT_SYSTEM.md`
6. `docs/product/06_HOME_GUIDANCE_SYSTEM.md`
7. `docs/product/05_REPORT_SYSTEM.md`
8. `docs/architecture/00_ARCHITECTURE_PRINCIPLES.md`
9. `docs/architecture/01_METHOD_TO_OS_MAPPING.md`
10. `docs/architecture/03_ARCHITECTURAL_OBJECTS.md`
11. `docs/architecture/05_TRAINER_WORKSPACE.md`
12. `docs/architecture/06_REPORT_GENERATION_ARCHITECTURE.md`

## Decision definition

A decision is a trainer-owned commitment that changes what happens next in the Studio Las process.

A decision is not the same as:

- a data point,
- a note,
- a measurement,
- a checkbox,
- a notification,
- an automated suggestion,
- an interface state.

Data may inform a decision.

The OS may record a decision.

The trainer makes the decision.

## Decision ownership

### Trainer owns

- interpretation,
- hypothesis formation,
- session focus,
- guidance adjustment,
- progression,
- regression,
- safety response,
- referral or pause recommendation,
- report meaning,
- client-safe report release,
- next phase recommendation.

### Client owns

- whether they perform assigned home guidance,
- what they honestly report,
- consent and participation,
- personal experience,
- questions and concerns.

### Studio Las OS owns

Only support functions:

- preserving selected signals,
- preserving trainer decisions,
- organizing source material,
- protecting visibility boundaries,
- maintaining process continuity.

The OS owns no human judgment.

## Decision sequence

Every supported decision should follow this architecture:

1. Context exists.
2. Signal is recorded or observed.
3. Trainer interprets.
4. Trainer makes a decision.
5. OS records the decision where useful.
6. Guidance, session focus, or report changes.
7. Client receives only the appropriate client-safe output.
8. Future signals test whether the decision remained useful.

Do not invert this sequence.

The OS must not start from action, automation, or progression before trainer interpretation.

## Core decision types

### 1. Safety decision

Question:

> Is it safe and appropriate to continue this direction now?

Inputs may include:

- pain response,
- unusual symptoms,
- trainer observation,
- client concern,
- recovery response,
- contraindication context.

Possible decisions:

- continue,
- reduce,
- pause,
- modify,
- refer out,
- request clarification,
- avoid a movement or method.

OS boundary:

The OS must not diagnose, clear, or medically approve the client.

### 2. Focus decision

Question:

> What should the process focus on now?

Inputs may include:

- client goal,
- daily-life limitation,
- assessment observation,
- current confidence,
- recent progress,
- trainer hypothesis.

Possible decisions:

- mobility focus,
- strength focus,
- confidence focus,
- tolerance focus,
- recovery focus,
- movement skill focus,
- maintenance focus.

OS boundary:

The OS must not assign focus automatically from scores.

### 3. Session decision

Question:

> What should happen in the next coached session?

Inputs may include:

- previous session notes,
- recent client signal,
- current hypothesis,
- pain/confidence response,
- planned progression.

Possible decisions:

- repeat,
- progress,
- regress,
- teach,
- test,
- observe,
- change exercise,
- review home guidance.

OS boundary:

The OS must not become a live session controller.

### 4. Home guidance decision

Question:

> What should the client do offline before the next review?

Inputs may include:

- current phase,
- paper guide,
- completion signal,
- pain/confidence response,
- client capacity,
- trainer observation.

Possible decisions:

- assign,
- continue,
- simplify,
- reduce,
- stop,
- progress,
- replace,
- clarify.

OS boundary:

The chosen channel carries the trainer-approved guidance.

The app may guide and record when it is the primary channel. Paper may guide when a physical, screen-free cue is better.

### 5. Measurement decision

Question:

> Is this measurement useful for this client and this report cycle?

Inputs may include:

- process stage,
- report goal,
- client context,
- safety,
- previous measurement relevance.

Possible decisions:

- measure now,
- postpone,
- skip,
- repeat later,
- include in report,
- exclude from report.

OS boundary:

The OS must not collect measurements because they are interesting.

### 6. Report decision

Question:

> What pattern should be communicated to the client?

Inputs may include:

- selected source material,
- trainer interpretation,
- process history,
- client-safe language,
- next recommendation.

Possible decisions:

- include pattern,
- exclude pattern,
- rewrite,
- release to client,
- hold as trainer-only,
- use for next phase only.

OS boundary:

The OS must not release reports without trainer approval.

### 7. Access decision

Question:

> Should this client currently have access to Studio Las OS?

Inputs may include:

- active process status,
- package relationship,
- ongoing guidance,
- administrative context,
- safety and privacy context.

Possible decisions:

- grant,
- continue,
- limit,
- suspend,
- end access.

OS boundary:

Access exists because of the guided relationship.

The app is not sold separately.

## Decision evidence

A decision should have enough evidence to be understandable later.

Evidence may be:

- a signal,
- an observation,
- a note,
- a client statement,
- a measurement,
- a prior decision,
- a report pattern.

Not every decision needs a long explanation.

But important decisions should leave enough trace to preserve continuity.

## Decision reversibility

Architecture should prefer decisions that can be reviewed and changed.

A decision may be:

- active,
- under review,
- changed,
- replaced,
- closed.

These are architecture states, not schema commitments.

The method should allow learning.

## Automation boundary

Automation may help detect that a decision is due for review.

Automation may help organize evidence.

Automation may help draft trainer-facing summaries.

Automation must not:

- choose progression,
- choose regression,
- decide safety,
- diagnose,
- release reports to clients,
- write client-facing meaning without trainer approval,
- decide that a client succeeded or failed.

## Decision quality test

Before defining any decision-support capability, answer:

1. What decision is being supported?
2. Who owns the decision?
3. What minimum evidence is required?
4. What should remain trainer-only?
5. What may become client-safe?
6. Does the decision change guidance, session focus, report, or access?
7. Can the decision be reviewed later?
8. Could automation accidentally take ownership?
9. What is the smallest safe version?

## Final rule

If Studio Las OS cannot clearly name the trainer decision, the capability should not leave architecture.

If Studio Las OS starts making the decision, the architecture has failed.
