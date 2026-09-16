# Production Target Schema Drift Report

Date: 2026-07-13
Target project ref: `ufcumhbnuyernuwepcij`
Comparison project ref: `ulauyoqjoetjqktegeuq`
Status: read-only schema comparison complete; target unchanged

## Scope and privacy boundary

This report compares database catalogs, object definitions, grants, policies, triggers, Storage metadata, and migration-blocking aggregate counts.

It does not contain:

- client names or emails,
- health or measurement values,
- trainer notes,
- report content,
- document paths or files,
- passwords, tokens, or secret keys,
- raw database rows.

The production-sensitive target was not modified.

## Executive conclusion

The production-sensitive target is structurally close to the historical pre-hardening Studio Las schema. A reviewed forward delta based on migrations `012–020` is technically plausible; a full database rebuild is neither indicated nor approved.

This conclusion is deliberately limited:

- it does not authorize migration execution,
- it does not replace a restorable backup,
- it does not repair or fabricate missing migration history,
- it does not complete Auth, MFA, or privacy/RODO gates,
- it does not prove that the current public runtime has stopped using legacy objects.

## High-confidence alignment

### Shared tables

The target and clean staging each contain `23` Studio Las tables, but not the same set:

- the target contains the obsolete `client_access_credentials` table,
- staging contains the new `security_audit_events` table.

There are `22` shared tables.

- `21` shared tables have identical column-definition fingerprints.
- `clients` differs only by the expected canonical `engagement_type` column and constraint introduced by migration `012`.

No unexplained shared-table column drift was found.

### Shared indexes

Existing indexes on shared pre-hardening objects match the clean staging definitions. Staging adds only the expected hardening indexes:

- two one-active-account relationship indexes,
- metadata-audit indexes,
- nine covering foreign-key indexes from migration `020`.

The target also has indexes belonging to the obsolete access-code table; those disappear with that table.

### Shared constraints

All shared table constraints match except the two documented forward changes:

1. `clients_engagement_type_check` is new in staging.
2. `body_measurements_muscle_mass_check` changes from the target's historical `15–150 kg` range to the canonical `0–120 kg` range.

The aggregate preflight found no target measurement outside the canonical `0–120 kg` range, so the constraint replacement is not currently blocked by existing data.

## Expected removals

Migration `012` intentionally removes:

- table `client_access_credentials`,
- view `client_active_home_plan`,
- view `client_guidance_status`,
- view `client_portal_summary`,
- view `client_visible_measurements`,
- view `client_visible_reports`.

The legacy access table is not empty. Therefore its removal is destructive and requires:

- a verified backup,
- confirmation that the retired browser runtime is no longer issuing or consuming local access codes,
- confirmation that client access will switch to Supabase Auth and the reviewed account lifecycle,
- no attempt to recreate access-code data in the new architecture.

Catalog search found no additional database view or function containing references to these legacy objects. Application/runtime dependencies remain a separate release check.

## Expected additions

The clean `001–020` staging schema adds:

- `clients.engagement_type`,
- canonical engagement constraint and backfill,
- active relationship uniqueness indexes,
- `security_audit_events`,
- 22 metadata-audit triggers,
- private authorization helpers,
- client snapshot and check-in RPCs,
- owner account-lifecycle RPCs,
- private document Storage bucket and policies,
- covering foreign-key indexes.

## RLS and policies

### Target

- all `23` public tables have RLS enabled,
- `0` public tables have forced RLS,
- policies reflect the historical pre-hardening model,
- `guidance_events` still has direct client table policies,
- access-code policies and old client projection grants remain.

### Clean staging

- all `23` public Studio Las tables have RLS enabled and forced,
- clients access process data through narrow RPCs rather than base-table policies,
- trainer assignment and client-account writes are owner-only,
- internal privileged helpers live in the non-exposed `private` schema,
- the audit table has no browser policy by design.

Policy fingerprints differ exactly where migrations `012`, `017`, `019`, and `020` replace the authorization contract.

## Function drift

The target still contains the historical function boundary:

- old `save_client_checkin` accepts browser-supplied client identity and date,
- `rls_auto_enable()` is privileged and executable by `anon`,
- `is_current_trainer_profile(uuid)` remains,
- authorization helpers are privileged functions in the public schema,
- `set_updated_at()` has no fixed `search_path`.

Clean staging contains the expected replacement:

- Auth-derived `client_portal_snapshot()`,
- Auth-derived validated `save_client_checkin(...)`,
- owner-only `trainer_client_access_status(uuid)`,
- service-role-only link and revoke RPCs,
- metadata audit trigger function,
- real authorization helpers in `private`,
- non-executable public compatibility wrappers,
- pinned function `search_path` values.

No unexpected target function was identified as a reason to rebuild the database.

## Trigger drift

On the target, each historical Studio Las table has only its normal `updated_at` trigger.

On clean staging, each of the `22` protected mutable tables has:

- its existing `updated_at` trigger,
- one additional metadata-audit trigger.

No unknown target business trigger was found that would be overwritten by the canonical migration chain.

## Grant drift

For common tables other than `clients`, browser-role grant fingerprints match the pre-hardening grants retained by staging.

Expected differences:

- target grants remain on the obsolete access table and five old views,
- staging removes those objects,
- staging restricts `clients` update privileges to an explicit column list,
- privileged account-lifecycle functions are not executable by normal authenticated users.

No custom per-client or per-trainer grant exception was identified.

## Storage drift

The production-sensitive target currently has no Storage bucket.

Clean staging has exactly one Studio Las bucket:

- `studio-las-client-documents`,
- private,
- `application/pdf` only,
- 10 MB maximum,
- trainer access scoped to client ownership/assignment,
- client read only after explicit metadata publication,
- no client upload, update, or delete policy.

Creating this bucket is additive. It does not justify enabling document uploads before target Storage tests pass.

## Aggregate migration preflight

The read-only aggregate checks found:

- no body-measurement row that violates the canonical muscle-mass constraint,
- no user linked to multiple active clients,
- no client linked to multiple active users,
- no duplicate active client check-in group,
- the legacy access-code table is non-empty,
- every client row maps to one of the `engagement_type` backfill branches,
- the default twelve-week-process branch is exercised and must be reviewed as a business-semantic decision before target execution.

Exact production counts are intentionally not copied into this public repository document.

## Migration-history risk

The target has no visible:

`supabase_migrations.schema_migrations`

Therefore the following remain prohibited:

- blind `supabase db push --include-all`,
- `db reset`,
- migration-history fabrication,
- migration repair without a reviewed baseline,
- assuming that the target has executed migrations merely because object names match.

The schema comparison supports a forward delta, not history reconstruction.

## Reviewed forward-delta shape

Subject to backup and release gates, the target delta should be based on the canonical migrations in this order:

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

Do not copy the staging execution tool's technical split of migration `013`. The repository's single `013_access_lifecycle_and_audit.sql` file remains authoritative.

## Stop conditions before target execution

Do not apply the target delta until all conditions below are true:

1. A restorable target backup or platform backup is verified.
2. The current public runtime is confirmed not to depend on access codes or old views.
3. The default engagement-type mapping branch is reviewed and accepted.
4. The Auth configuration gate is completed.
5. Exact Edge Function origin and redirect secrets are configured and tested.
6. Invitation, recovery, and password setup work with fictional accounts.
7. Mandatory trainer TOTP MFA and `aal2` enforcement are complete.
8. The privacy/RODO legal gate is complete.
9. A maintenance/rollback plan exists for the target change.
10. The post-delta tests `012–020` and Supabase advisors are ready to run immediately.

Any failed migration or authorization test is a stop condition. Use a reviewed forward fix or restore from the verified backup; do not weaken RLS or reintroduce local access codes.

## Repeatable evidence

The catalog and aggregate checks used for this report are committed as:

`supabase/tests/target_read_only_preflight.sql`

This file is SELECT-only and must remain free of row-level client output.
