# 13 Data Lifecycle, Access, Audit, and Deletion Contract

**Status:** Stage 1 contract candidate — owner and qualified legal/privacy review required
**Scope:** conceptual lifecycle, access, audit, correction, withdrawal, export, and deletion
**Implementation permission:** none

## Purpose

This contract defines how Studio Las information should be governed from acquisition or creation through restriction, correction, withdrawal, export, and deletion.

It does not establish final retention periods, legal bases, an Article 9 condition, a DPIA result, a privacy notice, a database schema, or production readiness. It is not legal advice.

## Lifecycle principles

1. Keep information only for a named Studio Las process, safety, continuity, decision, reporting, security, or legal purpose.
2. Start retention from a defined event, not an undocumented file date or last login.
3. Keep source, extraction, AI output, trainer meaning, decision, and client material distinguishable throughout the lifecycle.
4. Restrict client visibility independently from whether Studio Las still retains a record.
5. Preserve the minimum audit evidence necessary to prove material actions without duplicating sensitive content.
6. Deletion, anonymization, restriction, withdrawal, and access revocation are different actions.
7. Provider-side copies and backups are part of the lifecycle and cannot be ignored.
8. When legal/operational rules are unresolved, record the decision as blocked rather than inventing a period.

## Retention classes

The following classes define purpose and required fields, not approved durations.

| Class | Examples | Start trigger | End trigger | Default disposition | Decision required |
| --- | --- | --- | --- | --- | --- |
| Source evidence | Form message, pasted inquiry, PDF, Tanita source | Authorized acquisition | Purpose fulfilled plus approved legal/operational period | Delete, return, or irreversibly anonymize when no longer needed, subject to dependencies | Legal/privacy and process owner |
| Working preparation | Gaps, working extraction, AI hypothesis/suggestion, draft | Version creation or task start | Task closed, superseded, rejected, or purpose expires | Delete/minimize early unless needed for a documented decision trail | Owner plus privacy risk decision |
| Trainer process record | Observation, interpretation, decision, session/process continuity | Event/decision time | Relationship/process and approved post-process period end | Retain only decision-relevant history; then delete/anonymize as approved | Legal/privacy and operations |
| Client material | Approved and/or published material | Version creation; publication tracked separately | Superseded, withdrawn, relationship/process and approved post-process period end | Preserve version/publication evidence as required; remove client visibility on withdrawal | Owner plus legal/privacy |
| Security/access audit | Access grants/revocations, forbidden attempts, metadata changes | Security event | Approved security/legal period end | Retain metadata only; no raw health content | Security plus legal/privacy |
| Provider processing copy | Prompt/response or provider metadata, if any | Provider receipt | Exact contractual/configured deletion trigger | Prefer no/limited content retention; verify deletion behavior | Provider, security, legal/privacy |
| Backup/recovery copy | Authorized protected backups | Backup creation | Backup schedule expiry or exceptional hold end | Expire securely; restore must reapply current access/deletion obligations | Security, operations, legal/privacy |
| Legal restriction/hold | Precisely scoped records | Recorded qualified decision | Recorded release decision | Restrict use/access; do not expand scope | Qualified legal/privacy |

Every retained object needs: class, purpose, start event/time, end rule, decision owner, access policy, disposition, dependency treatment, and any hold/restriction. No numerical duration is approved in Stage 1.

## Access model

Access is least privilege, purpose-bound, client-scoped, and revocable.

| Actor | May access | Must not access by default |
| --- | --- | --- |
| Damian | Authorized trainer context needed for the client's Studio Las process, including trainer-only reasoning | Other trainers' clients, unrelated content, unrestricted raw logs, secrets |
| Assistant trainer | Only explicitly assigned client/process content and role-approved actions | Owner-only access lifecycle, publication approval, unrelated clients, unrestricted exports |
| Client | Current explicitly published `client_material`, assigned guidance, their permitted signals and access state | Source artifacts by default, raw extraction, trainer observation/interpretation, hypotheses, AI output, drafts, audit/security data, other clients |
| System service | Minimum data required for one authorized operation | Broad interactive browsing, secondary use, client communication not authorized by workflow |
| AI runtime/provider | Minimum source versions required for one approved task through the server boundary | Direct database browsing, secrets, unrelated client history, client contact, publication, long-lived unrestricted context |
| Support/processor staff | Only contractually and technically controlled exceptional access | Routine access to client content, use for debugging/training without approved purpose |

Authentication alone is not authorization. Client and trainer projections must exclude unauthorized information types and states by construction, and all future production access remains subject to the existing AAL2, RLS, Storage, and isolation gates.

## Minimum audit events

Material events include:

- source acquisition, integrity result, quarantine, subject association, and reassignment;
- creation/versioning of extracted facts, AI output, trainer interpretation/decision, and client material;
- review request, approval, rejection, supersession, and attempted forbidden transition;
- publication and withdrawal of an exact client-material version;
- access grant, role/assignment change, revocation, failed cross-client access, and privileged service action;
- export, correction, restriction, deletion request, disposition decision, deletion/anonymization, and failed deletion;
- provider/model/configuration change and provider processing outcome;
- source loss/invalidation and downstream dependency review;
- restoration from backup affecting a restricted, corrected, withdrawn, or deleted object.

Each event records actor, actor type, time, action, object/version reference, client/process scope, outcome, source channel, reason/authority when required, and correlation ID. Audit must not copy health values, notes, prompts, responses, report content, contact details, or entire payloads into a second datastore merely for convenience.

Audit records are append-only in meaning. Corrections to audit metadata are new linked events.

## Correction contract

Correction never silently rewrites history.

- Original source remains the original source. A corrected source is a new source version or artifact.
- Incorrect extraction is superseded by a corrected `extracted_fact`; the original extraction and correction actor/time remain traceable.
- Trainer observation, interpretation, decision, and client material corrections create new versions.
- Correcting a client-material version after approval invalidates approval for the new version.
- Material corrections trigger dependency review of downstream interpretations, decisions, reports, and published materials.
- The person requesting correction receives an outcome through an approved privacy process; the system does not expose trainer-only reasoning to satisfy the request automatically.

## Publication withdrawal

Withdrawal is governed by the information contract. It must remove the material from current client-visible surfaces while preserving original publication/withdrawal metadata, exact version, actor, time, reason, approval, and provenance.

Withdrawal is not deletion. A later deletion decision evaluates whether the retained withdrawn version or a minimized audit record remains necessary and lawful.

## Access closure and revocation

Closing client access must:

- revoke active account-to-client authorization through the controlled server-side path;
- stop future client reads immediately according to the verified access contract;
- not delete the Studio Las process record automatically;
- not remove Damian's accountability or existing audit events;
- record actor, time, reason, affected client/account scope, and outcome;
- ensure cached links, signed URLs, sessions, and restored backups do not silently restore access.

Account revocation, end of service, withdrawal of a particular publication, and a data-erasure request remain separate events.

## Export

An export requires verified requester identity, authority, scope, destination, and secure delivery. It must:

- include only the approved data scope and current/correct versions as required;
- explain relevant provenance and state without exposing another person or internal security data;
- keep trainer-only content separate pending legal/privacy determination;
- record request, verification, scope, generation, delivery, failure, and expiry/deletion of the export artifact;
- avoid email attachment or public-link delivery by default;
- use no real data in design/staging tests.

Export format and response periods require later legal/operational decisions.

## Deletion and anonymization

A deletion workflow must distinguish:

1. request received;
2. identity and scope verified;
3. dependencies discovered;
4. legal/operational restriction or exception reviewed;
5. Damian/qualified reviewer decision recorded;
6. live data deleted, irreversibly anonymized, or lawfully restricted;
7. derived objects and files handled according to provenance/dependency rules;
8. providers/processors instructed and evidence recorded;
9. backup expiry/restoration controls applied;
10. requester outcome recorded and communicated through an approved channel.

Deleting a source does not justify keeping a full unlinked extraction. Deleting a derivative does not rewrite the source. Where a minimal decision or security trail must remain, it should retain only the metadata needed for the approved purpose and must not masquerade as the deleted content.

Soft-delete flags alone do not prove deletion. Physical storage objects, search/index/cache copies, exports, provider copies, and backups must be included in the later implementation proof.

## Dependency rules

The lineage graph may include:

`source_artifact` → `source_fact` / `extracted_fact` → `ai_hypothesis` / `ai_suggestion` / `trainer_interpretation` → `trainer_decision` → `client_material` / report.

It is not required that every flow use every step. It is required that derivatives retain all material `derived_from` links.

When an upstream object is corrected, deleted, restricted, found to concern another person, or found materially wrong:

- identify every dependent version;
- prevent new use while impact is unresolved;
- return affected drafts/approved content to review as appropriate;
- withdraw affected published material or require explicit Damian revalidation;
- preserve the reason and actions in audit;
- avoid exposing the upstream content to an unauthorized person during remediation.

## AI-provider lifecycle

Before any client content is sent, the provider contract must define what is transmitted, provider-side content/metadata retention, regions/transfers, subprocessors, training/secondary use, abuse/support review, deletion capabilities, incident handling, and data-subject assistance.

Studio Las must be able to connect one provider processing event to the source versions and task without storing raw prompt/response content in ordinary logs. If provider deletion cannot be proved or aligned with the required lifecycle, real-data use remains blocked.

## Attachment deletion

Deleting an attachment must address:

- original private object and every authorized derivative (OCR, preview, working redaction, export);
- metadata and content indexes;
- provider/processor copies;
- cached/signed access;
- dependent extraction and downstream review;
- backup expiry and restore suppression;
- a metadata-only completion/failure event.

Deletion must never expose a different person's document during verification or confirmation.

## Qualified legal/privacy decisions still open

The following require qualified review before production:

- controller identity and purposes for each data flow;
- Article 6 legal basis and Article 9 condition for health-related content;
- whether and how consent applies, and how withdrawal affects processing;
- DPIA requirement and outcome;
- privacy notices for inquiry, intake, Studio Las OS, documents, client portal, and AI processing;
- retention periods and start/end triggers for every class;
- statutory/claims/accounting obligations and exceptions to deletion;
- data-subject request verification, response, restriction, correction, portability/export, and deletion procedure;
- processor agreements, subprocessors, transfers, security measures, and incident duties;
- treatment of data accidentally received about another person;
- backup, audit, and legal-hold proportionality.

Until these are approved, retention fields and classes may be designed, but no arbitrary duration may be presented as final.

## Security and implementation decisions still open

- mapping the conceptual lifecycle to existing structures without semantic collapse;
- auditable exact-version approval/publication without copying content into audit logs;
- dependency traversal and invalidation behavior;
- deletion across database, private storage, providers, caches, exports, and backups;
- export generation and secure delivery;
- privileged operational access and incident review;
- monitoring restored data so withdrawal/deletion is not undone.

`SCHEMA — NOT APPROVED`.

## Exit conditions owned by this contract

This contract is ready for owner review when lifecycle classes, triggers, access boundaries, minimum audit, correction, withdrawal, revocation, export, dependency handling, provider copies, and deletion are explicit, while exact periods and legal conclusions remain clearly assigned to qualified review.
