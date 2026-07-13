# Studio Las OS — Supabase security rollout

## Purpose

This is the mandatory deployment gate for PR #9.

The repository and free staging project contain the security design and test evidence. They do not prove that the same controls are active in the production-sensitive target. Real client health or process data must not be entered until every target, MFA, and privacy gate below passes.

Production-sensitive target currently used by the public runtime:

`ufcumhbnuyernuwepcij`

Free fictional-data staging:

`ulauyoqjoetjqktegeuq`

Never place database passwords, access tokens, secret keys, exported health data, service-role credentials, or real client records in GitHub, chat, screenshots, shell history, or fixtures.

## Current status

Completed on the free staging project:

- complete migration chain `001–020`,
- forced-RLS and cross-tenant tests,
- client RPC and revocation tests,
- account-conflict tests,
- metadata audit tests,
- private Storage metadata and policy tests,
- internal-helper exposure reduction,
- Supabase security and performance advisor review.

Not completed:

- non-destructive production-target drift report,
- verified target backup,
- reviewed target migration delta,
- staging and target Edge Function deployment,
- real invitation and recovery email tests,
- final Auth configuration,
- mandatory trainer TOTP MFA with `aal2` enforcement,
- privacy/RODO approval.

The production-sensitive target was not modified during the staging rehearsal.

## Required operator access

The operator needs locally protected access to:

- branch `agent/security-architecture-hardening`,
- Supabase CLI and Docker,
- the free staging project,
- the production-sensitive target,
- a password manager or protected environment variables for credentials.

Never commit `.env` files containing credentials.

## Non-negotiable order

1. Validate repository checks locally and in CI.
2. Rehearse the complete migration chain in a disposable database.
3. Run every metadata, role, audit, Storage, and regression test.
4. Produce a read-only target schema and migration-history inventory.
5. Generate and review a non-destructive target drift report.
6. Create and verify a restorable target backup.
7. Configure and test Auth and the Edge Function in staging.
8. Verify invitation, recovery, and password setup with fictional accounts.
9. Implement and verify trainer MFA with database/API `aal2` enforcement.
10. Complete the privacy/RODO gate.
11. Apply only the reviewed delta to the target.
12. Repeat every test against the target configuration.
13. Only then mark PR #9 ready for review and release.

Do not merge first and “fix production afterwards.”

## 1. Repository verification

From the repository root:

```powershell
python scripts/verify_studio_las_os.py
python scripts/verify_access_lifecycle.py
npx -y deno check supabase/functions/client-access/index.ts
```

All commands and GitHub Actions checks must finish successfully.

## 2. Canonical migration order

The security rollout is not limited to `012–016`. The current forward-only chain is:

```text
012_security_hardening.sql
013_access_lifecycle_and_audit.sql
014_private_client_documents.sql
015_reject_client_account_reassignment.sql
016_attribute_service_operations_to_trainer.sql
017_owner_assignment_role_helper.sql
018_fix_checkin_rpc_conflict.sql
019_minimize_exposed_rpc_helpers.sql
020_performance_safety_indexes.sql
```

Purpose of the staging-discovered forward fixes:

- `017` restores valid owner assignment and revocation writes under forced RLS through a narrow private role predicate.
- `018` fixes the check-in RPC output-column conflict without changing its public signature.
- `019` removes internal privileged helpers from the exposed API schema and pins trigger `search_path`.
- `020` adds covering foreign-key indexes and optimizes profile RLS identity evaluation without weakening isolation.

Do not squash these into `012`, rewrite applied history, or omit them from a target delta.

## 3. Disposable-project rehearsal

For a new empty database:

1. Apply migrations `001–011`.
2. Run `supabase/dev/seed_test_data.sql`.
3. Apply migrations `012–020` in filename order.
4. Run:

```text
supabase/tests/012_security_hardening_audit.sql
supabase/tests/012_security_role_tests.sql
supabase/tests/013_access_lifecycle_and_audit.sql
supabase/tests/014_private_client_documents.sql
supabase/tests/015_reject_client_account_reassignment.sql
supabase/tests/016_attribute_service_operations_to_trainer.sql
supabase/tests/017_owner_assignment_role_helper.sql
supabase/tests/018_checkin_rpc_conflict.sql
supabase/tests/019_private_helper_boundary.sql
supabase/tests/020_performance_safety_indexes.sql
```

Every script must finish with its explicit completion message. A script that was not executed is not a passed script.

Capture only migration names, completion messages, timestamps, advisor summaries, and pass/fail status. Never attach passwords, tokens, real emails, row content, or health information.

### Staging history note

The connected execution tool split canonical migration `013` into two smaller staging submissions because its safety layer rejected the combined request. The repository's canonical history remains one file: `013_access_lifecycle_and_audit.sql`.

Do not reproduce the staging-only split in production migration history.

## 4. Target inventory and drift report

The production-sensitive target currently has Studio Las tables but no visible `supabase_migrations.schema_migrations` relation. Therefore:

- do not run `db reset`,
- do not run `migration repair`,
- do not fabricate migration records,
- do not issue a blind `db push --include-all`,
- do not assume the target equals migrations `001–011` merely because table names match.

First capture a read-only inventory:

- table and column definitions,
- constraints and indexes,
- functions and signatures,
- grants,
- RLS enable/force state,
- policies,
- Storage buckets and policies,
- Auth configuration relevant to the portal,
- non-sensitive row counts,
- current functions or views that will be removed.

Compare that inventory with a clean database built from `001–020`. Produce a reviewed, non-destructive delta. The delta must preserve existing process data and explain every destructive statement.

Migration `012` intentionally removes the obsolete `client_access_credentials` table and historical client projection views. Confirm that no active runtime still depends on them before target execution.

## 5. Target backup gate

Before applying any target delta:

- create a database backup or verify a restorable platform backup,
- prove restoration in a disposable environment where feasible,
- export and inventory historical browser data through the local-only tool,
- record non-sensitive table counts,
- record the current target schema fingerprint,
- confirm the retired browser runtime is not being used for new writes.

A backup that has not been tested or platform-confirmed is not a passed gate.

## 6. Edge Function configuration

The `client-access` function is authenticated twice:

- platform JWT verification is pinned on in `supabase/config.toml`,
- `withSupabase({ auth: "user" })` validates the signed-in user inside the function.

Set exact custom secrets separately for staging and target:

```powershell
supabase secrets set `
  STUDIO_LAS_ALLOWED_ORIGINS="https://trenermedycznywarszawa.github.io" `
  STUDIO_LAS_CLIENT_REDIRECT_URL="https://trenermedycznywarszawa.github.io/studio-las-v15/studio-las-os.html" `
  --project-ref <PROJECT_REF>
```

Deploy without disabling JWT verification:

```powershell
supabase functions deploy client-access --project-ref <PROJECT_REF>
```

Never use `--no-verify-jwt`. Never send a service-role value to browser code or repository variables.

## 7. Edge Function role matrix

Use two trainers and fictional clients.

Required scenarios:

1. Owner trainer reads access status for their client.
2. Owner trainer invites only the email stored on that client record.
3. A different email is rejected before an email is sent.
4. Assistant or unrelated trainer cannot invite, inspect, or revoke.
5. Client and anonymous callers are rejected.
6. Invitation creates exactly one client profile and one active relationship.
7. Revocation immediately blocks portal and check-in RPC access.
8. A second active account cannot be attached to the same client.
9. One account cannot be active for two clients.
10. Conflict attempts do not revoke or transfer the existing relationship.
11. Re-linking the same pair is idempotent.
12. A trainer Auth account cannot be linked as a client.
13. Link and revoke audit rows are attributed to the verified owner trainer.

Do not use a real client to prove these scenarios.

## 8. Auth configuration and password flows

Before email testing, apply the separate Auth configuration gate in `02_SUPABASE_AUTH_CONFIGURATION_GATE.md`.

Required controls include:

- exact production Site URL and redirect allowlist,
- public and anonymous signup disabled,
- manual identity linking disabled,
- unused providers disabled,
- server password minimum of at least 12 characters,
- leaked-password protection enabled when the project plan supports it,
- custom SMTP and verified SPF/DKIM/DMARC,
- reviewed rate limits and abuse protection,
- no health or process information in Auth emails.

Required invitation and recovery tests:

1. Actual delivered links redirect only to the configured Studio Las OS URL.
2. Runtime accepts only `invite` and `recovery` password contexts.
3. Tokens are removed from the address bar immediately after consumption.
4. Password setup appears before client data loads.
5. Short or mismatched passwords are rejected.
6. Reload cannot bypass pending password setup.
7. Cancel signs out and clears the pending context.
8. Successful setup opens only the normal RLS/RPC path.
9. Neutral recovery response does not reveal account existence.
10. Expired and reused links fail without exposing identifiers or tokens.
11. If the delivered callback uses an authorization code rather than the supported hash-session format, stop and implement a reviewed exchange flow. Do not weaken PKCE or JWT checks.

## 9. Private document Storage matrix

Confirm in both staging and target:

- bucket `studio-las-client-documents` is private,
- only `application/pdf` is accepted,
- object size is limited to 10 MB,
- object path begins with the related client UUID,
- trainer A cannot read or write trainer B objects,
- clients cannot upload, update, or delete,
- client reads require matching published `client_documents` metadata,
- draft, trainer-only, archived, or soft-deleted documents are inaccessible.

No document upload UI may be enabled before the target matrix passes.

## 10. Audit verification

Verify that `security_audit_events`:

- has RLS enabled and forced,
- deliberately has no browser policy,
- cannot be selected or modified by normal authenticated users,
- records actor, time, table, row, related client, action, and changed column names,
- attributes server account operations to the verified owner trainer,
- does not contain health values, notes, reports, contact data, passwords, tokens, or raw payloads.

The audit is an investigation log, not a second client record.

## 11. Advisor review

Run Supabase security and performance advisors after target migration.

Acceptable documented staging findings:

- the audit table has forced RLS and intentionally no policies,
- the three intentionally exposed and separately tested privileged RPCs are:
  - `client_portal_snapshot()`
  - `save_client_checkin(...)`
  - `trainer_client_access_status(uuid)`
- unused-index information on fresh staging is not evidence for index removal.

Not acceptable as unresolved target findings:

- anonymous table or RPC access,
- internal privileged helpers exposed as browser RPCs,
- mutable function `search_path`,
- uncovered foreign keys added by this schema,
- per-row Auth evaluation in profile policies,
- leaked-password protection disabled when available and approved for the target plan.

## 12. Target execution and evidence

Apply only the reviewed target delta after the backup, Auth, MFA, and privacy gates are ready. Repeat every database, Edge Function, password, Storage, conflict, attribution, advisor, and role test.

PR #9 may be marked ready only when its deployment evidence contains:

- target project ref,
- reviewed target drift report,
- backup confirmation,
- applied migration/delta list through `020`,
- database test completion messages,
- Edge Function deployment version or timestamp,
- role and reassignment matrix,
- invitation and recovery callback matrix,
- service-operation trainer attribution result,
- private Storage result,
- Auth and leaked-password setting result,
- trainer MFA `aal2` result,
- confirmation that only fictional data was used for testing.

Evidence must not contain secrets, tokens, passwords, or client data.

## Rollback rule

Any failed migration, access, password, attribution, MFA, advisor, or Storage test is a stop condition.

Do not reopen anonymous access, restore local codes, disable JWT verification, add a browser service-role key, grant broad table access, or bypass RLS. Restore from the verified backup or prepare a reviewed forward-fix migration.

## Out of scope of technical rollout

Passing this rollout does not establish legal compliance with RODO or other health-data obligations. A qualified privacy/legal review must confirm legal bases, Article 9 conditions, information duties, processor agreements, retention, data-subject rights, incident procedures, and actual production data flows.
