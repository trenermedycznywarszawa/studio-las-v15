# Phase 5 source classification and reconstruction record

## Client-origin evidence inventory

| Record | Class | Actual boundary / deliberate mutability |
|---|---|---|
| Guidance client responses (`client_checkin`, historical `daily_step`) | A: original evidence | Original rows immutable; attributed corrections and interpretations appended separately. Auth-derived new narrative submission. Prior stages tested. |
| Public first-contact submitted fields | A: original evidence | `inquiries` grants authenticated SELECT only. Controlled operational RPCs update contact/lifecycle fields, not submitted words/contact/source versions. No new versioning layer needed. |
| First-contact contact status, next action, conversion | B: operational state | Controlled owner+AAL2 operations. Conversation decisions separately attributed/versioned. |
| Imported intake nonempty `raw_payload` and source provenance | A: original evidence | New guard freezes raw payload, source, import/creation identity and soft deletion; physical deletion blocked too. Identity/client link immutable. No historical values rewritten. Empty raw payload is not invented original evidence. |
| Intake normalized summary, goals, flags, trainer notes | C: normalized/derived | Remain trainer-editable under existing RLS; must not be presented as verbatim original responses. This change does not claim these fields have immutable revision history. |
| Pre-session checks | B: trainer operational assessment | Current repository/RLS expose trainer writes only; no current client form or client write policy. Preserve existing records; no automatic source relabeling as client-authored evidence. Dormant legacy boolean writer/defaults remain outside current forms and must be redesigned before reactivation. |
| Session/PWD/assessment/training-load/body measurement | B: attributed trainer records or C: imported measurements | Existing trainer workflow and RLS; not client-authored originals. Future report sources need a captured dated excerpt, not an assumption of immutable generic trainer rows. |
| External legacy broad questionnaire submissions | D: historical external records | Source page retired. No external records accessed/deleted; provider retention and legal decisions remain owner responsibilities. |

This is a scoped integrity statement, not a claim that every historical table is immutable. Privileged retention/deletion of guarded originals requires a deliberate maintenance procedure; no application purge route was added.

## Reconstruction status: PARTIAL

Canonical branch: `codex/post-audit-rebuild-2026-09-08`, Draft PR #66. Each build records its exact source SHA/branch/dirty flag and per-file SHA256 with a deterministic aggregate payload hash. The manifest excludes itself from hashing to avoid circular identity. A dirty build is explicitly labeled; final deploy must be built from a clean checkpoint.

Run `node scripts/build_studio_las_os_deploy.mjs --staging` for a preview artifact. This creates the existing allowlisted OS bundle and replaces only the generated runtime config with canonical staging (`ulauyoqjoetjqktegeuq`) and its public publishable key. It does not modify the repository production configuration. Never deploy a default/source-config bundle as staging. No secret/service key is embedded.

The public questionnaire retirement is outside the OS bundle allowlist; its separate public-site release remains pending owner production approval.

### Product migration mapping

| Repository migration | Hosted staging version |
|---|---|
| `20260908131947_guidance_integrity_boundary.sql` | `20260909055855` |
| `20260909060432_client_observation_history.sql` | `20260909060834` |
| `20260909113836_client_guidance_response_contract.sql` | `20260909114233` |
| `20260909115632_trainer_signal_contact_followthrough.sql` | `20260909120128` |
| `20260910072238_unanswered_assessment_tolerance.sql` | `20260910072337` |
| `20260910073724_imported_intake_source_integrity.sql` | `20260910073921` |
| `20260910074800_manual_report_evidence_boundary.sql` | `20260910122352` |

`20260910073724_imported_intake_source_integrity.sql` → hosted `20260910073921`; local and hosted `IMPORTED_INTAKE_SOURCE_SQL_PASS`. Older migration identity differences already exist (historical numeric names, duplicate numeric prefixes, separately applied staging fixtures). Do not blindly run CLI migration repair or push the whole chain against an existing hosted project. Compare names/content and recorded mapping first. Local fresh-schema replay is ordered lexicographically using the checked-in files; the minimal local Auth/Storage shim is test infrastructure, not cloud recovery.

Temporary hosted overlap probe ledger entries `20260909120935` and `20260909121143` record install/removal only. The probe is absent. They are not production migrations.

### Staging Edge Function inventory — read 2026-09-10

| Function | Revision | verify_jwt | Provider artifact SHA256 |
|---|---:|---|---|
| client-access | 2 | true | `8a3de79524f90a58549595ea98e266662ab692182fe1791120615ce2361a3083` |
| staging-auth-email-maintenance | 4 | true | `83c04e6b9131e69ae033d9d8f98c77baef60a3b5075d115a818ecb38d1348f7a` |
| public-inquiry-ingress | 3 | false | `dacdc3bac511bcb34482a4be5cc42d7bc6abccaffb4472fa8d192bedbe406229` |

Provider artifact identities are inventory evidence, not proof that local source reproduces identical bundles. Function deployment/secrets and Auth redirect/SMTP/MFA configuration must be reconciled for a fresh hosted reconstruction. No secrets were retrieved for this record. Staging-only maintenance functions must not enter production.

### Rebuild and recovery boundaries

1. Check out the exact reviewed SHA; verify clean status. Build the staging allowlist and retain manifest/hash alongside Netlify deploy identity.
2. For an empty local rehearsal database, run `supabase/dev/post_audit_local_platform.sql`, then every repository migration in lexicographic order, failing on the first SQL error. Use only a DB named `studio_las_rebuild_*`. Run rollback-only fictional regression SQL under real roles/claims. This exercises schema behavior, not real Auth service recovery.
3. For a new hosted staging project, first provision/configure Auth, Storage and functions through the provider, reconcile migration ordering/identities against the existing mapping, and set required provider-held secrets through an approved owner channel. Then replay the intended schema and run fictional real-Auth tests. This fresh cloud reconstruction has NOT yet been performed and must not be marked complete from in-place staging tests alone.
4. Existing production-only cleanup known from the completed audit is reconciled in the P0 source migration: restricted `rls_auto_enable` execution and removal of the obsolete four-argument check-in overload. No new production inspection occurred.
5. Production protected backup/restore remains the owner-run gate in `docs/deployment/06_TARGET_BACKUP_AND_RESTORE.md`: encrypted storage, source identification, complete schema/data/roles capture and restore verification. Production data must not be copied into this work session. Credentials, SMTP, Auth user factors, Storage objects and external provider retention are separate recovery boundaries.

Netlify preview identity and final clean source SHA remain pending the final preview step. Production merge/deploy remains unauthorized.
