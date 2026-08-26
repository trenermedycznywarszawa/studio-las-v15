# openGym mobile guidance execution pattern — Studio Las reference

- **Status:** RESEARCH REFERENCE ONLY — NOT PRODUCT AUTHORITY, NOT IMPLEMENTATION AUTHORIZATION
- **Captured:** 2026-08-26
- **External reference:** `https://gitlab.com/DuarteSantos8/opengym`
- **External project license at review time:** AGPL-3.0
- **Studio Las use rule:** study behavior and interaction patterns; independently re-design/re-implement. Do not copy source code, UI code, assets, text, or data structures into Studio Las without a separate license review.
- **Primary future use:** possible client-side execution surface inside the Stage 5 Guidance Loop.

## Why this reference exists

openGym is a workout tracker, while Studio Las is a trainer-led decision and guidance system. The product models are different. The useful part for Studio Las is not its gym-tracker identity but its **mobile execution engine**: how a pre-existing instruction becomes an active session, how the user sees one current action, records what actually happened with few taps, handles timed work, moves through the sequence, and completes or stops early without destroying history.

This document extracts that interaction pattern only. It does not make openGym a dependency or a product template.

## Observed openGym execution pattern

The reviewed implementation exposes several useful behaviors:

1. A planned routine can be converted into an **active workout state** rather than being edited directly while the user performs it.
2. The active state tracks a current position, entries, their completion state, start time, and progress.
3. The mobile surface emphasizes the **current exercise/unit**, while previous/next navigation remains available.
4. Each action carries only fields relevant to its mode: repetitions/load, timed hold, or cardio duration/speed.
5. Values are pre-filled from the plan/history and can be adjusted with low-friction controls instead of requiring repeated typing.
6. Completion is an explicit action. Finishing a step may move the flow forward, start rest, or complete the session.
7. Timed work records **what actually happened**. If a 45-second target is stopped at 38 seconds, the recorded result becomes 38 seconds rather than falsely crediting the target.
8. The flow separates planned values from executed values.
9. A session can be modified during execution, but destructive actions require confirmation and completed work is treated as meaningful history.
10. A session can be ended before all planned work is complete; early completion is represented explicitly instead of forcing fake completion.
11. The interface keeps execution feedback immediate through progress, completion marks, timer, vibration/sound and automatic navigation.

## What Studio Las should preserve

The following pattern is valuable and should be considered when a client execution surface is eventually authorized:

> **published guidance → active execution instance → one current action → minimal actual-response capture → optional contextual signal → next action → explicit finish/stop → trainer review**

The important architectural distinction is:

- **published guidance** remains the authoritative trainer-approved instruction;
- **execution instance** is an operational record of the client's attempt;
- **actual response** never rewrites the prescription;
- **client completion** never creates trainer meaning or automatically changes future guidance.

## Studio Las adaptation: minimum mobile execution surface

A future Studio Las execution surface should be substantially simpler than openGym.

### 1. Start

The client sees one exact current Studio Las guidance release and a clear action such as:

- `Start today's guidance`
- `Start 20-minute walk`
- `Start mobility sequence`

Starting creates an execution instance bound to the exact published guidance release/item version. It must not create a new guidance version.

### 2. Current action card

Show one main action at a time. Minimum content:

- action name;
- short client-safe purpose when useful;
- dose: repetitions / time / distance / simple instruction;
- stop or reduction rule when relevant;
- optional demonstration/media later, if separately approved;
- a large primary completion control.

Avoid exposing trainer-only reasoning, diagnostic labels, progression logic, scores or unnecessary history.

### 3. Actual versus planned

The engine should preserve both:

- `planned`: what Damian published;
- `actual`: what the client says occurred.

Examples:

- planned `10 repetitions`, actual `8`;
- planned `30 minutes`, actual `18 minutes`;
- planned `45-second hold`, actual timer `37 seconds`.

The actual value is evidence, not an automatic judgment of success/failure.

### 4. Minimal response vocabulary

The existing Stage 5 architecture remains authoritative. For common guidance execution the normalized response stays:

- `done_as_planned`
- `changed_or_partial`
- `stopped`
- `not_done`

Detailed numbers or time are optional evidence attached only where Damian deliberately requested them. Do not require detailed set-by-set logging by default.

### 5. Timed actions

Borrow the behavioral principle, not the implementation:

- timer starts from the prescribed target;
- client may stop early;
- system records actual elapsed time;
- stopping early does not automatically label the outcome as unsafe, failed, regressed or non-compliant;
- the client can optionally select/report the appropriate bounded response.

### 6. Sequence navigation

For multi-item guidance:

- one current action is visually dominant;
- previous and next remain available;
- completion can advance to the next action;
- skipping/stopping must remain possible;
- the system must never force completion merely to reach the end.

### 7. Finish

Finishing creates a bounded execution summary, not a progress score.

Potential client-facing output:

- `Zapisane.`
- `Damian zobaczy to przed kolejną decyzją.`
- optional open question/contact path.

Potential trainer-side evidence:

- exact guidance version attempted;
- start/end timestamp where useful;
- requested normalized execution response;
- requested actual values only;
- client question/context, kept separate from execution status.

## State model to remember

This is a conceptual pattern only, not an approved schema.

```text
GUIDANCE RELEASE (immutable published authority)
        |
        v
EXECUTION INSTANCE
  status: not_started | active | finished | stopped
  exact guidance reference
  started_at / ended_at if useful
        |
        +--> ACTION ATTEMPT 1
        |      planned dose
        |      actual evidence if requested
        |      execution response
        |
        +--> ACTION ATTEMPT 2
        |      ...
        |
        +--> CLIENT CONTEXT / QUESTION
               separate axis; never inferred meaning
```

Important: these labels are research vocabulary and do not add approved Architecture 10 information types, review states, publication states, or database tables.

## What NOT to import from openGym

Do not let this reference pull Studio Las toward a conventional fitness tracker. Specifically avoid making the following default product behavior:

- detailed logging of every set, repetition and kilogram;
- personal records / best-weight emphasis;
- automatic progression or deload decisions;
- exercise-history optimization as the main value proposition;
- body-weight graphs as a core navigation concept;
- completion percentages treated as adherence scores;
- streaks, rankings, badges, shame states or gamification;
- unrestricted freestyle exercise building for the client;
- automatic substitution, progression or regression;
- live surveillance of client activity as a default expectation.

Any future presence/activity telemetry would require a separate necessity, privacy and proportionality decision. The openGym heartbeat/admin-presence pattern is specifically **not** adopted by this reference.

## The Studio Las version of the engine

If implemented later, the engine should optimize for this question:

> **Can the client understand exactly what to do now, record only the information that may help Damian make the next decision, and finish without turning Studio Las into a tracking job?**

The target interaction is therefore closer to:

```text
Open current guidance
    ↓
Start
    ↓
One clear action
    ↓
Do it
    ↓
Done as planned / changed / stopped / not done
    ↓
(optional requested actual value or question)
    ↓
Next action
    ↓
Finish
    ↓
Evidence waits for Damian review
```

rather than:

```text
routine → exercise → set → reps → weight → PR → automatic progression
```

## Future acceptance criteria

Before any client execution engine is considered ready, it should be possible to demonstrate with fictional data that:

1. a published exact guidance version creates an execution instance without mutating the guidance;
2. the client can complete a simple one-action instruction in a few obvious taps;
3. a timed action records actual duration if stopped early;
4. a partial/stopped/not-done response remains valid and does not block finishing;
5. no completion event changes the trainer's focus, dose, progression, regression, safety interpretation or next guidance automatically;
6. a contextual question is stored separately from execution status;
7. stale/replaced guidance cannot silently remain the active actionable instruction;
8. the trainer can see only the bounded evidence needed for review;
9. the surface remains usable without exposing trainer-only rationale;
10. the flow works well on a phone with large tap targets and minimal typing.

## Decision for future Studio Las work

**KEEP AS REFERENCE.**

When the project reaches an authorized client execution implementation, start from this document and the current Stage 5 product/architecture authority. Use openGym only to re-check interaction ideas. Independently design the Studio Las implementation around minimal guidance execution and trainer decision quality.

The most valuable extracted principle is:

> **Do not ask the client to manage a training database. Give them one clear current action, capture what actually happened with minimum friction, and return the evidence to Damian for interpretation.**
