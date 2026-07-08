# 08 Information Flow

## Purpose

This document defines how information should move through Studio Las OS architecture.

It does not define data pipelines.

It does not define API flows.

It does not define database relationships.

It defines how observations, signals, interpretation, decisions, guidance, and reports should move through the Studio Las Method.

## Core principle

Studio Las OS should preserve the right information at the right moment for the right person.

Information flow must protect the sequence:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

The app must not become the beginning of the client's day.

The report must not become raw data.

The trainer must not be removed from meaning.

## Authority

This document is subordinate to:

1. `docs/constitution/README.md`
2. `docs/product/README.md`
3. `docs/product/02_STUDIO_LAS_METHOD.md`
4. `docs/product/03_COACHING_SYSTEM.md`
5. `docs/product/06_HOME_GUIDANCE_SYSTEM.md`
6. `docs/product/05_REPORT_SYSTEM.md`
7. `docs/architecture/00_ARCHITECTURE_PRINCIPLES.md`
8. `docs/architecture/01_METHOD_TO_OS_MAPPING.md`
9. `docs/architecture/02_DATA_MODEL_DECISIONS.md`
10. `docs/architecture/03_ARCHITECTURAL_OBJECTS.md`
11. `docs/architecture/04_CLIENT_SAFE_SURFACES.md`
12. `docs/architecture/07_DECISION_ARCHITECTURE.md`

## Information flow model

Studio Las OS should support this flow:

1. Context
2. Trainer observation
3. Trainer interpretation
4. Trainer decision
5. Paper-first guidance
6. Client action offline
7. App-recorded signal
8. Trainer review
9. Pattern recognition
10. Client-safe report
11. Next decision

This is not a technical pipeline.

It is the method translated into architecture.

## Flow stages

### 1. Context

Role:

The trainer understands the person before interpreting signals.

Examples:

- goals,
- fears,
- pain history,
- daily limitations,
- process phase,
- prior decisions,
- relevant constraints.

Architectural rule:

Context is trainer-facing by default and becomes client-safe only when intentionally summarized.

### 2. Trainer observation

Role:

The trainer notices what matters during 1:1 work.

Examples:

- movement quality,
- hesitation,
- confidence,
- fatigue,
- pain response,
- recovery response,
- skill acquisition,
- change in client language.

Architectural rule:

Observation is selected, not exhaustive.

The OS should not pressure the trainer to document everything.

### 3. Trainer interpretation

Role:

The trainer gives meaning to observations and signals.

Examples:

- working hypothesis,
- uncertainty,
- explanation for change,
- risk interpretation,
- possible next focus.

Architectural rule:

Interpretation is trainer-owned and trainer-only by default.

The OS may preserve it, but must not present it as automatic truth.

### 4. Trainer decision

Role:

The trainer commits to what should happen next.

Examples:

- continue,
- reduce,
- progress,
- change focus,
- assign guidance,
- pause,
- refer out,
- prepare report.

Architectural rule:

Decision must be explicit enough to preserve process continuity.

The OS must not make the decision.

### 5. Paper-first guidance

Role:

The client receives simple offline guidance.

Examples:

- what to do,
- when to do it,
- what to notice,
- when to stop,
- when to record a signal later.

Architectural rule:

Paper carries the morning.

The app must not replace the paper guide.

### 6. Client action offline

Role:

The client performs the assigned guidance offline, outside the app.

Examples:

- movement practice,
- breathing practice,
- walking,
- recovery action,
- simple body awareness task.

Architectural rule:

The action is not an app ritual.

The client should be able to complete it without opening Studio Las OS.

### 7. App-recorded signal

Role:

The client records the smallest useful signal after offline action.

Examples:

- completed / not completed,
- pain response,
- confidence response,
- difficulty,
- short note,
- need for trainer review.

Architectural rule:

The app records the signal.

It does not score the person.

It does not create streaks.

It does not produce client-facing meaning automatically.

### 8. Trainer review

Role:

The trainer reviews selected signals in context.

Examples:

- repeated pain response,
- stable completion,
- increased confidence,
- unexpected difficulty,
- mismatch between plan and reality.

Architectural rule:

Signals become useful only after trainer interpretation.

The OS may group or surface signals, but meaning stays trainer-owned.

### 9. Pattern recognition

Role:

The trainer identifies what is changing over time.

Examples:

- functional improvement,
- better tolerance,
- lower fear,
- improved consistency,
- need to simplify,
- need to change focus.

Architectural rule:

Patterns should support decisions and reports, not dashboards.

### 10. Client-safe report

Role:

The client receives a calm synthesis of the process.

Examples:

- what changed,
- what became easier,
- what the trainer observed,
- what helped,
- what to continue,
- what the next phase should focus on.

Architectural rule:

The report crosses the client-safe publication boundary only after trainer review.

Raw data and private reasoning are not client-safe by default.

### 11. Next decision

Role:

The report and process history inform the next trainer decision.

Examples:

- continue guidance,
- start next phase,
- reduce support,
- maintain independently,
- schedule review,
- change direction.

Architectural rule:

Every report should close one loop and support the next decision.

## Direction of information

Information should move through the system with increasing meaning:

- raw context becomes trainer understanding,
- observation becomes interpretation,
- interpretation becomes decision,
- decision becomes guidance,
- guidance creates action,
- action creates signal,
- signal becomes pattern,
- pattern becomes report,
- report informs next decision.

The system must not flatten this into a single dashboard.

## Visibility transitions

Information may change visibility only through intentional transformation.

### Trainer-only to client-safe

Trainer-only information may become client-safe only when:

1. The trainer chooses it.
2. It is rewritten for the client.
3. It removes private reasoning.
4. It avoids shame, alarm, and overinterpretation.
5. It supports action, clarity, or understanding.
6. It crosses the client-safe publication boundary intentionally.

### Client signal to trainer review

A client signal should remain small.

The trainer may interpret it in the broader process.

The client should not be pushed to over-monitor themselves.

### Report back to process

A client-safe released report becomes part of process history.

It should inform future decisions, but not lock the process into a fixed path.

## Information that should not flow

The following should not flow to client-facing surfaces by default:

- raw trainer notes,
- private hypotheses,
- uncertainty notes,
- internal risk reasoning,
- draft report text,
- technical identifiers,
- logs,
- implementation metadata,
- raw AI output,
- other clients' data,
- internal business notes.

The following should not flow into architecture without justification:

- data collected only because it is easy,
- data points created for future speculation,
- metrics that do not support a trainer decision,
- signals that increase client anxiety,
- dashboards that do not change action.

## Failure modes

Information flow has failed if:

- the client needs the phone to begin the morning,
- the trainer becomes a data clerk,
- the OS creates meaning before the trainer,
- reports become raw exports,
- client-facing surfaces expose internal reasoning,
- data exists without decision value,
- the system rewards more recording rather than better guidance,
- the product begins to feel like a fitness app or wellness tracker.

## First architecture slice: information flow

The first architecture slice should define only these responsibilities:

1. Trainer assigns paper-first guidance.
2. Client records a minimal signal later.
3. Trainer reviews signals in context.
4. Trainer records the next decision.
5. Selected information supports report preparation.
6. Trainer releases a client-safe report.

This is enough for the method.

Everything else must earn its place.

## Architecture test

Before defining any information flow, answer:

1. Where does this information originate?
2. Who owns its meaning?
3. Who may see it?
4. Does it need transformation before the client sees it?
5. Does it support a trainer decision?
6. Does it support a future report pattern?
7. Does it increase app time?
8. Does it create self-monitoring pressure?
9. What should not flow?
10. What is the smallest safe version?

## Final rule

Information flow must make Studio Las OS quieter, safer, and more useful.

The system should preserve the signal without stealing the meaning.