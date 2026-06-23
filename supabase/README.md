# Studio Las OS 9.0 Supabase

This directory contains the first database-only phase for Studio Las OS 9.0.

It does not connect Supabase to the current Studio Las OS 8.0 frontend. It only prepares schema, RLS policies, client-safe views, and migration notes.

## Runtime Validation

Phase 1 runtime validation passed in a real empty Supabase test project.

Validated order:

1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_client_safe_views.sql`
4. `dev/seed_test_data.sql`
5. `tests/rls_access_tests.sql`

Final SQL Editor result:

`Studio Las OS 9.0 RLS access tests completed`

Runtime fixes applied during validation:

- `dev/seed_test_data.sql` now appends PostgreSQL array elements with `array[...]` syntax.
- `tests/rls_access_tests.sql` no longer depends on temporary functions, `pg_temp`, or `search_path`; it runs as one SQL file in Supabase SQL Editor.

## Files

Run migrations in this order:

1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_client_safe_views.sql`

For the Phase 1 test harness, run the fake dev fixtures and RLS tests after the migrations:

4. `dev/seed_test_data.sql`
5. `tests/rls_access_tests.sql`

The seed file uses fixed fake UUIDs and `example.test` emails only. The RLS test file uses `SET LOCAL ROLE` and JWT claim settings to simulate `trainer`, `client`, and `anon` access. Run it as a privileged local/test database role that can `SET ROLE` to `authenticated` and `anon`.

Importer planning is documented in `IMPORTER_DESIGN.md`. No importer is implemented in this phase.

## Included In This Phase

- Core tables for trainers, clients, process data, plans, reports, documents, and legacy import audit.
- Tanita data as `body_measurements`.
- Polar data as `training_load_observations`.
- Reports with `audience`, `status`, and `published_at`.
- Soft delete fields on process tables.
- RLS helper functions and table policies.
- Client-safe views for the future client panel.

## Not Included In This Phase

- No frontend integration.
- No Supabase client in `studio-management-os-3.0.html`.
- No UI login.
- No JavaScript importer.
- No executable data migration from localStorage.
- No changes to Studio Las OS 8.0 behavior.

## Security Model

Trainer access is scoped by client ownership:

- `clients.owner_trainer_id`
- future shared access through `client_trainers`

Client access is scoped by `client_users`. Clients should not query sensitive base process tables directly. The client panel should read from client-safe views:

- `client_portal_summary`
- `client_active_home_plan`
- `client_visible_reports`
- `client_visible_measurements`
- `client_guidance_status`

The client-safe views are intentional security-definer projection views with explicit auth-scoped filters. They do not use `security_invoker = true`, because that would require client-facing RLS `select` policies on the underlying process tables and could expose rows that contain trainer-only columns through direct table queries. The safe-view contract is:

- no client direct RLS access to sensitive base process tables
- no sensitive columns projected in views
- every view filters by `client_can_access_client(client_id)` or `trainer_can_access_client(client_id)`
- views are granted as `select` only

Sensitive data intentionally kept out of client-safe views:

- raw intake payloads
- red flags as raw labels
- contraindications
- trainer observations
- trainer decisions in raw form
- trainer interpretations and notes
- access credentials
- drafts and unpublished records
- full exercise atlas

Normal application deletes should be soft deletes by setting `deleted_at`. Hard delete policies are intentionally not defined for regular authenticated users.
