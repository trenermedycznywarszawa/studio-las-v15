# 02 Data Model Decisions

## Purpose

This document defines how Studio Las OS should think about data before any database or schema decision is made.

It is not a Supabase schema document.

It is not a table design.

It is not an implementation plan.

It defines the rules for deciding whether information should exist, who owns it, who may see it, whether it should persist, and how it may support trainer decisions and reports.

## Core principle

Data follows trainer decisions.

Data does not follow screens.

Data does not follow dashboards.

Data does not follow what is technically easy to store.

The first question is not:

> Where do we save this?

The first question is:

> Does this information exist in the Studio Las Method and can it improve a trainer decision?

## Persistence is the last decision

Do not decide persistence too early.

Every new data idea must pass this sequence:

1. Does it exist in the Studio Las Method?
2. Does it support a trainer decision?
3. Does it reduce client chaos or improve safety?
4. Does it support a future report pattern?
5. Does it need to be remembered beyond the current conversation or session?
6. Does it need history?
7. Who should see it?
8. What is the risk of storing it?
9. Can an existing structure represent it safely?
10. Only then: where should it persist?

If the answer fails before step 10, do not create an implementation artifact, schema object, interface element, or storage path.

## Architectural objects vs database objects

Studio Las OS has architectural objects.

These are not automatically database tables.

Examples:

- Client
- Process
- Trainer Hypothesis
- Session Observation
- Home Guidance
- Client Signal
- Measurement
- Trainer Interpretation
- Report Pattern
- Next Decision

A database table is only one possible implementation of an architectural object.

One architectural object may live across multiple existing tables.

Multiple architectural objects may be represented in one existing table if the semantics remain clear and safe.

Do not create one table per concept without proving the need.

## Stable information concepts

The following concepts are stable in the Studio Las Method and should guide future data decisions.

### 1. Client

A person in the Studio Las 1:1 process.

Relevant data:

- identity and contact data,
- active/inactive status,
- package/process status,
- client-safe summaries,
- access control state.

Boundary:

Client data exists to support the relationship and process continuity, not marketing profiling or app monetization.

### 2. Process

The guided arc of work with a client.

Relevant data:

- start date,
- current stage,
- process focus,
- next review point,
- major decisions,
- report cycle.

Boundary:

The process is not a generic program template.

The process is trainer-led and may change based on signals.

### 3. Trainer Hypothesis

A temporary working interpretation used to guide the next intervention.

Relevant data:

- hypothesis text,
- reason,
- supporting observations,
- status,
- change history,
- trainer-only notes.

Boundary:

A hypothesis is not a diagnosis.

It should not be client-facing by default.

### 4. Session Observation

A selected observation from a coached session.

Relevant data:

- session focus,
- movement response,
- load tolerance,
- pain response,
- confidence or fear signal,
- trainer decision,
- next adjustment.

Boundary:

Session data should not become a performance dashboard.

Record what can matter later.

### 5. Home Guidance

Trainer-assigned between-session guidance delivered through paper, app, or a deliberate hybrid.

Relevant data:

- assignment,
- purpose,
- offline instructions reference,
- selected signal to observe,
- start/end dates,
- status,
- trainer-only rationale.

Boundary:

Home guidance must not become a digital habit tracker.

The trainer-selected primary channel remains authoritative for that client and task.

### 6. Client Signal

The smallest client-provided information that may help the trainer interpret the process.

Relevant data:

- done / not done,
- pain response,
- confidence response,
- unusual difficulty,
- short note,
- reason for missing when relevant.

Boundary:

A client signal is not a score of the person.

It must not be visualized as compliance pressure.

### 7. Measurement

Selected objective or subjective data that clarifies baseline, change, safety, or report patterns.

Relevant data:

- body measurements,
- functional tests,
- RPE,
- HR observations,
- movement assessments,
- trainer interpretation.

Boundary:

Measurement must not become quantified-self tracking.

No data point should exist because it is merely interesting.

### 8. Trainer Interpretation

The meaning assigned by the trainer after reviewing context and signals.

Relevant data:

- interpretation note,
- decision rationale,
- uncertainty,
- next step,
- client-safe version when needed.

Boundary:

Interpretation is trainer-owned.

The system may assist organization but must not replace judgment.

### 9. Report Pattern

A repeated signal or meaningful change across time that belongs in a report.

Relevant data:

- pattern description,
- supporting observations,
- selected measurements,
- trainer interpretation,
- next decision implication.

Boundary:

A report pattern is not raw data volume.

It should answer what was discovered.

### 10. Next Decision

The decision that closes one cycle and opens the next.

Relevant data:

- decision type,
- reason,
- next focus,
- review date,
- client-safe summary,
- trainer-only rationale.

Boundary:

The system must not auto-progress the client.

The best next decision may be to reduce support, pause, refer out, or finish.

## Lifecycle of information

Not all information deserves the same lifecycle.

### Temporary information

Temporary information may support a conversation or session but does not need long-term storage.

Examples:

- passing comments,
- non-actionable observations,
- vague impressions,
- data that will not change a decision.

Default decision:

Do not store.

### Working information

Working information supports current trainer reasoning.

Examples:

- current hypothesis,
- current home guidance focus,
- current uncertainty,
- current session adjustment.

Default decision:

Store only if it supports continuity.

Keep trainer-only unless intentionally summarized for the client.

### Historical information

Historical information supports later comparison and reports.

Examples:

- session decisions,
- measurements,
- client signals,
- report-ready observations,
- major process changes.

Default decision:

Store when it can reveal a pattern or protect continuity.

### Report information

Report information has been interpreted and structured for a decision point.

Examples:

- what changed,
- what did not change,
- what pattern emerged,
- what next decision was made.

Default decision:

Store as report output or report source material.

Client visibility must be explicit.

### Information that should disappear or not be stored

Some information should not enter the system.

Examples:

- unnecessary sensitive details,
- broad lifestyle surveillance,
- raw emotional diary content,
- wearable streams,
- irrelevant health speculation,
- data collected for curiosity,
- anything that increases anxiety without improving decisions.

Default decision:

Do not store.

## Ownership

Every piece of information must have an owner.

### Trainer-owned

Trainer-owned information includes:

- hypotheses,
- private notes,
- risk observations,
- interpretation,
- decision rationale,
- report drafts.

Default visibility:

Trainer-only.

### Client-provided

Client-provided information includes:

- intake answers,
- short signals,
- optional notes,
- reported symptoms or confidence responses.

Default visibility:

Trainer-visible, client-visible only where appropriate and safe.

### System-generated

System-generated information may include:

- timestamps,
- status changes,
- computed summaries,
- report draft helpers,
- sync metadata.

Default visibility:

Internal unless intentionally made client-safe.

System-generated information must not pretend to be trainer interpretation.

## Visibility model

Visibility must be designed before storage.

### Trainer-only

Use for:

- hypotheses,
- internal reasoning,
- risk notes,
- raw uncertainty,
- private process notes,
- draft reports,
- technical metadata.

### Client-safe

Use for:

- assigned instructions,
- short explanations,
- calm summaries,
- client-safe released reports,
- selected process reflections written for the client.

### Shared operational

Use for information both trainer and client need to understand the process.

Examples:

- assigned home guidance,
- appointment-related process status,
- selected completed actions,
- final report content.

### Never client-facing by default

Do not expose:

- raw trainer notes,
- private hypotheses,
- risk flags,
- internal decision logic,
- raw logs,
- technical identifiers,
- other clients' data.

## Mutability model

Not all data should be editable in the same way.

### Editable

Editable data includes information that naturally changes:

- contact details,
- current process focus,
- draft guidance,
- draft report content,
- client-safe copy before publication.

### Append-only preferred

Append-only is preferred when history matters:

- session observations,
- client signals,
- trainer decisions,
- hypothesis changes,
- client-safe report release decisions.

### Immutable after client-safe release

Some information should become immutable after client-safe release or decision:

- final reports,
- final decision summaries,
- audit-relevant events,
- client check-ins when used as historical signals.

If corrections are needed, prefer correction records over silent rewriting.

## Data minimization rules

Before adding data, ask:

1. Will this change a trainer decision?
2. Will this reduce client chaos?
3. Will this support a report pattern?
4. Is this safe to store?
5. Is this necessary now?
6. Can it be represented by an existing structure?
7. Can it stay in conversation instead?
8. Can it stay on paper instead?
9. Can it remain trainer-only?
10. What risk does storing it create?

If the answer is weak, do not store it.

## Current-state implementation audit inputs

The current system already contains implementation structures for:

- clients,
- intakes,
- sessions,
- tasks,
- measurements,
- assessments,
- home plans,
- guidance events,
- reports.

These structures are audit inputs for future schema decisions.

They are not architecture principles and not a preferred future schema.

Architecture may prefer reuse only when reuse preserves meaning and safety.

Create new structures only when:

- existing structures distort the meaning,
- visibility cannot be protected,
- report needs cannot be met,
- history or immutability requires a separate concept,
- reuse would create technical or semantic confusion.

## Database design implications

Future schema work must follow these rules:

1. Do not create tables from document headings.
2. Do not create data points because an interface might request them.
3. Do not create daily tracking structures by default.
4. Do not duplicate existing concepts without a gap analysis.
5. Do not expose trainer-only data through client-safe views.
6. Do not store sensitive data in URLs, logs, or public files.
7. Prefer small, testable, reversible schema changes.
8. Treat the existing `localStorage` fallback as a current-state constraint for a future migration plan, not as a preferred future persistence model.
9. Treat access revocation as part of the data model.
10. Treat client-safe released reports and historical signals as audit-sensitive.

## Architecture decision record requirement

Every future schema proposal must include an architecture decision record answering:

1. What Studio Las Method concept does this represent?
2. What trainer decision does it support?
3. Why can this not stay on paper or in conversation?
4. Why does it need persistence?
5. Why does it need history?
6. Who owns it?
7. Who can see it?
8. Can existing structures represent it?
9. What is the privacy risk?
10. What is the smallest safe implementation?

## Anti-patterns

Avoid:

- table-per-idea design,
- dashboard-first data capture,
- universal daily scoring,
- hidden compliance tracking,
- broad wellness questionnaires,
- premature AI-ready data capture,
- wearable data ingestion,
- client-visible internal reasoning,
- report generation based on raw volume,
- deleting or mutating history without trace.

## Final rule

The data model should make the Studio Las Method easier to remember, review, and report.

It should not make the client more monitored.

It should not make the trainer more dependent on dashboards.

It should not make the app more central than the method.

Data serves the method.

Persistence is the last decision.
