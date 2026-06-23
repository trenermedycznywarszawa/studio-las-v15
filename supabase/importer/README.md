# Studio Las OS 9.0 - LocalStorage Importer Dry-Run

This directory contains the first dry-run importer for Studio Las OS 9.0.

It does not connect to Supabase. It does not execute SQL. It does not use API keys, environment variables, service role, or frontend code.

## Run

From the repository root:

```bash
node supabase/importer/dry_run_importer.mjs supabase/importer/sample-localstorage-export.json
```

With explicit output path:

```bash
node supabase/importer/dry_run_importer.mjs supabase/importer/sample-localstorage-export.json --out supabase/importer/sample-dry-run-report.json
```

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
- no apply-mode
- no database writes
- no Storage uploads
- no service role
- no SQL migrations

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
- raw payloads redact secrets and full base64/data URLs,
- hard delete is not used for rollback.
