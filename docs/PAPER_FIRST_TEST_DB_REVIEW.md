# Paper-first test DB review

## 1. Summary

Reviewed the refreshed `origin/main` state at `6f224f4`.

`supabase/migrations/011_paper_first_client_checkins.sql` is the correct executable Paper-first migration for test DB execution. It reuses `public.guidance_events`, adds a `client_checkin` partial unique index, and adds separate client `client_checkin` RLS policies without modifying the existing `daily_step` policies.

`supabase/migrations/005_paper_first_client_checkins.sql` is deprecated/no-op only. It contains comments and no executable SQL.

There is a migration numbering collision in the repository because both of these files exist:

- `supabase/migrations/005_clients_trainer_write_rls.sql`
- `supabase/migrations/005_paper_first_client_checkins.sql`

That is not an executable SQL conflict because the Paper-first `005` file is no-op, but it is still a migration-version risk for any automated runner that treats the prefix before the first underscore as the migration version. Manual test DB execution can proceed only if the deprecated `005_paper_first_client_checkins.sql` file is not applied.

No SQL was executed during this review. No application code, auth code, Supabase config, public layout, dependencies, or localStorage fallback were changed.

## 2. Files reviewed

Reviewed from refreshed `origin/main`:

- `docs/PAPER_FIRST_TEST_DB_RUNBOOK.md`
- `docs/PAPER_FIRST_EXECUTION_CHECKLIST.md`
- `docs/PAPER_FIRST_MIGRATION_PROPOSAL.md`
- `supabase/migrations/011_paper_first_client_checkins.sql`
- `supabase/migrations/005_paper_first_client_checkins.sql`
- `supabase/migrations/005_clients_trainer_write_rls.sql`
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/003_client_safe_views.sql`

Later migrations present:

- `supabase/migrations/004_body_measurements_kg_constraints.sql`
- `supabase/migrations/006_clients_insert_rls_helper.sql`
- `supabase/migrations/007_clients_insert_rls_claim_helper.sql`
- `supabase/migrations/008_clients_insert_rls_policy_minimal.sql`
- `supabase/migrations/009_clients_select_rls_owner_helper.sql`
- `supabase/migrations/010_clients_update_rls_owner_helper.sql`

Search result:

- Later migrations `006` through `010` do not modify `guidance_events`, `daily_step`, or `client_checkin`.

## 3. Findings by severity

### P0

No P0 blockers were found for a manual fresh/test DB execution of `011_paper_first_client_checkins.sql`.

This does not approve production execution.

### P1

#### P1-1: Duplicate `005` migration prefix is a runner risk

The repository contains two `005_*` migration files. The Paper-first `005` file is deprecated and no-op only, so it should not change database state if opened manually.

Risk:

- Supabase-style migration tooling may treat `005` as the migration version and reject or mishandle duplicate versions.
- The runbook/checklist correctly say not to apply the deprecated Paper-first `005`, but automated "apply whole folder" execution is not safe until this behavior is verified.

Recommendation:

- Use manual SQL Editor execution on a fresh/test DB for this test pass.
- Do not use an automated full-folder migration runner unless duplicate-version behavior has been tested and documented.

#### P1-2: Client update policy is broader than the checklist expectation

`011` creates `guidance_events_client_checkin_update`.

The policy is scoped to:

- authenticated clients only,
- own accessible `client_id`,
- `kind = 'client_checkin'`,
- `created_by = current_profile_id()`,
- non-deleted rows,
- non-null `home_plan_item_id`,
- active/published target home plan item and parent home plan.

This is good cross-client scoping, but it does not guarantee immutability of the original row.

The current policy appears to allow a client to update their own check-in to:

- another active/published `home_plan_item_id` for the same client,
- another `event_date`,
- different `completed` value,
- different `payload`.

This conflicts with the runbook/checklist expectation that a client cannot move a check-in to another `home_plan_item_id` through update.

Recommendation:

- Treat this as a gating test case.
- If the product rule is "client can correct today's check-in fields only," tighten the update policy before production.
- If client updates are not required for V1, consider removing the client update policy before production.

#### P1-3: `home_plan_item_id` non-null is enforced for client-created rows, but not globally

`011` requires `home_plan_item_id is not null` in both client insert and client update `with check` clauses.

This properly enforces non-null `home_plan_item_id` for client-created and client-updated check-ins.

Limit:

- The base column remains nullable.
- Existing trainer policies from `002` are broad by kind and could still allow trainer-created `client_checkin` rows with null `home_plan_item_id`.
- The partial unique index also would not prevent duplicate null-item rows because PostgreSQL unique indexes treat null values as distinct.

Recommendation:

- This is acceptable for the stated client-created check-in scope.
- If all `client_checkin` rows must require a home plan item regardless of actor, add a separate table check constraint in a future reviewed migration.

### P2

#### P2-1: Unique index can fail on reused test data

`011` creates:

```sql
create unique index if not exists guidance_events_client_checkin_unique_idx
  on public.guidance_events(client_id, home_plan_item_id, kind, event_date)
  where kind = 'client_checkin' and deleted_at is null;
```

On a fresh DB this should be safe. On a reused test DB it can fail if duplicate active `client_checkin` rows already exist for the same client, home plan item, kind, and date.

Recommendation:

- Run the duplicate audit from the runbook before applying `011`.
- Stop if the audit returns rows.

#### P2-2: `create unique index if not exists` can hide a wrong pre-existing index

On a reused test DB, an index with the same name but different definition would cause `if not exists` to skip creation.

Recommendation:

- After migration, inspect `pg_indexes.indexdef` and confirm the index definition exactly matches the intended partial index.

#### P2-3: Payload shape is not enforced by SQL

The migration does not validate `payload.schema`, score ranges, allowed payload keys, or note length.

This matches the proposal's "app validation first" direction, but it means test DB execution alone does not prove payload safety.

Recommendation:

- Keep this accepted for DB/RLS testing.
- Do not release UI writes until app-side validation exists.

#### P2-4: Client-safe views are intentionally unchanged

`003_client_safe_views.sql` keeps `client_guidance_status` tied to `kind = 'daily_step'`.

`011` does not add a client-safe `client_checkin` view. Clients selecting from `guidance_events` will rely on RLS and will see their own row payload.

Recommendation:

- This is acceptable for the DB-only test.
- Keep payload minimal and do not store trainer notes in client-created payload.

## 4. Go / No-Go recommendation

**Conditional GO for manual fresh/test DB execution only.**

Allowed:

- Manual SQL Editor execution against a fresh/test Supabase DB.
- Apply `011_paper_first_client_checkins.sql` only after prerequisite migrations and duplicate audit pass.
- Use the runbook and checklist as the execution control documents.

Not allowed:

- Production execution.
- Automated full-folder migration execution until the duplicate `005` prefix behavior is resolved or explicitly tested.
- UI release.
- Auth/config/dependency/public-layout/localStorage changes.

Acceptance gate:

- The known update-policy concern must be tested explicitly.
- If a client can move a check-in to another `home_plan_item_id` and that is not intended, mark the test result NO-GO before production.

## 5. Manual test DB execution notes

Use only a fresh/test Supabase project with no production client data.

Recommended manual sequence:

1. Confirm the project is a test DB.
2. Apply prerequisite migrations in lexical/business order, excluding the deprecated Paper-first `005` no-op:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_client_safe_views.sql`
   - `004_body_measurements_kg_constraints.sql`
   - `005_clients_trainer_write_rls.sql`
   - `006_clients_insert_rls_helper.sql`
   - `007_clients_insert_rls_claim_helper.sql`
   - `008_clients_insert_rls_policy_minimal.sql`
   - `009_clients_select_rls_owner_helper.sql`
   - `010_clients_update_rls_owner_helper.sql`
3. Do not apply `005_paper_first_client_checkins.sql`.
4. Run the duplicate audit.
5. Apply `011_paper_first_client_checkins.sql`.
6. Verify policies, index, grants, and `daily_step` behavior.

Duplicate audit:

```sql
select client_id, home_plan_item_id, kind, event_date, count(*)
from public.guidance_events
where kind = 'client_checkin'
  and deleted_at is null
group by client_id, home_plan_item_id, kind, event_date
having count(*) > 1;
```

Expected before applying `011`:

- zero rows.

Confirm `client_checkin` already exists:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.guidance_events'::regclass
  and conname = 'guidance_events_kind_check';
```

Expected:

- constraint includes `daily_step`, `client_checkin`, and `trainer_marker`.

Verify policies after `011`:

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'guidance_events'
order by policyname;
```

Expected:

- existing `guidance_events_client_select`
- existing `guidance_events_client_insert`
- existing `guidance_events_client_update`
- new `guidance_events_client_checkin_select`
- new `guidance_events_client_checkin_insert`
- new `guidance_events_client_checkin_update`
- existing trainer policies still present

Verify index after `011`:

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
- `deleted_at is null` in the predicate.

Verify grants:

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'guidance_events'
order by grantee, privilege_type;
```

Expected:

- `authenticated` has `select`, `insert`, and `update`.
- no direct `anon` access is required.

Targeted RLS tests:

1. Trainer A can select/insert/update check-ins for Client A.
2. Trainer A cannot select/insert/update check-ins for Client B.
3. Client A can insert own `client_checkin` for an active, published item.
4. Client A cannot insert with `home_plan_item_id = null`.
5. Client A cannot insert for another client.
6. Client A cannot insert for draft/unpublished/deleted item or plan.
7. Client A cannot spoof `created_by`.
8. Client A cannot select `trainer_marker`.
9. Client A cannot create a duplicate same-day check-in for the same item.
10. Existing `daily_step` select/insert/update still works.

Extra update-policy tests:

1. Client A attempts to move an existing check-in to another active item for Client A.
2. Client A attempts to change `event_date`.
3. Client A attempts to change `kind`.
4. Client A attempts to change `client_id`.
5. Client A attempts to change `created_by`.
6. Client A attempts to set `deleted_at`.

Expected:

- `kind`, `client_id`, `created_by`, and `deleted_at` changes should be rejected.
- Moving to another same-client active item and changing `event_date` may currently be allowed by `011`; if that is not intended, mark the result NO-GO.

## 6. Risks

- Duplicate `005` prefix can confuse automated migration tooling.
- Client update policy may be broader than intended for V1.
- Reused test DBs may already contain duplicate `client_checkin` rows.
- `create unique index if not exists` can skip validation if a wrong same-name index already exists.
- Trainer-created `client_checkin` rows can still have null `home_plan_item_id` under existing broad trainer policies.
- Payload shape is not enforced in SQL.
- Clients can select their own full `payload`, so the app must keep payload minimal and client-safe.
- This review approves only fresh/test DB execution, not production.

## 7. Exact next step

Run one manual fresh/test DB execution using `docs/PAPER_FIRST_TEST_DB_RUNBOOK.md`, with special attention to the duplicate `005` prefix and the client update-policy tests.

```text
Work in repository trenermedycznywarszawa/studio-las-v15.

Use only a fresh/test Supabase DB.
Do not execute SQL in production.
Do not change application code.
Do not change auth.
Do not change Supabase config.
Do not remove localStorage fallback.
Do not add dependencies.
Do not change public site layout.

Task:
Execute the Paper-first test DB runbook manually on a fresh/test Supabase project.

Apply:
- prerequisite migrations 001 through 010 in order,
- excluding deprecated no-op supabase/migrations/005_paper_first_client_checkins.sql,
- then supabase/migrations/011_paper_first_client_checkins.sql.

Before 011:
- run the duplicate audit,
- stop if duplicates exist.

After 011:
- verify index definition,
- verify RLS policies,
- verify grants,
- verify existing daily_step behavior,
- run targeted client update-policy tests for changing home_plan_item_id and event_date.

Create a test result report.
Do not touch production data.
```