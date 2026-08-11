# Stage 4A — Fictional PWD Decision Conversation

**Status:** DRAFT FICTITIOUS PROTOTYPE ONLY

This isolated, deterministic, offline, session-memory prototype demonstrates task `conduct_pwd_and_record_trainer_decision` under contract `stage4-v1`.

## Boundaries

- fictional pseudonymous fixtures only;
- no real AI, provider, prompt execution, or generated decision;
- optional pre-prepared fictional Tanita package only;
- no PDF upload, OCR, parser, quarantine, Storage, or real measurement file;
- no network, persistence, cookies, service worker, database, or production import;
- no Supabase, Auth, MFA, RLS, Edge Functions, schema, SQL, or migrations;
- no send, publish, price, payment, booking, staging, production, or deployment;
- no diagnosis, sales pressure, automatic qualification, automatic decision, or canonical test catalogue.

The prototype has no send or publication control. A follow-up draft remains `trainer_only`, `needs_review`, and `unpublished` in memory until reset or reload.

## Run

Serve the repository root with a local static server and open:

`/prototypes/stage-4-pwd-decision-conversation/`

Do not enter real client information or open a real Tanita file.

## Required cases

- `fictional-01`: comparable Tanita and complete evidence;
- `fictional-02`: `START_CONDITIONAL` with a condition and verification written only by Damian;
- `fictional-03`: `DEFER_CONSULT` with no Tanita;
- `fictional-04`: `NOT_THIS_PRODUCT` without negative judgement or sales pressure;
- `fictional-05`: skipped and stopped observations plus not-comparable Tanita;
- `fictional-06`: complete manual path with zero AI objects;
- `fictional-07`: prompt-injection-like source text remains inert;
- `fictional-08`: cross-case fail-closed contract in the behavioral test;
- `fictional-09`: material handoff change invalidates workspace and decision while preserving history.

The fixture labels describe audit coverage, not an expected system decision. Every decision remains Damian's explicit action and no radio is preselected.

## Desktop audit

1. Open the prototype in current Chrome or Edge.
2. Keep DevTools Network open and clear the log after load.
3. Complete `fictional-01` in assisted mode.
4. Review every suggestion using approve, edit, and reject across repeated runs.
5. Record an observation and a separate fictional client reaction.
6. Save a separate trainer interpretation.
7. Confirm all four decision controls are equal and initially unselected.
8. Save each decision across the required fixtures.
9. Confirm `START_CONDITIONAL` rejects empty statement or verification.
10. Save a follow-up draft and confirm there is no send or publication action.
11. Trigger the material handoff change after a saved decision and confirm active records become invalidated while both versions remain visible.
12. Confirm zero external requests after the initial local document/module/style loads and no console errors.

## Exact mobile audit — 360 × 900 CSS px

1. Set the browser viewport to exactly 360 × 900 CSS px.
2. Reload and complete `fictional-03` in manual mode.
3. Confirm there is no horizontal page overflow at any step.
4. Confirm long exact references and prompt-injection-like text wrap inside their cards.
5. Confirm controls remain at least 44 CSS px high and no fixed navigation hides content.
6. Repeat `fictional-05` and verify performed/skipped/stopped controls remain reachable.

## Keyboard audit

1. Reload without using the pointer.
2. Use `Tab` and `Shift+Tab` through every interactive control.
3. Use arrow keys and `Space` for radio groups and checkboxes.
4. Use `Enter` or `Space` for buttons.
5. Confirm visible focus on every interactive element.
6. Trigger missing mode, missing observation state, missing interpretation, missing decision, missing rationale, missing evidence, and incomplete conditional-start errors.
7. Confirm each error is understandable and focus order remains usable.

## Automated validation

Run:

`node scripts/test_stage4_pwd_decision_conversation.mjs`

The test covers domain behavior, all decision values, optional Tanita, manual fallback, information separation, suggestion review, prompt-injection inertness, cross-case rejection, invalidation/history, fixture privacy, static offline boundaries, accessibility markers, and absence of decision defaults.

## Technical provenance

The implementation starts from exact `product-recovery@65a65f192225fb4f30dc658dd02aa750ec8eab69`. Its isolated HTML/CSS/ES-module/test layout follows the already accepted Stage 2 and Stage 3 fictional prototype harness in the canonical branch.

PR #18 was independently reviewed only as historical technical evidence. No PR #18 file or branch was copied, imported, rebased, or used as the implementation base. The prototype independently uses general techniques—semantic fieldsets, visible focus, responsive single-column layout, exact source labels, and small domain/UI modules—that are also ordinary platform patterns and already present in the accepted prototype line. The fixed `Dzisiaj → Brief → Sesja` information architecture, PR #18 runtime/Supabase coupling, its measurement form, and its product hierarchy were not inherited.

## Independent audit gate

The Draft PR must remain Draft. A separate read-only reviewer must inspect one frozen commit and tree, repeat desktop, exact 360 × 900, and keyboard checks, and report zero P0/P1 before Damian is asked for a separate merge decision.

An audit pass does not authorize merge, real ingestion, runtime, real data, staging, production, or deployment.
