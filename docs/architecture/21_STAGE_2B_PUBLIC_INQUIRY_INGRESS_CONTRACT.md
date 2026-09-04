# Stage 2B — Public Inquiry Ingress Contract

Status: implementation contract for staging gate
Issue: #50
Base: Stage 2 production runtime merged in PR #48

## Decision

The public first-contact form must not write directly to `public.inquiries` and must never receive privileged credentials.

Canonical flow:

`public form → bounded Edge Function → service-only atomic RPC → public.inquiries`

Formspree remains the production transport until this gate passes staging audit and a separate owner-approved cutover PR changes `main`.

## Product boundary

This is transport and abuse protection, not a CRM feature.

The ingress may record only the minimum first-contact signal required for a human conversation. It must not diagnose, qualify, score, create PWD findings, publish Guidance, create client accounts, or automate contact.

## Accepted public payload

Exactly these fields are allowed:

- `requestId` — client-generated idempotency key, 12–128 safe characters;
- `name` — required, 1–120 chars;
- `phone` — required, 5–32 chars;
- `email` — optional, normalized lowercase, max 320 chars;
- `preferredContactWindow` — one of the existing five approved values;
- `broadGoal` — one of the existing five approved Stage 2 values;
- `personWords` — optional, max 280 chars;
- `contactConsent` — must be exactly `true`; not persisted as a separate field because an accepted request cannot exist without it;
- `privacyNoticeVersion` — required stable version of the displayed contact notice;
- `formVersion` — required bounded source version;
- `honeypot` — must be empty for a real request.

Unknown fields fail validation.

Forbidden content includes diagnosis, pain score, injury/operation category, documentation, commute/travel, free-form health intake, trainer interpretation, decisions, PWD fields, Guidance fields and account data.

## Server boundary

The Edge Function is the only public write surface.

It must:

1. require `POST` with `application/json`;
2. reject bodies larger than 8 KiB;
3. require an exact browser Origin allowlist;
4. answer CORS preflight only for allowed origins;
5. enforce the payload allowlist and lengths before database work;
6. treat a non-empty honeypot as a generic accepted/no-op response;
7. derive an opaque rate-limit key server-side from the gateway client address using keyed HMAC; raw IP must never be written to inquiry or audit data;
8. call only the service-only atomic ingress RPC;
9. return generic public responses and never return inquiry/client IDs or existence information;
10. set `Cache-Control: no-store`;
11. log error class/code only — never submitted content, IP, rate key, phone or email.

`verify_jwt=false` is permitted only for this public function because the function implements its own public boundary. This does not authorize anonymous table privileges.

## Origin policy

Allowed browser origins are explicit code/config values, never wildcard `*`.

Staging test origins may include local preview origins. Production cutover must preserve the current public GitHub Pages origin and any explicitly approved Studio Las custom domain only.

Origin is an abuse reduction control, not authentication; it is not relied upon as the only protection.

## Idempotency / replay

`public.inquiries` already enforces unique `(source_channel, source_request_key)`.

The ingress RPC must check the request key before rate-limit mutation and return a duplicate status without creating another inquiry. Concurrent duplicate inserts must also collapse to one durable inquiry.

The public Edge Function maps both `created` and `duplicate` to the same generic success response.

## Rate limit

A minimal private limiter is allowed. It is not an analytics/event table.

Required design:

- private schema only;
- opaque keyed-HMAC rate key; no raw IP;
- fixed 15-minute buckets;
- per-client-address limit: 5 valid new submission attempts / 15 min;
- global safety ceiling: 100 valid new submission attempts / 15 min;
- rows expire after 30 minutes and are opportunistically deleted;
- rate-limited attempts create no inquiry row;
- repeated idempotent requests do not consume additional quota;
- no submitted free text/contact values are stored in limiter rows.

These limits are initial safety defaults, not product metrics. Change only with observed abuse/false-positive evidence.

## Owner routing

The database must not infer an arbitrary trainer from row order.

A private singleton ingress configuration explicitly identifies the owner trainer and whether ingress is enabled. Missing, disabled or ambiguous configuration fails closed.

Staging E2E may configure this singleton through a staging-only AAL2 trainer fixture. Production configuration is a separate cutover step.

## Atomic database RPC

`public.ingest_public_inquiry(...)` is `SECURITY DEFINER` with fixed `search_path` and executable only by `service_role`.

It must:

- validate all values again;
- resolve exactly one enabled private ingress configuration;
- return duplicate before rate limiting if the same source/request already exists;
- atomically update limiter state;
- return rate-limited without creating inquiry content when limits are exceeded;
- insert at most one `public.inquiries` row with `source_channel='public_first_contact'`;
- create zero `inquiry_decisions`, clients, sessions, assessments, home plans or client-user links.

Anonymous and authenticated browser roles receive no execute grant on this RPC and no DML grant on inquiry tables.

## Staging proof

The implementation PR may change only `product-recovery`-based code and canonical staging.

Required automated proof:

- valid public request → exactly one inquiry visible to the configured owner trainer;
- replay of same `requestId` → generic success, still one inquiry;
- invalid field/value → 400, zero inquiry;
- unknown field → 400, zero inquiry;
- honeypot → generic success, zero inquiry;
- disallowed origin → 403, zero inquiry;
- oversized body → 413, zero inquiry;
- rate limit → 429, no inquiry for rejected attempts;
- anon direct table read/write denied;
- public request creates zero decision/client/PWD/Guidance/account side effects;
- PWD and Guidance regressions remain green;
- synthetic cleanup removes test inquiries and limiter rows while leaving metadata-only audit history intact.

## Production cutover gate

This contract does **not** authorize `main` or production transport changes.

After staging is audited, production cutover must be a separate minimal PR from current `main` changing only the transport wiring needed by `ankieta-kontakt.html`. It must preserve the approved visible copy and have an immediate rollback path to the known Formspree blob/commit.

## Non-goals

No CAPTCHA vendor by default. No pipeline, scoring, marketing automation, AI decisioning, auto-email/SMS, `people` table, `service_episodes` table, PWD changes, Guidance changes, client portal changes or production deploy in this staging gate.
