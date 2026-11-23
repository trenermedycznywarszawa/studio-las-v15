# Studio Las OS — Internal Data Safety Policy

## Status

This is an internal technical and operational safety policy.

It is **not** a privacy notice, consent form, record of processing activities,
legal opinion, or confirmation of RODO/GDPR compliance.

Real client health or process data must not be entered into Studio Las OS until:

1. PR #9 live Supabase rollout passes,
2. mandatory trainer MFA is enforced,
3. the legal/privacy gate in the repository is approved by a qualified person,
4. the actual production data flows match the approved documentation.

## 1. Purpose limitation

Studio Las OS exists only to support the private trainer-led Studio Las 1:1
process.

Data may be used to:

- understand the client's starting point,
- document sessions and relevant process context,
- support trainer decisions,
- provide assigned guidance,
- prepare trainer-approved reports,
- maintain continuity between sessions,
- protect the client from relying on memory or disconnected notes.

Data must not be collected or reused for:

- curiosity,
- gamification,
- advertising profiling,
- social proof,
- automated medical decisions,
- mass analytics,
- sale of an app or dataset,
- unrelated AI training,
- employee or client surveillance.

Every production field needs a documented operational purpose. A field without a
current, approved purpose must not be collected.

## 2. Data categories currently represented by the schema

### Identity and contact

- name,
- email,
- phone,
- contact note,
- account and access state,
- cooperation type and process status.

### Process and coaching

- start and review dates,
- current process stage,
- goals and milestones,
- motivation and fears when relevant,
- trainer decisions,
- session summaries,
- assigned home guidance,
- client-safe summaries,
- reports.

### Health-related process context

The system can contain information that may be special-category health data or
closely related sensitive context, including:

- pain and symptom notes,
- readiness and sleep-quality observations,
- health history summaries,
- treatment context,
- contraindications,
- red-flag notes,
- movement limitations,
- intake flags,
- trainer observations and hypotheses,
- body-composition measurements,
- heart-rate and perceived-exertion values.

The existence of a database field does not automatically authorize collection.
The legal basis, information duty, necessity and retention period must be approved
before real data is entered.

### Authentication and security metadata

- Supabase Auth identity,
- role and client/trainer relationship,
- session and factor state managed by Supabase Auth,
- metadata-only audit events,
- object paths and publication state for private documents.

Passwords, password-reset tokens, invitation tokens, TOTP secrets and TOTP codes
must never enter Studio Las application tables, audit rows, GitHub, logs,
screenshots, support messages or prompts.

## 3. Approved production storage boundaries

### Structured data

Supabase PostgreSQL is the only production source of truth for structured Studio
Las OS data.

Production must not use:

- `localStorage` for health, process, client, report or plan data,
- browser fallback databases,
- offline queues,
- public JSON files,
- GitHub files,
- spreadsheets as an ungoverned parallel client record.

Historical browser data may be read only by the dedicated local export tool for a
controlled migration. The tool does not upload or delete data automatically.

### Authentication session

The authenticated browser session is stored only in `sessionStorage` for the
current browser tab. It is not a health-data store.

The production Content Security Policy, RLS, MFA gate and Supabase session
configuration are part of the security boundary. Session storage alone is never
an authorization decision.

### Documents

Client documents belong only in the private Supabase Storage bucket:

`studio-las-client-documents`

Current technical contract:

- bucket is private,
- PDF only,
- maximum object size 10 MB,
- object path begins with the related client UUID,
- trainers remain client-scoped,
- clients cannot upload, update or delete,
- a client may read only a document explicitly published to that client in
  `client_documents` metadata.

Document upload UI remains disabled until the live Storage tests pass.

### Audit metadata

`security_audit_events` is a metadata-only incident-investigation trail.

It may contain:

- actor Auth user and profile identifiers,
- time,
- operation,
- table,
- row identifier,
- related client identifier,
- changed column names.

It must not contain:

- field values,
- health notes,
- report text,
- contact data,
- passwords,
- tokens,
- TOTP secrets or codes,
- raw intake payloads,
- document contents.

## 4. Access model

### Trainer

A trainer may access full process records only for clients allowed by ownership or
an explicit trainer assignment.

Before real data is allowed, trainer access must require:

- Supabase Auth,
- an active trainer profile,
- mandatory TOTP MFA,
- an AAL2 session,
- passing RLS and Storage policies.

Assistant access, if used later, must be explicit, minimal and reviewable.

### Client

A client may access only their own intentionally published projection:

- assigned active guidance,
- their own short signal entry,
- trainer-approved summaries,
- published reports,
- explicitly published private documents.

A client must not receive direct access to sensitive base process tables, raw
trainer notes, private hypotheses, risk reasoning, drafts, other clients' data,
technical identifiers or internal audit records.

### Technical and administrative access

Service-role access is allowed only in trusted server-side operations and must
never appear in browser code.

Administrative account operations must:

- verify the owner trainer,
- fail on account/client conflicts,
- be attributed to the initiating trainer in audit metadata,
- never silently move an account between clients,
- never weaken RLS or make data public.

Production data must not be used for casual debugging, demos, screenshots, AI
prompts or automated testing.

## 5. Client-facing publication boundary

Client-facing does not mean raw.

A record is visible to a client only after an explicit publication decision and
only through the approved RPC/Storage projection.

Trainer notes must not be automatically converted into client summaries.
Automated software must not publish interpretations, diagnoses, treatment advice,
progression decisions or alarming risk language.

## 6. Data minimization

Collect the smallest amount that supports the current trainer-led process.

The minimal between-session signal is currently limited to:

- assigned item,
- completion yes/no,
- energy 0–10,
- symptom level 0–10,
- short optional note.

Do not add without an approved purpose and legal review:

- continuous location,
- broad mood diaries,
- nutrition diaries,
- step counts,
- HRV streams,
- continuous wearable ingestion,
- contact lists,
- microphone or camera data,
- social-media data,
- unrelated lifestyle surveillance,
- passive background tracking.

## 7. Forbidden data paths

Sensitive or authentication data must not appear in:

- URL paths or query parameters,
- persistent URL fragments,
- browser console logs,
- analytics events,
- GitHub issues or pull requests,
- commit history,
- public fixtures,
- public screenshots,
- chat or email without an approved secure channel,
- push notifications,
- static GitHub Pages files,
- third-party AI prompts,
- unencrypted local backup folders.

Authentication callback tokens must be removed from the address bar immediately
after consumption.

## 8. Retention and deletion — unresolved legal gate

No final retention period is approved in this document.

Until a qualified privacy/legal review defines the schedule:

- do not enable real production data,
- do not claim that soft deletion satisfies a legal deletion request,
- do not create automatic purge jobs based on guessed periods,
- do not promise indefinite retention,
- do not promise immediate deletion where another legal obligation may apply.

The approved retention schedule must define at least:

- active-client records,
- completed-process records,
- health-related notes,
- reports,
- documents,
- authentication accounts and relationships,
- security audit metadata,
- backups,
- migration exports,
- accounting records outside Studio Las OS.

It must distinguish:

- revoking client portal access,
- soft deletion from normal application views,
- legal restriction of processing,
- irreversible deletion from primary storage,
- expiry from backups and disaster-recovery copies.

## 9. Data-subject rights — unresolved operational gate

Before production, Studio Las needs tested procedures for:

- identity verification of a requesting person,
- access request,
- copy/export in an understandable format,
- correction,
- restriction,
- objection where applicable,
- deletion where applicable,
- withdrawal of consent where consent is used,
- account revocation,
- documenting the request and response without exposing data.

A raw database dump is not an acceptable client export.

No browser or public endpoint may execute an irreversible deletion request without
trainer/admin review and an approved legal workflow.

## 10. Processors, region and transfers — unresolved legal gate

The final documentation must identify the actual production providers and roles,
including at least:

- Supabase project entity, region and contractual terms,
- email/SMTP provider,
- GitHub Pages as the static application host,
- domain/DNS provider if applicable,
- backup provider,
- any support, monitoring or error-reporting service,
- any AI provider that may receive data.

It must verify:

- data-processing agreements,
- subprocessor information,
- international transfer mechanism where relevant,
- access and deletion behavior,
- breach notification obligations,
- production region actually selected.

No provider may be silently added through a frontend library, analytics script,
CDN, form endpoint or support tool.

## 11. Security operations

Before production, Studio Las must have:

- verified backups and restore procedure,
- incident owner and contact path,
- credential rotation procedure,
- trainer MFA recovery procedure,
- account revocation procedure,
- audit-review procedure,
- vulnerability and dependency review process,
- defined response to a lost device or compromised email,
- process for notifying affected persons and authorities where legally required.

A failed security test is a stop condition. The response must not be to disable
RLS, JWT verification, MFA, CSP, private Storage or audit controls.

## 12. Demo, test and development

Only fictional data may be used in:

- demos,
- seeds,
- screenshots,
- automated tests,
- GitHub discussions,
- Codex or ChatGPT prompts,
- development databases.

The demo runtime must remain technically isolated from production configuration,
network data calls and browser persistence.

## 13. Required legal/privacy decision before real data

A qualified reviewer must approve and document:

- controller identity and contact details,
- purposes and legal bases for each data category,
- Article 9 condition for health-related data where applicable,
- necessity of each field,
- information duties and privacy notice,
- whether and where explicit consent is needed,
- retention and deletion schedule,
- data-subject rights workflow,
- processor agreements and transfer safeguards,
- production region,
- incident and breach procedure,
- use of email for invitations and recovery,
- whether a data-protection impact assessment is required,
- actual Studio Las business form and applicable Polish obligations.

Until this approval is recorded, Studio Las OS remains a technical staging system
for fictional data only.
