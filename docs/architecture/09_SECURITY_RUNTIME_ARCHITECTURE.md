# Studio Las OS — Security and Runtime Architecture

Status: implementation authority for the security-hardening branch.

This document is subordinate to Constitution and Product. It defines the technical boundaries required before real client health/process data may be used.

Core rule:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

Priority order for this work:

1. health-data security,
2. architectural integrity,
3. code clarity,
4. delivery speed.

---

## 1. One source of truth

### Real problem

The current runtime mixes Supabase records with browser `localStorage` state. This is not a harmless fallback. It creates two competing realities: a record may exist on one device and not another, a successful-looking save may never reach Supabase, and later cloud reads may overwrite or hide local changes.

### Incorrect assumptions

- A silent fallback is not resilience when data contains health/process information.
- Local persistence is not an acceptable temporary database for production.
- A UI that continues working after a backend failure can be more dangerous than a UI that stops, because it creates false confidence that a record was saved.

### Consequences of the current state

- incomplete client histories,
- cross-device inconsistency,
- reports built from partial data,
- difficult incident reconstruction,
- accidental storage of health data in an uncontrolled browser profile,
- no reliable revocation or deletion path.

### Chosen solution

Production uses Supabase only. The browser may keep the Supabase Auth session in `sessionStorage`, but it must not persist client, health, session, measurement, report, plan, or trainer-note data.

All production writes go through the repository/data module. A failed remote write is a failed write. The UI must display the failure and must not silently store a copy elsewhere.

Demo mode is in-memory only and cannot call Supabase.

### Not doing

- No offline production mode. It would require encrypted local storage, conflict resolution, device trust, revocation, and a formal threat model.
- No background synchronization queue. It would recreate the same dual-source problem in a more complex form.
- No production data migration from unknown browser profiles automatically. Legacy export/import remains an explicit trainer-admin operation.

---

## 2. Real client authentication

### Real problem

A locally generated `LAS-XXXX` code identifies neither a person nor a trusted device. A code visible in a screenshot or message can unlock the panel, and local `sessionStorage` unlock state is only a UI flag.

### Incorrect assumptions

- Obscurity is not authentication.
- `noindex` is not access control.
- A client code stored or verified in frontend JavaScript cannot provide tenant isolation.

### Consequences of the current state

- unauthorized panel access,
- inability to revoke a person reliably,
- no auditable identity binding,
- possible exposure of another client's data if UI state is manipulated.

### Chosen solution

Each client uses a Supabase Auth account. The authenticated `auth.users.id` maps to a `profiles` row with role `client`, then to exactly one active `client_users` relation. Access is revoked by setting that relation to `revoked` and/or disabling the Auth account.

The browser never receives a service-role key. Account provisioning is an administrative action performed through Supabase Dashboard or a trusted server-side administrative tool.

The client portal does not query health/process tables directly. It calls `client_portal_snapshot()`, which returns only an explicit client-safe projection. Check-ins use `save_client_checkin()` with server-side validation.

### Not doing

- No custom password database.
- No client invitation creation from public frontend JavaScript.
- No service-role key in GitHub Pages.
- No local access codes or trainer-preview bypass in production.

---

## 3. Split the monolith

### Real problem

A single HTML file containing layout, styles, domain logic, persistence, authentication, reports, demo data, migrations, and UI handlers cannot be reviewed safely. Security changes become coupled to unrelated visual behavior, and a small change can break a distant flow.

### Incorrect assumptions

- A framework is not required to have modules.
- Keeping everything in one file is not simpler once the file exceeds the ability of one reviewer to understand it.
- Refactoring is not cosmetic when it creates enforceable boundaries between data, auth, domain rules, reports, and UI.

### Consequences of the current state

- poor testability,
- hidden dependencies,
- duplicated persistence logic,
- difficult security review,
- version drift inside one file,
- high regression risk.

### Chosen solution

The production runtime is split into native ES modules:

- `runtime.js` — environment and storage boundaries,
- `data.js` — Supabase Auth, HTTP, repositories, all persistence,
- `decision-support.js` — non-medical attention signals,
- `ui.js` — DOM rendering and form collection,
- `app.js` — orchestration,
- `styles.css` — presentation.

The old monolith path becomes a non-data deprecation page. Git history remains the recovery source; the legacy runtime is not kept live as a second application.

### Not doing

- No React/Vue/framework migration. It would increase scope without solving the main risk.
- No microservices.
- No attempt to preserve every accidental legacy API as a permanent compatibility layer.

---

## 4. Canonical naming

### Real problem

Names such as `3.0`, `9.0`, `Write Preview`, `FUNDAMENT`, `ROZWÓJ`, and `VIP Clinical` describe historical implementation experiments, not the current Studio Las method. Mixed naming creates business and data ambiguity.

### Incorrect assumptions

- File names do not become harmless merely because users do not see them.
- Old package labels should not continue governing new data contracts.
- Version numbers inside titles are not architecture.

### Consequences of the current state

- inconsistent UI,
- brittle conditions in code,
- confusing reports,
- migration mistakes,
- business terminology leaking into database logic.

### Chosen solution

Runtime name: `Studio Las OS`.

Canonical cooperation types:

- `diagnostic_visit` — Pierwsza Wizyta Diagnostyczna,
- `twelve_week_process` — Proces 12-tygodniowy,
- `continuation` — Prowadzenie kontynuacyjne.

Canonical stages:

1. Diagnostyka i punkt startowy,
2. Plan i pierwsze decyzje,
3. Prowadzona praca 1:1,
4. Raport i decyzja co dalej.

The database receives `clients.engagement_type`. The historical `package` field remains temporarily for migration compatibility and is explicitly marked legacy. New code must not write or branch on it.

### Not doing

- No blind destructive rewrite of historical free-text records.
- No new marketing package taxonomy inside technical code.
- No application version number in user-facing title or metadata.

---

## 5. Hard demo/production separation

### Real problem

A runtime that can switch from cloud to local data automatically makes it impossible to know whether a screen contains a real record, a demo record, or stale browser state.

### Incorrect assumptions

- A small `DEMO` label is not architectural separation.
- Runtime fallback is not an environment boundary.
- Demo fixtures must never coexist with production write code in the same initialization path.

### Consequences of the current state

- real data entered into demo state,
- demo records mistaken for client records,
- screenshots with ambiguous provenance,
- tests accidentally touching production.

### Chosen solution

Production and demo use different entry points.

Production:

- requires `STUDIO_LAS_CONFIG.mode === "production"`,
- requires Supabase URL and publishable key,
- refuses to start on missing/mismatched configuration,
- uses Supabase only,
- contains no demo seed command.

Demo:

- uses a separate HTML and script,
- has a persistent visual banner,
- uses in-memory fixtures only,
- cannot initialize the Supabase client,
- loses all changes on reload.

### Not doing

- No query-string `?demo=1` switch.
- No shared persistence adapter that chooses local or cloud at runtime.
- No real client export into demo fixtures.

---

## 6. Decision heuristics

### Real problem

The current code converts inputs such as VAS, sleep, RPE, heart-rate zones, and red-flag text into labels such as progress/maintain/regress/consult. That presentation can look like an automated clinical decision engine even when intended only as a convenience.

### Incorrect assumptions

- Adding a disclaimer does not neutralize a system that outputs a treatment-like recommendation.
- Hard-coded thresholds are not individualized clinical reasoning.
- Software cannot infer safety from sparse self-reported values without context.

### Consequences of the current state

- false certainty,
- automation bias,
- trainer decisions shaped by opaque thresholds,
- medical-sounding claims,
- increased legal and safety risk.

### Chosen solution

The module is renamed and narrowed to `decision-support.js`. It produces only attention signals:

- what input triggered attention,
- why the trainer should review it,
- whether the signal is urgent or routine,
- an explicit statement that the software does not recommend progression, regression, treatment, or diagnosis.

The trainer records the actual decision separately. No client-facing automatic interpretation is generated.

### Not doing

- No clinical scoring system.
- No automatic plan change.
- No automatic client warning based solely on numeric thresholds.
- No AI recommendation.

---

## 7. RLS and privacy audit

### Real problem

The existing RLS evolved through migrations `005–010` that repeatedly replaced the same client policies. Although the final state may work, the chain is difficult to audit and can produce different outcomes when migrations are applied inconsistently.

### Incorrect assumptions

- A passing happy-path browser test is not an authorization audit.
- Table grants plus RLS are safe only when every policy and helper is known and tested.
- Security-definer views are not automatically safe; their projected columns and filters become a critical security boundary.

### Consequences of the current state

- policy drift,
- accidental direct client access to base tables,
- hard-to-reproduce environments,
- insufficient evidence before health data is entered.

### Chosen solution

Migration `012_security_hardening.sql`:

- replaces identity helpers with one `auth.uid()`-based contract,
- removes the experimental JWT-claim helper,
- removes the legacy access-code table,
- forces RLS on sensitive tables,
- revokes anonymous access,
- recreates canonical client policies,
- removes direct client policies on `guidance_events`,
- replaces client-safe views with explicit RPC projections,
- enforces one active client mapping per client account,
- adds canonical engagement vocabulary.

Audit script `012_security_hardening_audit.sql` verifies metadata invariants and fails on critical drift.

### Not doing

- No claim of legal RODO compliance. Technical controls do not replace a legal basis, information clause, consent analysis, retention schedule, processor review, or incident procedure.
- No claim that the migration has been applied to the live Supabase project from GitHub alone.
- No production health data until the migration and tests run successfully in the target Supabase project and role-scenario tests are completed.

---

## Production gate

Real client data may be entered only after all conditions are true:

1. Migration `012_security_hardening.sql` is applied in the target Supabase project.
2. `012_security_hardening_audit.sql` completes without exception.
3. Trainer A cannot read Trainer B's client in a seeded role test.
4. Client A cannot read Client B's snapshot.
5. A revoked `client_users` relation immediately blocks portal access.
6. The browser network panel shows no health/process writes to any storage other than Supabase.
7. Production entry point refuses to run in demo mode or without configuration.
8. No service-role key exists in repository, browser bundle, local storage, or deployment configuration.
9. A separate RODO/legal review defines legal basis, notices, retention, deletion/export, processors, and incident response.

Until then, the production runtime must be treated as blocked for real health data.
