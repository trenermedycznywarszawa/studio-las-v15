# Stage 2C — Trainer Inquiry Notification Contract

Status: implementation contract for Issue #52.

## Purpose

A new public first-contact inquiry may create one minimal operational signal for the trainer so that Studio Las OS does not depend on the trainer repeatedly checking the inquiry workspace.

The notification is **not** a second inquiry transport, not a CRM event stream and not communication with the person who submitted the form.

## Invariant

The canonical client-submitted data path is:

`public form → Studio Las public ingress → inquiries`

The notification path carries **no PII** and no process content:

`new inquiry created → fixed trainer signal`

Allowed signal only:
- subject: `Studio Las — nowy pierwszy kontakt`
- body: `Nowy pierwszy kontakt w Studio Las OS`

Forbidden in the notification:
- name
- phone
- email
- broad goal
- person_words
- request/idempotency key
- inquiry/client ids
- diagnosis, pain, health or PWD/Guidance content
- trainer interpretation or decision

## Trigger semantics

Notify only when `ingest_public_inquiry(...)` returns `created`.

Do not notify for:
- `duplicate` / replay
- invalid request
- honeypot
- rate-limited request
- unavailable owner routing
- failed persistence

This ensures one successful idempotent inquiry does not generate duplicate trainer alerts through normal replay.

## Failure semantics

Inquiry persistence is primary. Trainer notification is secondary.

Notification delivery failure **must not fail inquiry acceptance**, roll back the inquiry, or change the public success response for an already-created inquiry.

Failure logging may contain only non-sensitive delivery metadata such as HTTP status or exception class/name. It must not log inquiry payload values.

## Environment boundary

External trainer notification is enabled only when the Edge Function is running against the canonical production Supabase origin.

Canonical staging must not send external mailbox notifications during CI/E2E.

The current relay may use the existing Formspree endpoint solely for the fixed no-PII signal. Formspree is no longer permitted to receive submitted client data after production cutover.

If a future notification provider replaces Formspree, the no-PII contract remains unchanged.

## Complexity boundary

Do not add now:
- notification database table
- outbox/event store
- delivery dashboard
- retries/queues
- SMS/push infrastructure
- marketing automation
- client notification

Add stronger delivery infrastructure only if real operational evidence shows the fixed best-effort signal is insufficient.

## Cutover dependency

Production form cutover may proceed only after this notification slice passes static/security tests, staging regressions and audit.

The production form cutover itself remains a separate minimal PR to `main` with an explicit rollback to the prior Formspree client-data transport blob.
