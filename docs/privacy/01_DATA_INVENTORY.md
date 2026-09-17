# Production data inventory

**Status: DRAFT — NOT LEGAL APPROVAL**  
**Observed production schema:** 2026-09-17, read-only catalog query against `ufcumhbnuyernuwepcij`.

This inventory classifies application tables and the columns most relevant to privacy. Column existence is not authorization to collect real data.

## Identity, contact and access

| Table | Relevant columns | Data type / purpose | Visibility / notes |
|---|---|---|---|
| `profiles` | `auth_user_id`, `role`, `display_name`, `email` | identity, role, account linkage | Authenticated internal identity; not a client health record. |
| `clients` | `name`, `contact`, `email`, `phone`, `owner_trainer_id`, `status`, `engagement_type`, dates | identity/contact + service relationship | Trainer-owned base record; contains also health/process fields listed below. |
| `client_profile_details` | `age_observation`, emergency contact name/phone/relation | identity/contact, emergency context | Sensitive contact data; trainer-facing. |
| `client_trainers` | `client_id`, `trainer_id`, `role` | authorization relationship | Security/ownership metadata. |
| `client_users` | `client_id`, `user_id`, `status` | portal account linkage | Access lifecycle metadata. |
| `inquiries` | submitted name/phone/email, contact window, source/request key, status, converted client link | pre-client first contact | Deliberately separate from full health intake. |

## Health, process and trainer interpretation

| Table | Relevant columns | Data category |
|---|---|---|
| `clients` | `goal`, `motivation`, `fears`, `health_status`, `contraindications`, `red_flags_text`, `communication_profile`, `next_milestone`, `working_hypothesis`, `stage` | process context; several fields may contain health or sensitive trainer interpretation. |
| `client_intakes` | `raw_payload`, `summary`, `goals`, `main_goal`, `motivation`, `expectations`, `readiness_text`, `pain_areas`, `medical_flags`, `movement_limitations`, `lifestyle_flags`, `training_preferences`, `flags`, `communication_style`, `compliance_forecast`, `first_session_focus`, `risk_level`, `trainer_notes` | broad intake; may contain special-category health data and private trainer notes. |
| `sessions` | date, readiness, VAS values, mobility index, sleep quality, exercises, trainer observation/decision, milestone, client summary/next step, publication fields, `session_type` | session health/process record and trainer decision. |
| `assessment_results` | test/performance identifiers, pain before/after, result, quality, interpretation, trainer decision/note, reaction, session link, publication fields | assessment/observation + health/process interpretation. |
| `pre_session_checks` | pain increase, sleep, home-plan completion, new symptoms, red-flag concern, planned decision, trainer note | pre-session health/process signal. |
| `post_session_observations` | what was done, client response, decision, home task, client message, publication fields | post-session process record. |
| `training_load_observations` | duration, HR avg/max, zones, RPE, trainer note, client summary, load decision, publication fields | physiological/training-load data; potentially health-related. |
| `body_measurements` | weight, fat %, fat mass, FFM, muscle mass, body water, visceral fat, BMR, metabolic age, BMI, bone mass, protein, trainer interpretation, client summary | body-composition measurements; health-related context. |
| `client_cycle_decisions` | decision, rationale, actor, decided time | trainer-owned process decision; rationale may contain sensitive context. |
| `trainer_signal_reviews` | signal key, outcome, contact-resolution metadata/note | trainer review state; note may contain process context. |
| `inquiry_decisions` | goal in person words, why-now, current barrier, decision, rationale, boundary note, next action, evidence provenance | pre-client trainer decision record; may contain sensitive context even before formal client creation. |

## Guidance, tasks, responses and reports

| Table | Relevant columns | Data category |
|---|---|---|
| `home_plans` | title, focus, frequency, duration, instructions, guidance channel, version/approval/publication/withdrawal fields | trainer-authored guidance and publication lifecycle. |
| `home_plan_items` | exercise, name, dosage, frequency, client cue, stop criteria, trainer note, publication/status | assigned guidance items. |
| `guidance_events` | event date, kind, completion, payload | client/process signal related to guidance. |
| `guidance_observation_notes` | kind, body, reason, creator | private trainer note attached to observation. |
| `guidance_pilots` | status, dates, objective, trainer note | pilot/process metadata. |
| `guidance_pilot_feedback` | understood next step, reduced chaos, friction, simplify next | client/process feedback. |
| `client_tasks` | text, completion, source, due/completed dates | process task record; content may be sensitive depending on use. |
| `reports` | audience, status, title, content, evidence snapshot, trainer working notes, approval/publication/withdrawal fields | consolidated process evidence and trainer-approved client material. |

## Questionnaire lifecycle

| Table | Relevant columns | Data category |
|---|---|---|
| `questionnaire_templates` | key, title, purpose, active | configuration metadata. |
| `questionnaire_versions` | version, immutable definition/hash, release/retire timestamps | immutable questionnaire contract; definition may describe health questions but is not a person's response. |
| `questionnaire_assignments` | client, version, assigned-by, status, goal snapshot, lifecycle timestamps | linkage/process metadata; `goal_snapshot` may contain client-authored process data. |
| `questionnaire_responses` | `answers`, revision, submitted timestamp | client-authored questionnaire response; can contain special-category health data. Draft and submitted lifecycle is server-side. |
| `questionnaire_privacy_events` | event type, consent text version, privacy notice version, actor, timestamps/sequence | immutable consent/withdrawal evidence metadata; does not itself prove legal sufficiency. |

## Documents and storage

| Table / storage | Relevant columns | Data category / boundary |
|---|---|---|
| `client_documents` | client, related record, kind, original name, bucket/path, mime/size, audience, status, publication/deletion timestamps | document metadata. File content belongs in private Supabase Storage. |
| `storage.objects` | bucket, object name/path, owner metadata, timestamps, metadata | storage system metadata. File contents are outside PostgreSQL row inventory. |
| `storage.buckets` | bucket identity, public flag, size and MIME limits | storage configuration metadata. Canonical application contract expects private PDF-only client-documents bucket with 10 MB limit. |

## Audit, migration and abuse-control metadata

| Table | Relevant columns | Data category / rule |
|---|---|---|
| `security_audit_events` | actor IDs, time, action, table, row ID, client ID, changed column names, source | metadata-only audit by design; must not contain field values, contact data, notes or health payloads. |
| `legacy_import_batches` | trainer, source version, storage/backup path, counts, validation, status | migration metadata; paths can reveal operational structure. |
| `legacy_import_records` | source path, legacy/target IDs, `raw_payload`, status, notes | historical migration record; `raw_payload` may contain identity/health/process data and requires the same sensitivity controls as source records. |
| `private.inquiry_ingress_config` | owner trainer, enabled, configured time | server-side routing configuration. |
| `private.inquiry_ingress_rate_limits` | pseudonymous rate key, window/count/expiry/request key | anti-abuse metadata; designed not to persist raw IP/contact/free text. |

## Exercise library

`exercises` contains trainer/workshop content such as exercise names, categories, equipment, instructions, coach notes, mistakes, stop criteria, regressions/progressions, contraindications, video URLs, tags and muscle maps. It is not inherently client personal data, but `owner_trainer_id` and free-text fields should still be treated as internal content. It must not become an uncontrolled client-facing catalogue.

## Soft-delete / publication observations

Many process tables include `deleted_at`; this is application soft deletion, **not** evidence of irreversible erasure. Several tables also contain explicit publication fields (`client_visible`, `published_at`, approval/withdrawal status), supporting separation between internal trainer records and client-safe publication.

## Auth data outside application tables

Supabase Auth manages passwords, sessions, identities and MFA factors outside the application tables above. Passwords, reset/invite tokens, TOTP secrets/codes and challenge material must never be copied into Studio Las tables, audit events, GitHub, screenshots or AI prompts.

## Gaps requiring human/legal decision

- necessity and legal basis for each health-related field;
- whether historical/raw payload fields should remain enabled for future real use;
- exact retention periods by category;
- rules for restriction vs soft deletion vs irreversible erasure;
- whether any trainer hypothesis/note category needs stricter retention/access rules;
- treatment of emergency-contact data;
- former-client and failed-inquiry retention.
