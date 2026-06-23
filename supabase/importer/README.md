# Studio Las OS 9.0 - LocalStorage Importer

This directory contains the localStorage importer for Studio Las OS 9.0.

Default mode is dry-run. Dry-run does not connect to Supabase, execute SQL, use API keys, require environment variables, or touch frontend code.

Apply-mode exists only for a test Supabase database and must be explicitly confirmed.

## Dry-Run

From the repository root:

```bash
node supabase/importer/dry_run_importer.mjs supabase/importer/sample-localstorage-export.json
```

With explicit output path:

```bash
node supabase/importer/dry_run_importer.mjs supabase/importer/sample-localstorage-export.json --out supabase/importer/sample-dry-run-report.json
```

## Test Apply-Mode

Apply-mode is refused unless all safety inputs are present:

- `--apply`
- `--confirm-test-db`
- `--confirm-project-ref <project-ref>`
- `--trainer-profile-id <profile-uuid>`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Example for a test project only:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
node supabase/importer/dry_run_importer.mjs path/to/export.json \
  --out path/to/apply-report.json \
  --apply \
  --confirm-test-db \
  --confirm-project-ref <project-ref> \
  --trainer-profile-id <trainer-profile-uuid>
```

The importer checks that `<project-ref>` matches `SUPABASE_URL`. Never run apply-mode against production data or a production Supabase project.

## Input

The script accepts both common export shapes:

1. localStorage-like object where values are JSON strings:

```json
{
  "studioLasOS_v3": "{\"clients\":[]}",
  "studioLasGuidance_v1": "{}"
}
```

2. Already parsed object:

```json
{
  "studioLasOS_v3": {
    "clients": []
  },
  "studioLasGuidance_v1": {}
}
```

## Output

The report JSON contains:

- `summary`
- `targetCounts`
- `sourceCounts`
- `needsReview`
- `warnings`
- `errors`
- `skipped`
- `idempotencyKeys`
- `mappingPreview`

The default report path is next to the input file:

`<input-name>.dry-run-report.json`

## What It Detects

- target table counts for the OS 9.0 Supabase model
- localStorage technical keys that should be ignored
- missing or duplicate legacy IDs
- fallback `legacy_path` idempotency keys
- invalid dates
- number parsing issues
- empty strings that should become `null`
- plaintext `clientAccessCode`
- Tanita `pdfDataUrl`
- legacy Polar fields: `vasBefore`, `vasAfter`, `readiness`, `sleepQuality`
- legacy session fields: `energy`, `sleep`
- legacy assessment fields: `finding`, `score`, `pain`, `decision`
- reports without `audience`
- unstable `client.checkins[]` and `client.documents[]`
- guidance entries without a matching client

## What It Does Not Do

- no frontend edits
- no Supabase client
- no Auth/login
- no production apply-mode
- no database writes in dry-run
- no Storage uploads
- no plaintext access-code import
- no SQL migrations

## Test Apply V1 Scope

Apply-mode V1 imports only:

- `clients`
- `client_intakes`
- `sessions`
- `pre_session_checks`
- `client_tasks`
- `body_measurements`
- `assessment_results`
- `exercises`
- `home_plans`
- `home_plan_items`
- `reports`
- `legacy_import_batches`
- `legacy_import_records`

Apply-mode V1 intentionally does not import:

- `client_access_credentials`
- `client_documents` / Tanita PDFs
- Supabase Storage files
- `training_load_observations`
- `guidance_events`
- `guidance_pilots`
- `guidance_pilot_feedback`
- `post_session_observations`

## Safety Rules

- Default mode remains dry-run.
- Apply-mode refuses to run when dry-run has `errors > 0` or fatal errors.
- Apply-mode refuses missing env vars or missing confirmation flags.
- Apply-mode refuses when `--confirm-project-ref` does not match `SUPABASE_URL`.
- Service role key is never printed.
- Console output avoids personal data and raw JSON.
- Report idempotency keys use hashes instead of raw legacy IDs.
- Plaintext `clientAccessCode` is redacted and recorded only as `needs_review` audit.
- Tanita `pdfDataUrl` is not uploaded and is not stored as raw SQL text.
- Reports without audience are imported as `audience = 'trainer'`, `status = 'draft'`, `published_at = null`.
- Records without IDs use deterministic `legacy_path` through `legacy_import_records`.
- Empty strings are converted to `null` where appropriate.
- Existing target rows are not overwritten in V1; reruns record a skipped/no-overwrite audit entry.

## Real Export Analysis Notes

The real-export dry-run should be interpreted as an apply-mode gate, not as permission to write production data.

Current recommended path:

1. Harden dry-run classification for known questionnaire/intake fields.
2. Build apply-mode only for a test Supabase database.
3. Keep Storage upload out of V1 apply-mode.
4. Do not import plaintext access codes.
5. Import OS 8.0 reports as trainer-only drafts unless explicitly published later.

Apply-mode V1 should be allowed to write only if:

- the target project/ref is explicitly confirmed,
- a full backup JSON exists outside the database,
- every write has a `legacy_import_records` audit row,
- records without IDs use deterministic `legacy_path`,
- existing target rows are skipped rather than overwritten,
- raw payloads redact secrets and full base64/data URLs,
- hard delete is not used for rollback.
