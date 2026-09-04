# Studio Las OS

Studio Las OS is a private support system for the trainer-led Studio Las Method.

It is not a public product, fitness application, SaaS platform, medical diagnostic tool, or automated coach.

Core rule:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

## Authority hierarchy

All decisions follow this order:

1. Mission
2. Constitution
3. Product
4. Architecture
5. PRD
6. Implementation
7. Code
8. Runtime
9. Public/client surfaces

A lower layer must never redefine a higher layer.

## Current architecture

The application uses:

- static HTML entry points,
- native ES modules,
- Supabase Auth,
- Supabase Postgres and Row Level Security,
- Supabase REST/RPC,
- GitHub Pages for static delivery.

No frontend framework or application server is required for the current scope.

### Production entry point

`studio-las-os.html`

Production rules:

- `STUDIO_LAS_CONFIG.mode` must be exactly `production`,
- Supabase is the only source of truth,
- health/process data is never persisted in browser storage,
- failed remote writes fail visibly,
- the client uses a Supabase Auth account,
- client data is returned only through a narrow authenticated RPC projection,
- the browser never contains a service-role key.

### Demo entry point

`demo/studio-las-os-demo.html`

Demo rules:

- persistent visible DEMO banner,
- fictional data only,
- no Supabase configuration,
- no network data calls,
- no `localStorage` or `sessionStorage`,
- changes exist only in memory and disappear after reload.

### Retired entry point

`studio-management-os-3.0.html`

The historical path is now a deprecation and migration gate. It does not run the former application, read client data, or save data. Git history remains the recovery source for the old implementation.

## Module map

- `assets/os/runtime.js` — strict production configuration, session-storage boundary, local-data guard, canonical labels.
- `assets/os/data.js` — Supabase Auth, REST/RPC client, repositories, all production persistence.
- `assets/os/decision-support.js` — non-medical attention signals for trainer review.
- `assets/os/app.js` — application orchestration and role routing.
- `assets/os/ui/common.js` — safe DOM and shared form helpers.
- `assets/os/ui/forms.js` — trainer and client forms.
- `assets/os/ui/trainer.js` — trainer workspace.
- `assets/os/ui/client.js` — client-safe portal.
- `assets/os/styles.css` — shared visual layer.

The UI cannot select a local or cloud storage adapter. Production has one data repository and it writes to Supabase only.

## Canonical vocabulary

Runtime name:

- `Studio Las OS`

Cooperation types:

- `diagnostic_visit` — Pierwsza Wizyta Diagnostyczna,
- `twelve_week_process` — Proces 12-tygodniowy,
- `continuation` — Prowadzenie kontynuacyjne.

Process stages:

1. Diagnostyka i punkt startowy
2. Plan i pierwsze decyzje
3. Prowadzona praca 1:1
4. Raport i decyzja co dalej

The historical `clients.package` column is retained only for migration compatibility. New code must use `clients.engagement_type`.

## Authentication and client access

Trainer and client identities are managed by Supabase Auth.

An authenticated user maps to:

1. `auth.users`,
2. `public.profiles`,
3. for clients: exactly one active `public.client_users` relationship.

Client access is revoked by revoking the relationship and/or disabling the Auth account.

The production frontend does not:

- create client Auth accounts,
- store passwords,
- generate local access codes,
- use a trainer-preview bypass,
- expose service-role credentials.

Client account provisioning and revocation are trusted administrative operations performed outside the public browser runtime.

## Database and RLS hardening

Apply migrations in repository order, including:

`supabase/migrations/012_security_hardening.sql`

This migration:

- removes the legacy client access-code table,
- establishes canonical Auth/RLS helper functions,
- forces RLS on sensitive tables,
- removes anonymous table access,
- recreates canonical trainer policies for client records,
- removes direct client policies on process tables,
- replaces client-safe views with explicit RPC boundaries,
- adds the `client_portal_snapshot()` RPC,
- adds the validated `save_client_checkin()` RPC,
- enforces one active Studio Las client mapping per client account,
- adds canonical cooperation vocabulary.

Run afterward:

`supabase/tests/012_security_hardening_audit.sql`

The audit fails when a critical metadata invariant is missing.

## Decision support boundary

Studio Las OS does not make medical or training decisions.

The decision-support module may identify an input that deserves trainer attention, for example:

- a reported increase in symptoms,
- very low readiness,
- very high perceived effort,
- a manually marked new symptom or risk concern.

It may not output:

- an automated diagnosis,
- a treatment recommendation,
- an automatic progression or regression decision,
- an automatic plan change,
- a client-facing medical interpretation.

The trainer records the actual decision separately and remains responsible for context and communication.

## Data policy

The system may process identity, contact, session, movement, pain/symptom, health-history, measurement, plan, and report information needed for the private Studio Las process.

Data must not be used for:

- gamification,
- marketing profiling,
- mass analytics,
- unrelated lifestyle surveillance,
- curiosity-driven tracking.

Sensitive data must never be stored in:

- URLs or query strings,
- browser logs,
- analytics events,
- push notifications,
- public fixtures,
- screenshots shared publicly,
- Git commits, issues, or pull-request comments,
- browser `localStorage`.

Supabase Auth tokens are stored only in `sessionStorage`. This is an authentication session, not health-data persistence.

## Production gate

Do not enter real client health/process data until all conditions are satisfied:

1. Migration `012_security_hardening.sql` has been applied to the target Supabase project.
2. `012_security_hardening_audit.sql` completes without exception.
3. Seeded role tests prove Trainer A cannot read Trainer B's client.
4. Seeded role tests prove Client A cannot read Client B's snapshot.
5. Revoking `client_users.status` blocks access immediately.
6. Browser inspection shows all production process writes go only to Supabase.
7. Production refuses to start when configuration is missing or not explicitly marked `production`.
8. No service-role key exists in the repository, browser, deployment files, or browser storage.
9. A separate RODO/legal review defines legal basis, notices, retention, export/deletion, processors, and incident response.

Technical hardening is not a declaration of legal RODO/GDPR compliance.

## Legacy browser-data migration

The production runtime refuses to start if known historical Studio Las data keys remain in `localStorage`.

This is intentional. A silent fallback would create two sources of truth.

Required sequence:

1. export the historical local data,
2. preserve a secure backup outside the public repository,
3. run the existing importer in dry-run mode,
4. review rejected or ambiguous records,
5. import to a non-production Supabase environment,
6. validate counts and relationships,
7. apply to the approved target environment,
8. verify records in Supabase,
9. remove historical browser data only after verification.

The application does not automatically migrate unknown browser profiles.

## Security rules

- Never commit Supabase service-role keys.
- Never commit real client data.
- Never put secrets in frontend code.
- Never use production data as demo fixtures.
- Never expose full trainer notes to clients.
- Never rely on `noindex` as access control.
- Never add a local persistence fallback to production.
- Never add a custom authentication code verified in frontend JavaScript.
- Never add direct client RLS access to sensitive base tables when a narrow RPC projection is sufficient.
- Never represent an attention signal as a medical conclusion.

## Product bans

Do not add:

- gamification,
- streaks,
- points,
- badges,
- leaderboards,
- community features,
- push notifications,
- wearable ingestion,
- automatic medical interpretation,
- client-facing AI coaching,
- broad daily tracking,
- a separate SaaS product direction.

## Required reading before changes

1. `docs/constitution/README.md`
2. Constitution documents in order
3. `docs/governance/00_SOURCE_OF_TRUTH_REGISTRY.md`
4. `docs/product/README.md`
5. Relevant Product documents
6. Relevant Architecture documents
7. `docs/architecture/09_SECURITY_RUNTIME_ARCHITECTURE.md` for authentication, data, RLS, runtime, client portal, demo, or decision-support changes
8. Relevant PRD and implementation plan only after Architecture approves the direction

## Final rule

Studio Las OS should not become more impressive.

It should become safer, calmer, easier to understand, and more useful to the trainer-led process.
