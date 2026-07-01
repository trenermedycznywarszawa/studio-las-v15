# Implementation Plan: Paper-first Process Tracking

This document defines the safe implementation plan for Paper-first Process Tracking in Studio Las OS.

This is not an implementation commit.

No migrations should be executed from this document without a separate explicit task.

## 1. Goal

Create a minimal paper-first tracking layer that supports the Studio Las 1:1 process.

Core rule:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

The goal is not to build a fitness tracker, wellness app, habit system, quantified-self dashboard, or standalone product.

## 2. Current OS audit

Audit target: `studio-management-os-3.0.html` and existing Supabase schema.

### 2.1 Current app shape

Current OS is a static single-file HTML application with inline CSS and JavaScript.

Known characteristics:

- main OS file: `studio-management-os-3.0.html`,
- no frontend framework required,
- Supabase REST/Auth helper exists,
- `localStorage` fallback still exists,
- client portal exists,
- trainer dashboard exists,
- client/session/report/home-plan/guidance concepts already exist,
- public site layout is separate and should not be changed for this task.

### 2.2 Existing Supabase integration

The current OS already resolves Supabase config from multiple places:

- `studio-las-config.js`,
- legacy window globals,
- browser storage.

The OS has helper logic for:

- resolving Supabase URL/ref,
- reading an access token,
- reading dashboard state from Supabase,
- trainer authentication helper,
- client insert/update/soft-delete preview paths.

Do not change auth, config, or login logic in the paper-first documentation phase.

### 2.3 Existing data structures visible in the current schema

The existing schema already includes important structures that overlap with paper-first tracking:

- `clients`,
- `client_intakes`,
- `sessions`,
- `pre_session_checks`,
- `post_session_observations`,
- `client_tasks`,
- `client_documents`,
- `body_measurements`,
- `training_load_observations`,
- `assessment_results`,
- `exercises`,
- `home_plans`,
- `home_plan_items`,
- `guidance_events`,
- `guidance_pilots`,
- `guidance_pilot_feedback`,
- `reports`.

Most important overlap:

- `home_plans` can already represent between-session guidance.
- `home_plan_items` can already represent assigned items/exercises/instructions.
- `guidance_events` can already represent dated guidance events, including `client_checkin`.
- `reports` can already store 4/12-week style report content.

Therefore, new paper-first tables must not be added until a schema gap analysis proves they are necessary.

## 3. Proposed data model — describe only, do not migrate yet

The following structures are a conceptual target only.

Do not create them yet.

### 3.1 paper_protocols

Purpose: reusable paper-first protocol definition.

Fields:

- `id`
- `name`
- `description`
- `offline_instructions`
- `estimated_minutes`
- `status`
- `created_at`
- `updated_at`

### 3.2 client_protocol_assignments

Purpose: assignment of a protocol to a specific client.

Fields:

- `id`
- `client_id`
- `protocol_id`
- `assigned_by_trainer_id`
- `start_date`
- `end_date`
- `assignment_reason`
- `status`
- `created_at`

### 3.3 daily_protocol_checkins

Purpose: minimal client signal after completing the offline protocol.

Fields:

- `id`
- `client_id`
- `protocol_id`
- `checkin_date`
- `protocol_done`
- `energy_score`
- `symptom_score`
- `optional_note`
- `created_at`

### 3.4 protocol_report_snapshots

Purpose: frozen report-ready summary for a defined period.

Fields:

- `id`
- `client_id`
- `period_start`
- `period_end`
- `adherence_summary`
- `energy_summary`
- `symptom_summary`
- `trainer_summary`
- `created_at`

## 4. Required schema gap analysis before any migration

Before adding any SQL, compare the proposed structures with current tables.

### 4.1 Questions to answer

1. Can `paper_protocols` be represented by `home_plans` or a new protocol table is cleaner?
2. Can `client_protocol_assignments` be represented by `home_plans` plus status/date fields?
3. Can `daily_protocol_checkins` be represented by `guidance_events` with `kind = 'client_checkin'` and structured `payload`?
4. Is `protocol_report_snapshots` needed, or can report snapshots live in `reports`?
5. What RLS policies are required so a client can insert only their own check-in?
6. What data should trainer see that client should not see?
7. Does any current unique index block repeated check-ins?
8. Should check-ins be one per client/protocol/date?
9. How will ended client access be revoked?
10. How will `localStorage` fallback represent this without breaking old data?

### 4.2 Likely direction, not final decision

Most conservative first direction:

- use existing `home_plans` / `home_plan_items` for assigned offline instructions if possible,
- use existing `guidance_events` for minimal check-in signal if the payload approach is safe,
- use existing `reports` for report summaries if possible,
- avoid new tables until proven necessary.

This must be confirmed by actual schema/RLS review.

## 5. Recommended implementation stages

### Stage 0 — Documentation foundation

Status: current task.

Deliverables:

- `README.md`,
- `docs/STUDIO_LAS_OS_BLUEPRINT.md`,
- `docs/DATA_POLICY.md`,
- `docs/PAPER_FIRST_PROTOCOLS.md`,
- `docs/IMPLEMENTATION_PLAN_PAPER_FIRST.md`.

No app code changes.

### Stage 1 — Schema gap analysis

Deliverable:

- `docs/SCHEMA_GAP_ANALYSIS_PAPER_FIRST.md`

Scope:

- compare proposed model with current schema,
- inspect current RLS policies,
- inspect client-safe views,
- identify whether `guidance_events` can safely store check-ins,
- propose one minimal database path,
- no migrations yet.

### Stage 2 — Migration proposal only

Deliverable:

- draft SQL migration file or markdown SQL proposal,
- RLS strategy,
- rollback notes,
- manual test plan.

No execution against production.

### Stage 3 — Local/dev implementation

Scope:

- add minimal data adapter methods,
- preserve `localStorage` fallback,
- no public layout changes,
- no new framework,
- no extra dependencies unless absolutely necessary.

### Stage 4 — Trainer assignment UI

Scope:

- trainer can assign/select one paper-first protocol,
- trainer writes assignment reason,
- trainer can see current assignment status,
- no client-facing automation.

### Stage 5 — Client minimal check-in

Scope:

- client sees assigned paper protocol summary,
- client records done yes/no,
- energy 0-10,
- symptom 0-10,
- optional note,
- save takes 30-45 seconds.

No streaks. No points. No notifications.

### Stage 6 — Trainer review view

Scope:

- trainer sees recent check-ins,
- trainer sees simple period summary,
- trainer can interpret in context.

No automated conclusions.

### Stage 7 — Report integration

Scope:

- 4/8/12-week summaries can include adherence, energy, symptoms, and trainer interpretation,
- report remains trainer-authored,
- AI support, if ever added, supports trainer only.

## 6. Minimal model for first implementation

The first implementation should use only this signal:

- `date`,
- `client_id`,
- `protocol_id` or assignment/item reference,
- `protocol_done`,
- `energy_score`,
- `symptom_score`,
- `optional_note`,
- `created_at`.

Do not add:

- mood scale,
- sleep questionnaire,
- nutrition log,
- step count,
- HRV,
- wearable import,
- long symptom list,
- daily life survey.

## 7. Best insertion points in the current OS

### 7.1 Trainer side

Best future insertion points:

- existing home plan / between-session guidance area,
- client detail view,
- report generation area,
- existing guidance-related state if present.

Reason:

Paper-first protocols are not separate workouts. They are between-session guidance assigned by the trainer.

### 7.2 Client side

Best future insertion points:

- client `Dzisiaj` area,
- current client portal guidance area,
- material/instruction area if already used for client-safe summaries.

Reason:

The client should see one clear action, not a new module tree.

### 7.3 Data adapter layer

Best future insertion point:

- existing Supabase data service / mapper layer,
- existing `localStorage` state migration functions,
- report mapper when report integration begins.

Reason:

Data loading is already centralized enough to avoid scattering paper-first logic across the whole file.

## 8. Existing functions/concepts that can be reused

Likely reusable concepts:

- `clients`,
- client status/stage/package fields,
- `homePlan` / home-plan UI concepts,
- `home_plans`,
- `home_plan_items`,
- `guidance_events`,
- `reports`,
- Supabase data service,
- local state migration pattern,
- client-safe summary pattern,
- trainer/client visibility split.

Do not duplicate these concepts unless there is a clear reason.

## 9. What is missing

Currently missing or not confirmed:

- final paper-first schema decision,
- client insert permission for daily check-ins,
- RLS policy for client-owned check-ins,
- client-safe view for protocol assignments/check-ins,
- trainer review summary for check-ins,
- report aggregation logic,
- access revocation flow after cooperation ends,
- formal RODO/legal review,
- final decision whether check-ins live in `guidance_events` or dedicated table.

## 10. Technical risks

### Risk 1 — Duplicate data model

Adding new tables without checking `guidance_events` may create parallel systems.

Mitigation:

- perform schema gap analysis first.

### Risk 2 — RLS leakage

Client check-ins involve sensitive process data.

Mitigation:

- define client insert/select policies explicitly,
- use client-safe views,
- never expose trainer notes by accident.

### Risk 3 — Single-file blast radius

`studio-management-os-3.0.html` is large. Small changes can affect unrelated flows.

Mitigation:

- avoid broad refactors,
- isolate data helpers,
- use small patches,
- manually test main flows after each change.

### Risk 4 — localStorage/Supabase divergence

Existing fallback may behave differently from Supabase.

Mitigation:

- define the same minimal check-in shape in local state and Supabase adapter,
- avoid removing fallback.

### Risk 5 — Product drift

A check-in can easily become a habit tracker.

Mitigation:

- enforce 30-45 second limit,
- no streaks,
- no gamification,
- no notifications,
- no broad tracking.

### Risk 6 — Report overinterpretation

Energy/symptom scores are subjective signals, not medical conclusions.

Mitigation:

- reports show patterns,
- trainer writes interpretation,
- avoid automatic diagnostic language.

## 11. Manual tests for future implementation

Manual tests should include:

### Trainer flow

1. Trainer logs in.
2. Trainer opens active client.
3. Trainer assigns paper protocol.
4. Trainer sees assignment on client profile.
5. Trainer can pause/archive assignment.
6. Existing client/session/report flows still work.

### Client flow

1. Client opens portal.
2. Client sees only assigned client-safe protocol summary.
3. Client completes minimal check-in.
4. Client cannot see trainer notes.
5. Client cannot see another client's data.
6. Check-in takes less than 45 seconds.

### Data flow

1. Check-in is saved once per date/protocol/client.
2. Duplicate same-day check-in behavior is defined.
3. Supabase save works.
4. localStorage fallback still works.
5. Report summary can read the data later.

### Safety flow

1. Sensitive data does not appear in URL.
2. Sensitive data does not appear in console logs.
3. No push notifications exist.
4. No gamification exists.
5. No AI coach exists.

## 12. Acceptance criteria for first implementation stage

A first paper-first implementation is acceptable only when:

- no public site layout is changed,
- auth is unchanged,
- Supabase config is unchanged,
- localStorage fallback is preserved,
- client check-in is minimal,
- client cannot see trainer notes,
- no gamification is added,
- no push notifications are added,
- no wearable integration is added,
- no AI coach is added,
- reports can later use the signal,
- manual tests pass.

## 13. What NOT to implement now

Do not implement now:

- SQL migrations,
- new production tables,
- RLS changes,
- client-facing check-in UI,
- trainer assignment UI,
- report aggregation,
- AI analysis,
- push notifications,
- gamification,
- streaks,
- wearable integration,
- community features,
- supplement module,
- public marketing changes,
- auth changes,
- Supabase config changes,
- broad refactor.

## 14. Open questions

OPEN QUESTION 1:

Should paper-first protocols be a new table or a disciplined use of `home_plans` / `home_plan_items`?

OPEN QUESTION 2:

Should daily check-ins be stored in `guidance_events` using `kind = 'client_checkin'` and `payload`, or in a dedicated table?

OPEN QUESTION 3:

What is the exact RLS strategy for active client access and access revocation?

OPEN QUESTION 4:

Should report snapshots be separate immutable rows, or should `reports` remain the only report storage layer?

OPEN QUESTION 5:

What is the final retention policy after RODO/legal review?

## 15. Recommended next Codex prompt

Use this prompt as the next safe step:

```text
Work in repository trenermedycznywarszawa/studio-las-v15.

Do not change application code.
Do not create migrations.
Do not change auth.
Do not change Supabase config.
Do not remove localStorage fallback.
Do not add dependencies.
Do not change public site layout.

Task:
Create docs/SCHEMA_GAP_ANALYSIS_PAPER_FIRST.md.

Read:
- README.md
- docs/STUDIO_LAS_OS_BLUEPRINT.md
- docs/DATA_POLICY.md
- docs/PAPER_FIRST_PROTOCOLS.md
- docs/IMPLEMENTATION_PLAN_PAPER_FIRST.md
- studio-management-os-3.0.html
- supabase/migrations/001_initial_schema.sql
- supabase/migrations/002_rls_policies.sql
- supabase/migrations/003_client_safe_views.sql
- any later migrations if present

Analyze whether Paper-first process tracking should use:
- existing home_plans
- existing home_plan_items
- existing guidance_events
- existing reports
or whether new tables are truly needed.

Compare the proposed conceptual model:
- paper_protocols
- client_protocol_assignments
- daily_protocol_checkins
- protocol_report_snapshots

against the existing schema.

For each proposed table, decide:
- reuse existing table
- extend existing table later
- create new table later
- open question

Include:
1. Current schema summary
2. Overlap analysis
3. RLS implications
4. Client visibility implications
5. localStorage fallback implications
6. Recommended minimal database path
7. Migration risks
8. What not to implement yet
9. Exact next implementation prompt only if safe

Output only the markdown document.
No code changes.
No SQL execution.
```

## 16. Final implementation principle

The first version should be smaller than expected.

If the implementation feels exciting, it is probably too large.

The correct first version should feel almost boring:

- assign simple offline protocol,
- record minimal signal,
- trainer reviews context,
- report shows pattern.
