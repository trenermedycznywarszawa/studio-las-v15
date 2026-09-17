# Technical rights capability and retention worksheet

**Status: DRAFT — NOT LEGAL APPROVAL**

This file describes what the system can technically support. It does not decide whether a legal right applies in a given case or what retention period is lawful.

## Rights capability matrix

| Capability | Current technical state | Evidence / limitation |
|---|---|---|
| Access / read by trainer | IMPLEMENTED | Authenticated trainer, owner/client scope, RLS and AAL2/MFA boundaries exist. |
| Client access to own published material | IMPLEMENTED | Client-safe projection/publication model; not unrestricted base-table access. |
| Correction | PARTLY IMPLEMENTED / WORKFLOW-DEPENDENT | Many active records are editable by authorized trainer workflows; immutable historical/versioned records should be corrected through successor/version semantics rather than silent history rewrite. A formal rights-request procedure is not documented here. |
| Portal/account revocation | IMPLEMENTED | Client account lifecycle supports explicit revoke; access relationship is separate from deleting underlying process records. |
| Understandable client export | MISSING AS FORMAL RIGHTS WORKFLOW | Raw SQL/database dump is explicitly insufficient. A curated export process still requires implementation/validation. |
| Restriction of processing | NOT FORMALIZED | Technical access can be revoked and records can be withheld from publication, but a legally approved restriction state/process is not defined. |
| Soft deletion from normal application views | PARTLY IMPLEMENTED | Multiple process tables use `deleted_at`. Soft deletion is not irreversible erasure. |
| Irreversible primary-data deletion | NOT APPROVED AS GENERAL WORKFLOW | No public/client irreversible-delete endpoint should exist. Exact legal review and reviewed admin procedure required. |
| Backup expiry / deletion from DR copies | UNKNOWN | Actual backup mechanism and expiry need documentation and test evidence. |
| Auth account deletion | TECHNICALLY POSSIBLE, WORKFLOW NOT APPROVED HERE | Must be coordinated with session revocation, client relationship state and legal retention requirements. |
| Consent withdrawal event for questionnaire | IMPLEMENTED TECHNICALLY | Immutable questionnaire privacy events can record grant/withdrawal. Legal consequence for previously processed data and further retention is a human/legal decision. |
| Security audit retention | UNDECIDED | Audit is metadata-only, but no final retention period is approved. |

## Retention worksheet

Do not fill a legal period without qualified review.

| Category / storage layer | Examples | Current deletion/expiry mechanics | Approved legal period | Open decision |
|---|---|---|---|---|
| Public inquiry | `inquiries`, `inquiry_decisions` | closure/conversion metadata; `retention_review_at` exists on inquiry | **UNDECIDED** | retention of non-converted / not-fit / unreachable inquiries. |
| Core client identity/contact | `clients`, `client_profile_details` | soft-delete/status patterns exist | **UNDECIDED** | active vs former-client period; emergency-contact data. |
| Health/process notes | intake, sessions, assessments, checks, observations | many tables support soft deletion; some versioned history is intentionally preserved | **UNDECIDED** | necessity, restriction and irreversible erasure rules. |
| Questionnaire responses | assignments/responses | submitted response is designed as immutable evidence; drafts have revision lifecycle | **UNDECIDED** | drafts vs submitted forms; effect of consent withdrawal. |
| Questionnaire consent/privacy evidence | `questionnaire_privacy_events` | append-only/immutable event model | **UNDECIDED** | retention needed to evidence consent/withdrawal. |
| Guidance / Home Plan | `home_plans`, items, guidance events/notes | explicit version, approval, publication, withdrawal and soft-delete fields | **UNDECIDED** | historical prescription retention after supersession/end of process. |
| Measurements | body composition, HR/RPE/load | soft-delete fields on measurement tables | **UNDECIDED** | whether all metrics are necessary and for how long. |
| Reports | `reports`, evidence snapshots, working notes | publication/withdrawal lifecycle plus soft delete | **UNDECIDED** | final client report vs trainer working notes. |
| Client documents | private Storage + `client_documents` | metadata soft delete/status; Storage deletion needs explicit reviewed operation | **UNDECIDED** | primary-object deletion and backup expiry. |
| Auth/account data | Supabase Auth + `profiles` / `client_users` | account/link revoke available; Auth deletion separate | **UNDECIDED** | former-client account removal and session invalidation sequence. |
| Security audit metadata | `security_audit_events` | metadata-only, no content values | **UNDECIDED** | incident/audit retention period. |
| Legacy migration payloads | `legacy_import_*`, controlled exports/backups | status/path metadata; raw payload may persist | **UNDECIDED** | whether raw migrated payload is still needed after verified migration. |
| Rate-limit metadata | private ingress limiter | explicit expiry field | technical short-lived expiry exists | confirm operational purge/expiry implementation and legal relevance. |
| Backups / disaster recovery | provider-specific | **UNKNOWN** | **UNDECIDED** | provider, frequency, restore test, expiry and deletion from backups. |
| GitHub / CI artefacts | code/tests only | repository history is persistent | N/A for client data because real client data is forbidden here | confirm no client data ever enters issues, logs, screenshots or artefacts. |

## Required operational procedures still missing or needing formal approval

1. Identity verification for a rights request.
2. Human-readable export package.
3. Correction procedure for mutable vs immutable/versioned records.
4. Restriction-of-processing procedure.
5. Reviewed irreversible deletion procedure with backup implications.
6. Consent-withdrawal operational decision tree.
7. Former-client account and session lifecycle.
8. Backup expiry and restore evidence.
9. Incident/breach response owner, communication path and evidence handling.
10. Written mapping from each processing purpose to legal basis / Article 9 condition where applicable.
