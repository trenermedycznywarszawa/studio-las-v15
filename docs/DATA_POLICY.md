# Studio Las OS Data Policy

This is a practical internal operating policy for Studio Las.

It is not a final legal document. It does not replace RODO/GDPR review, legal consultation, client consent documents, or a formal privacy policy.

The goal is to keep implementation decisions safe while Studio Las OS is developed.

## 1. Purpose

Studio Las OS collects data only to support the private Studio Las 1:1 process.

Data should help:

- understand the client's starting point,
- document the process,
- support trainer decisions,
- prepare 4/8/12-week reports,
- maintain continuity between sessions,
- avoid relying on memory alone.

Data should not be collected for curiosity, gamification, marketing manipulation, mass profiling, or standalone app analytics.

## 2. Data we may collect

Studio Las OS may contain the following categories.

### Client identity and contact data

- name,
- email,
- phone,
- contact notes,
- package/process status,
- access status.

### Process data

- start date,
- current stage,
- next session date,
- next review date,
- goals,
- fears,
- motivation,
- process notes,
- trainer decisions,
- next milestone.

### Health-related process data

The system may include sensitive process context when it is relevant to training guidance:

- pain notes,
- symptom notes,
- readiness,
- sleep quality notes,
- contraindications,
- red flag notes,
- health history summaries,
- treatment context,
- supplementation context when relevant to the process,
- movement limitations,
- intake flags,
- trainer observations.

### Session and training data

- session date,
- exercises performed,
- RPE,
- HR values entered manually,
- training load observations,
- trainer decision,
- client-safe summary,
- home plan / between-session plan.

### Measurement data

- body measurement values entered manually,
- device-derived values entered manually when used in the studio process,
- trainer interpretation,
- client-safe summary.

### Paper-first protocol data

Future paper-first check-ins should be minimal:

- date,
- client_id,
- protocol_id,
- protocol_done yes/no,
- energy_score 0-10,
- symptom_score 0-10,
- optional note,
- created_at.

No broad daily questionnaire should be added to the check-in.

## 3. Why we collect data

Data is collected to support:

- better trainer decisions,
- safer process adjustments,
- continuity between sessions,
- client-specific guidance,
- future reports,
- internal process learning.

Every field needs a clear operational reason.

If a field does not help the trainer, the client, or the report, it should not be collected.

## 4. Who has access

Trainer access:

- The trainer may see full process records for active clients.
- Trainer notes are trainer-facing by default.
- Trainer interpretation remains contextual and human-led.

Client access:

- The client may see assigned instructions.
- The client may see client-safe summaries.
- The client may see published reports or materials intended for the client.
- The client should not see full trainer notes, internal reasoning, raw risk notes, or private decision logic unless explicitly converted into a client-safe summary.

Technical/admin access:

- Technical access should be limited to what is necessary for maintenance.
- Production data should not be used for casual testing.
- Debugging should use minimal data and avoid exposing sensitive content.

## 5. What the client does not see

The client should not see by default:

- full trainer notes,
- internal risk notes,
- raw intake flags,
- private hypotheses,
- internal decision logic,
- other clients' data,
- unpublished reports,
- draft summaries,
- technical identifiers,
- raw logs.

Client visibility should be explicit, not accidental.

## 6. Where data is stored

Current intended storage layers:

- Supabase for structured process data.
- Browser localStorage fallback may still exist for legacy/dev operation and must not be removed without a separate migration plan.
- GitHub repository must never contain real client data or secrets.

Sensitive process data should not be stored in:

- URLs,
- query strings,
- browser console logs,
- push-style messages,
- commit history,
- public test fixtures,
- screenshots shared publicly,
- issue descriptions,
- pull request comments,
- static public files.

## 7. Working retention principle

This is an operational principle, not a final legal retention policy.

Working rule:

- Active clients: keep data needed to conduct the current process.
- Recently finished clients: keep data needed for final report, continuity, and legitimate studio operations.
- Long-term history: keep only what has a clear operational, legal, accounting, or client-continuity reason.
- Access should be revoked when cooperation ends, even if internal records are retained for a justified period.

A final retention schedule requires later RODO/legal consultation.

## 8. Data minimization

Collect the smallest amount of data that supports the process.

For daily paper-first check-ins, do not collect:

- full mood diary,
- nutrition diary,
- sleep tracker details,
- step count,
- HRV,
- wearable data,
- long symptom inventories,
- generic wellness scores,
- unrelated lifestyle surveillance.

Minimal daily signal is enough:

- done yes/no,
- energy 0-10,
- symptoms 0-10,
- short optional note.

## 9. Confidentiality rules

- Treat all health-related process data as confidential.
- Share client-facing summaries only when intentionally written for the client.
- Do not expose private notes through accidental UI reuse.
- Do not use real client data in examples, seeds, screenshots, prompts, or demos.
- Do not put real client cases into development tasks unless they are anonymized and necessary.

## 10. Forbidden technical patterns

Do not put sensitive data in:

- URL paths,
- query parameters,
- hash fragments,
- browser logs,
- analytics events,
- push-style messages,
- local test screenshots,
- public GitHub files,
- raw frontend error messages shown to clients.

Do not implement:

- push notifications,
- wearable ingestion,
- automatic diagnostic conclusions,
- client-facing AI recommendations,
- broad daily tracking without a report/trainer decision purpose.

## 11. RODO/legal open question

OPEN QUESTION:

A lawyer/RODO consultant should later review:

- consent wording,
- privacy notice,
- data retention schedule,
- client access/revocation process,
- data export/deletion process,
- processor relationships,
- Supabase configuration and region implications,
- handling of sensitive process data,
- incident response procedure.

Until that review, this document is an internal product safety policy, not a final legal compliance document.
