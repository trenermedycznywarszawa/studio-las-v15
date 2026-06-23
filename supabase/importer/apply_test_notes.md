# Studio Las OS 9.0 - Test Apply Notes

This note is for a manual test of importer apply-mode against an empty Supabase test project.

Do not use this flow on production.

## Preconditions

1. Run the Phase 1 SQL migrations in the test project.
2. Create or seed a trainer profile.
3. Keep the localStorage export outside Git.
4. Confirm the Supabase project ref from the test project URL.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` local and never paste it into logs or commits.

## Required Command Shape

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
node supabase/importer/dry_run_importer.mjs tmp/studio-las-localstorage-export-2026-06-23.json \
  --out tmp/private-apply-report.json \
  --apply \
  --confirm-test-db \
  --confirm-project-ref <project-ref> \
  --trainer-profile-id <trainer-profile-uuid>
```

## V1 Writes

The importer writes only the V1 test scope:

- clients
- client_intakes
- sessions
- pre_session_checks
- client_tasks
- body_measurements
- assessment_results
- exercises
- home_plans
- home_plan_items
- reports
- legacy_import_batches
- legacy_import_records

## V1 Skips

- no client access credentials
- no plaintext access codes
- no Storage upload
- no active client_documents for PDFs
- no training_load_observations
- no guidance tables
- no post_session_observations

## Expected Safety Behavior

- Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` stops before network writes.
- Missing `--confirm-test-db` stops before network writes.
- Project ref mismatch stops before network writes.
- Dry-run errors stop apply-mode.
- Each imported target row receives a `legacy_import_records` audit row.
- Existing target rows are skipped rather than overwritten.
- PDF and access-code issues become redacted `needs_review` audit rows.

## After Test

Inspect only aggregate counts and audit categories. Do not paste client names, contact details, medical content, raw JSON, service role keys, or private report files into Git or PRs.
