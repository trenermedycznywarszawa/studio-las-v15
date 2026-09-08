# P1 — Client Goal + phase-aware information architecture — discovery

**Date:** 2026-09-08  
**Base:** `product-recovery` after PR #63  
**Scope:** discovery only; no runtime/schema/RLS/Auth changes.

## Decision summary

P1 can start without a schema migration.

The existing model already contains the core source-of-truth needed for the first implementation slice:

- **client goal:** `clients.goal`
- **process stage:** `clients.stage` (canonical stages 1–4)
- **current focus:** derived read-only from the current published Guidance, then latest intake `first_session_focus`, then `clients.goal` as fallback
- **decision need:** existing Decision & State Integrity logic
- **timeline sources:** existing workspace records and their source timestamps

The weak point is not missing data. It is **information hierarchy**. The trainer UI currently has a fixed section order and the PWD remains high in the page even after the client has moved into an active process.

## Findings

### 1. Client goal

`StudioLasRepository.listClients()` already selects `goal`; `getClientWorkspace()` loads the full client row. No duplicate goal field is required.

**Canonical source:** `clients.goal`.

Do not introduce a new `life_goal`, `north_star`, or similar field in P1.

### 2. Stage / phase

`clients.stage` is already part of the client record and maps through `CANONICAL_STAGES`:

1. Diagnostyka i punkt startowy
2. Plan i pierwsze decyzje
3. Prowadzona praca 1:1
4. Raport i decyzja co dalej

For P1, use this existing stage as the phase-aware UI input. Do not derive a second phase model from week numbers.

### 3. Current focus

`buildTrainerSessionBrief()` already uses a sensible provenance chain:

1. active published home plan `focus || title`
2. latest intake `first_session_focus`
3. `clients.goal` fallback

This should remain read-only. P1 should improve how this is presented, not create another persisted focus field.

### 4. Ability / barrier

No single canonical persisted source was found that can safely be labeled as **current ability** or **biggest barrier** across the whole process.

Potential source material exists in intake, observations, sessions and safety context, but choosing one automatically would cross from FACT aggregation into interpretation.

**Decision:** do not add Ability/Barrier cards in the first P1 slice unless a source is explicit and trainer-authored. Do not synthesize them from measurements or signals.

### 5. Current trainer hierarchy

Current fixed order in `renderTrainer()` is approximately:

1. client identity
2. Teraz
3. cycle decision when applicable
4. PWD
5. signals
6. session/review brief
7. sessions
8. measurements
9. movement observations
10. Guidance
11. reports

This is the main P1 UX problem. The order does not adapt strongly enough to stage.

### 6. Recommended stage-aware ordering

Keep the same sections. Change emphasis/order only.

**Stage 1 — PWD**
- identity + goal
- Teraz
- PWD
- safety/current context
- signals
- remaining history/measurements

**Stage 2 — first decisions / guidance**
- identity + goal
- Teraz
- current context / session brief
- Guidance
- signals
- PWD as history/context
- sessions / observations / measurements

**Stage 3 — active 1:1 process**
- identity + goal
- Teraz
- session brief
- signals
- latest session
- Guidance
- observations / measurements
- PWD lower as historical source
- reports lower

**Stage 4 — report / next decision**
- identity + goal
- Teraz
- cycle decision
- reports
- confirmed current context/signals
- latest session / Guidance
- older PWD and history lower

No separate applications and no hidden data. This is an attention hierarchy change.

### 7. Unified process view

A read-only timeline can be composed from existing records without event sourcing or a new table.

Candidate sources already loaded in `getClientWorkspace()`:

- client / start date
- intakes
- sessions / PWD sessions
- pre-session checks
- post-session observations
- body measurements
- training-load observations
- assessments
- home plans / Guidance
- guidance events / client check-in
- reports
- cycle decisions
- signal reviews

Each timeline item must preserve:

- source type
- source row id
- source date
- human label
- FACT vs trainer-authored interpretation/decision semantics

The timeline should be a **projection**, not a persisted event log.

### 8. Provenance limitation

`clients.goal` currently shares the generic client row `updated_at`; this does not prove when the goal itself changed. P1 can still show the current goal as a canonical client-record field, but should avoid claiming a precise goal-change timestamp.

This limitation does **not** justify a migration in the first slice.

## Risks

1. **Duplication risk:** creating new goal/focus/phase fields would create competing sources of truth.
2. **Interpretation leak:** automatically naming an “ability” or “barrier” from mixed facts could make the app interpret for the trainer.
3. **Timeline overreach:** a persisted timeline/event table would create unnecessary architecture before the read-only projection is proven insufficient.
4. **UI churn:** moving every section at once would make regression diagnosis harder. Prefer one small phase-ordering helper plus focused tests.

## Recommended implementation slice

P1-A should be intentionally small:

1. show `clients.goal` prominently with client identity, without duplicating storage;
2. introduce one pure stage-aware section-order helper;
3. move PWD lower for stages 2–4;
4. prioritize session context / Guidance / report according to the existing `clients.stage`;
5. add regression tests for stage ordering and goal source;
6. no schema migration;
7. no new durable domain entity;
8. no client-side behavior change.

Unified read-only timeline should be a subsequent P1-B slice after P1-A is validated in staging.

## Acceptance gate for P1-A

- one canonical goal source (`clients.goal`)
- no new schema or enum
- stage 1 keeps PWD prominent
- stages 2–3 no longer let PWD dominate the top of the trainer workspace
- stage 4 prioritizes report + decision context
- `Teraz` remains dominant near the top for all stages
- FACT / INTERPRETATION / DECISION separation unchanged
- mobile no-overflow regression test
- existing Auth/MFA/AAL2/RLS untouched

## Explicit non-goals

- no Change Evidence model
- no Decision Engine
- no scoring
- no CRM/task semantics
- no event sourcing
- no automatic ability/barrier inference
- no client portal redesign
- no migration unless a later, separately reviewed discovery proves it necessary
