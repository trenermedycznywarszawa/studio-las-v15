# Pierwszy kontakt v2 — bramka wydania (2026-10-26)

**Status:** PREPARE + STAGING VALIDATED AT DB/RPC LEVEL. Existing production project RESTORED/ACTIVE_HEALTHY; v2 is NOT production-ready.
**Owner:** Studio Las. **Surface:** `ankieta-kontakt.html` (GitHub Pages). **Backend:** `public-inquiry-ingress` (Supabase Edge).
**Sources:** `docs/governance/00_SOURCE_OF_TRUTH_REGISTRY.md`, `docs/constitution/README.md`, `docs/product/01_CLIENT_JOURNEY.md`, `docs/product/02_STUDIO_LAS_METHOD.md`, `docs/architecture/08_INFORMATION_FLOW.md`.

## Scope implemented in this branch

- Public form v2: preferred contact by phone/SMS/email, one required channel, phone-only timing with morning/evening choice, optional multiple broad goals, optional brief text.
- Backward compatible server: old v1 payload still routed unchanged; v2 recognized separately, whitelist validation and validation of channel/goal combinations added.
- Database migration `20261026202658_first_contact_v2_backward_compatible_staging.sql`: additive columns `contact_method`, `broad_goals`; relaxes phone nullability only when validated v2 email method is used; preserves legacy `broad_goal` as a readable first selected goal.
- RPC `ingest_public_inquiry_v2` is restricted to `service_role`; auth/anon have no EXECUTE; existing RLS and owner constraints remain.
- Rate limits, idempotency keys, trainer ownership and notification-without-PII remain in the original ingestion path and are carried forward to v2.
- Existing contact checkbox and privacy notice version remain unchanged. **This is not legal approval of that text.**

## Exact staging evidence

- Project `ulauyoqjoetjqktegeuq` (`studio-las-os-staging`) is ACTIVE_HEALTHY.
- Migration `20261026202658` applied successfully to staging.
- Staging Edge Function `public-inquiry-ingress` deployed as version **6**, verify_jwt=false (public ingress with server-side validation). Production Edge Function untouched.
- `supabase/tests/first_contact_v2_staging.sql` executed via SQL on staging with ROLLBACK:
  - v2 phone, SMS, email-only: PASS;
  - multiple goals and zero chosen goals: PASS;
  - duplicate request idempotency: PASS;
  - original v1 RPC: PASS;
  - malformed email+phone and unknown goal: rejected;
  - subsequent verification: staging ingress remains `enabled=false`, inquiries rows 0, synthetic rate-limit keys 0.
- `supabase/tests/first_contact_v2_email_pwd_staging.sql`: PASS email-only inquiry → owner PWD decision → client with null phone and retained email. PASS rejection for AAL1 and non-owner trainer. These tests use **simulated JWT claims** within a rolled-back SQL transaction, not live authenticated HTTP requests.
- New RPC privileges: anon=false, authenticated=false, service_role=true.
- `supabase/tests/first_contact_v2_rls_staging.sql` executed on staging with synthetic rows + ROLLBACK: **PASS** owner trainer AAL2 can SELECT own inquiry, unrelated trainer AAL2 sees 0 rows, owner AAL1 sees 0 rows. The inquiry policies are: `inquiries_owner_select` PERMISSIVE and `inquiries_trainer_aal2_gate` RESTRICTIVE. Simulated claims, not live Auth.
- Static frontend JS syntax was checked in branch; tests with synthetic DOM scenarios for phone/SMS/email passed.
- Security Advisor shows existing wider project warnings, but no finding for `ingest_public_inquiry_v2`. These unrelated warnings are not declared resolved.

## Production restoration evidence — 2026-10-26 (read-only verification)

- Explicit owner authorization covered only resuming `ufcumhbnuyernuwepcij` (`studio-las-os9-test`), not production SQL, role changes, Edge deployment or PR merge.
- Supabase `restore_project` returned `success: true`. Project progressed `INACTIVE` → `COMING_UP` → `RESTORING` → **`ACTIVE_HEALTHY`**.
- Database connection succeeded with read-only `SELECT current_database(), current_setting('server_version'), now()` on PostgreSQL 17.6.
- Production `list_migrations` succeeded: 53 historical migrations; latest `20261005130543 process_report_guidance_sources`. Production v2 migration `20261026202658` is **NOT applied**.
- Production Edge Functions intact: `public-inquiry-ingress` version **2**, `client-access` version **2**. No new production Edge code was deployed.
- Read-only aggregate counts: `public.clients` **19**, `public.inquiries` **5**, `public.profiles` **5**; historical completeness not verified. No names/emails/phone numbers were retrieved.
- The original production intake config reports `enabled=true`. Existing `public.ingest_public_inquiry` permits only `service_role`; `anon` and `authenticated` cannot execute it. Existing inquiry policies `inquiries_owner_select`, `inquiries_trainer_aal2_gate` persist and RLS is enabled.
- Production schema remains strictly v1: `submitted_phone NOT NULL`; no `contact_method`, no `broad_goals`, no `ingest_public_inquiry_v2`.
- Security Advisor ran: existing warnings `rls_enabled_no_policy` (1, INFO), `authenticated_security_definer_function_executable` (27, WARN) and `auth_leaked_password_protection` (1, WARN). They were not modified or independently cleared.
- Attempts to perform external HTTP smoke tests from the assistant's container were blocked by DNS/network access. **No live form POST test was run.**
- This verification establishes recovered DB connectivity and legacy intake configuration, **not a successful end-to-end submission or proof that automatic email notification currently works**.

## BLOCKERS — do not merge/deploy to production yet

1. **Production availability RESTORED, v2 release NOT authorized**: `ufcumhbnuyernuwepcij` is now `ACTIVE_HEALTHY` following an explicitly authorized restore. The previous automatic pause was confirmed by Supabase emails on 11–12 October 2026. Avoid routing real visitors to staging. The restored environment must undergo live form-to-Edge-to-DB and notification smoke validation before any v2 release. Reference: https://supabase.com/docs/guides/platform/free-project-pausing
2. **Production schema now inspected (read-only)**: original v1 schema and privileges verified; the v2 columns, RPC and migration are absent. Future v2 production SQL and Edge deploy require their own explicit authorization, backup/recovery validation and drift review. Do not blindly apply staging migration.
3. **Privacy gate**: current first-contact HTML still carries a mandatory legacy consent statement and lacks a published link to a verified privacy policy. Repository registry explicitly assigns privacy text to its own owner and flags it as critical. Project and Drive searches found no unambiguous approved first-contact privacy source; do not infer approval from unrelated documents. Confirm controller notice, legal basis (including volunteered health data), processors (Supabase, no-PII notification relay, website fonts), retention and withdrawal/contact rights before releasing v2.
4. **HTTP integration test not run**: staging ingress is intentionally disabled for public requests. Need synthetic POST from allowed origin and record + notification verification (without exposing any personal data), including invalid/duplicate/forbidden origin/rate-limit.
5. **Trainer OS projection and real session not verified**: `broad_goal` contains one readable value for legacy views; `broad_goals` carries all selected goals. A rolled-back SQL scenario proved email-only PWD conversion and simulated AAL1/cross-trainer denial, but **does not prove a real trainer AAL2 HTTP session, actual screen presentation, or cross-tenant RLS from client tokens**. Current Netlify project has no declared site-level environment variables in connector results; this is insufficient to establish runtime backend configuration. Trainer UI must visibly show all goals and contact method.
6. There are no PR-triggered GitHub Actions workflow runs for the current changes; static checks and SQL staging tests are not CI/browser validation. GitHub Pages publishes `main` and can immediately expose v2 after merge; wait for controls 1–5. `main`; merging this PR can expose v2 immediately. Only merge after points 1–5 pass and release approval covers production.

## Recommended release order

1. Confirm restored production health (DONE for DB and metadata); **backup/recovery path verification still outstanding** before modifying schema.
2. Compare current production DB schema/migrations/grants with staging and the additive migration.
3. Apply verified additive migration on production.
4. Deploy backward-compatible Edge Function with exact code from this branch and check v1 still writes.
5. Perform authenticated trainer-read, rejection, permission, idempotency, email-only conversion, and synthetic HTTP ingress tests. Remove any synthetic fixtures.
6. Complete privacy approval and user-facing copy/link alignment.
7. Verify current page HEAD and merge/publish only after successful checks; verify real HTTPS endpoint and visible browser UI in a clean session.
8. Monitor first-contact delivery using metadata only; do not log entered health content or contact details.

## Safe rollback

- **Before merge:** simply leave the Draft PR unmerged and the public v1 form unchanged.
- **If frontend fails after merge:** revert the site commit, leaving backend v2 additive and v1-compatible.
- **If Edge fails:** first revert the public v2 page, then restore previous proven Edge v1 source; keep existing records.
- Do not drop added columns or delete submitted v2 records as a casual rollback.
- Restore-from-backup is for verified data loss scenarios only and needs a separate tested procedure.

**Outstanding validations are NOT PASS. This file records evidence and blockers; it does not grant deployment permission.**
