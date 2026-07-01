# Paper-first Execution Checklist

This checklist is the go/no-go control document for executing the Paper-first client_checkin migration.

Target migration:

- `supabase/migrations/011_paper_first_client_checkins.sql`

Deprecated no-op file:

- `supabase/migrations/005_paper_first_client_checkins.sql`

Do not execute anything from this checklist directly in production.

The first execution must happen only on a fresh/test Supabase database.

## 1. Scope

This checklist covers only Paper-first daily check-in database/RLS support.

It does not approve:

- application UI,
- production execution,
- auth changes,
- Supabase config changes,
- public layout changes,
- localStorage fallback removal,
- AI coach,
- push notifications,
- gamification,
- wearable integration.

## 2. Core product rule

Before execution, confirm that the migration still supports the Studio Las OS principle:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

If the migration begins to create a standalone tracking product, stop.

## 3. Pre-execution go/no-go checklist

### 3.1 Repository state

- [ ] Confirm current branch is intended branch.
- [ ] Confirm latest `main` is pulled locally.
- [ ] Confirm `supabase/migrations/011_paper_first_client_checkins.sql` exists.
- [ ] Confirm `supabase/migrations/005_paper_first_client_checkins.sql` is a deprecated no-op file only.
- [ ] Confirm there is no second executable Paper-first migration with a conflicting number.
- [ ] Confirm no application code changes are bundled into the migration execution task.
- [ ] Confirm no public site changes are bundled into the migration execution task.

### 3.2 Migration sequence

- [ ] Confirm previous migrations exist and are known:
  - `001_initial_schema.sql`
  - `002_rls_policies.sql`
  - `003_client_safe_views.sql`
  - `004_body_measurements_kg_constraints.sql`
  - `005_clients_trainer_write_rls.sql`
- [ ] Confirm any migrations between `006` and `010`, if present, do not conflict with `guidance_events`.
- [ ] Confirm `011_paper_first_client_checkins.sql` is the intended next Paper-first migration.

### 3.3 Existing schema confirmation

Run on test DB only:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.guidance_events'::regclass;
```

Go only if:

- [ ] `guidance_events` exists.
- [ ] `kind = 'client_checkin'` is already allowed.
- [ ] `home_plan_item_id` exists.
- [ ] `payload` exists and is json/jsonb-compatible.
- [ ] `created_by` exists.
- [ ] `deleted_at` exists.

### 3.4 Existing RLS confirmation

Run on test DB only:

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
order by policyname;
```

Go only if:

- [ ] Existing trainer policies are scoped by `trainer_can_access_client(client_id)`.
- [ ] Existing client policies are currently scoped to `kind = 'daily_step'`.
- [ ] Existing client policies do not already expose `trainer_marker`.
- [ ] New `client_checkin` policies do not replace or weaken `daily_step` policies.

### 3.5 Duplicate audit before index

Run on test DB only before applying the migration:

```sql
select client_id, home_plan_item_id, kind, event_date, count(*)
from public.guidance_events
where kind = 'client_checkin'
  and deleted_at is null
group by client_id, home_plan_item_id, kind, event_date
having count(*) > 1;
```

Go only if:

- [ ] Query returns zero rows.

If duplicates exist:

- [ ] Stop.
- [ ] Do not apply the migration.
- [ ] Decide whether to delete, merge, soft-delete, or archive duplicates in a separate test-only cleanup plan.

### 3.6 Access helper confirmation

Run on test DB only:

```sql
select proname
from pg_proc
join pg_namespace n on n.oid = pg_proc.pronamespace
where n.nspname = 'public'
  and proname in (
    'is_trainer',
    'is_client',
    'current_profile_id',
    'trainer_can_access_client',
    'client_can_access_client'
  )
order by proname;
```

Go only if all helper functions exist:

- [ ] `is_trainer`
- [ ] `is_client`
- [ ] `current_profile_id`
- [ ] `trainer_can_access_client`
- [ ] `client_can_access_client`

### 3.7 Client-safe view confirmation

Run on test DB only:

```sql
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'client_portal_summary',
    'client_active_home_plan',
    'client_visible_reports',
    'client_visible_measurements',
    'client_guidance_status'
  )
order by table_name;
```

Go only if:

- [ ] Existing client-safe views still exist.
- [ ] No new raw check-in payload view is being added in this migration.
- [ ] `client_guidance_status` remains tied to `daily_step` until a separate UI/view decision is approved.

## 4. Execution checklist — test DB only

Execute only on a test Supabase database.

- [ ] Confirm test DB project name/reference.
- [ ] Confirm this is not production.
- [ ] Backup/export test DB if needed.
- [ ] Apply all required previous migrations in order.
- [ ] Apply `011_paper_first_client_checkins.sql`.
- [ ] Record execution timestamp.
- [ ] Record any warnings/errors.

Stop immediately if:

- migration fails,
- duplicate index creation fails,
- policy creation fails,
- helper function is missing,
- existing `daily_step` flow fails after migration.

## 5. Post-execution verification

### 5.1 Index exists

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'guidance_events'
  and indexname = 'guidance_events_client_checkin_unique_idx';
```

Pass only if:

- [ ] Index exists.
- [ ] Index is partial for `kind = 'client_checkin'`.
- [ ] Index excludes `deleted_at is not null` rows.

### 5.2 Policies exist

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
  and policyname in (
    'guidance_events_client_checkin_select',
    'guidance_events_client_checkin_insert',
    'guidance_events_client_checkin_update'
  )
order by policyname;
```

Pass only if all exist:

- [ ] `guidance_events_client_checkin_select`
- [ ] `guidance_events_client_checkin_insert`
- [ ] `guidance_events_client_checkin_update`

### 5.3 Existing daily_step behavior remains unchanged

Manual test:

- [ ] Existing client daily guidance status still loads.
- [ ] Existing `daily_step` insert still works for active published home plan item.
- [ ] Existing `daily_step` update still works if previously supported.
- [ ] Existing `client_guidance_status` still returns expected data.

### 5.4 Trainer behavior

Manual RLS test with trainer users:

- [ ] Trainer A can read own client `client_checkin` rows.
- [ ] Trainer A can insert own client `client_checkin` rows if needed.
- [ ] Trainer A can update own client `client_checkin` rows if needed.
- [ ] Trainer A cannot read Trainer B client rows.
- [ ] Trainer A cannot write Trainer B client rows.
- [ ] Soft-deleted rows are hidden from normal trainer read flows.

### 5.5 Client behavior

Manual RLS test with client users:

- [ ] Client can insert own `client_checkin` for active published home plan item.
- [ ] Client cannot insert `client_checkin` for another client.
- [ ] Client cannot insert `client_checkin` for draft/unpublished home plan.
- [ ] Client cannot insert `client_checkin` for draft/unpublished home plan item.
- [ ] Client cannot insert `client_checkin` with null `home_plan_item_id`.
- [ ] Client cannot spoof `created_by`.
- [ ] Client can select own `client_checkin` rows only.
- [ ] Client cannot select `trainer_marker` rows.
- [ ] Client cannot update another client's `client_checkin`.
- [ ] Client cannot move check-in to another `client_id`, `home_plan_item_id`, or `kind` through update.

### 5.6 Duplicate behavior

Manual test:

- [ ] First same-day `client_checkin` for client/item/date succeeds.
- [ ] Second same-day `client_checkin` for same client/item/date is rejected by unique index.
- [ ] Same day different item can be inserted if product rules allow it.
- [ ] Same item different date can be inserted.
- [ ] Soft-deleted duplicate behavior is understood and acceptable.

### 5.7 Payload safety

Until app validation exists, payload safety is not fully enforced by SQL.

Manual review:

- [ ] No trainer notes are stored in client-created payload.
- [ ] Payload uses `schema = 'paper_first_checkin_v1'`.
- [ ] Payload contains only expected fields:
  - `schema`
  - `energy_score`
  - `symptom_score`
  - `optional_note`
- [ ] Scores are treated as subjective signals, not diagnosis.
- [ ] No long daily questionnaire is introduced.

## 6. Rollback plan — test DB only

If test fails, rollback the Paper-first migration changes.

```sql
drop policy if exists guidance_events_client_checkin_select on public.guidance_events;
drop policy if exists guidance_events_client_checkin_insert on public.guidance_events;
drop policy if exists guidance_events_client_checkin_update on public.guidance_events;

drop index if exists public.guidance_events_client_checkin_unique_idx;
```

After rollback:

- [ ] Confirm `daily_step` still works.
- [ ] Confirm trainer dashboard still reads guidance events.
- [ ] Confirm client portal still loads.
- [ ] Record failure reason.
- [ ] Do not proceed to UI work.

## 7. Go / no-go decision

### GO only if

- [ ] Test DB migration succeeds.
- [ ] Duplicate audit is clean.
- [ ] Index exists.
- [ ] Policies exist.
- [ ] Client cannot access other clients' data.
- [ ] Client cannot access trainer markers.
- [ ] Trainer access remains scoped.
- [ ] Existing `daily_step` still works.
- [ ] Existing client portal still works.
- [ ] Existing trainer dashboard still works.
- [ ] No production data was touched.

### NO-GO if

- [ ] Migration number conflict exists.
- [ ] Duplicate check-ins exist and are unresolved.
- [ ] `client_checkin` kind is missing.
- [ ] Helper functions are missing.
- [ ] Client can access another client's data.
- [ ] Client can access trainer markers.
- [ ] Existing `daily_step` breaks.
- [ ] Any test was run against production by mistake.
- [ ] Scope expands into UI, gamification, AI, or notifications.

## 8. After test DB success

If and only if the test DB passes:

1. Write a short test result report.
2. Keep production unchanged.
3. Decide separately whether to apply migration to the real project.
4. Only after database/RLS is stable, plan the minimal data adapter.
5. Only after adapter, plan client UI.

## 9. Recommended next prompt

```text
Work in repository trenermedycznywarszawa/studio-las-v15.

Do not change application code.
Do not execute SQL in production.
Do not change auth.
Do not change Supabase config.
Do not remove localStorage fallback.
Do not add dependencies.
Do not change public site layout.

Task:
Review docs/PAPER_FIRST_EXECUTION_CHECKLIST.md and supabase/migrations/011_paper_first_client_checkins.sql.

Create docs/PAPER_FIRST_TEST_DB_RUNBOOK.md.

The runbook should describe exactly how to test the migration on a fresh/test Supabase DB:
1. prerequisites,
2. order of migrations,
3. preflight SQL checks,
4. duplicate audit,
5. migration execution command/manual SQL editor steps,
6. post-migration verification SQL,
7. trainer RLS test scenarios,
8. client RLS test scenarios,
9. rollback steps,
10. go/no-go report template.

Do not apply SQL.
Do not change application code.
Output only the markdown runbook.
```
