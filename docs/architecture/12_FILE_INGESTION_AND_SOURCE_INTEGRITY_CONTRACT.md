# 12 File Ingestion and Source Integrity Contract

**Status:** OWNER ACCEPTED — 2026-08-03
**Scope:** manually pasted text, form messages, PDFs, Tanita documents, and future attachments
**Implementation permission:** none

## Purpose

This contract protects original sources from silent alteration, wrong-person association, unsafe parsing, prompt injection, and publication of unverified extraction.

It defines a conceptual ingestion boundary. It does not approve an upload UI, storage path, parser, OCR service, AI provider, schema, migration, MIME allowlist value, file-size value, or production import.

## Source classes

Stage 1 recognizes:

- manually pasted text;
- a message received from a form;
- PDF documents;
- Tanita documents;
- future documents and attachments admitted by a separately reviewed source profile.

Each source class requires its own later implementation profile. A file extension, sender name, browser MIME value, or AI classification is not sufficient proof of type, safety, or client identity.

## Ingestion sequence

A future implementation must preserve the following order:

1. **Acquire** — record acquisition channel, actor, time, claimed filename/type, and claimed subject without trusting them.
2. **Bound** — enforce source-profile size, type, count, and rate limits before parsing.
3. **Identify bytes/text** — determine actual content type and compute a cryptographic content hash where bytes exist.
4. **Safety screen** — isolate unsupported, malformed, encrypted, suspicious, or potentially malicious content.
5. **Preserve original** — store or retain the authorized original separately from all extracted content.
6. **Resolve subject** — propose a client/process association and show evidence; Damian confirms or rejects material cases.
7. **Extract** — create separate `extracted_fact` objects with exact locators, extraction process version, and `derived_from` links.
8. **Validate** — show omissions, conflicts, partial reads, uncertainty, and source comparison to Damian.
9. **Accept or correct** — Damian confirms, corrects, rejects, reassigns, or quarantines the extraction.
10. **Use downstream** — only reviewed derivative objects may support later preparation or decisions; client publication always requires a separate `client_material` and its publication gate.

The order is conceptual and does not imply a database workflow.

## Required source metadata

Every acquired source must be capable of recording:

- source class and acquisition channel;
- acquisition actor and time;
- original sender/origin information when known;
- original name or message identifier;
- claimed MIME type and detected MIME/type result;
- size in bytes or bounded text length;
- cryptographic content hash for immutable byte content;
- exact original version identity;
- claimed client/process and association evidence;
- confirmed client/process or explicit unassigned/quarantined state;
- source date and acquisition date separately;
- original storage/retention reference;
- safety/scan result and quarantine reason;
- extraction process name and version;
- extraction outcome: complete, partial, unreadable, unsupported, failed, or not attempted;
- duplicate/reprocessing relations;
- deletion/restriction state without erasing audit history.

The original and extraction are different objects. The original is `source_artifact`; extracted content is `extracted_fact` and must point back through `derived_from` to the exact artifact version and locator.

## Source integrity rules

- AI, OCR, parsers, and humans may create derivatives; none may overwrite the original.
- Normalization, OCR text, thumbnails, page splits, and redacted working copies are derivatives with their own process/version provenance.
- The content hash identifies byte equality, not truth, correct person, safety, or semantic equivalence.
- A source correction supplied later is a new artifact/version with an explicit relation; it does not rewrite what was originally received.
- A manual correction to extraction creates a new extracted version and preserves the incorrect extraction and correction event.
- Loss of access to the original makes dependent extraction integrity unresolved. It does not promote the extraction to source truth.

## Person and process association

Association requires evidence appropriate to the source class, such as an authenticated submission context, explicit source identifier, or Damian's comparison with known client context. The contract must support:

- confidently matched but still reviewable content;
- ambiguous content;
- content with conflicting identifiers;
- content that belongs to another known or unknown person;
- an unassigned source pending Damian's decision.

A document about another person must never be automatically attached to a client, even if AI reports a high match probability. High confidence is not authorization.

When identity is ambiguous or conflicting:

- quarantine from the client record and downstream AI tasks;
- show the evidence and conflict to Damian without exposing it to the wrong client;
- record Damian's confirm, reject, or reassign action;
- audit both the proposed and final association without copying raw health content to ordinary logs.

## Source profiles

### Manually pasted text

- Preserve the exact submitted text and identify the person who pasted it.
- Record the claimed origin and message boundary separately from the paste action.
- Do not treat Damian's paste as proof that Damian authored the underlying words.
- Truncation or formatting loss must be visible before extraction.

### Form message

- Preserve provider message/submission identity and receipt time when available.
- Treat form fields as source claims, not verified facts.
- Do not automate Formspree or another form provider until processor, notice, retention, identity, and integration decisions are approved.
- Email forwarding or copy/paste must not erase the original channel and sender provenance.

### PDF

- Validate actual file type, size, encryption/readability, page count, and integrity before extraction.
- Keep page and bounding/text locators where practical.
- Distinguish embedded text, OCR-produced text, and visually unreadable content.
- A successful parser status does not prove complete or correct extraction.

### Tanita document

- Preserve the original document and measurement context.
- Record device/report date separately from import date.
- Keep every extracted measurement linked to its exact source field/page.
- Unit, locale, decimal, and client-identity mismatches require review.
- No measurement becomes a trainer interpretation or client explanation automatically.

### Future attachment

A new type is rejected by default until a source profile defines purpose, allowed content, type/size controls, parser, safety handling, locator strategy, minimum metadata, person matching, retention, downstream use, manual fallback, and fictional acceptance cases.

## Duplicate and reprocessing rules

### Exact duplicate

A matching content hash indicates the same bytes. The system should surface the existing source and contexts instead of silently creating a second authority. Damian may link the existing artifact to an additional authorized process only after identity and purpose review.

### Near duplicate or revised document

Similarity is not equality. Preserve both versions, record their relation, and show material differences. Do not merge content automatically.

### Reprocessing

Reprocessing creates a new extraction run with:

- the same immutable source version;
- new extraction process/model/parser version;
- new time and actor;
- new outcome and derived objects;
- an explicit relation to the prior extraction run.

Prior extraction is not overwritten. Downstream decisions and materials keep pointing to the exact versions they actually used.

## Unreadable, partial, unsupported, and failed content

- **Unreadable:** retain only when authorized and useful; mark extraction unavailable; use manual review or request a better source.
- **Partial:** identify exactly which pages/regions/fields were read and which were not; never represent the result as complete.
- **Unsupported:** do not rename, coerce, or send to an unapproved third party; quarantine or reject visibly.
- **Failed:** record a metadata-only failure event and manual fallback; retries remain bounded and versioned.

No failure state may create empty fields that look like negative answers.

## Prompt injection and malicious content

All instructions found inside a source are untrusted source content. Text such as “ignore previous instructions,” requests for secrets, tool commands, or claims of system authority must never override Studio Las policy, trusted application context, or the named task.

A future ingestion/AI boundary must:

- label source content as untrusted;
- prevent attachments from selecting tools, recipients, client identity, publication, or data scope;
- prohibit the model from following embedded commands;
- detect and surface suspicious instructions to Damian where useful;
- quarantine when safe processing cannot be established;
- prevent content from causing access to another client, another source, secrets, network destinations, or system prompts.

Prompt-injection detection is a safety signal, not proof that the rest of the document is false.

## Quarantine

Quarantine means the source is unavailable to ordinary client/process views and downstream automated processing until a named decision is made. It must preserve:

- original source identity and integrity metadata;
- quarantine time, reason, and actor/system rule;
- any claimed/proposed client association;
- review outcome and Damian's decision;
- deletion or release event.

Quarantined content must not be client-visible and must not be included in broad AI context.

## Damian's mandatory decisions

Damian must deliberately decide when:

- person/process association is ambiguous, conflicting, or indicates another person;
- extraction is partial or materially uncertain;
- a correction changes a decision-relevant fact;
- a source is suspicious, unsupported, or quarantined;
- a duplicate is reused in a new process context;
- a source is released to downstream decision support;
- source invalidation affects already approved or published material.

The system may propose; it may not make these decisions invisibly.

## Publication boundary

Neither `source_artifact` nor `extracted_fact` becomes client-visible merely because the client originally supplied it or because extraction was approved. Client communication must be a new `client_material` with complete `derived_from` lineage and the exact-version approval/publication gate.

Unverified, wrong-person, quarantined, partial-without-disclosure, or provenance-detached extraction must not be published.

## Audit events

Minimum metadata events include acquisition, integrity/type check, duplicate detection, quarantine, proposed/confirmed/rejected/reassigned subject, extraction start/outcome, manual correction, reprocessing, source access loss, deletion/restriction, downstream use, and attempted publication without verified provenance.

Audit records contain identifiers, actors, time, action, outcome, and reason. They do not duplicate raw source content in ordinary logs.

## Manual fallback

Damian can read an authorized original directly, compare it with the client, record selected source facts or observations manually, and continue without OCR, parsing, or AI. The fallback preserves source locators and does not downgrade identity, review, or publication rules.

## Open implementation and legal decisions

- allowed MIME types and maximum sizes per source profile;
- malware/content-disarm needs and approved processor;
- storage and quarantine architecture;
- OCR/parser selection and processing region;
- source retention and deletion schedule;
- form/email provider roles and notices;
- handling of another person's accidentally received data;
- locator precision and accessibility requirements.

These are not approved by Stage 1. `SCHEMA — NOT APPROVED`.
