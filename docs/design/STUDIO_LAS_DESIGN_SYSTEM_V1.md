# Studio Las Design System v1 — foundation

Status: **EXPERIMENTAL / NOT PRODUCTION**  
Baseline: `61fc83cb415bf471ae23b1b75c3b69b42f4c8f2f`  
Scope: presentation layer only.

## Product boundary

Studio Las OS supports the service; it does not become the service.

- Paper guides the morning.
- Trainer gives meaning.
- App records the signal.
- Report shows the pattern.

The client UI should reduce uncertainty without turning into a wellness dashboard, engagement product or autonomous coach.

## Visual direction

Working direction: **B + C** from the September 2026 explorations.

- B contributes warmth, nature, quietness and recognisable Studio Las character.
- C contributes information hierarchy, restraint and low visual entropy.
- Mōs remains a design benchmark, not a product blueprint.

Design language:

1. Las, nie laboratorium.
2. Jedna decyzja naraz.
3. Cisza przed informacją.
4. Trener ponad algorytm.
5. Papier prowadzi, ekran orientuje.
6. Postęp jako opowieść, nie scoreboard.
7. Status bez alarmizmu.
8. Premium przez redukcję.

## Dzisiaj V2 — primary job

> Wiem, co jest ważne dzisiaj i po wykonaniu mogę szybko zostawić sygnał dla trenera.

The screen hierarchy is intentionally narrow:

1. **Na dziś** — the current trainer-published focus.
2. **Od trenera** — only when a meaningful trainer note exists.
3. **Po wykonaniu** — one short signal using the existing response flow.
4. **Kierunek procesu** — supporting context, visually secondary.

The client should not need to interpret multiple metrics, trends or readiness scores to know what to do.

## Existing data first

Dzisiaj V2 must reuse the existing client runtime and snapshot before any data-model proposal.

Current integration target:

- `assets/os/client-app-runtime.js`
- `assets/os/client-portal-controller.js`
- `assets/os/ui/client.js`

Do not add tables, fields or RPCs merely to reproduce a mockup element.

In particular, `Minimum / Standard / Więcej` is **not** assumed to exist as a production data contract. It can only become an interactive product mechanism after an explicit product decision and a separate data/security review.

## Responsibility boundary

The UI may present:

- a trainer-published plan/focus;
- a trainer-authored agreement/note;
- process context already present in the client snapshot;
- a client response/signal;
- published reports and other client-visible records.

The UI must not independently state that:

- the process is going well;
- a client should progress or regress;
- pain/readiness means a specific training decision;
- a plan should change.

Interpretation remains a trainer responsibility.

## Technical strategy

No framework migration is required for this experiment.

Foundation assets:

- `assets/os/design-system.css` — prefixed, presentation-only tokens and primitives;
- `tools/ui-lab.html` — synthetic preview, no Supabase connection and no writes.

The production runtime does **not** load `design-system.css` yet.

The first integration PR must use a feature flag or an equally reversible renderer switch and keep the current persistence path unchanged.

## Release gates

Before Dzisiaj V2 can replace the current client renderer:

1. Existing login/client access flow passes unchanged.
2. Existing client snapshot loads unchanged.
3. Existing check-in save, uncertain-state and retry behaviour passes unchanged.
4. Empty-plan and error states are explicitly designed.
5. Keyboard focus and mobile layout are tested.
6. No Auth, MFA, RLS, schema or migration change is bundled with the visual PR.
7. Visual review confirms that the screen communicates its primary job within roughly five seconds.

## Success criteria for the experiment

The redesign is successful if it improves clarity without increasing operational load.

Qualitative checks:

- The client can identify today's focus immediately.
- Trainer-authored meaning is visually distinct from client-entered signals.
- Process context supports orientation but does not compete with today's task.
- The interface feels private, calm and specific to Studio Las rather than like a generic fitness app.

Operational checks:

- no additional mandatory daily interaction;
- no additional coach workflow required only to keep the UI populated;
- no new client metric without a defined trainer decision it supports;
- no new source of truth outside the existing repository/Supabase contract.

## Explicitly out of scope for this foundation

- redesign of the trainer panel;
- Trainer Attention Cockpit;
- Knowledge Library release;
- Supabase schema changes;
- Auth/MFA/RLS changes;
- automatic interpretation;
- wearables;
- gamification, streaks or engagement mechanics;
- React/Tailwind/framework migration.
