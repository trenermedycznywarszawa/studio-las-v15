# Post-audit rebuild — implementation and release evidence

Status: IN PROGRESS. Production go-live is not authorized.

Base: `product-recovery` at `e112a043cb3a6ad2976881f0c96728a27f2f020a`.
Branch: `codex/post-audit-rebuild-2026-09-08`.
Authority: September 8 Owner Decision and the explicit post-audit implementation brief.

## Dependency order

1. Complete-set validation, exact-version approval separate from publication,
   immutable approved/published prescriptions, controlled lifecycle operations.
2. Original client observations and attributed corrections.
3. Client projection, purposeful response and already-saved semantics.
4. Exact-source trainer signals and unresolved follow-through, reusing the existing phase-aware UI.
5. Recoverable loading/save states, intake retirement, accessibility and language.
6. Manual evidence-to-report workflow; no automated interpretation.

Release identity and logical migration mapping run alongside this sequence and
gate the preview/go-live recommendation. Preserve existing dirty checkout and
all historical client records. No automatic backfill may invent past approval,
original prescription content, or original client statements.

## Verification boundaries

- Local/staging use fictional fixtures only.
- Production-sensitive project `ufcumhbnuyernuwepcij`: no mutations.
- Staging project `ulauyoqjoetjqktegeuq`: authorized rehearsal target.
- Production database/Auth/Storage recovery proof is separate from a schema rebuild.
- A successful static test is not evidence that a SQL or authenticated browser test ran.
- No paid infrastructure, security weakening, or production release.

## Execution evidence

- Clean worktree created from the latest remote base; original working tree preserved.
- Supabase CLI 2.101.0 and PostgreSQL 17 tooling available.
- Docker daemon unavailable; use isolated PostgreSQL plus hosted staging for the relevant proofs.
- Current Supabase changelog and RLS/function documentation reviewed before changes.

## Go/no-go

NO-GO while implementation and staging evidence remain incomplete.
Production additionally requires owner approval and a verified protected recovery package.

## Publication checkpoint — 2026-09-09

Recovered the uncommitted implementation from the interrupted session at HEAD
`11552ce02240b4dca07060c639d0f09f16ce88bf`; no implementation was recreated from a stale checkout.

Migration `20260908131947_guidance_integrity_boundary.sql`:
- validates every included action under the shared parent lock;
- requires separate approval of the viewed draft revision before publication;
- freezes approved/published content and blocks ordinary lifecycle writes;
- preserves legacy records without invented approval metadata;
- creates editable successor drafts with fresh approval requirements;
- supplies plan revision/items in one SQL snapshot for review;
- records withdrawal actor and the deliberate withdrawal/replacement operation;
- reconciles the verified production cleanup in source, without touching production.

Local evidence: PostgreSQL 17.10 on localhost, a fresh disposable database rebuilt
from every source migration using the explicitly test-only Auth/Storage SQL harness.
`post_audit_guidance_integrity.sql` passed with fictional fixtures and ROLLBACK.
It covers empty/partial/complete sets, stale revisions, edits after approval,
lifecycle bypass (including a spoofed custom GUC), one-action publication,
replacement lineage, client A/B, revoked access, owner AAL1/AAL2, unrelated trainer,
anonymous execution, historical response references, paper retirement and withdrawal.
Positive outcomes are assertions, not merely printed booleans.

This proves database behavior; the local harness does not prove hosted Auth or
Storage services. Hosted staging and concurrent-session verification remain pending.
No production-sensitive project was accessed during this checkpoint.

### Remote and hosted staging checkpoint

- Database implementation commit: `17423c0a6cc99402080f49384d51aab5be36a860`.
- UI/transport commit: `7301d6aa674cb76e745523869187134d4c4c9742`.
- Draft PR #66 remote head and files verified using `gh pr view`: all 11 files,
  including the migration and executable SQL tests, are present.
- Staging `ulauyoqjoetjqktegeuq` preflight: migration absent, table owner and
  function execution role both postgres, fictional UUID collision count zero.
- Applied exact committed SQL as hosted migration `20260909055855`,
  `guidance_integrity_boundary` (logical source identity:
  `20260908131947_guidance_integrity_boundary.sql`). No timestamp renaming in source.
- Executed exact committed `supabase/tests/post_audit_guidance_integrity.sql`:
  hosted result `GUIDANCE_INTEGRITY_SQL_PASS` on 2026-09-09.
- Post-rollback verification: zero fixture Auth users and zero original fixture plans.
- Publication/edit concurrency attempts through separate connector calls did not
  overlap, including a simultaneous dispatch attempt. The expected lock-timeout
  assertion failed because the publication transaction had already rolled back.
  This is inconclusive concurrency evidence, not a database-invariant pass.
  Dedicated concurrency fixtures were removed after both rollback-only attempts;
  remaining fixture Auth users: zero. Direct concurrent-session proof remains a
  release gate; sequential hosted SQL assertions passed independently.
- No production-sensitive project access or production deployment occurred.

## Observation history — guidance responses

Migration `20260909060432_client_observation_history.sql` freezes original
`client_checkin`/`daily_step` events, including soft deletion and reclassification.
An owner/AAL2 RPC adds correction or trainer-interpretation notes with exact
source, actor and time; corrections require a reason. Notes are append-only and
trainer-only; they do not replace original payloads or become client material.
No old statement is reconstructed or backfilled. This is deliberately a bounded
first history change; other client-origin records and the trainer UI remain to verify.
Local PostgreSQL regression: `CLIENT_OBSERVATION_HISTORY_SQL_PASS`.
Existing static security verifier passed. Hosted history verification pending.

### Guidance observation hosted and UI evidence

- Database commit `b5353c1`; staging logical migration mapping:
  `20260909060432_client_observation_history.sql` -> `20260909060834`.
- Exact committed SQL test returned `CLIENT_OBSERVATION_HISTORY_SQL_PASS` on staging;
  rollback verified with zero fixture Auth users remaining.
- Trainer history shows original response and its historical prescription alongside
  separate correction and interpretation notes. Correction requires a reason.
- Repository transport regression checks exact source/kind/body/reason arguments;
  forged attribution is not sent. Static security and modularity checks passed.
- Microsoft Edge fictional fixture verified separate approval/publication controls,
  hidden approved-content editors, and correction submission preserving the visible
  original. Responsive checks at 390/768/1440 found no horizontal overflow; 390px
  screenshot visually inspected. Local screenshots: output/playwright/publication-history-*.png.
- Browser fixture uses in-memory callbacks; it is UI evidence, not hosted Auth E2E.
  Hosted SQL role enforcement was tested separately. Only console error was missing
  fixture favicon (404). Other historical sources, full authenticated preview and
  concurrent hosted publication remain explicit outstanding release checks.

### Resumed semantic UI checkpoint — 2026-09-09

Recovery confirmed clean status/diff at `6c8ebfba070d720643bc7ffd69cff435b9e757d1`,
matching remote Draft PR #66. The prior guard fix and responsive evidence were
already committed; nothing was recreated or discarded.

Added visible author and precise timestamp to later records, with source actor
identifier available for attribution. Reproducible CLI browser scenario:
`scripts/fixtures/publication-history.browser.js` against its fictional HTML fixture.
Passed all seven semantic conditions at 390/768/1440: original, correction and
interpretation distinct; historical prescription readable; unrelated note typing
leaves approval enabled; unsaved prescription editing disables approval; approved
content has no editors; publication remains separate. Screenshots at
`output/playwright/semantic-history-*.png`, with 390/1440 visually inspected.
Transport and static security/modularity checks passed. Hosted concurrency is
still an OPEN RELEASE GATE; no new claim of a passing concurrency test.

## Client projection and narrative response contract

Inspection: current portal filtered published/active items correctly but omitted
release ID/revision and today's saved response. Existing form forced binary
completion plus energy/symptom scores without a client-specific measurement purpose.

Chosen minimum: optional submission of a short original statement (1-500 chars),
attached to the immutable item and exact release. Free text preserves what happened
(reduced, stopped, not attempted, not applicable) without five durable statuses or
an inferred success/failure score. A deliberate reduced alternative must already
be prescribed; the response itself does not approve one. Existing historical
binary/score fields and statements are untouched; older RPC remains compatible.

Migration `20260909113836_client_guidance_response_contract.sql` adds controlled
projection identity/server date/today response and an idempotent narrative RPC.
The RPC derives client/actor from active Auth, locks access/client and applicable
plan during validation/write, and returns the original on duplicate submissions.
The existing per-item/server-day uniqueness remains. A changed retry payload under
the same submission UUID fails rather than rewriting history.

Local fictional test `client_response_contract.sql`: `CLIENT_RESPONSE_CONTRACT_SQL_PASS`.
Covers projection identity, initial/saved state, repeat/second-tab writes, stale
release, no inferred failure score, client A/B, revocation, trainer and anonymous.
Hosted verification and client UI integration pending at this checkpoint.

### Hosted client response contract

Database source commit `232577c`, logical staging mapping:
`20260909113836_client_guidance_response_contract.sql` -> `20260909114233`.
First hosted test exposed an incorrect assumption that tied item sort keys implied
array position zero. Corrected the assertion to select the immutable item ID;
local and hosted reruns returned `CLIENT_RESPONSE_CONTRACT_SQL_PASS`. No migration
change was needed. Post-rollback fixture user count is zero.

### Client current-action and already-saved UI

Client UI now leads with applicable guidance, purpose, general instructions, dose,
existing trainer-written alternatives/boundary, then an optional original narrative.
No new mandatory energy/symptom bundle or inferred completion flag is sent.
Next meeting and existing public telephone contact follow; published reports and
measurements are available deeper. No guidance means no invented response task.

`ClientPortalController` retains only ephemeral in-memory write identity/text and
receipt state. Confirmed saves prevent another submit even when refresh fails;
uncertain network outcomes offer a deliberate check/retry using the same UUID and
text. Read failures retain useful context, authorization loss clears it, and late
reads cannot overwrite newer results. No response text is added to browser storage.

Evidence: `test_client_response_state.mjs` passed saved, failed, saved/refresh-failed,
lost receipt, lost request with same-ID retry, initial retry, revocation and read
ordering. Exact transport and static security/modularity checks passed.
`client-response.browser.js` exercised six modes at 390/768/1440 with the actual
renderer/controller and fictional network outcomes; all assertions passed. It
verified guidance before collection, no wellness spinbuttons, readable contact,
retained failed text, saved-form suppression, no duplicate write after lost receipt,
and no rest-day form. Saved and refresh-failed screenshots captured; 390px failure
and 1440px success visually inspected. This remains fixture UI evidence separate
from the passing hosted SQL role test, not a claim of full hosted Auth E2E.

## Exact-source trainer signal follow-through

New signal keys include source record ID and source revision, preserving same-day
observations separately. Coarse legacy keys remain historical; no ambiguous review
is backfilled onto an exact observation. The existing phase-aware surface now
receives all loaded source observations, including original client narratives.
Narratives are review context, not automatically scored or interpreted.

Migration `20260909115632_trainer_signal_contact_followthrough.sql` adds explicit
contact completion time/actor/note to the existing review. Owner/AAL2 RPC only;
original review and completed contact metadata cannot silently change. Contact
required stays actionable until that explicit completion, even when its source is
not in the current loaded source set. No generic task engine or new state enum.
Local `SIGNAL_CONTACT_SQL_PASS` and `SIGNAL_FOLLOWTHROUGH_PASS`; existing decision
state regression passed with its stale pre-approval add-item assumption corrected.
Hosted and browser evidence pending at this checkpoint.

### Signal follow-through verification

Source DB commit `c437a68`; hosted exact SQL test returned `SIGNAL_CONTACT_SQL_PASS`
with rollback-only fictional fixtures. Local domain and existing decision-state
regressions plus static security/modularity checks passed.

`signal-followthrough.browser.js` passed at 390/768/1440: two same-day sources
stay distinct; contact-required remains visible after a newer source replaces the
loaded source; deliberate contact confirmation removes it from the open view and
retains the dated outcome in history. New source timestamps are shown for context.
Pending contact is prioritized below urgent review and above ordinary information.
No duplicate trainer dashboard was introduced. Browser fixture callbacks are
separate from the hosted SQL authorization proof.

## Hosted overlapping concurrency gate — CLOSED with evidence

At `2026-09-09T12:10:04.562491Z`, real concurrent HTTP requests reached distinct
hosted staging PostgreSQL backends. The fixture authenticated through password
and a real TOTP challenge to AAL2 (no forged JWT / relaxed MFA).

- Publisher PID `1450671` called the actual approval and publication functions,
  then held the transaction during `pg_sleep`.
- Editor PID `1450681` observed that live publisher and attempted to change its
  item. It hit `lock_not_available` under a 500ms lock timeout.
- Publisher returned deliberate `EXPECTED_PROBE_ROLLBACK pid 1450671`.
- Runner returned `HOSTED_PUBLICATION_OVERLAP_PASS`.
- Post-test SQL asserted draft revision 2, no approval/publication and original
  dose `3 repetitions`, proving neither test transaction changed the prescription.
- Temporary probe function removed; fixture client/plan/item/profile/Auth user
  and sessions removed. Verified zero users/plans and absent probe.
- Local temporary credential file removed. No production-sensitive access.

Reproducible runner: `scripts/test_hosted_publication_overlap.py`.
Scoped temporary harness: `supabase/dev/staging_publication_overlap_probe.sql`.
The harness requires the exact fictional fixture owner and AAL2, and is outside
production migrations. Its staging-only create/remove ledger entries are test
infrastructure, not product migrations. Earlier connector attempts remain recorded
as inconclusive; this proof supersedes their OPEN gate status.

Security advisor reviewed after product DDL: new controlled SECURITY DEFINER RPCs
are intentional owner/AAL2 or Auth-derived client boundaries with explicit grants
and passing negative-role tests. Existing audit table with no public policies is
intentionally inaccessible. Staging leaked-password protection remains disabled;
no plan/configuration change was made. Advisor remediation references:
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
