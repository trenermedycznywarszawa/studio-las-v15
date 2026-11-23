# Stage 4A — Fictional PWD Decision Conversation

**Status:** OWNER ACCEPTED AND MERGED — FICTITIOUS PROTOTYPE CONTRACT ONLY

- **Owner acceptance and merge date:** 2026-08-16
- **Accepted head:** `ad101c87e4eca13ce18517ec9cc8b9277392756b`
- **Accepted tree:** `41747abd450c60e6f9a2b8c85fb41dae04a1efca`
- **Merge commit:** `149fb9538a2491bed5cbf71c6885fe789247d541`
- **Pull request:** PR #25
- **Independent audit:** `0 P0 / 0 P1`
- **Stage 4A regression:** `52/52 PASS`

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
12. Create the replacement workspace and confirm it names exact handoff v2 while the superseded v1 remains rejected and visible.
13. Save interpretation v1, prepare a run and decision, then save interpretation v2; confirm dependent active records become invalidated without losing history.
14. Save decision v1 and a follow-up, correct the decision to v2, and confirm the old draft still displays `derived_from` decision v1.
15. Prepare the conversation twice and confirm distinct run versions plus preserved suggestion/review history.
16. Attempt a decision while a suggestion is `needs_review` and confirm the domain error is shown.
17. Attempt to select a Tanita fact without the active exact-package comparability record and confirm save is rejected; repeat without Tanita and continue successfully.
18. Add two manual notes of equal length and confirm their exact identifiers differ.
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

The accepted and merged Stage 4A head completed this suite with `52/52 PASS`.

The test covers domain behavior, append-only interpretation/decision lineage, immutable nested references, exact follow-up provenance, versioned conversation runs and preserved suggestion history, domain-level conversation gating, exact-package Tanita evidence gating, manual identifier uniqueness, handoff v2 workspace rebuilding, all decision values, manual fallback, information separation, prompt-injection inertness, cross-case rejection, invalidation/history, fixture privacy, static offline boundaries, accessibility markers, and absence of decision defaults.

## Technical provenance

The implementation starts from exact `product-recovery@65a65f192225fb4f30dc658dd02aa750ec8eab69`. Its isolated HTML/CSS/ES-module/test layout follows the already accepted Stage 2 and Stage 3 fictional prototype harness in the canonical branch.

PR #18 was independently reviewed only as historical technical evidence. No PR #18 file or branch was copied, imported, rebased, or used as the implementation base. The prototype independently uses general techniques—semantic fieldsets, visible focus, responsive single-column layout, exact source labels, and small domain/UI modules—that are also ordinary platform patterns and already present in the accepted prototype line. The fixed `Dzisiaj → Brief → Sesja` information architecture, PR #18 runtime/Supabase coupling, its measurement form, and its product hierarchy were not inherited.

## Independent audit gate — completed

PR #25 remained Draft through the separate read-only audit of exact accepted head `ad101c87e4eca13ce18517ec9cc8b9277392756b` and tree `41747abd450c60e6f9a2b8c85fb41dae04a1efca`. The audit reported `0 P0 / 0 P1`; Damian then issued the separate acceptance and merge decision, and PR #25 merged on 2026-08-16 as `149fb9538a2491bed5cbf71c6885fe789247d541`.

The audit pass did not by itself authorize merge. The later owner decision authorized the controlled merge. A subsequent read-only Stage 4 Completion Gate on 2026-08-16 mapped the full roadmap Stage 4 scope and exit gate to this accepted evidence and found no remaining product-contract gap. Real PDF upload/parser/OCR and Tanita import-reliability automation remain Stage 8 work, after manual flows are proven. Stage 4 is therefore `OWNER ACCEPTED, MERGED AND CLOSED — BOUNDED FICTIONAL PROTOTYPE CONTRACT ONLY`; Stage 4A remains the delivery-slice and evidence name, and no Stage 4B is required.

Neither the audit, merge, nor Stage 4 closure authorizes runtime, real AI, real Tanita ingestion, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, real data, staging, production, deployment, publication, integration with `main`, or Stage 5. Starting Stage 5 requires a separate explicit owner decision.
Every domain action resolves exact references through an immutable in-memory session aggregate. Do not treat a displayed or copied `status` field as authority.
Client reactions require an explicit exact-version Damian review before use in interpretation or decision evidence.
It also covers canonical aggregate conflict rejection, complete run-set resolution, manual run ownership, run-triggered transitive invalidation, handoff predecessor continuity, handoff/workspace-bound Tanita, and explicit exact-version client `source_fact` review.

## P1 re-audit procedure

1. In assisted mode, leave all suggestions pending and attempt domain save with an empty set and then with one omitted record; both must reject.
2. Attempt save without an active run; it must reject. Start a manual run with no AI records; it must pass.
3. Add a manual option in run 1, prepare run 2, and confirm the old option is visibly invalidated and absent from the active run 2 set.
4. Save a decision and follow-up, prepare another run, and confirm both dependent active records are invalidated while their original provenance remains visible.
5. Record a fictional client reaction. Interpretation must reject while it is `needs_review`. Use the explicit Damian approval control for that exact version, then retry successfully.
6. Trigger handoff v1→v2. Confirm a preserved original v1 object and v2 without the exact invalidated predecessor both reject. Confirm the valid replacement workspace names v2 and `supersedes` the predecessor.
7. Attempt to assess or use the old Tanita package/fact in the replacement workspace; it must reject.
8. Repeat the standard desktop, exact 360 × 900 CSS px, keyboard, focus, error, empty-state, storage, cookie, console, and local-request checks.

All steps use fictional fixtures only. Do not enter real data or introduce network, persistence, upload, parser, AI runtime, Supabase, deployment, send, publish, payment, or booking capability.
