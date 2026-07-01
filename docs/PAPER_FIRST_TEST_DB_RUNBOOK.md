# Paper-first Test DB Runbook

This runbook describes how to test the Paper-first `client_checkin` migration on a fresh/test Supabase database.

Target migration:

- `supabase/migrations/011_paper_first_client_checkins.sql`

Control checklist:

- `docs/PAPER_FIRST_EXECUTION_CHECKLIST.md`

Do not use this runbook to execute SQL in production. First run must happen only on a fresh/test Supabase project.

## 1. Purpose

Prove that the Paper-first database/RLS layer is safe before any UI work or production execution.

The test must confirm:

- migration applies cleanly,
- existing `daily_step` behavior still works,
- clients can create only their own `client_checkin` rows,
- clients can select only their own `client_checkin` rows,
- clients cannot update `client_checkin` rows in V1,
- clients cannot see trainer/private rows,
- trainers remain scoped to their own clients,
- duplicate same-day check-ins are blocked,
- revoked/inactive clients cannot select or insert check-ins,
- rollback is clear.

## 2. V1 immutability rule

For V1:

- client insert is allowed,
- client select is allowed,
- client update is not allowed.

Corrections remain trainer-owned.

This avoids the risk of clients moving check-ins to another `home_plan_item_id`, changing the date, or editing history after creation.

## 3. Non-goals

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

## 4. Required files

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

Confirm this deprecated file is no-op only and do not apply it:

```text
supabase/migrations/005_paper_first_client_checkins.sql
```

## 5. Test DB prerequisites

Use a fresh/test Supabase project.

Required:

- Supabase project dedicated to testing,
- no production client data,
- SQL Editor access,
- ability to create Auth users,
- ability to run migrations manually in order,
- ability to inspect RLS policies and table grants.

Recommended test users:

- Trainer A,
- Trainer B,
- Client A assigned to Trainer A,
- Client B assigned to Trainer B,
- revoked/inactive Client C for access-revocation tests.

Recommended test data:

- Active published home plan for Client A,
- active published home plan item for Client A,
- draft/unpublished home plan item for Client A,
- active published home plan for Client B,
- active published home plan item for Client B.

## 6. Migration order

Apply manually in order on the test database:

```text
001_initial_schema.sql
002_rls_policies.sql
003_client_safe_views.sql
004_body_measurements_kg_constraints.sql
005_clients_trainer_write_rls.sql
006_clients_insert_rls_helper.sql       if present
007_clients_insert_rls_claim_helper.sql if present
008_clients_insert_rls_policy_minimal.sql if present
009_clients_select_rls_owner_helper.sql if present
010_clients_update_rls_owner_helper.sql if present
011_paper_first_client_checkins.sql
```

Do not apply deprecated no-op migration content from:

```text
005_paper_first_client_checkins.sql
```

Do not use automated full-folder migration execution until duplicate `005` prefix behavior is resolved.

## 7. Preflight SQL checks

Run before applying `011`.

### 7.1 Confirm `guidance_events` constraints

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.guidance_events'::regclass
order by conname;
```

Expected:

- `guidance_events` exists,
- `kind` accepts `client_checkin`,
- foreign key relationship with `home_plan_items` exists.

### 7.2 Confirm helper functions

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

- `client_can_access_client`,
- `current_profile_id`,
- `is_client`,
- `is_trainer`,
- `trainer_can_access_client`.

### 7.3 Confirm existing guidance policies

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
order by policyname;
```

Expected:

- trainer policies exist and are scoped by `trainer_can_access_client(client_id)`,
- existing client policies are scoped to `kind = 'daily_step'`,
- no policy exposes `trainer_marker` to clients.

### 7.4 Duplicate audit

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

If rows are returned, stop and do not apply `011`.

## 8. Apply migration on test DB only

Manual SQL Editor process:

1. Open the test Supabase project.
2. Open SQL Editor.
3. Paste the full contents of `011_paper_first_client_checkins.sql`.
4. Confirm the project is test DB, not production.
5. Run the SQL.
6. Save the execution result.
7. Record timestamp and project ref.

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
- predicate includes `deleted_at is null`.

### 9.2 Confirm client_checkin policies

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
  and policyname like 'guidance_events_client_checkin%'
order by policyname;
```

Expected:

- `guidance_events_client_checkin_insert`,
- `guidance_events_client_checkin_select`,
- no `guidance_events_client_checkin_update`.

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

- `authenticated` has required table privileges from existing migrations,
- no direct `anon` access is required.

## 10. RLS test scenarios

Run using authenticated context/tooling that respects RLS.

### Trainer A positive tests

- [ ] Trainer A can select Client A `client_checkin` rows.
- [ ] Trainer A can insert Client A `client_checkin` row if needed.
- [ ] Trainer A can update Client A `client_checkin` row if needed through existing trainer policies.

### Trainer A negative tests

- [ ] Trainer A cannot select Client B `client_checkin` rows.
- [ ] Trainer A cannot insert Client B `client_checkin` row.
- [ ] Trainer A cannot update Client B `client_checkin` row.

### Client A positive tests

- [ ] Client A can insert `client_checkin` for own active, published home plan item.
- [ ] Client A can select own `client_checkin` created by own profile.

### Client A negative tests

- [ ] Client A cannot update own `client_checkin`.
- [ ] Client A cannot insert `client_checkin` for Client B.
- [ ] Client A cannot insert with `home_plan_item_id = null`.
- [ ] Client A cannot insert for draft/unpublished home plan item.
- [ ] Client A cannot insert for archived/deleted home plan item.
- [ ] Client A cannot spoof `created_by`.
- [ ] Client A cannot select `trainer_marker` rows.

### Revoked/inactive client tests

- [ ] Revoked/inactive Client C cannot insert `client_checkin`.
- [ ] Revoked/inactive Client C cannot select previous `client_checkin` rows.

## 11. Duplicate behavior test

1. Insert first `client_checkin` for same client/item/date.
2. Insert second `client_checkin` for same client/item/date.

Expected:

- first insert succeeds,
- second insert fails because of `guidance_events_client_checkin_unique_idx`.

Also test:

- same item different date succeeds,
- same date different item succeeds if product rules allow multiple item-specific check-ins.

## 12. Payload checks

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

The migration does not enforce payload schema at SQL level. App-level validation is required before UI release.

## 13. Existing behavior regression tests

After migration, confirm:

- [ ] Existing `daily_step` insert/select/update still works.
- [ ] `client_guidance_status` still works.
- [ ] `client_active_home_plan` still works.
- [ ] `client_visible_reports` still works.
- [ ] Trainer dashboard still loads.
- [ ] Client portal still loads.
- [ ] No app code was changed for this DB test.

## 14. Rollback steps

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

## 15. Go/no-go report template

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
- duplicate audit:

## Migration execution
- success/failure:
- errors/warnings:

## Post-migration verification
- index exists:
- select/insert policies exist:
- update policy absent:
- grants verified:

## Trainer RLS tests
- passed:
- failed:

## Client RLS tests
- passed:
- failed:

## Revoked/inactive client tests
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

## 16. GO criteria

Proceed only if:

- migration succeeds on test DB,
- duplicate audit is clean,
- index exists,
- select/insert client_checkin policies exist,
- client update policy for `client_checkin` is absent,
- client cannot access another client's data,
- client cannot access trainer markers,
- revoked/inactive client cannot select or insert,
- daily_step still works,
- client portal still works,
- trainer dashboard still works,
- no production data was touched.

## 17. Next phase after GO

Only after a clean test DB GO:

1. Decide whether to apply the migration to the real Supabase project.
2. Prepare a separate production execution checklist.
3. After DB/RLS is stable, implement minimal data adapter.
4. After adapter, implement minimal client check-in UI.
5. Trainer review and report integration come later.
