# Paper-first test DB review

## 1. Summary

Reviewed the Paper-first test DB readiness after the V1 immutable client check-in decision.

`supabase/migrations/011_paper_first_client_checkins.sql` remains the executable Paper-first index/RLS migration for manual fresh/test DB execution, and `supabase/migrations/013_enforce_immutable_client_checkin_rpc.sql` is the final V1 RPC contract migration.

Together they now:

- reuse `public.guidance_events`,
- add a `client_checkin` partial unique index,
- add a client `client_checkin` select policy,
- add a client `client_checkin` insert policy,
- intentionally do **not** create a client `client_checkin` update policy,
- replace the `012` RPC upsert behavior with insert-only `save_client_checkin`,
- reject duplicate same client/item/date RPC calls with `client_checkin_already_exists`,
- store the minimal `paper_first_checkin_v1` payload,
- do not modify existing `daily_step` policies,
- do not create new protocol/check-in/report tables.

`supabase/migrations/005_paper_first_client_checkins.sql` is deprecated/no-op only and must not be applied.

No SQL was executed during this review. No auth code, Supabase config, public layout, dependencies, or localStorage fallback were changed.

## 2. Files reviewed

- `docs/PAPER_FIRST_TEST_DB_RUNBOOK.md`
- `docs/PAPER_FIRST_EXECUTION_CHECKLIST.md`
- `docs/PAPER_FIRST_MIGRATION_PROPOSAL.md`
- `supabase/migrations/011_paper_first_client_checkins.sql`
- `supabase/migrations/012_save_client_checkin_rpc.sql`
- `supabase/migrations/013_enforce_immutable_client_checkin_rpc.sql`
- `supabase/migrations/005_paper_first_client_checkins.sql`
- `supabase/migrations/005_clients_trainer_write_rls.sql`
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/003_client_safe_views.sql`

Known later migrations `006` through `010` do not modify `guidance_events`, `daily_step`, or `client_checkin`. Migration `012` creates the historical RPC upsert; migration `013` replaces that function with the immutable insert-only contract.

## 3. Findings by severity

### P0

No P0 blockers were found for manual fresh/test DB execution.

This does not approve production execution.

### P1

#### P1-1: Duplicate `005` migration prefix remains a runner risk

The repository contains:

- `supabase/migrations/005_clients_trainer_write_rls.sql`
- `supabase/migrations/005_paper_first_client_checkins.sql`

The Paper-first `005` file is deprecated/no-op only, but automated migration tooling may still treat duplicate numeric prefixes as a migration-version conflict.

Recommendation:

- Use manual SQL Editor execution for this test pass.
- Do not run automated full-folder migration execution until duplicate-version behavior is resolved or explicitly documented.

### P2

#### P2-1: Unique index can fail on reused test data

`011` creates:

```sql
create unique index if not exists guidance_events_client_checkin_unique_idx
  on public.guidance_events(client_id, home_plan_item_id, kind, event_date)
  where kind = 'client_checkin' and deleted_at is null;
```

On a fresh DB this should be safe. On a reused test DB it can fail if duplicate active `client_checkin` rows already exist.

Recommendation:

- Run the duplicate audit before applying `011`.
- Stop if the audit returns rows.

#### P2-2: `create unique index if not exists` can hide a wrong pre-existing index

On a reused test DB, an index with the same name but different definition would cause `if not exists` to skip creation.

Recommendation:

- After migration, inspect `pg_indexes.indexdef` and confirm the exact partial index definition.

#### P2-3: Direct REST payload shape is not fully enforced by table policy

Migration `013` builds the minimal `paper_first_checkin_v1` payload inside the RPC and validates the currently supported/null fields. A direct REST insert that passes the `011` policy can still provide arbitrary payload keys because no table-level payload check exists.

Recommendation:

- Accept for V1 if client UI writes through `save_client_checkin`.
- Treat direct REST insert as a test-only compatibility path unless a table-level payload constraint is added later.

#### P2-4: Trainer-created `client_checkin` rows can still bypass the client item-link rule

Client insert policy requires non-null active/published `home_plan_item_id`, but existing trainer policies are broader.

Recommendation:

- Accept for V1 as trainer-owned correction/admin capacity.
- Revisit later only if every `client_checkin` row must be item-linked regardless of actor.

#### P2-5: Client-safe views are intentionally unchanged

`011` does not add a client-safe `client_checkin` view. Clients selecting from `guidance_events` rely on RLS and see their own minimal payload.

Recommendation:

- Accept for DB-only test.
- Add a client-safe projection later if historical check-in read UI grows beyond minimal payload.

## 4. Go / No-Go recommendation

**Conditional GO for manual fresh/test DB execution only.**

Allowed:

- Manual SQL Editor execution against a fresh/test Supabase DB.
- Apply `011_paper_first_client_checkins.sql`, `012_save_client_checkin_rpc.sql`, and `013_enforce_immutable_client_checkin_rpc.sql` only after prerequisite migrations and duplicate audit pass.
- Use the runbook and checklist as execution control documents.

Not allowed:

- Production execution.
- Automated full-folder migration execution.
- UI release.
- Auth/config/dependency/public-layout/localStorage changes.

Acceptance gates:

- `guidance_events_client_checkin_select` exists.
- `guidance_events_client_checkin_insert` exists.
- `guidance_events_client_checkin_update` does **not** exist.
- Client cannot update `client_checkin`.
- Client cannot insert/select when access is revoked/inactive.
- Existing `daily_step` still works.

## 5. Manual test DB execution notes

Use only a fresh/test Supabase project with no production client data.

Recommended sequence:

1. Confirm the project is a test DB.
2. Apply prerequisite migrations in order, excluding the deprecated Paper-first `005` no-op.
3. Run the duplicate audit.
4. Apply `011_paper_first_client_checkins.sql`.
5. Apply `012_save_client_checkin_rpc.sql`.
6. Apply `013_enforce_immutable_client_checkin_rpc.sql`.
7. Verify index definition.
8. Verify client_checkin select/insert policies exist and update policy is absent.
9. Verify `save_client_checkin` is insert-only and duplicate RPC calls fail with `client_checkin_already_exists`.
10. Verify daily_step behavior still works.
11. Run trainer, client, duplicate, and revoked/inactive client tests.

## 6. Risks

- Duplicate `005` prefix can confuse automated migration tooling.
- Reused test DBs may already contain duplicate `client_checkin` rows.
- `create unique index if not exists` can skip validation if a wrong same-name index already exists.
- Trainer-created `client_checkin` rows can still have null `home_plan_item_id` under existing broad trainer policies.
- RPC payload shape is enforced by `013`; direct REST payload shape is still not table-constrained.
- Clients can select their own full payload, so the app must keep payload minimal and client-safe.
- This review approves only fresh/test DB execution, not production.

## 7. Exact next step

Run one manual fresh/test DB execution using `docs/PAPER_FIRST_TEST_DB_RUNBOOK.md`.

Do not execute SQL in production.
Do not release application code to production before the test DB pass.
Do not change auth.
Do not change Supabase config.
Do not remove localStorage fallback.
Do not add dependencies.
Do not change public site layout.
