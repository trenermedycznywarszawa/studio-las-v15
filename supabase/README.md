# Studio Las OS — Supabase

This directory contains the database schema, migrations, test fixtures, importer tooling, and security tests for Studio Las OS.

Supabase is the only production source of truth. Browser storage is not a production persistence layer.

## Security model

- Supabase Auth establishes identity.
- `public.profiles` establishes the Studio Las role.
- Trainers access clients through ownership or an explicit trainer assignment.
- Only the owner trainer may change trainer assignments or client-account relationships.
- A client account maps to exactly one active client record.
- Clients do not query sensitive base process tables.
- The client portal reads only the explicit `client_portal_snapshot()` RPC projection.
- Client check-ins use only the validated `save_client_checkin()` RPC.
- Internal authorization helpers live in the non-exposed `private` schema.
- Anonymous roles have no access to Studio Las tables or client RPCs.
- Regular authenticated roles have no hard-delete policies.
- The browser never receives a service-role key.

## Migration order

Apply migrations in filename order:

1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_client_safe_views.sql`
4. `migrations/004_body_measurements_kg_constraints.sql`
5. `migrations/005_clients_trainer_write_rls.sql`
6. `migrations/005_paper_first_client_checkins.sql` — deprecated no-op compatibility marker
7. `migrations/006_clients_insert_rls_helper.sql`
8. `migrations/007_clients_insert_rls_claim_helper.sql`
9. `migrations/008_clients_insert_rls_policy_minimal.sql`
10. `migrations/009_clients_select_rls_owner_helper.sql`
11. `migrations/010_clients_update_rls_owner_helper.sql`
12. `migrations/011_paper_first_client_checkins.sql`
13. `migrations/012_security_hardening.sql`
14. `migrations/013_access_lifecycle_and_audit.sql`
15. `migrations/014_private_client_documents.sql`
16. `migrations/015_reject_client_account_reassignment.sql`
17. `migrations/016_attribute_service_operations_to_trainer.sql`
18. `migrations/017_owner_assignment_role_helper.sql`
19. `migrations/018_fix_checkin_rpc_conflict.sql`
20. `migrations/019_minimize_exposed_rpc_helpers.sql`
21. `migrations/020_performance_safety_indexes.sql`

Migrations `006–010` document historical repairs to the client write path. Migration `012` replaces their final runtime contract with one canonical authorization model. Migrations `017–020` are forward fixes discovered by executing the complete model against a clean cloud staging project. Do not rewrite already-applied migration history.

## What the staging-discovered fixes protect

- `017` keeps owner-only assignment and revocation writes functional under `FORCE ROW LEVEL SECURITY` without exposing another user's profile row.
- `018` fixes the PL/pgSQL output-column conflict in `save_client_checkin()` while preserving the public RPC signature and one-check-in-per-item-per-day rule.
- `019` moves privileged authorization helpers out of the exposed API schema and leaves non-executable compatibility wrappers for stored function bodies.
- `020` adds covering foreign-key indexes and evaluates `auth.uid()` once per statement in profile policies without changing isolation.

## Test-environment sequence

Use a disposable Supabase project or local test database containing no real client data.

1. Apply migrations `001–011`.
2. Run `dev/seed_test_data.sql` while the historical fixture schema still exists.
3. Apply migrations `012–020` in filename order.
4. Run:

```text
tests/012_security_hardening_audit.sql
tests/012_security_role_tests.sql
tests/013_access_lifecycle_and_audit.sql
tests/014_private_client_documents.sql
tests/015_reject_client_account_reassignment.sql
tests/016_attribute_service_operations_to_trainer.sql
tests/017_owner_assignment_role_helper.sql
tests/018_checkin_rpc_conflict.sql
tests/019_private_helper_boundary.sql
tests/020_performance_safety_indexes.sql
```

Every file must finish with its explicit completion message. A file that was not run is not a passed test.

The tests cover:

- Trainer A and Trainer B tenant isolation,
- protected client ownership columns,
- owner-only account relationship changes under forced RLS,
- Client A and Client B RPC isolation,
- no client access to base health/process tables,
- no direct client insert into `guidance_events`,
- immediate access loss after relationship revocation,
- no anonymous RPC access,
- metadata-only audit and service-operation trainer attribution,
- private PDF-only Storage boundaries,
- account reassignment conflicts,
- valid and duplicate check-in behavior,
- non-exposed privileged helpers,
- profile RLS planner optimization and covering indexes.

`tests/rls_access_tests.sql` is a deprecated compatibility marker. The former suite validated the removed access-code table and removed projection views and must not be used for the current architecture.

## Production gate

Do not enter real client health/process data until:

- migrations `012–020` have successfully run in the target project,
- every current SQL test completes without exception,
- role scenarios are repeated with the actual target project's role and configuration settings,
- the production browser has been inspected for unintended local persistence,
- the Edge Function, Auth redirects, invitation, recovery, password setup, and private Storage flows pass in staging and target,
- mandatory trainer MFA with `aal2` enforcement is active,
- a separate RODO/legal review covers legal basis, notices, retention, processors, export/deletion, and incident response.

A committed migration or a passing staging test is not proof that the live target has been migrated.

## Client-safe RPC boundary

`client_portal_snapshot()`:

- derives the client identity from `auth.uid()`,
- requires an active `profiles` role of `client`,
- requires one active `client_users` relationship,
- excludes trainer notes, working hypotheses, contraindications, raw intake, ownership identifiers, drafts, and unpublished records,
- returns only published client-facing plan items, reports, selected measurements, and the latest client summary.

`save_client_checkin()`:

- derives the client identity from Auth,
- never accepts `client_id` from the browser,
- accepts only an active, published home-plan item assigned to that client,
- validates 0–10 ranges,
- limits free-text notes,
- enforces one active check-in per plan item per day,
- prevents direct arbitrary JSON writes by clients.

The three intentionally exposed privileged RPCs are:

- `client_portal_snapshot()` — authenticated client projection,
- `save_client_checkin(...)` — authenticated, validated client write,
- `trainer_client_access_status(uuid)` — owner-trainer access status.

All other authorization helpers are internal and must not be added to PostgREST exposed schemas.

## Legacy browser-data migration

The production runtime fails closed when recognized historical Studio Las keys remain in `localStorage`.

Use:

`tools/export-legacy-browser-data.html`

The tool:

- reads only recognized legacy keys on the same origin,
- displays metadata rather than rendering sensitive records,
- downloads a JSON backup with a SHA-256 checksum,
- performs no network upload,
- does not delete the browser copy.

Then use the importer in dry-run mode, review mappings and rejected records, test against a non-production project, and verify the imported record counts before removing browser data.

Never commit a legacy export or real client data.

## Importer

Importer design and dry-run tooling live under:

- `IMPORTER_DESIGN.md`
- `importer/`

The importer must preserve an audit trail and must not silently guess ambiguous relationships. Production import remains an explicit trainer-admin operation.

## Storage and documents

The current modular frontend stores document metadata only. It does not upload documents.

Before enabling uploads:

- verify the private bucket and owner-scoped Storage policies in the target,
- verify signed URL lifetimes,
- prohibit public buckets,
- test cross-client object paths,
- define retention and deletion behavior.

Do not infer that table RLS automatically secures Supabase Storage objects.

## Soft deletion

Normal application deletion uses `deleted_at` or status revocation. Hard-delete policies are intentionally absent for regular authenticated users.

Administrative hard deletion, retention enforcement, export, and legal erasure are separate controlled operations.
