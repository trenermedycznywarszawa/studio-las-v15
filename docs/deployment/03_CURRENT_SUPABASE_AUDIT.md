# Current Supabase Audit Snapshot

Date: 2026-07-13
Status: staging database rehearsal completed; production unchanged

This document records non-sensitive observations and test evidence from the connected Supabase projects. It is not proof that the production-sensitive target has been migrated.

## Environments

### Production-sensitive target

- Project ref: `ufcumhbnuyernuwepcij`
- Current project name: `studio-las-os9-test`
- Region: `eu-west-1`
- Contains real data.
- Was inspected read-only during this work.
- Must not be used for destructive rehearsal.

### Free staging

- Project ref: `ulauyoqjoetjqktegeuq`
- Project name: `studio-las-os-staging`
- Region: `eu-west-1`
- Free project; no paid infrastructure was created.
- Started with no Studio Las tables and no migration history.
- Contains only fixed fictional `example.test` identities and fictional process records.

## Read-only production-target observations

At the time of inspection:

- `23` Studio Las tables existed in the `public` schema,
- all `23` public tables had RLS enabled,
- `0` public tables had `FORCE ROW LEVEL SECURITY`,
- `6` Supabase Auth users existed,
- no `supabase_migrations.schema_migrations` relation was present,
- the historical `client_access_credentials` table still existed,
- the historical client-facing projection views still existed,
- the deployed `save_client_checkin` function still accepted a browser-supplied `p_client_id`,
- the deployed `rls_auto_enable()` function was `SECURITY DEFINER` and executable by `anon`,
- the current client projection views used `security_invoker=false` and depended on privileged helpers.

No client rows, health values, names, emails, notes, documents, tokens, passwords, or raw payloads were read or copied into this audit.

## Completed staging rehearsal

The complete repository migration chain `001–020` was applied to the empty free staging project in filename order.

The connected tool's safety layer required canonical migration `013_access_lifecycle_and_audit.sql` to be submitted as two smaller staging operations:

- `013_security_audit_metadata`
- `013_client_access_lifecycle`

This is a staging-tool history detail only. The repository's canonical migration remains the single file `013_access_lifecycle_and_audit.sql`. Production must not copy or fabricate the staging split.

The staging database now has:

- `23/23` public Studio Las tables with RLS enabled and forced,
- the historical access-code table removed,
- historical client projection views removed,
- the metadata-only append-only audit table,
- a private PDF-only document bucket with a 10 MB limit,
- Auth-derived client projection and check-in RPCs,
- owner-only account lifecycle operations,
- internal authorization helpers moved to the non-exposed `private` schema,
- covering foreign-key indexes and optimized profile policies.

## Staging defects found and fixed

Real cloud execution found defects that repository-only static checks had not exposed:

1. **Owner account revocation failed under forced RLS.**
   The assignment policies tried to validate another user's role through `public.profiles`, whose forced RLS correctly hid that row. Migration `017_owner_assignment_role_helper.sql` adds a narrow private role predicate that returns no profile attributes.

2. **The role test used `integer` literals for a `smallint` RPC.**
   `tests/012_security_role_tests.sql` now uses exact `smallint` casts. The production RPC was not widened to accommodate an imprecise test.

3. **`save_client_checkin()` had an ambiguous PL/pgSQL `event_date` conflict target.**
   Migration `018_fix_checkin_rpc_conflict.sql` preserves the public signature, uses the unique index as the authority, and translates duplicate writes into the existing safe error.

4. **Internal privileged helpers were exposed in the public API schema.**
   Migration `019_minimize_exposed_rpc_helpers.sql` moves the real helpers to `private`, leaves non-executable compatibility wrappers, and pins the update trigger's `search_path`.

5. **The performance advisor found uncovered foreign keys and per-row `auth.uid()` evaluation.**
   Migration `020_performance_safety_indexes.sql` adds nine covering indexes and changes profile policies to evaluate Auth identity once per statement without weakening isolation.

## Passed staging tests

The following behavior was verified with fictional identities and transactional rollback where applicable:

- Trainer A and Trainer B tenant isolation.
- Protected ownership columns cannot be changed by browser trainers.
- An owner trainer can revoke their own client relationship under forced RLS.
- An unrelated trainer cannot change a foreign relationship or assignment.
- Client snapshots are Auth-derived and exclude technical IDs and trainer-only fields.
- Clients cannot read base health/process tables.
- Valid check-ins work only through the narrow RPC.
- Unassigned items and direct `guidance_events` writes are rejected.
- A duplicate check-in fails closed.
- Revocation removes portal access immediately.
- Anonymous RPC access is rejected.
- The audit has 22 protected-table triggers and stores metadata rather than payload values.
- Service-role link/revoke operations are attributed to the verified owner trainer.
- The private Storage bucket, PDF-only rule, size limit, publication boundary, and no-client-write rule are present.
- Account reassignment and silent account replacement are rejected.
- Internal privileged helpers are not directly executable through the public API schema.
- Profile RLS isolation remains intact after planner optimization.

## Supabase advisor result after fixes

Security advisor findings remaining on staging:

- `security_audit_events` has forced RLS and deliberately no browser policy. This is intentional fail-closed behavior.
- Three `SECURITY DEFINER` RPCs are intentionally exposed and separately tested:
  - `client_portal_snapshot()`
  - `save_client_checkin(...)`
  - `trainer_client_access_status(uuid)`
- leaked-password protection is disabled in staging Auth and remains a configuration gate.

Performance advisor findings remaining on staging are only `unused_index` informational messages. They are not actionable on a newly created, low-traffic test database. No index was removed based on fresh-staging usage statistics.

## Interpretation

The production-sensitive target still reflects the pre-hardening schema. The missing migration-history relation creates a schema-drift risk. Do not fabricate or repair history before generating a non-destructive target drift report and verifying a restorable backup.

Staging proves that the current migration and authorization model can be applied and tested in a clean cloud project. It does not authorize production rollout or real client data entry.

## Remaining production blockers

1. Generate a non-destructive target drift report against the actual pre-hardening schema.
2. Create and verify a restorable target backup/export.
3. Configure staging and target Auth settings, including exact redirects, custom SMTP, password policy, rate limits, and leaked-password protection when available.
4. Deploy and validate the `client-access` Edge Function with exact allowed origins and redirects.
5. Test real invitation and recovery emails using fictional accounts.
6. Implement mandatory trainer TOTP MFA and database/API `aal2` enforcement.
7. Complete the separate privacy/RODO legal gate.
8. Apply only the reviewed migration delta to the target and repeat every test.

Do not enable client access or enter real health/process data before all blockers pass.

## Cost constraint

- Do not create paid Supabase branches or paid infrastructure.
- Prefer local Supabase CLI plus Docker for repeatable destructive rehearsals.
- Use the free staging project only for cloud-specific Auth, Storage, and Edge Function validation.
- Any future paid service requires explicit owner approval.
