# Studio Las OS

Studio Las OS is a private operating system for guiding Studio Las clients through an individual 1:1 process.

It is not a public product. It is not sold separately. It is available only to active Studio Las clients in the FUNDAMENT, ROZWÓJ, or continued 1:1 process. When the cooperation ends, the client should lose access to the app.

Core product rule:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

## Source-of-truth hierarchy

All future decisions must follow this hierarchy:

1. Constitution
2. Product
3. Architecture
4. PRD
5. Implementation
6. Code

A lower layer must never redefine a higher layer.

If implementation conflicts with Product, Product wins.

If Product conflicts with Constitution, Constitution wins.

## What Studio Las OS is

Studio Las OS is a private client process system for:

- organizing client history,
- recording trainer decisions,
- supporting 1:1 guidance,
- assigning simple offline protocols,
- collecting short process signals,
- preparing future 4/8/12-week reports,
- helping the trainer notice patterns over time.

The system exists to support the Studio Las Method, not to replace it.

## What Studio Las OS is not

Studio Las OS is not:

- a fitness app,
- a wellness app,
- a habit tracker,
- a quantified-self product,
- a SaaS product,
- a marketplace,
- a community platform,
- a medical diagnosis tool,
- an AI coach for the client,
- a wearable data platform,
- a gamified motivation system.

## Current project status

Current status:

- Public website exists on GitHub Pages.
- Main OS file is `studio-management-os-3.0.html`.
- The OS is currently a static HTML/CSS/JS application.
- Supabase read/write preview exists in the OS.
- `localStorage` fallback still exists and must not be removed without a separate migration plan.
- Supabase migrations exist under `supabase/migrations/`.
- Client, session, measurement, intake, report, home plan, exercise, and guidance-related structures already exist.
- Paper-first process tracking is not yet implemented as a production feature.

## Main product principles

1. The client should not start the morning from the phone.
2. Morning guidance should happen offline, on paper.
3. The app records only a short signal after the offline protocol.
4. The trainer interprets the signal in context.
5. Reports show patterns across time.
6. The app must reduce chaos, not create new tasks.
7. The app must lower fear of movement, not increase self-monitoring anxiety.
8. The system must protect the role of the trainer.
9. Data collection must be minimal and purposeful.
10. No feature should exist only because it is technically possible.

## Strategic decisions currently in force

1. The First Diagnostic Visit currently costs 300 PLN.
2. The 300 PLN fee may be deducted from the package if the client enters the process under the current offer rules.
3. The Studio Las process follows the System 4 Kroków.
4. The app processes health-related data: pain, symptoms, health history, treatment, supplementation, process notes, and individual recommendations.
5. Data is entered manually.
6. There are no integrations with Apple Health, Garmin, WHOOP, Oura, Tanita API, or other wearable systems.
7. The client sees instructions and summaries only.
8. The client does not see full trainer notes.
9. The system should support future 4/8/12-week reports.
10. AI may later support the trainer in report analysis, but the client-facing AI coach is out of scope.
11. The public website still leads to the diagnostic form.
12. The app may be mentioned as part of the process, but not as the main public product.
13. We are not creating a new application from scratch.

Pricing is business data. If the offer changes, update this section in a focused documentation commit.

## Architecture overview

Current architecture is intentionally simple:

- Static public website files.
- Static Studio Las OS HTML file.
- Inline JavaScript and CSS in the OS file.
- Supabase for backend data.
- Browser storage fallback for legacy/local operation.
- GitHub Pages for hosting.

Important current files and folders:

- `index.html` — public homepage.
- `ankieta-kontakt.html` — diagnostic/contact path.
- `strefa-klienta.html` — client zone entry.
- `studio-management-os-3.0.html` — current OS.
- `studio-las-config.js` — runtime configuration surface.
- `docs/constitution/` — highest documentation authority and decision hierarchy.
- `docs/product/` — Studio Las Method and product layer.
- `docs/` — operating, architecture, data, implementation, and review documentation.
- `supabase/migrations/` — database migrations.
- `supabase/importer/` — legacy import tooling.

## Current stack

- HTML
- CSS
- Vanilla JavaScript
- Supabase REST/Auth
- Supabase SQL migrations
- GitHub Pages
- No required frontend framework
- No required npm runtime for the public app

## Rules for working with this repository

Before changing code, read in this order:

1. `README.md`
2. `docs/constitution/README.md`
3. `docs/product/README.md`
4. `docs/product/00_PRODUCT_MODEL.md`
5. `docs/product/02_STUDIO_LAS_METHOD.md`
6. `docs/STUDIO_LAS_OS_BLUEPRINT.md`
7. `docs/DATA_POLICY.md`
8. `docs/PAPER_FIRST_PROTOCOLS.md`
9. Relevant architecture documents when they exist.
10. Relevant implementation plans only after Architecture approves the direction.

Every change should be small, reversible, and aligned with the private 1:1 service model.

Preferred workflow:

1. Confirm the source-of-truth layer that governs the change.
2. Audit current code and data structures.
3. Describe the intended change.
4. Check whether existing tables/functions already solve part of the problem.
5. Avoid broad refactors.
6. Implement the smallest safe step.
7. Manually test trainer flow and client flow.
8. Document risk and next step.

## Security rules

- Never commit Supabase service role keys.
- Never commit private client data.
- Never put secrets in frontend code.
- Never put health-sensitive data in URLs.
- Never put health-sensitive data in logs.
- Never put health-sensitive data in push notifications.
- Never expose full trainer notes to the client.
- Use client-safe views/policies for client-facing data.
- Treat pain, symptoms, treatment history, supplementation, and trainer notes as sensitive operational data.
- Any production change involving health data must be reviewed from a RODO/legal perspective later.

## Bans for future changes

Do not add:

- gamification,
- streaks,
- points,
- badges,
- leaderboards,
- community features,
- push notifications,
- wearable integrations,
- automatic medical interpretation,
- client-facing AI coach,
- supplement advice module as medical advice,
- a separate app or framework,
- a new SaaS-like product direction,
- broad tracking that does not support trainer decisions or reports.

Do not change without a separate explicit task:

- authentication,
- Supabase config,
- existing login logic,
- existing public site layout,
- existing `localStorage` fallback,
- SQL migrations,
- production database data.

## Checklist before every change

Before every change, answer:

- Does this reduce client chaos?
- Does this lower fear of movement?
- Does this help the trainer make a better decision?
- Does this support a 4/8/12-week report?
- Can this work without morning phone use?
- Is the collected data minimal?
- Is this free from gamification?
- Is this free from medical diagnosis claims?
- Does this preserve the trainer's role?
- Does this avoid sensitive data in URLs/logs/notifications?
- Can this be tested manually without touching production data?
- Does this avoid unnecessary refactor?
