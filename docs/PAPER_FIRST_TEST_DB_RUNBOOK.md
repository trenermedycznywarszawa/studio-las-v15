# Paper-first Test DB Runbook

This runbook describes how to test the Paper-first `client_checkin` migration on a fresh/test Supabase database.

Target migration:

- `supabase/migrations/011_paper_first_client_checkins.sql`

Control checklist:

- `docs/PAPER_FIRST_EXECUTION_CHECKLIST.md`

Do not use this runbook to execute SQL in production.

The first run must happen only on a fresh/test Supabase project.

## 1. Purpose

The goal is to prove that the Paper-first database/RLS layer is safe before any UI work or production execution.

This test should confirm:

- the migration applies cleanly,
- existing `daily_step` behavior still works,
- clients can create only their own `client_checkin` rows,
- clients cannot see trainer/private rows,
- trainers remain scoped to their own clients,
- duplicate same-day check-ins are blocked,
- rollback is clear.

## 2. Non-goals

This runbook does not approve:

- production migration execution,
- application UI changes,
- auth changes,
- Supabase config changes,
- localStorage fallback removal,
- public layout changes,
- AI coach,
- push notifications,
- gamification,
- wearable integrations.

## 3. Required files

Before testing, confirm these files exist locally:

```text
README.md
docs/STUDIO_LAS_OS_BLUEPRINT.md
docs/DATA_POLICY.md
docs/PAPER_FIRST_PROTOCOLS.md
docs/IMPLEMENTATION_PLAN_PAPER_FIRST.md
docs/SCHEMA_GAP_ANALYSIS_PAPER_FIRST.md
docs/STUDIO_LAS_OS_DOMAIN_MODEL.md
docs/PAPER_FIRST_MIGRATION_PROPOSAL.md
docs/PAPER_FIRST_EXECUTION_CHECKLIST.md
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_client_safe_views.sql
supabase/migrations/004_body_measurements_kg_constraints.sql
supabase/migrations/005_clients_trainer_write_rls.sql
supabase/migrations/011_paper_first_client_checkins.sql
```

Also confirm this deprecated file is a no-op only:

```text
supabase/migrations/005_paper_first_client_checkins.sql
```

## 4. Test DB prerequisites

Use a fresh/test Supabase project.

Required:

- Supabase project dedicated to testing.
- No production client data.
- SQL Editor access.
- Ability to create Auth users.
- Ability to run migrations manually in order.
- Ability to inspect RLS policies and table grants.

Recommended test users:

- Trainer A
- Trainer B
- Client A assigned to Trainer A
- Client B assigned to Trainer B

Recommended test clients:

- Client A profile/client record
- Client B profile/client record
- Active published home plan for Client A
- Active published home plan item for Client A
- Draft/unpublished home plan item for negative tests

## 5. Migration order

On the fresh/test database, apply migrations in order.

Minimum required order:

```text
001_initial_schema.sql
002_rls_policies.sql
003_client_safe_views.sql
004_body_measurements_kg_constraints.sql
005_clients_trainer_write_rls.sql
011_paper_first_client_checkins.sql
```

If migrations `006` through `010` exist in the local checkout, review and apply them in lexical order before `011` unless they are explicitly unrelated and intentionally excluded.

Do not apply deprecated no-op migration content from:

```text
005_paper_first_client_checkins.sql
```

## 6. Preflight SQL checks

Run these checks before applying `011_paper_first_client_checkins.sql`.

### 6.1 Confirm guidance_events constraints

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.guidance_events'::regclass
order by conname;
```

Expected:

- `guidance_events` exists.
- `kind` accepts `client_checkin`.
- Foreign key relationship with `home_plan_items` exists.

### 6.2 Confirm helper functions

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

Expected all functions:

- `client_can_access_client`
- `current_profile_id`
- `is_client`
- `is_trainer`
- `trainer_can_access_client`

### 6.3 Confirm existing guidance_events policies

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
order by policyname;
```

Expected:

- Trainer policies exist and are scoped by `trainer_can_access_client(client_id)`.
- Existing client policies are scoped to `kind = 'daily_step'`.
- No policy exposes `trainer_marker` to clients.

### 6.4 Confirm client-safe views

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

Expected:

- All listed views exist.
- No raw `client_checkin` view is required yet.

## 7. Duplicate audit

Run before applying `011`:

```sql
select client_id, home_plan_item_id, kind, event_date, count(*)
from public.guidance_events
where kind = 'client_checkin'
  and deleted_at is null
group by client_id, home_plan_item_id, kind, event_date
having count(*) > 1;
```

Expected:

- zero rows.

If rows are returned:

- stop,
- do not apply `011`,
- document duplicates,
- decide separate test cleanup strategy.

## 8. Apply migration on test DB only

Apply only this file after preflight passes:

```text
supabase/migrations/011_paper_first_client_checkins.sql
```

Manual SQL Editor process:

1. Open the test Supabase project.
2. Open SQL Editor.
3. Paste the full contents of `011_paper_first_client_checkins.sql`.
4. Confirm the project is test DB, not production.
5. Run the SQL.
6. Save the execution result.
7. Record the timestamp and project ref in the test report.

Stop if any SQL error appears.

## 9. Post-migration verification SQL

### 9.1 Confirm unique index exists

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'guidance_events'
  and indexname = 'guidance_events_client_checkin_unique_idx';
```

Expected:

- one row,
- partial index for `kind = 'client_checkin'`,
- condition includes `deleted_at is null`.

### 9.2 Confirm new policies exist

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

Expected:

- `guidance_events_client_checkin_insert`
- `guidance_events_client_checkin_select`
- `guidance_events_client_checkin_update`

### 9.3 Confirm daily_step policies still exist

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
  and policyname in (
    'guidance_events_client_select',
    'guidance_events_client_insert',
    'guidance_events_client_update'
  )
order by policyname;
```

Expected:

- existing `daily_step` client policies still exist.

### 9.4 Confirm grants

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'guidance_events'
order by grantee, privilege_type;
```

Expected:

- authenticated has required table privileges from existing migrations.
- anon/public are not granted direct access.

## 10. Minimal test data setup

Create or confirm test data:

- Trainer A profile.
- Trainer B profile.
- Client A profile and client record linked to Trainer A.
- Client B profile and client record linked to Trainer B.
- Active published home plan for Client A.
- Active published home plan item for Client A.
- Draft or unpublished home plan item for Client A.

Do not use real client data.

## 11. Trainer RLS test scenarios

Run using authenticated context/tooling that respects RLS.

### Trainer A positive tests

- [ ] Trainer A can select Client A `client_checkin` rows.
- [ ] Trainer A can insert Client A `client_checkin` row if needed.
- [ ] Trainer A can update Client A `client_checkin` row if needed.

### Trainer A negative tests

- [ ] Trainer A cannot select Client B `client_checkin` rows.
- [ ] Trainer A cannot insert Client B `client_checkin` row.
- [ ] Trainer A cannot update Client B `client_checkin` row.

### Existing trainer flow tests

- [ ] Trainer A can still read Client A home plan.
- [ ] Trainer A can still read Client A reports.
- [ ] Trainer dashboard data loading is not broken.

## 12. Client RLS test scenarios

Run using Client A authenticated context.

### Client A positive tests

- [ ] Client A can insert `client_checkin` for own active, published home plan item.
- [ ] Client A can select own `client_checkin` created by own profile.
- [ ] Client A can update own `client_checkin` if update is intentionally allowed.

### Client A negative tests

- [ ] Client A cannot insert `client_checkin` for Client B.
- [ ] Client A cannot insert with `home_plan_item_id = null`.
- [ ] Client A cannot insert for draft/unpublished home plan item.
- [ ] Client A cannot insert for archived/deleted home plan item.
- [ ] Client A cannot spoof `created_by`.
- [ ] Client A cannot select `trainer_marker` rows.
- [ ] Client A cannot update a row into another `client_id`.
- [ ] Client A cannot update a row into another `home_plan_item_id`.
- [ ] Client A cannot update a row into another `kind`.

## 13. Duplicate behavior test

Using Client A or Trainer A context:

1. Insert first `client_checkin` for same client/item/date.
2. Insert second `client_checkin` for same client/item/date.

Expected:

- first insert succeeds,
- second insert fails because of `guidance_events_client_checkin_unique_idx`.

Also test:

- same item different date succeeds,
- same date different item succeeds if product rules allow multiple item-specific check-ins.

## 14. Payload checks

Expected payload:

```json
{
  "schema": "paper_first_checkin_v1",
  "energy_score": 7,
  "symptom_score": 3,
  "optional_note": "Short note"
}
```

Manual review:

- [ ] No trainer notes in payload.
- [ ] No medical diagnosis language.
- [ ] No long diary field.
- [ ] No wearable metrics.
- [ ] No streak/gamification field.

Important:

The migration does not yet enforce payload schema at SQL level. App-level validation is required before UI release.

## 15. Existing behavior regression tests

After migration, confirm:

- [ ] Existing `daily_step` insert/select/update still works.
- [ ] `client_guidance_status` still works.
- [ ] `client_active_home_plan` still works.
- [ ] `client_visible_reports` still works.
- [ ] Trainer dashboard still loads.
- [ ] Client portal still loads.
- [ ] No app code was changed for this DB test.

## 16. Rollback steps

If test fails, run on test DB only:

```sql
drop policy if exists guidance_events_client_checkin_select on public.guidance_events;
drop policy if exists guidance_events_client_checkin_insert on public.guidance_events;
drop policy if exists guidance_events_client_checkin_update on public.guidance_events;

drop index if exists public.guidance_events_client_checkin_unique_idx;
```

Then verify:

- [ ] Existing `daily_step` still works.
- [ ] Existing trainer dashboard still loads.
- [ ] Existing client portal still loads.
- [ ] Failure is documented.
- [ ] No UI work starts until failure is resolved.

## 17. Go/no-go report template

After test execution, create a report with this structure:

```text
# Paper-first Test DB Run Report

Date:
Tester:
Test Supabase project ref:
Migration tested:
Commit SHA:

## Summary
GO / NO-GO:

## Preflight results
- guidance_events constraint:
- helper functions:
- existing RLS:
- client-safe views:
- duplicate audit:

## Migration execution
- success/failure:
- errors/warnings:

## Post-migration verification
- index exists:
- policies exist:
- grants verified:

## Trainer RLS tests
- passed:
- failed:

## Client RLS tests
- passed:
- failed:

## Regression tests
- daily_step:
- client portal:
- trainer dashboard:

## Rollback
- needed: yes/no
- performed: yes/no

## Risks / open questions

## Recommended next step
```

## 18. GO criteria

Proceed to the next phase only if:

- migration succeeds on test DB,
- duplicate audit is clean,
- index exists,
- new policies exist,
- client cannot access another client's data,
- client cannot access trainer markers,
- trainer cannot access another trainer's clients,
- daily_step still works,
- client portal still works,
- trainer dashboard still works,
- no production data was touched.

## 19. NO-GO criteria

Stop if:

- any test was run on production by mistake,
- duplicate audit returns rows,
- migration fails,
- helper functions are missing,
- client_checkin kind is missing,
- client can access another client's data,
- client can access trainer_marker rows,
- existing daily_step breaks,
- app behavior breaks,
- scope expands beyond DB/RLS test.

## 20. Next phase after GO

Only after a clean test DB GO:

1. Decide whether to apply the migration to the real Supabase project.
2. If approved, prepare a separate production execution checklist.
3. After DB/RLS is stable, implement minimal data adapter.
4. After adapter, implement minimal client check-in UI.
5. After client UI, implement trainer review view.
6. Report integration comes last.
