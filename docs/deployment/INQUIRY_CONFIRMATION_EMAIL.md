# Inquiry confirmation email

Client-requested addition: send the approved Studio Las transactional confirmation after a new public inquiry is persisted. This is separate from the fixed no-PII trainer notification; that relay and its contract stay unchanged.

## Trigger and data

Only the `created` production branch can call the sender. Duplicate/replayed, invalid, honeypot, rate-limited and failed persistence requests must not send. Email remains optional in the form: missing email skips confirmation. No form answers, name, phone or health/context fields are sent to Resend. The provider receives the recipient address, fixed subject/body, configured sender/reply address and an opaque request key for idempotency.

Delivery is best effort and bounded to 2.5 seconds. Failure logs only status, error class or a fixed configuration reason. A delivery failure never rolls back the inquiry or changes an accepted response. No automatic retry/outbox is included; a provider outage may result in a saved inquiry without a confirmation email. API success means provider acceptance, not mailbox delivery.

## Activation prerequisites

This change is disabled by default. Do not mark delivery active until all items below are verified:

1. Select/configure the Resend account and verify a sender domain. Do not use an arbitrary Gmail address as a verified sender.
2. Configure Edge Function secrets privately:
   - `RESEND_API_KEY`: sending credential (never commit or paste into a public file).
   - `INQUIRY_EMAIL_FROM`: verified bare sender email address.
   - `INQUIRY_EMAIL_REPLY_TO`: monitored bare reply address.
   - `INQUIRY_CONFIRMATION_ENABLED`: `true` only after configuration/verification.
3. Confirm the approved privacy/provider information covers the recipient address processed by the transactional provider. Do not forward the full form to Formspree.
4. Deploy `public-inquiry-ingress` and both relative modules, preserving its existing `verify_jwt=false` ingress behavior and existing request validation/rate limits. No database or Auth changes are required.
5. Test with an owner-controlled address: newly created inquiry, received email, exact sender, reply destination, mobile/Gmail/Outlook, light/dark readability. Replay the same request: no second email. Do not use real client inquiries as test fixtures.

Rollback: disable `INQUIRY_CONFIRMATION_ENABLED`, or restore the previous ingress function version. Keep trainer notification enabled.

## Checks

- `node scripts/test_inquiry_confirmation.mjs` (Node 22.18+): mocked delivery and real handler; no network sends or data writes.
- `node scripts/test_public_inquiry_ingress.mjs`
- `python3 scripts/verify_studio_las_os.py`
- CI runs `deno check supabase/functions/public-inquiry-ingress/index.ts`.

References: https://supabase.com/docs/guides/functions/examples/send-emails and https://resend.com/docs/api-reference/emails/send-email .
