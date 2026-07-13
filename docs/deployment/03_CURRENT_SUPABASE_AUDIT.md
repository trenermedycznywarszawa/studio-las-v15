# Current Supabase Audit Snapshot

Date: 2026-07-13
Status: pre-rollout evidence; no production changes performed

This document records non-sensitive, read-only observations from the connected Supabase projects. It must not be treated as proof that the security migrations have been applied.

## Environments

### Production-sensitive target

- Project ref: `ufcumhbnuyernuwepcij`
- Current project name: `studio-las-os9-test`
- Region: `eu-west-1`
- Contains real data.
- Must not be used for destructive rehearsal.

### Free staging

- Project ref: `ulauyoqjoetjqktegeuq`
- Project name: `studio-las-os-staging`
- Region: `eu-west-1`
- Created under the Free plan at a reported monthly project cost of `0`.
- Fresh database: no Studio Las tables and no Supabase CLI migration-history table were present at the time of inspection.
- Must contain fictional test identities and data only.

## Read-only target observations

At the time of inspection:

- `23` Studio Las tables existed in the `public` schema.
- all `23` public tables had RLS enabled,
- `0` public tables had `FORCE ROW LEVEL SECURITY`,
- `6` Supabase Auth users existed,
- no `supabase_migrations.schema_migrations` relation was present,
- the historical `client_access_credentials` table still existed,
- the historical client-facing projection views still existed,
- the deployed `save_client_checkin` function still accepted a browser-supplied `p_client_id`,
- the deployed `rls_auto_enable()` function was `SECURITY DEFINER` and executable by `anon`,
- the current client projection views used `security_invoker=false` and depended on security-definer helper functions.

No client rows, health values, names, emails, notes, documents, tokens, passwords or raw payloads were read or copied into this audit.

## Interpretation

The target reflects the pre-hardening schema rather than the contract proposed by migrations `012–016` in PR #9. This is expected before rollout, but it confirms that the target is not ready for client portal release.

The missing migration-history relation creates a schema-drift risk. Do not fabricate or repair migration history before comparing the actual target schema with migrations `001–011` and rehearsing `001–016` from a clean database.

## Required safe sequence

1. Reconstruct the full schema from migrations `001–016` in local Supabase and the free staging project.
2. Run all repository SQL and role tests with fictional identities.
3. Compare the staging schema with the intended migration contract.
4. Produce a non-destructive target drift report.
5. Create and verify a restorable target backup/export.
6. Apply only the reviewed delta to the target.
7. Repeat all role, Storage, Auth, audit and account-lifecycle tests.
8. Do not enable client access until mandatory trainer MFA and the privacy/RODO gate are complete.

## Cost constraint

- Do not create paid Supabase branches or paid infrastructure.
- Prefer local Supabase CLI + Docker for repeatable tests.
- Use the free staging project only for cloud-specific Auth, Storage and Edge Function validation.
- Any future paid service requires explicit owner approval.
