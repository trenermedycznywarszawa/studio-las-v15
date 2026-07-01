# Architecture Freeze Review: Paper-first Foundation

## 1. Executive summary

Review basis: `origin/main` at `d524803`, plus the Paper-first corpus listed in the task and the deprecated no-op Paper-first migration `supabase/migrations/005_paper_first_client_checkins.sql`.

No application code was changed. No SQL was executed. No migration was modified. This document is review-only.

The Paper-first foundation is directionally strong. The product philosophy is unusually clear: paper is the instruction layer, the app is the signal layer, the trainer is the interpretation layer, and reports are the pattern layer. The architecture also follows the right conservative instinct: reuse `home_plans`, `home_plan_items`, `guidance_events`, and `reports` before creating new tables.

The foundation is not ready for a full architecture freeze as-is. There are no P0 blockers, but there are P1 issues that could become real technical debt if future developers treat the current SQL and control docs as frozen truth. The largest issue is the client `client_checkin` update policy: migration `011` creates it, while the review docs already identify that it may allow clients to move a check-in to another active item or date. The second major issue is migration numbering: the deprecated Paper-first `005` no-op exists beside another executable `005` migration, which is safe only if future execution remains manual and disciplined.

Final recommendation: **APPROVE WITH CHANGES**.

## 2. Strengths

The domain model has a clear center of gravity. "Reuse before Create" prevents the system from splitting into separate assignment, check-in, protocol, and report models before there is operational pressure.

The product philosophy is consistent across the README, blueprint, domain model, data policy, protocol document, implementation plan, and schema analysis. The repeated bans on gamification, wearables, push notifications, client-facing AI, broad daily tracking, and public-product drift are useful architectural constraints, not just product copy.

The Paper-first data path is appropriately boring for V1: `home_plan_items` represent assigned paper work, `guidance_events` stores the minimal dated signal, and `reports` remain trainer-authored pattern summaries.

`paper_protocols` is correctly deferred. Treating paper protocols as content before infrastructure avoids an early reusable-library table that would create versioning, RLS, and reporting obligations too soon.

The RLS direction is mostly aligned with the private 1:1 service model. Trainer policies remain the broad operational path, while client policies are scoped to client-owned, client-safe actions.

The execution checklist and runbook are valuable because they make test DB execution manual, explicit, and reversible. They also keep production, app code, auth, Supabase config, public layout, and localStorage out of scope.

The report philosophy is healthy: reports should show adherence, energy, symptoms, relevant context, and trainer interpretation without pretending to diagnose.

## 3. Risks (P0/P1/P2)

### P0

No P0 architecture freeze blockers were found.

### P1

#### P1-1: Client check-in update policy conflicts with V1 immutability

`supabase/migrations/011_paper_first_client_checkins.sql` creates `guidance_events_client_checkin_update`. `docs/PAPER_FIRST_TEST_DB_REVIEW.md` already identifies that this policy may allow a client to move a check-in to another active `home_plan_item_id` or another `event_date`.

This is realistic technical debt because future client UI or data adapters may build around client-editable check-ins, making it harder to restore the simpler V1 rule later. For Paper-first V1, the safer architecture is: clients create a check-in once; correction workflows remain trainer-owned unless a separately reviewed immutable-field update policy is designed.

Freeze gate: choose one rule and align SQL plus docs. Do not freeze while the migration creates client update capability and the review warns that it is broader than intended.

#### P1-2: Control documents disagree about the update policy

The proposal, checklist, runbook, migration, and review do not fully agree on whether `guidance_events_client_checkin_update` should exist. The checklist and runbook expect it as a post-migration policy; the review treats it as a P1 concern; the executable migration creates it.

This is a handoff risk. A future developer could follow the checklist and consider the risky policy a pass condition, while another developer could follow the review and treat it as a no-go.

Freeze gate: make the control docs match the chosen V1 rule before any test DB execution is treated as architecture-approved.

#### P1-3: Duplicate `005` migration prefix is safe only under manual execution discipline

The repository contains both:

- `supabase/migrations/005_clients_trainer_write_rls.sql`
- `supabase/migrations/005_paper_first_client_checkins.sql`

The Paper-first file is no-op and clearly marked deprecated, but automated migration tooling may still treat duplicate numeric prefixes as a migration-version conflict.

Freeze gate: either document the Paper-first migration path as manual-only until runner behavior is verified, or remove/rename the deprecated migration through a separate migration-governance decision. Do not let future developers run the whole folder blindly.

#### P1-4: Access revocation is a stated product rule but not a visible Paper-first execution gate

The product docs say client access should end when cooperation ends. The Paper-first migration relies on `client_can_access_client(client_id)`, but the runbook's client scenarios focus on other-client, draft/unpublished, null-item, spoofing, and trainer-marker checks. It does not make ended/revoked client access a first-class Paper-first test gate.

This could become security debt because Paper-first check-ins are health-related process data. Revocation must be proven for check-in insert and select before production.

Freeze gate: add an explicit revoked/inactive client test to the Paper-first DB/RLS execution criteria.

### P2

#### P2-1: `protocol_id` terminology can mislead future implementation

Several conceptual documents use `protocol_id`, while the chosen V1 database path links check-ins to `home_plan_item_id`. That is understandable historically, but it can mislead future developers into creating a protocol table or local `dailyProtocolCheckins` model too early.

Freeze guidance: for V1, "protocol reference" means the assigned `home_plan_item_id`, not a `paper_protocols.id`.

#### P2-2: Payload shape is documented but not enforced by SQL

The intended payload is minimal: `schema`, `energy_score`, `symptom_score`, and `optional_note`, with `completed` as the protocol-done source of truth. The migration does not enforce score ranges, allowed keys, note length, or schema version.

This is acceptable for a DB/RLS test, but it becomes debt if client UI or import paths write payloads before app-level validation exists.

Freeze guidance: no client write UI should ship before app-level payload validation is in place.

#### P2-3: Trainer-created `client_checkin` rows can bypass the V1 item-link rule

Client insert policies require a non-null active published `home_plan_item_id`, but trainer policies are broader. Trainer-created `client_checkin` rows may still have null `home_plan_item_id`, and the partial unique index will not protect null-item duplicates.

This may be acceptable for trainer correction/admin workflows, but the source-of-truth rule should be explicit.

Freeze guidance: either state that trainer-created exception rows are allowed, or add a later reviewed constraint/policy if every check-in must be item-linked.

#### P2-4: Direct client read access to `guidance_events` is safe only while payload remains minimal

The migration does not add a client-safe `client_checkin` view. Direct base-table read through RLS is acceptable for V1 if payload remains minimal and client-safe. It becomes riskier if payload grows to include trainer interpretation or internal context.

Freeze guidance: historical client check-in reads should move to a client-safe projection if payload grows beyond the V1 minimal signal.

#### P2-5: `create unique index if not exists` can hide an incorrect pre-existing index

The runbook already calls this out. On reused test DBs, a same-name index with a different definition could be silently accepted.

Freeze guidance: post-migration index definition inspection must remain a required execution check.

#### P2-6: Report generation has the right philosophy but not yet a stable data contract

The docs correctly say reports should show patterns, not diagnosis. What is not frozen yet is the exact report input contract: which fields are aggregated, how missing days are represented, and how trainer interpretation is separated from raw client signal.

This is not a blocker for DB/RLS foundation, but it should be resolved before report integration work starts.

#### P2-7: localStorage fallback is protected but not yet mapped as an executable compatibility contract

The docs consistently say not to remove localStorage fallback. The schema analysis proposes a compatible local shape, but there is no execution-level compatibility test yet.

This is fine before app work. It becomes debt once the data adapter starts writing Paper-first check-ins.

## 4. Architectural inconsistencies

The largest inconsistency is update behavior. Product intent leans toward immutable client-created check-ins for V1, while migration `011` creates a client update policy and the checklist/runbook expect it to exist.

The second inconsistency is naming. Earlier documents use `protocol_id`; later architecture chooses `home_plan_item_id`. The freeze should make `home_plan_item_id` the V1 assignment reference and keep `paper_protocols` deferred.

The third inconsistency is document maturity. Some documents are historical proposals and include "recommended next prompt" sections that are now outdated. That is useful for audit history but risky as developer instruction if copied later.

The fourth inconsistency is report readiness. Reports are consistently described as the pattern layer, but the actual report data contract is not frozen. This is acceptable only if report integration remains a later phase.

## 5. Long-term scalability

The chosen reuse-first model scales well for the first operating phase because it avoids extra tables, RLS surfaces, and localStorage models.

The main future scaling pressure will be protocol reuse. `paper_protocols` should remain deferred until there are enough reusable protocols, categories, versioning needs, or cross-client reporting needs to justify a stable library.

The second scaling pressure will be reporting. Querying `guidance_events.payload` is fine for V1, but if reports need stable analytics across many clients and periods, the project may later need stricter payload validation, generated columns, materialized summaries, or report snapshots.

The third scaling pressure will be client-safe visibility. Direct RLS reads from `guidance_events` are simple, but a client-safe projection will age better if the payload grows.

The fourth scaling pressure is migration governance. The duplicate `005` prefix is manageable manually, but automated deployment needs a clean migration story before the database layer can scale operationally.

## 6. Decisions that should never change

- Paper guides the morning.
- Trainer gives meaning.
- App records the signal.
- Report shows the pattern.
- Studio Las OS remains a private 1:1 service system, not a standalone SaaS or public fitness product.
- No gamification, streaks, badges, leaderboards, push notifications, wearable ingestion, client-facing AI coach, or automated medical diagnosis.
- Client data collection stays minimal and purposeful.
- Trainer notes and internal reasoning stay trainer-facing unless intentionally rewritten into client-safe summaries.
- Paper protocols remain content first; infrastructure follows only real operational pressure.
- `localStorage` fallback is not removed without a separate migration plan.
- Production health-related data changes require separate RODO/legal review.

## 7. Decisions that may change later

- A `paper_protocols` table may be introduced when reusable protocol library pressure is real.
- A client-safe `client_checkin` view may be added when the UI needs historical check-in reads or payload projection.
- SQL-level payload validation may be added after the V1 payload contract proves stable.
- Report snapshots or structured report source tables may be added if `reports.content` is not enough for trustworthy period summaries.
- A client correction flow may be introduced later, but only with a separately reviewed policy that prevents moving check-ins across client, item, kind, date, and ownership boundaries.
- Stable protocol identifiers may be introduced later if `home_plan_item_id` is no longer enough for longitudinal reporting.
- Automated migration execution may replace manual SQL Editor execution only after duplicate-version behavior is resolved and documented.

## 8. Recommended freeze checklist

- [ ] Confirm the review basis: branch, commit SHA, and exact Paper-first files reviewed.
- [ ] Resolve the V1 client update decision and align migration `011`, proposal, checklist, runbook, and review docs.
- [ ] Keep the `client_checkin` unique index and verify its exact definition after migration.
- [ ] Keep `guidance_events_client_checkin_select` and `guidance_events_client_checkin_insert`.
- [ ] Keep existing trainer policies unchanged.
- [ ] Keep existing `daily_step` policies unchanged.
- [ ] Keep `paper_protocols` DEFERRED.
- [ ] Document that deprecated `005_paper_first_client_checkins.sql` is never applied.
- [ ] Do not use automated full-folder migration execution until duplicate `005` behavior is resolved.
- [ ] Add explicit revoked/inactive client tests for check-in select and insert.
- [ ] Verify client cannot read trainer markers or other clients' events.
- [ ] Verify client cannot spoof `created_by`.
- [ ] Verify draft/unpublished/deleted home plan items cannot receive client check-ins.
- [ ] Verify `daily_step` behavior remains unchanged after `011`.
- [ ] Require app-level payload validation before any client UI writes check-ins.
- [ ] Preserve localStorage fallback in any future app implementation.
- [ ] Keep report integration as a later phase until the report input contract is defined.
- [ ] Do not touch production data during foundation testing.

## 9. Final recommendation

**APPROVE WITH CHANGES**

The Paper-first philosophy, domain model, and reuse-first architecture should be approved. The executable database/RLS foundation should not be frozen as-is until the P1 issues are resolved, especially the client update policy mismatch and duplicate migration-prefix governance.

Once those changes are aligned across SQL and control docs, the foundation is suitable for manual fresh/test DB execution. It is not yet a production execution approval.
