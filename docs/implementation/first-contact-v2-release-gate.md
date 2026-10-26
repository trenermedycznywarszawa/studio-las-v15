# Pierwszy kontakt v2 — bramka wydania (2026-10-26)

**Status:** PREPARE + STAGING VALIDATED AT DB/RPC LEVEL. Not production-ready.
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
- New RPC privileges: anon=false, authenticated=false, service_role=true.
- Static frontend JS syntax was checked in branch; tests with synthetic DOM scenarios for phone/SMS/email passed.
- Security Advisor shows existing wider project warnings, but no finding for `ingest_public_inquiry_v2`. These unrelated warnings are not declared resolved.

## BLOCKERS — do not merge/deploy to production yet

1. **Production Supabase status**: `ufcumhbnuyernuwepcij` (`studio-las-os9-test`, the exact endpoint referenced by the public site) reports `INACTIVE`. Listing schema/migrations failed due to DB timeout. **Do not swap in the staging URL.** Confirm whether this is truly the canonical production project and whether it should be restored; verify backups/restore capability and ownership first.
2. **Production schema**: cannot establish which migrations and policies were applied until production is active; do not blindly apply staging migrations.
3. **Privacy gate**: original form's mandatory contact-consent text remains; repository does not provide a verified, published privacy-policy link for this screen. Privacy/controller/basis/retention and optional disclosure of health-adjacent text require the authorized legal review.
4. **HTTP integration test not run**: staging ingress is intentionally disabled for public requests. Need synthetic POST from allowed origin and record + notification verification (without exposing any personal data), including invalid/duplicate/forbidden origin/rate-limit.
5. **Trainer OS projection not verified**: `broad_goal` contains one readable value for legacy views; `broad_goals` carries all selected goals. Confirm current trainer UI shows all relevant goals and supports email-only contact through conversion to PWD. Existing conversion RPC inserts phone into a nullable client column, but full AAL2 workflow was not end-to-end tested.
6. GitHub Pages publishes `main`; merging this PR can expose v2 immediately. Only merge after points 1–5 pass and release approval covers production.

## Recommended release order

1. Confirm/restore correct production project and establish a tested recovery path and clean backup.
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
