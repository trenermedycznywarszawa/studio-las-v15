# Paper-first Execution Checklist

This checklist is the go/no-go control document for executing the Paper-first `client_checkin` migration.

Target migrations:

- `supabase/migrations/011_paper_first_client_checkins.sql` for index/RLS support,
- `supabase/migrations/013_enforce_immutable_client_checkin_rpc.sql` for the insert-only RPC contract.

Deprecated no-op file:

- `supabase/migrations/005_paper_first_client_checkins.sql`

Do not execute anything from this checklist directly in production. First execution must happen only on a fresh/test Supabase database.

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

## 2. V1 rule

For V1, client-created check-ins are immutable from the client side.

Clients may:

- insert their own `client_checkin`,
- select their own `client_checkin`.

Clients may not:

- update `client_checkin`,
- move check-ins to another item,
- change check-in dates,
- edit historical signal rows.

Corrections remain trainer-owned for V1.

## 3. Pre-execution checklist

### Repository state

- [ ] Confirm latest `main` is pulled locally.
- [ ] Confirm `supabase/migrations/011_paper_first_client_checkins.sql` exists.
- [ ] Confirm `supabase/migrations/012_save_client_checkin_rpc.sql` exists as the historical RPC migration.
- [ ] Confirm `supabase/migrations/013_enforce_immutable_client_checkin_rpc.sql` exists as the final V1 immutable RPC migration.
- [ ] Confirm `supabase/migrations/005_paper_first_client_checkins.sql` is deprecated/no-op only.
- [ ] Confirm no second executable Paper-first migration has a conflicting number.
- [ ] Confirm no unrelated public layout/auth/config/localStorage changes are bundled.

### Migration sequence

- [ ] Confirm prior migrations exist:
  - `001_initial_schema.sql`
  - `002_rls_policies.sql`
  - `003_client_safe_views.sql`
  - `004_body_measurements_kg_constraints.sql`
  - `005_clients_trainer_write_rls.sql`
  - `006_clients_insert_rls_helper.sql` if present
  - `007_clients_insert_rls_claim_helper.sql` if present
  - `008_clients_insert_rls_policy_minimal.sql` if present
  - `009_clients_select_rls_owner_helper.sql` if present
  - `010_clients_update_rls_owner_helper.sql` if present
  - `011_paper_first_client_checkins.sql`
  - `012_save_client_checkin_rpc.sql`
  - `013_enforce_immutable_client_checkin_rpc.sql`
- [ ] Confirm migrations `006` through `010`, if present, do not conflict with `guidance_events`.
- [ ] Confirm `011` is the Paper-first index/RLS migration and `013` replaces the `012` RPC upsert behavior with insert-only semantics.

### Existing schema confirmation — test DB only

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.guidance_events'::regclass;
```

Go only if:

- [ ] `guidance_events` exists.
- [ ] `kind = 'client_checkin'` is already allowed.
- [ ] `home_plan_item_id` exists.
- [ ] `payload` exists.
- [ ] `created_by` exists.
- [ ] `deleted_at` exists.

### Existing RLS confirmation — test DB only

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
order by policyname;
```

Go only if:

- [ ] Existing trainer policies are scoped by `trainer_can_access_client(client_id)`.
- [ ] Existing client policies are scoped to `kind = 'daily_step'`.
- [ ] Existing client policies do not expose `trainer_marker`.
- [ ] Existing `daily_step` policies remain separate from `client_checkin`.

### Duplicate audit before index — test DB only

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

If duplicates exist: stop and do not apply `011`.

### Access helper confirmation — test DB only

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

Go only if all helper functions exist.

## 4. Execution checklist — test DB only

- [ ] Confirm project is test DB, not production.
- [ ] Apply required previous migrations in order.
- [ ] Do not apply deprecated `005_paper_first_client_checkins.sql`.
- [ ] Run duplicate audit.
- [ ] Apply `011_paper_first_client_checkins.sql`.
- [ ] Apply `012_save_client_checkin_rpc.sql`.
- [ ] Apply `013_enforce_immutable_client_checkin_rpc.sql`.
- [ ] Record execution timestamp and project ref.

Stop immediately if:

- migration fails,
- duplicate index creation fails,
- policy creation fails,
- helper function is missing,
- existing `daily_step` flow fails after migration.

## 5. Post-execution verification

### Index exists

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
- [ ] Index includes `deleted_at is null`.

### Expected policies

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
  and policyname like 'guidance_events_client_checkin%'
order by policyname;
```

Pass only if:

- [ ] `guidance_events_client_checkin_select` exists.
- [ ] `guidance_events_client_checkin_insert` exists.
- [ ] `guidance_events_client_checkin_update` does **not** exist.

### Expected RPC

```sql
select p.proname, pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'save_client_checkin';
```

Pass only if:

- [ ] Function is `SECURITY DEFINER` with explicit safe `search_path`.
- [ ] Function has no `ON CONFLICT DO UPDATE`.
- [ ] Function has no `UPDATE public.guidance_events` path.
- [ ] Function raises `client_checkin_already_exists` for duplicate same client/item/date.
- [ ] Execute is granted to `authenticated`, not public/anon.

### Existing daily_step behavior remains unchanged

- [ ] Existing `daily_step` select/insert/update policies still exist.
- [ ] Existing `client_guidance_status` still works.
- [ ] Existing client portal still loads.
- [ ] Existing trainer dashboard still loads.

## 6. RLS tests

### Trainer tests

- [ ] Trainer A can read own client `client_checkin` rows.
- [ ] Trainer A can insert/update own client `client_checkin` rows through existing trainer policies if needed.
- [ ] Trainer A cannot read/write Trainer B client rows.
- [ ] Soft-deleted rows are hidden from normal trainer read flows.

### Client tests

- [ ] Client can insert own `client_checkin` for active published home plan item.
- [ ] Client can select own `client_checkin` rows only.
- [ ] Client cannot insert for another client.
- [ ] Client cannot insert for draft/unpublished home plan.
- [ ] Client cannot insert for draft/unpublished home plan item.
- [ ] Client cannot insert with null `home_plan_item_id`.
- [ ] Client cannot spoof `created_by`.
- [ ] Client cannot select `trainer_marker` rows.
- [ ] Client cannot update own `client_checkin`.
- [ ] Revoked/inactive client cannot select or insert `client_checkin`.

### Duplicate behavior

- [ ] First same-day `client_checkin` for same client/item/date succeeds.
- [ ] Second same-day `client_checkin` for same client/item/date is rejected.
- [ ] Same item different date succeeds.
- [ ] Same date different item succeeds if product rules allow item-specific check-ins.

## 7. Payload safety

Migration `013` enforces the RPC payload shape for `save_client_checkin`. Direct REST inserts, if tested through the `011` policy, still need manual review against the same minimal policy.

Manual review:

- [ ] Payload uses `schema = 'paper_first_checkin_v1'`.
- [ ] Payload contains only `schema`, `protocol_done`, `energy_score`, `symptom_score`, `optional_note`.
- [ ] DB/RPC contract supports energy/symptom/note; current UI may initially send null for fields not yet exposed.
- [ ] No trainer notes are stored in client-created payload.
- [ ] No medical diagnosis language.
- [ ] No long daily questionnaire.
- [ ] No wearable metrics.
- [ ] No streak/gamification field.

## 8. Rollback plan — test DB only

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

## 9. GO / NO-GO

GO only if:

- [ ] Test DB migration succeeds.
- [ ] Duplicate audit is clean.
- [ ] Index exists.
- [ ] Only select/insert client_checkin client policies exist.
- [ ] Client update policy for `client_checkin` is absent.
- [ ] Client cannot access other clients' data.
- [ ] Client cannot access trainer markers.
- [ ] Revoked/inactive client cannot select or insert.
- [ ] Existing `daily_step` still works.
- [ ] Existing client portal still works.
- [ ] Existing trainer dashboard still works.
- [ ] No production data was touched.

NO-GO if:

- [ ] Any test was run against production by mistake.
- [ ] Duplicate check-ins exist and are unresolved.
- [ ] `client_checkin` kind is missing.
- [ ] Helper functions are missing.
- [ ] Client can update `client_checkin`.
- [ ] Client can access another client's data.
- [ ] Client can access trainer markers.
- [ ] Existing `daily_step` breaks.
- [ ] Scope expands into UI, gamification, AI, or notifications.

## 10. After test DB success

If and only if the test DB passes:

1. Write a short test result report.
2. Keep production unchanged.
3. Decide separately whether to apply migration to the real project.
4. Only after database/RLS is stable, plan the minimal data adapter.
5. Only after adapter, plan client UI.
