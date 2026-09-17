# Data flows and provider inventory

**Status: DRAFT — NOT LEGAL APPROVAL**

## Production data flows

### Public first contact

`public browser → Studio Las public ingress → validated server-side boundary → public.inquiries → trainer workspace`

The public first-contact path is intentionally narrow. It accepts identity/contact, preferred contact window, broad goal and optional short person-authored context. It does not create a client, PWD result, Guidance or client account automatically.

A fixed no-PII trainer notification may be sent after a new inquiry is accepted. The notification contract is designed not to include submitted identity/contact/process values.

### Trainer application

`trainer browser → Supabase Auth → AAL2/MFA → PostgREST/RPC → RLS/owner scope → PostgreSQL`

The trainer application reads/writes structured records directly against the approved Supabase boundary. Sensitive protected mutations use validated RPCs where atomicity or stronger server-side validation is required.

### Client portal

`client browser → Supabase Auth → client-safe RPC/projection → own published/current material`

The client must not receive raw trainer notes, hypotheses, cross-client records, security audit data or unrestricted base-table access. Client-authored questionnaire drafts are stored server-side; browser storage is not the authority for questionnaire answers.

### Questionnaire before PWD

`trainer assignment → client portal exact questionnaire version → consent/privacy event → server-side draft → explicit client transfer/submission → submitted-only trainer brief`

Draft responses remain client-side in visibility semantics even though they are stored server-side. Trainer access begins only after explicit submission according to the questionnaire contract. Guidance/Home Plan remains a separate trainer-owned workflow.

### Guidance and publication

`trainer draft → trainer review/approval → explicit publication → selected channel (paper/app/deliberate hybrid) → client response signal → trainer review`

Publication is separate from trainer private working material. The system must not silently transform a private interpretation into client guidance.

### Client documents

`trainer browser → private Supabase Storage + client_documents metadata → explicit publication boundary → client read when allowed`

Canonical technical contract: private bucket, PDF only, 10 MB maximum, client-scoped path, no client upload/update/delete.

### Auth/account lifecycle

`trainer AAL2 browser → authenticated client-access Edge Function → Supabase Auth Admin + protected database functions`

Browser code must never receive a service-role key. Invitation/recovery links and MFA credentials are authentication secrets and are outside application data storage.

### Static hosting

Studio Las OS static application bundle is deployed to Netlify from an explicit allowlist. The public marketing/contact site also uses GitHub Pages surfaces. Static hosting is not the structured health/process database.

### Historical migration/export

Historical browser data may be exported locally through the dedicated migration/export path. It must not silently upload or delete source data. Migration records containing raw payloads inherit the sensitivity of their source data.

## Current providers / processors — technical inventory

| Provider / component | Observed technical role | Known fact | Legal/privacy status |
|---|---|---|---|
| Supabase | PostgreSQL, Auth, Storage, Edge Functions | Production project `ufcumhbnuyernuwepcij`; region `eu-west-1`; database currently healthy. | DPA/entity/subprocessors/transfer assessment requires qualified review. |
| Netlify | Production static hosting of Studio Las OS | Project `studio-las-os`; production deploy is active. | Hosting contract/processor role and injected platform UI require review as applicable. |
| GitHub / GitHub Pages | repository, CI, public static site | Repository is public; client data must never be committed. | DPA/processor relevance depends on actual processing; no client content should be stored in repo. |
| Formspree | fixed no-PII notification relay in the public-inquiry architecture | Intended payload is constant and excludes inquiry/client values. | Confirm current production configuration and contractual role; no PII transport should be reintroduced. |
| SMTP / email provider | invitation / recovery email delivery | **UNKNOWN — HUMAN INPUT REQUIRED** which provider is currently configured and under which terms. | Requires processor/DPA and transfer review if applicable. |
| Domain / DNS provider | domain resolution | **UNKNOWN — HUMAN INPUT REQUIRED**. | Usually limited data role, but inventory should record provider. |
| Backup provider / mechanism | database/disaster recovery and exports | **UNKNOWN — HUMAN INPUT REQUIRED** for actual production backup/export destination and expiry. | Retention/deletion/restore obligations must be documented. |
| Monitoring / error reporting | diagnostics | No separate third-party client-data monitoring service is established in this package. | Any future provider must be added deliberately; do not silently add SDKs. |
| AI provider receiving client data | none approved by current Studio Las architecture | Current architecture requires AI to remain optional, minimum-data and explicitly approved; this package does not identify an approved production AI provider for client data. | Any future provider requires explicit legal/security/owner review before real client data is sent. |

## Platform-injected Netlify UI

Production evidence shows Netlify injects hosting-side UI into served HTML, while repository asset hashes remain unchanged. Current investigation points to Netlify's edge-injected badge / toolbar family rather than Studio Las source code. Netlify documentation states these overlays are injected at the edge and can conflict with restrictive CSP. The Studio Las CSP must **not** be weakened merely to allow such UI.

## Unknowns to resolve before formal Issue #12 closure

- exact controller identity/business form to publish;
- SMTP provider and email data flow;
- backup mechanism, retention and restore path;
- processor agreements and current subprocessor lists;
- transfer safeguards where required;
- final list of any support/monitoring tools with production access;
- formal decision on whether a DPIA is required.
