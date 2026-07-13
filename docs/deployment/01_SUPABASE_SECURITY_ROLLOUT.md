# Studio Las OS — Supabase security rollout

## Purpose

This is the mandatory deployment gate for PR #9.

The repository contains the security design and tests. It does not prove that the
same policies are active in the linked Supabase project. Real client health or
process data must not be entered until every gate below passes in the target
project.

Project ref currently used by the public runtime:

`ufcumhbnuyernuwepcij`

Do not put database passwords, access tokens, secret keys, exported health data,
or service-role credentials in GitHub, chat, screenshots, shell history, or test
fixtures.

## Required operator access

The operator needs locally configured access to:

- branch `agent/security-architecture-hardening`,
- Supabase CLI,
- the target Supabase project,
- a disposable or staging Supabase project,
- the project database password or an equivalent authenticated CLI session.

Use a password manager or protected environment variables. Never commit `.env`
files containing credentials.

## Non-negotiable order

1. Validate locally and in CI.
2. Rehearse the complete migration on a disposable project.
3. Run database metadata and role tests.
4. Deploy and test the Edge Function in staging.
5. Verify private Storage policies.
6. Back up the target project.
7. Apply the same changes to the target project.
8. Repeat all tests against the target configuration.
9. Only then mark PR #9 ready for review and release.

Do not merge first and “fix production afterwards.”

## 1. Repository verification

From the repository root:

```powershell
python scripts/verify_studio_las_os.py
python scripts/verify_access_lifecycle.py
npx -y deno check supabase/functions/client-access/index.ts
```

All commands must finish successfully.

## 2. Link the CLI safely

```powershell
supabase login
supabase link --project-ref ufcumhbnuyernuwepcij
supabase projects list
supabase migration list --linked
```

If migration history does not match the repository, stop. Do not use `db reset`,
`migration repair`, or a forced push until the mismatch is explained and recorded.

## 3. Dry-run the database change

```powershell
supabase db push --linked --include-all --dry-run
```

Expected new migrations:

- `012_security_hardening.sql`
- `013_access_lifecycle_and_audit.sql`
- `014_private_client_documents.sql`
- `015_reject_client_account_reassignment.sql`

Review the plan. Any unexpected destructive operation is a blocker. Migration
`012` intentionally removes the obsolete local access-credential table and old
client-safe views. It must not delete client process records.

Migration `015` is a fail-closed access safeguard. It prevents an existing account
from being silently moved to another client and prevents a client record from
having its existing active account silently replaced. Reassignment requires an
explicit revoke first.

## 4. Disposable-project rehearsal

Create or select a disposable project containing no real client data. Apply the
full migration chain in repository order.

Run the fake seed and tests:

```text
supabase/dev/seed_test_data.sql
supabase/tests/012_security_hardening_audit.sql
supabase/tests/012_security_role_tests.sql
supabase/tests/013_access_lifecycle_and_audit.sql
supabase/tests/014_private_client_documents.sql
supabase/tests/015_reject_client_account_reassignment.sql
```

Every script must finish with its explicit completion message. A script that was
not executed is not a passed script.

Capture only non-sensitive output: migration names, completion messages,
timestamps, and pass/fail status. Never attach passwords, tokens, real emails,
raw rows, or health information to the PR.

## 5. Edge Function configuration

The function is authenticated twice:

- platform JWT verification is pinned on in `supabase/config.toml`,
- `withSupabase({ auth: "user" })` validates and supplies the signed-in user
  context inside the function.

Set only these custom function secrets:

```powershell
supabase secrets set `
  STUDIO_LAS_ALLOWED_ORIGINS="https://trenermedycznywarszawa.github.io" `
  STUDIO_LAS_CLIENT_REDIRECT_URL="https://trenermedycznywarszawa.github.io/studio-las-v15/studio-las-os.html" `
  --project-ref ufcumhbnuyernuwepcij
```

Do not pass service-role values or database passwords as repository variables.
Supabase supplies the privileged server context to the Edge Function.

Deploy without disabling JWT verification:

```powershell
supabase functions deploy client-access --project-ref ufcumhbnuyernuwepcij
```

Never use `--no-verify-jwt`.

## 6. Edge Function role tests

Use two trainers and fictional clients in staging.

Required scenarios:

1. Owner trainer reads access status for their client.
2. Owner trainer sends an invitation to the email stored on that client record.
3. A different email is rejected.
4. Assistant or unrelated trainer cannot invite, inspect, or revoke access.
5. Client cannot invoke owner-only actions.
6. Anonymous request is rejected.
7. Invitation creates or links exactly one client profile and one active
   `client_users` relationship.
8. Revocation immediately makes `client_portal_snapshot()` and
   `save_client_checkin()` inaccessible to the revoked account.
9. A second active account cannot be attached to the same client.
10. One account cannot be active for two clients.
11. Attempting either conflict does not revoke or transfer the existing link.
12. Re-linking the same account/client pair is idempotent.

Do not use a real client to prove these scenarios.

## 7. Private document Storage tests

Confirm that:

- bucket `studio-las-client-documents` is private,
- only `application/pdf` is accepted,
- object size is limited to 10 MB,
- object path starts with the related client UUID,
- trainer A cannot read or write trainer B client objects,
- a client cannot upload, update, or delete objects,
- a client can read only an object whose `client_documents` row is explicitly
  `audience = client`, `status = published`, and has `published_at` set,
- draft, trainer-only, archived, or soft-deleted documents are inaccessible.

No document upload UI should be enabled until these checks pass in the target
project.

## 8. Audit log verification

Verify that `security_audit_events`:

- has RLS enabled and forced,
- cannot be directly selected or modified by normal authenticated users,
- records inserts and updates to protected process tables,
- records actor, time, table, row identifier, related client identifier, action,
  and changed column names,
- does not contain health values, notes, report text, contact data, or raw payloads.

The audit log is an incident-investigation tool, not a second copy of the client
record.

## 9. Target backup and deployment

Before applying migrations to the target project:

- create a database backup or verify a restorable platform backup,
- export and inventory historical browser data through the dedicated local tool,
- record current table counts without exposing row content,
- record current migration history,
- confirm there is no active use of the retired runtime.

Run the dry-run again, then apply:

```powershell
supabase db push --linked --include-all
```

Repeat every database, Edge Function, Storage, conflict, and role test from this
document against the target project.

## 10. Release evidence

PR #9 may be marked ready only when it contains a deployment comment with:

- target project ref,
- applied migration list `012–015`,
- database test completion messages,
- Edge Function deployment timestamp or version,
- role and reassignment matrix pass/fail,
- private Storage result,
- backup confirmation,
- confirmation that no real health data was used in testing.

The comment must not contain secrets or client data.

## Rollback rule

A failed migration or access test is a stop condition.

Do not reopen anonymous access, restore local codes, disable JWT verification,
add a browser service-role key, grant broad table access, or bypass RLS. Restore
from the verified backup or prepare a reviewed forward-fix migration on a separate
branch.

## Out of scope of technical rollout

Passing this rollout does not by itself establish legal compliance with RODO or
other health-data obligations. A separate legal/privacy review must confirm legal
basis, information duties, processor agreements, retention periods, data-subject
rights, incident procedures, and actual production data flows.
