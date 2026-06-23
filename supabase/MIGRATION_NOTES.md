# Studio Las OS 9.0 Migration Notes

These notes describe the future localStorage import strategy. No importer is implemented in this phase.

## Runtime Validation Status

Phase 1 schema, RLS, client-safe views, dev seed data, and RLS access tests passed in a real empty Supabase test project.

Validated order:

1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_client_safe_views.sql`
4. `dev/seed_test_data.sql`
5. `tests/rls_access_tests.sql`

Final result:

`Studio Las OS 9.0 RLS access tests completed`

The importer is still not implemented. The next step is importer design, then a separate implementation phase.

## Importer Design Review Status

Importer design review was completed against the current `studio-management-os-3.0.html` localStorage structures.

Required V1 coverage now includes:

- `studioLasOS_v3.clients[]`
- `client.intake`
- `client.sessions[]`
- `client.preSessionChecks[]`
- `client.postSessionNotes[]`
- `client.tasks[]`
- `client.measurements[]`
- `client.polarSessions[]`
- `client.testResults[]`
- `client.homePlan` and `client.homePlan.exercises[]`
- `client.reports[]`
- `studioLasExerciseLibraryV1`
- `studioLasGuidance_v1`
- `studioLasGuidancePilot_v1`
- Tanita `pdfDataUrl` through Storage, never SQL text

The first importer implementation should start with `dry_run` only. No frontend integration, JS importer, or Auth/client login work exists in this phase.

Real export dry-run analysis found no fatal importer errors. Before any apply-mode, the importer must still:

- classify known questionnaire/intake spillover fields,
- use deterministic `legacy_path` for records without IDs,
- skip plaintext client access codes unless a hash-only migration is explicitly approved,
- keep Tanita PDFs out of SQL and defer actual document rows until Storage upload is implemented,
- import legacy reports as trainer-only drafts by default.

The next safe implementation target is test-database apply-mode without Storage upload, not production migration.

## Source

The current OS 8.0 browser state lives under:

- `studioLasOS_v3`
- `studioLasExerciseLibraryV1`
- `studioLasGuidance_v1`
- `studioLasGuidancePilot_v1`

Before any import, export and store a full JSON backup.

## Import Batch

Create one `legacy_import_batches` row per import attempt:

- trainer id
- source app version
- storage key
- backup JSON storage path
- expected record counts
- validation summary
- status

Every imported, skipped, failed, or ambiguous record should create a `legacy_import_records` row.

Trainer and client `profiles` should be provisioned by a trusted migration/admin path, not by self-service inserts from the browser. Authenticated users can read their own profile and update only basic profile columns permitted by grants.

## legacy_id

Use `legacy_id` to preserve OS 8.0 identifiers.

Examples:

- `client.id` -> `clients.legacy_id`
- `client.sessions[].id` -> `sessions.legacy_id`
- `client.measurements[].id` -> `body_measurements.legacy_id`
- `client.polarSessions[].id` -> `training_load_observations.legacy_id`
- `client.homePlan.exercises[].id` -> `home_plan_items.legacy_id`

Also store `source_path`, for example:

- `clients[0]`
- `clients[0].sessions[3]`
- `clients[0].measurements[1]`

## Tanita pdfDataUrl

OS 8.0 stores Tanita PDF attachments as `pdfDataUrl`.

Future importer flow:

1. Detect `measurement.pdfDataUrl`.
2. Decode the data URL.
3. Upload the file to Supabase Storage.
4. Create `client_documents` with `kind = 'tanita_pdf'`.
5. Link `body_measurements.document_id` to the document row.
6. Store the original `pdfName`.

Do not keep the base64 data URL in SQL.

## Legacy Polar Fields

OS 8.0 `polarSessions[]` may include:

- `vasBefore`
- `vasAfter`
- `readiness`
- `sleepQuality`

These are not primary fields in `training_load_observations`.

Future importer rule:

1. If there is a matching `sessions` row on the same date and the session field is empty, copy the values into `sessions`.
2. If there is no safe matching session, record the original payload in `legacy_import_records.raw_payload` with `status = 'needs_review'`.
3. Do not create main Polar columns for these fields.

## Record Count Validation

After import, compare source counts against target counts:

- clients
- sessions
- body measurements
- training load observations
- assessment results
- reports
- pre-session checks
- post-session observations
- home plan items
- client tasks
- guidance events
- guidance pilots and feedback
- exercises

Differences should be explained in `legacy_import_batches.validation_summary`.

## needs_review

Mark records as `needs_review` in `legacy_import_records` when data is ambiguous or intentionally not mapped.

Known cases:

- `client.checkins[]` has no stable OS 8.0 contract.
- `client.documents[]` has no stable OS 8.0 contract.
- CSV spillover fields stored directly on `client` should move to `client_intakes.raw_payload`.
- `stageRaw` should be preserved but not trusted as primary process stage.
- `measurement.sourceMode` and `measurement.pdfAutoFilled` duplicate `inputMethod` and `parseStatus`.
- `reports.audience` does not exist in saved OS 8.0 reports and must be inferred or set by the trainer.
- Polar legacy VAS/readiness/sleep fields without a matching session need review.
- Plaintext `clientAccessCode` must become a hash, never a direct SQL field.

## Safety Rule

Studio Las OS 8.0 must continue working from localStorage until frontend integration is explicitly started in a later phase.
