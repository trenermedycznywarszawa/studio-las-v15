# 01 Method to OS Mapping

## Purpose

This document maps the Studio Las Method to Studio Las OS responsibilities.

It prevents implementation from starting with screens, tables, or features.

The method comes first.

The OS supports the method.

## Core mapping rule

For every method element, define:

1. What the trainer decides.
2. What signal is needed.
3. Where the signal belongs.
4. What the OS may record.
5. What the OS must not do.
6. How the report may use the pattern.

## High-level mapping

| Studio Las Method element | OS responsibility | OS boundary |
| --- | --- | --- |
| Client context | Preserve process history | Do not expose private context to client by default |
| Trainer hypothesis | Store or reference trainer-only working interpretation | Do not present hypothesis as diagnosis |
| Session work | Record selected observations and decisions | Do not turn session into performance dashboard |
| Home guidance | Preserve assigned paper-first guidance | Do not make the app the morning guide |
| Client signal | Record minimal signal after offline action | Do not create habit tracking pressure |
| Trainer interpretation | Support trainer review and notes | Do not automate meaning for the client |
| Measurement | Store selected report-relevant data | Do not collect everything |
| Report | Assemble patterns for trainer-authored decision | Do not generate automatic verdicts |
| Next decision | Preserve decision and continuity | Do not auto-progress the client |

## 1. Client context

### Method need

The trainer needs to understand the person before interpreting the signal.

Context may include:

- pain history,
- fear of movement,
- prior attempts,
- treatment context,
- daily-life limitations,
- goals,
- contraindications,
- client language about the body.

### Trainer decision

What is safe, meaningful, and useful for this person now?

### OS responsibility

Studio Las OS should preserve client process context so the trainer does not rely only on memory.

The OS may store:

- intake summary,
- goals,
- fears,
- relevant limitations,
- process status,
- client-safe summary,
- trainer-only notes.

### OS boundary

The OS must not expose full context to the client by default.

The OS must not turn intake data into automatic diagnosis.

### Report use

Client context helps the report explain where the person started and why the process took a particular direction.

## 2. Trainer hypothesis

### Method need

The trainer forms working hypotheses to guide action.

A hypothesis is temporary.

It is not a diagnosis.

### Trainer decision

Which working explanation should guide the next intervention?

### OS responsibility

Studio Las OS should support trainer memory around hypotheses.

The OS may store:

- current hypothesis,
- hypothesis status,
- reason for hypothesis,
- related observations,
- change history,
- trainer-only notes.

### OS boundary

The OS must not show private hypotheses to the client by default.

The OS must not label hypotheses as medical truth.

The OS must not auto-generate final interpretations.

### Report use

The report may include a client-safe version of the hypothesis only after trainer editing.

The report should show what the process revealed, not pretend certainty.

## 3. Session work

### Method need

A session is a coached experiment.

The trainer observes how the client responds to movement, load, instruction, fear, fatigue, and recovery.

### Trainer decision

Should the trainer progress, regress, pause, simplify, repeat, or refer out?

### OS responsibility

Studio Las OS should preserve session-level observations that matter later.

The OS may record:

- session date,
- focus,
- selected exercises or patterns,
- RPE,
- HR observations when useful,
- pain response,
- trainer decision,
- client-safe summary,
- next guidance.

### OS boundary

The OS must not turn the session into a performance scoreboard.

The OS must not require full exercise logging if it does not support trainer decisions or reports.

### Report use

Session records help show progression, tolerance, response, and decision changes over time.

## 4. Home guidance

### Method need

The client needs simple between-session guidance without turning the phone into the coach.

Paper carries the morning.

### Trainer decision

What should the client do alone before the next meeting, and what should they notice?

### OS responsibility

Studio Las OS should preserve the assignment and later record only the selected signal.

The OS may store:

- assigned paper guide reference,
- assignment reason,
- start/end dates,
- status,
- selected signal to record,
- trainer notes about the assignment.

### OS boundary

The OS must not become the morning interface.

The OS must not send push reminders.

The OS must not show streaks, points, badges, or pressure.

### Report use

Home guidance data helps reveal whether the guidance reduced chaos, created friction, or supported independence.

## 5. Client signal

### Method need

The trainer needs a short signal from the client after offline action.

The client should not be asked to track everything.

### Trainer decision

What minimal signal helps interpret whether the guidance is working?

### OS responsibility

Studio Las OS should make signal recording short and calm.

Possible signal examples:

- done / not done,
- pain response,
- confidence response,
- unusual difficulty,
- short note,
- missed because of pain / time / fear / confusion.

### OS boundary

The OS must not create universal daily scoring by default.

The OS must not turn missed days into shame.

The OS must not visualize signals as compliance pressure.

### Report use

Repeated signals may reveal patterns around fear, tolerance, clarity, friction, and independence.

## 6. Trainer interpretation

### Method need

The trainer gives meaning to signals.

The same signal can mean different things in different contexts.

### Trainer decision

What does the signal likely mean for this client now?

### OS responsibility

Studio Las OS should support trainer review.

The OS may provide:

- recent signals,
- timeline view,
- related session notes,
- related home guidance,
- report-ready pattern candidates,
- trainer-only interpretation responsibility.

### OS boundary

The OS must not flatten meaning into a score.

The OS must not tell the client what the signal means without trainer interpretation.

### Report use

Trainer interpretation turns raw signal history into a client-safe explanation and next decision.

## 7. Measurement

### Method need

Measurements are useful only when they clarify starting point, safety, change, or report patterns.

### Trainer decision

Which measurement, if any, can change the next decision?

### OS responsibility

Studio Las OS should store selected measurements and make them available for review.

The OS may store:

- body measurements,
- functional assessments,
- selected HR/RPE observations,
- movement observations,
- trainer interpretation.

### OS boundary

The OS must not become a dashboard of all numbers.

The OS must not require wearable integrations.

The OS must not collect data for curiosity.

### Report use

Measurements support the report only when they clarify a meaningful pattern.

## 8. Report

### Method need

The report is a decision point.

It shows what the process revealed and what should happen next.

### Trainer decision

What did we discover, and what is the next responsible step?

### OS responsibility

Studio Las OS should help assemble report-ready patterns.

The OS may support:

- process timeline,
- selected measurements,
- session summaries,
- home guidance patterns,
- trainer notes,
- draft report structure,
- client-safe final report.

### OS boundary

The OS must not generate automatic verdicts.

The OS must not publish raw trainer notes.

The OS must not reduce the report to attendance or data volume.

### Report use

The report itself is the output: a trainer-authored decision artifact.

## 9. Next decision

### Method need

Every cycle should lead to a decision.

The decision may be to continue, change focus, reduce support, refer out, pause, or finish.

### Trainer decision

What is the safest and most useful next step?

### OS responsibility

Studio Las OS should preserve the decision and keep continuity across cycles.

The OS may store:

- decision date,
- decision type,
- reason,
- next focus,
- next review date,
- client-safe summary,
- trainer-only rationale.

### OS boundary

The OS must not auto-progress the client.

The OS must not push continuation as a business default.

The best next decision may be less Studio Las if the client has become more independent.

## Architecture objects implied by the method

The method implies the following OS concepts:

1. Client context
2. Trainer hypothesis
3. Session observation
4. Home guidance assignment
5. Client signal
6. Trainer interpretation
7. Selected measurement
8. Report pattern
9. Next decision

These are architectural concepts, not automatic table names.

Do not create tables directly from this list.

First compare them with current-state implementation audit inputs.

## Current-state implementation audit inputs

Before any future schema proposal, treat the current OS implementation structures as audit inputs to review later:

- `clients`,
- `client_intakes`,
- `sessions`,
- `pre_session_checks`,
- `post_session_observations`,
- `client_tasks`,
- `body_measurements`,
- `training_load_observations`,
- `assessment_results`,
- `home_plans`,
- `home_plan_items`,
- `guidance_events`,
- `reports`.

This list is not an architecture principle, not a preferred future schema, and not an instruction to preserve or extend any table.

Reuse may be appropriate only when it preserves method meaning, visibility boundaries, and process safety.

## Minimum architecture path

For any new OS capability, follow this path:

1. Identify method element.
2. Identify trainer decision.
3. Define minimum signal.
4. Define surface: paper / conversation / app / trainer note / report.
5. Define client visibility.
6. Define trainer visibility.
7. Check existing structures.
8. Define smallest safe implementation.
9. Define report implication.
10. Define what not to build.

## Final rule

Studio Las OS should never be more complex than the method requires.

The method leads.

Architecture translates.

Implementation follows.
