# PRD 005 — Twelve-Week Guidance and Adaptation Loop v1

- **Status:** DRAFT PRD — OWNER AUTHORIZED FOR INDEPENDENT AUDIT ONLY
- **Owner:** Damian
- **Stage:** 5
- **PRD authorization date:** 2026-08-17
- **Exact base:** `product-recovery@03757a7402baa3f288ae31c46452efd354731862`
- **Base tree:** `462a773bff75e597191977bf48b0c14e7a23ee1e`
- **Product authority:** accepted Stage 5 Product Decision Brief at head `c16ac756af35b3977fc344babcb374fb29e2afe5`, tree `5d51ce05a9945f67eb259419d0f69ea4e6caa780`
- **Architecture authority:** accepted Stage 5 Architecture Contract at head `02fcb175460b340d13cf4fc0833081a0ae071706`, tree `34c24a4880ca7543550cd51d912250a28e0b691d`
- **Task contract:** `stage5-guidance-loop-v1`
- **Schema and provider:** `NOT APPROVED / BLOCKED`
- **Prototype, UI, runtime, real-data, and implementation permission:** none

## Purpose

This PRD defines the testable behavior of the Stage 5 twelve-week guidance and adaptation loop without designing a screen, schema, API, provider, or runtime.

The product is the trainer-led process. Paper, the app, or a deliberate hybrid may carry the current instruction when Damian selects that channel. The OS supports exactness, continuity, client-safe publication, response capture, and review; it never becomes the source of meaning or the trainer.

The complete loop is:

> exact current qualifying Stage 4 `START` → one current trainer-owned focus → one authoritative guidance release → client action → optional minimum decision-relevant response or contextual question → Damian review → explicit trainer decision → controlled guidance continuation or revision → selected report-ready evidence

## Authority and conflict rule

This PRD is subordinate to:

1. Constitution v1.1;
2. the accepted Product layer, especially `10_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP.md`;
3. Architecture 00–18, especially Architecture 04, 07, 08, 10, 13, 17, and 18;
4. the Source of Truth Registry and Product Recovery Execution Plan.

If this PRD appears to create a product rule, information type, review state, publication state, interface, schema, provider, or runtime behavior that is not authorized above, the higher layer wins and the apparent addition is invalid.

## Problem

During a twelve-week process Damian must give one clear current instruction, learn only what can change a decision, revise guidance without leaving stale alternatives actionable, and preserve useful evidence without becoming a data clerk.

The client must know what matters now, what makes the instruction complete, when to reduce or stop, and how to ask a contextual question. The client must not need to interpret competing paper and app versions, maintain a streak, report unnecessary data, or wait for an automated coach.

## Users and authority

### Damian

Damian is the sole authority for:

- entry into Stage 5;
- the current focus;
- exact guidance approval and publication;
- channel authority;
- interpretation;
- continuation, simplification, progression, regression, replacement, pause, referral, channel change, and closure;
- report-ready selection.

### Client

The client may:

- act entirely offline when the selected channel allows it;
- access only deliberately authorized same-client projections; Studio Las-authored `client_material` requires exact approval and publication, while an allowed projection of the client's own source, signal, or access state preserves its original information type and may remain `unpublished`;
- provide the exact requested response when one exists;
- ask a contextual question bound to the relevant guidance;
- stop or modify action without shame or automatic judgment.

### Studio Las OS

The OS may preserve, validate, project, and enforce Damian's exact decisions. It may not choose, rank, recommend, infer, or preselect a trainer decision in Stage 5.

## Job to be done

When a client is inside the twelve-week process, Damian wants to maintain one clear direction and adapt it from the smallest useful evidence, so the client gains confidence and independence while the process remains safe, calm, and operationally sustainable.

## Success outcome

Stage 5 is successful when:

- the client can identify the one current authoritative instruction and its stop/reduction boundary;
- Damian can determine what changed without reviewing ordinary completion as administrative work;
- a material guidance change produces a new exact version and retires stale actionable material;
- paper, app, and deliberate hybrid each work without duplicate truth;
- the complete loop works manually without AI, integration, notification, or production runtime;
- selected evidence can enter the later report process without producing a Stage 7 report;
- the process increases client independence rather than screen dependence.

## Scope

In scope for this PRD:

- exact Stage 4 entry eligibility;
- the twelve-week cycle and review anchors;
- one current focus;
- one authoritative guidance release;
- minimum-effective guidance requirements;
- paper, app, and deliberate-hybrid authority;
- real stale-paper retirement responsibility;
- optional result, response, note, or contextual question;
- trainer review and explicit decisions;
- version continuation, replacement, withdrawal, and hard-validity behavior;
- client-safe responsibilities;
- report-ready evidence selection;
- manual fallback, failure behavior, fictional cases, and later moderated validation.

Outside this PRD:

- offer, pricing, payment, booking, or package construction;
- fixed twelve-week modules or exercise curriculum;
- screens, navigation, wireframes, components, routes, or UI copy;
- tables, columns, enums, SQL, RLS, storage paths, API contracts, payloads, or events;
- Supabase, Auth, MFA, Edge Functions, provider, model, prompts, or AI execution;
- notifications, messaging automation, imports, wearables, Tanita, Polar, or Formspree integration;
- Stage 6 preparation, Stage 7 report generation, or Stage 8 automation;
- real client data, staging, production, deployment, publication, or implementation.

## Closed information and state vocabulary

This PRD adds no `information_type`, `review_state`, or `publication_state`.

The nine information types remain:

`source_artifact`, `source_fact`, `extracted_fact`, `trainer_observation`, `ai_hypothesis`, `ai_suggestion`, `trainer_interpretation`, `trainer_decision`, `client_material`.

Review states remain `draft`, `needs_review`, `approved`, `rejected`, and `superseded`. Publication states remain `unpublished`, `published`, and `withdrawn`.

Cycle, focus activation, release, channel assignment, response request, review due, retirement confirmation, access, and report-evidence selection are operational roles or records, not new semantic information types. They may reference exact semantic versions but may not copy or reclassify their meaning for convenience.

## Entry gate

Stage 5 opens only when all are true:

1. one exact Stage 4 `trainer_decision` belongs to the same client process;
2. Damian authored it;
3. its value is exactly `START`;
4. it is the canonical current version and is not stale, rejected, superseded, invalidated, detached, or cross-client;
5. the Stage 5 cycle binds immutably to that exact version.

`START_CONDITIONAL`, `DEFER_CONSULT`, `NOT_THIS_PRODUCT`, missing decision, payment, booking, elapsed time, UI state, or a system suggestion never opens Stage 5.

If the bound `START` later becomes ineligible, actionable guidance fails closed until Damian creates and binds a new exact qualifying decision. History remains intact and no old reference is redirected.

## Happy path

1. Damian opens a fictional Stage 5 case bound to one exact current qualifying `START`.
2. He establishes one exact current focus.
3. He chooses paper, app, or deliberate hybrid and names the authoritative channel.
4. He prepares the minimum-effective guidance and any optional decision-relevant response request.
5. Every Studio Las-authored guidance `client_material` intended for the client begins unapproved and unpublished.
6. Damian reviews and approves each exact intended `client_material` version for the same client and use.
7. Each intended item is deliberately published.
8. The complete release activates atomically only after all entry, focus, approval, publication, channel, dose, stop, validity/review, and single-release conditions pass.
9. The client receives or uses the authoritative instruction through the selected channel.
10. The client acts offline or uses the bounded response/question path when one was requested.
11. Ordinary completion and silence create no administrative queue by default.
12. A question, stopped/changed task, unexpected requested value, review anchor, or expiring/invalid guidance creates a bounded review need.
13. Damian reviews exact evidence and records an explicit decision.
14. An unchanged continuation preserves the same release only when nothing material changed; a material change creates a controlled successor.
15. Retained, replaced, and removed predecessor items resolve explicitly; the successor becomes current only as one complete transition.
16. Damian may select exact report-ready evidence without generating or publishing a report.
17. At the review boundary he explicitly continues, extends, pauses, refers, or closes; time alone chooses nothing.

## Alternative and failure paths

### Paper primary

The complete authoritative instruction exists on paper. The app is not required. A replacement cannot become current until the old paper has a real bounded handover or retirement outcome. If retirement cannot be confirmed and creates material ambiguity or risk, the successor remains non-current, Damian makes the affected guidance paused and non-actionable, and he contacts the client through the approved human path until explicit resolution. A database flag never pretends to remove a physical copy.

### App primary

The exact current published release is the actionable projection. App unavailability does not silently switch authority to paper. Damian restores the selected path or makes an explicit channel-change decision.

### Deliberate hybrid

One channel is authoritative. The secondary role is separately bounded and never becomes independently maintained mutable guidance. Ambiguous authority rejects the hybrid.

### No signal required

The guidance remains complete. No missing-data, incomplete-plan, late, or non-compliant state is created.

### Client changes, stops, does not act, or asks

`changed_or_partial`, `stopped`, and `not_done` remain factual client sources. A contextual question is a separate axis. None is scored or interpreted automatically.

### Review point passes

A soft next review point creates `review due` only. Otherwise-valid current guidance remains authoritative. The event does not pause, extend, progress, or close the process.

### Hard validity expires

The affected guidance becomes non-actionable. A zero-current-guidance state is allowed and the client-safe projection must not imply that old guidance remains valid. Expiry enforces Damian's prior boundary; it is not an inferred trainer decision.

### Partial revision fails

The successor remains non-current. The predecessor remains unchanged unless Damian separately makes a valid pause, invalidation, referral, closure, or safety decision. No mixed release becomes current.

### Late response

The response remains attached to the retired exact request and release. It may be reviewed in its original context but cannot mutate, satisfy, or redirect to current guidance.

### Client question suggests urgency

The client receives the established non-emergency boundary and direction to appropriate external help. No automated advice, diagnosis, or safety clearance is produced.

## Functional requirements

### Cycle and entry

- **FR-01:** Resolve Stage 5 entry from canonical exact-version lineage, never from a caller-supplied active flag.
- **FR-02:** Reject every entry that is not the exact current same-client Damian-authored `START`.
- **FR-03:** Preserve the immutable entry binding and fail actionable guidance closed if it later becomes ineligible.
- **FR-04:** Treat twelve weeks as a commercial and review envelope, not a curriculum or automatic lifecycle.
- **FR-05:** Treat start, approximately week 4, approximately week 8, and week 12 as review anchors only.
- **FR-06:** Require an explicit Damian decision for early finish, pause, referral, extension, or closure.
- **FR-06a:** If week 12 arrives without a decision, mark review due only and neither auto-extend nor auto-close the cycle. A separately declared hard-validity boundary acts only under its own exact terms in FR-25–FR-27; the week-12 anchor neither creates nor implies one.

### Current focus

- **FR-07:** Maintain exactly one current focus as an exact Damian `trainer_decision` version for an active cycle.
- **FR-08:** Preserve prior focus history and exact supersession or invalidation lineage.
- **FR-09:** Bind every current release and guidance item to the exact current focus.
- **FR-10:** Reject guidance bound to a missing, stale, different, cross-client, or ineligible focus.
- **FR-11:** Keep trainer-only focus rationale separate from any approved and published client-safe focus expression.

### Guidance item and release

- **FR-12:** Require every guidance item to contain a clear client-safe instruction, purpose, dose or completion condition, relevant stop/reduction criteria, channel authority, validity or exact review point, and signal decision.
- **FR-13:** Permit no requested signal unless Damian records what decision or conversation it may change.
- **FR-14:** Keep every Studio Las-authored guidance `client_material` intended for the client `needs_review` and `unpublished` until Damian separately approves and publishes that exact version for the same client and use. This requirement does not reclassify an allowed same-client projection of the client's own source, signal, or access state.
- **FR-15:** Activate a release only when every exact intended item and all entry, focus, channel, validity/review, and single-release conditions pass.
- **FR-16:** Make release activation and replacement atomic: partial success never becomes current.
- **FR-17:** Maintain at most one current authoritative release; maintain exactly one whenever the client is expected to act.
- **FR-18:** Allow zero current releases only before first publication, after an explicit pause/invalidation/referral/closure, or after an exact hard validity expiry.
- **FR-19:** Never edit approved or published client material in place; a material change creates a new exact version and new approval/publication obligations.
- **FR-20:** Preserve the same release on `continue` only when content, dose, stop criteria, signal request, validity, focus expression, and channel authority remain materially unchanged.
- **FR-21:** Require every predecessor item in a successor mapping to be explicitly retained unchanged, replaced, or removed.
- **FR-22:** Reuse a retained item as the same exact approved and published version; do not clone, supersede, or withdraw it.
- **FR-23:** Give every replacement a new exact version; supersede and withdraw the replaced version without republishing it.
- **FR-24:** Withdraw a removed item without falsely marking it superseded when no replacement exists.

### Validity and review

- **FR-25:** Keep a soft next review point separate from a hard validity boundary unless Damian explicitly records one exact point as both before activation.
- **FR-26:** When a soft review point passes, mark review due and leave otherwise-valid guidance, focus, and publication unchanged.
- **FR-27:** When a hard validity boundary passes, make affected guidance non-actionable and do not infer continuation, pause, or adaptation.
- **FR-28:** Reject activation when a required validity/review boundary is missing, conflicting, ambiguous, or already passed.

### Channel authority and stale material

- **FR-29:** Let Damian deliberately select `paper`, `app`, or `deliberate_hybrid` for the exact release.
- **FR-30:** Require paper primary to remain completely usable without the app.
- **FR-31:** Require a real bounded handover/retirement outcome before a replacement paper release becomes current.
- **FR-32:** If stale paper cannot be retired and creates material ambiguity or risk, keep the successor non-current, make the affected guidance paused and non-actionable, and require Damian to contact the client through the approved human path until he explicitly resolves the ambiguity.
- **FR-33:** Remove a withdrawn app version from actionable projection while preserving history.
- **FR-34:** Never infer a channel switch from device availability, client age, account status, prior habit, or novelty.
- **FR-35:** Require a hybrid to name one authoritative channel, one bounded secondary role, permitted secondary content, retirement behavior, and a review point.
- **FR-36:** Reject independently maintained or ambiguously authoritative paper/app instructions.

### Client response and question

- **FR-37:** Support the exact common execution values `done_as_planned`, `changed_or_partial`, `stopped`, and `not_done` only when a response was requested.
- **FR-38:** Preserve a contextual question or uncertainty as a separate axis from execution response, bind it to the exact same client, cycle, release, guidance item, and question-context version, and preserve its operational `unresolved` or `resolved` state without turning that state into semantic meaning.
- **FR-39:** Bind every response request and response to the exact client, cycle, release, guidance item, and request version; never redirect a response or question to another or newer context.
- **FR-40:** Preserve original client source separately from normalized `extracted_fact`; normalization never approves meaning.
- **FR-41:** Make a reason or note optional unless an explicit safety contract requires it.
- **FR-42:** Apply no score, streak, adherence percentage, colour judgment, shame, pressure, or automatic interpretation.
- **FR-43:** State the bounded non-emergency response path for contextual questions, make no promise of an immediate response, and direct urgent situations to appropriate external help without automated advice.
- **FR-44:** Keep ordinary completion and silence out of Damian's review queue by default.

### Trainer review and decision

- **FR-45:** Surface for review only bounded decision-relevant events: question, stopped/changed task, unexpected requested value, review due, hard expiry, stale/invalid release, or deliberately selected report evidence.
- **FR-46:** Preserve exact evidence reviewed and unresolved uncertainty.
- **FR-47:** Require explicit Damian action to continue, simplify, progress, regress, replace, pause, change channel, change signal, refer, or close.
- **FR-48:** Let the OS enforce the selected transition but never rank, recommend, preselect, or infer it in Stage 5.
- **FR-49:** Preserve every prior interpretation, decision, release, and source version as history without making stale content actionable.

### Client-safe responsibilities and report-ready evidence

- **FR-50:** Provide only three client-safe responsibilities: current guidance or paper-authority statement; requested response/contextual question; and separately approved/published summaries.
- **FR-51:** Exclude trainer-only rationale, observation, interpretation, draft, audit detail, report candidates, and every Studio Las `client_material` version that is not the exact approved and published version intended for that client and use. A separately authorized same-client projection of the client's own allowed source, signal, or access state preserves its original type and may remain `unpublished`.
- **FR-52:** Interpret `Plan` only as current authoritative guidance, never as a speculative twelve-week calendar.
- **FR-53:** Interpret `Progress` only as Damian-approved pattern meaning, never raw completion or adherence charts.
- **FR-54:** Let Damian select exact evidence references, purpose, time, and reason for later reporting without copying full content or generating a report.
- **FR-55:** Create separate `trainer_interpretation` when Damian adds meaning and separate exact `client_material` for any client-safe review summary.

### Failure, isolation, and audit

- **FR-56:** Reject missing, ambiguous, cross-client, detached, stale, or conflicting exact references before mutation or publication.
- **FR-57:** Preserve the conceptual audit minimum: action, actor identifier and actor type, event time, same-client/process scope, source channel, exact primary and related object versions, reason and authority when required, outcome, and correlation identifier, without copying sensitive semantic content into the audit record.
- **FR-58:** Make the complete workflow executable manually without portal, AI, notification, integration, wearable, automated import, or production runtime.
- **FR-59:** Treat AI, integration, and automation unavailability as irrelevant to manual completion.
- **FR-60:** Preserve PR #18 only as frozen evidence; never use it as product truth or the implementation base.

## Safety requirements

- **SR-01:** No automated trainer decision, diagnosis, safety clearance, referral decision, or client-facing advice.
- **SR-02:** Every relevant guidance item has complete stop or reduction criteria before activation.
- **SR-03:** A safety stop, invalidated entry, pause, referral, or closure retires actionable guidance unless Damian deliberately publishes a narrower valid replacement.
- **SR-04:** Missing or conflicting safety, focus, validity, approval, publication, or client identity fails closed.
- **SR-05:** Stopped, changed, partial, and not-done states remain non-judgmental facts.
- **SR-06:** The contextual-question path is never represented as emergency support.
- **SR-07:** No automated progression or risk interpretation occurs from time, completion, measurement, or silence.

## Privacy and access requirements

- **PR-01:** All downstream PRD acceptance evidence uses fictional pseudonymous cases only.
- **PR-02:** Wrong-client read, write, publication, response attachment, or evidence selection is a P0 failure.
- **PR-03:** Studio Las-authored `client_material` enters client-safe access only as the exact approved and published version intended for that client and use. A separately authorized same-client projection may show the client their own allowed source, signal, or access state while preserving its original information type and `unpublished` publication state; access never converts it into `client_material` or changes review/publication axes.
- **PR-04:** Trainer-only meaning and audit metadata never enter the client-safe projection.
- **PR-05:** No network, persistence, real account, real client data, analytics, external library, or remote asset is authorized by this PRD.
- **PR-06:** Retention, deletion, backup, provider, legal basis, region, and production access remain governed by higher contracts and later explicit decisions.

## Accessibility and dignity requirements for the later fictional prototype

- **AR-01:** WCAG 2.2 Level AA is the baseline for any later interface evaluation.
- **AR-02:** The later prototype must remain usable at 360 × 900 CSS px without horizontal overflow.
- **AR-03:** All essential controls must be keyboard reachable with visible focus.
- **AR-04:** A 44 × 44 CSS px target is a deliberate usability goal, not a claim that WCAG AA requires SC 2.5.5 AAA.
- **AR-05:** Age alone cannot determine channel selection or digital capability.
- **AR-06:** Language must preserve agency and avoid shame, discipline, compliance, urgency, or pressure mechanics.

## Required fictional acceptance cases

| Case | Required result | P1 failure example |
| --- | --- | --- |
| `app-primary` | One exact current release is client-actionable; every response and question preserves exact same-client cycle/release/item context, question resolution state, and the no-immediate-response/non-emergency boundary | Old or unapproved guidance appears actionable, or a question loses lineage or implies immediate support |
| `paper-primary` | Complete guidance works without the app and old paper has a real retirement outcome | A database withdrawal pretends to remove paper |
| `deliberate-hybrid` | One named authority and one bounded secondary role | Both channels independently maintain guidance |
| `stopped-or-uncertain` | Stop/change and question remain separate, non-shaming exact-context sources; the question remains `unresolved` or `resolved` operationally and Damian decides next | Automatic regression, warning, compliance judgment, or detached question |
| `version-change` | v2 has new approval/publication, v1 is retired, history remains exact | Approval is inherited or v1 stays actionable |
| `partial-release-revision` | Retained/replaced/removed outcomes complete atomically | A mixed successor becomes current |
| `focus-validity-boundary` | Exact focus, soft review, and hard validity behave independently | Review time auto-pauses or hard-expired guidance remains active |
| `no-signal-required` | Guidance remains complete without tracking | Missing-data or incomplete-plan pressure appears |
| `week-4-adjustment` | The anchor creates review; Damian explicitly changes or continues | Calendar position changes guidance |
| `week-8-independence` | Damian may reduce support or change channel | Product pushes more app use or engagement |
| `week-12-handoff` | Exact evidence becomes trainer-only report-ready selection | A report or renewal is generated automatically |
| `ineligible-stage-4-decision` | Every non-current or non-`START` entry rejects | Payment, time, or UI state opens Stage 5 |
| `entry-invalidated-mid-cycle` | Loss of the bound qualifying `START` makes the current release non-actionable and requires a new explicit Damian decision and exact binding | Guidance continues from a stale, superseded, invalidated, or detached entry |
| `manual-no-portal` | The full entry → focus → guidance → client action → review → Damian decision → evidence-selection path completes through the selected manual channel without a portal | Any essential step requires an app, AI, integration, or runtime |
| `client-safe-boundary` | Trainer-only focus rationale, observation, interpretation, draft, audit detail, and report candidates never enter client-safe projection; allowed client-owned source/signal projection preserves type and `unpublished` | Trainer-only or unpublished Studio Las material is exposed, or a client-owned signal is falsely converted/published |
| `late-response` | Response stays on retired exact context and cannot alter current guidance | Late data attaches to v2 automatically |
| `paper-retirement-failure` | Risky ambiguity keeps v2 non-current, makes affected guidance paused/non-actionable, and requires Damian's approved human contact until explicit resolution | v1 remains actionable or v2 activates while both can look current |
| `wrong-client-reference` | Read, write, response, publication, and selection reject before mutation | Any foreign content or state is exposed or changed |

## Later moderated validation contract

The downstream fictional prototype must be tested with 5–7 representative target users. This is qualitative risk discovery, not statistical proof.

The protocol must test:

- identification of the current authoritative instruction;
- understanding of dose/completion and stop/reduction criteria;
- distinction between changed/partial, stopped, not done, and question;
- comprehension of paper/app/hybrid authority;
- ability to complete a requested response or ask a contextual question;
- ability to recognize retired or invalid material as non-actionable;
- completion of the full selected manual-channel path without a portal;
- preservation of exact question context, resolution state, no immediate-response promise, and urgent external-help boundary;
- absence of shame, pressure, scoring, and screen-dependence cues;
- Damian's ability to publish/revise and review without administrative overload.

Provisional measurement budgets inherited from Product are:

- client orientation to current instruction: under 30 seconds;
- contextual response or question: under 60 seconds;
- simple trainer publication or revision: under 3 minutes;
- trainer review of decision-relevant changes: under 2 minutes.

The later test must measure rather than assume these budgets. Damian must explicitly approve or revise the operational criteria before the prototype gate closes. Failure requires simplification before automation.

## Acceptance criteria for this PRD

- **AC-01:** Every accepted Product invariant maps to an explicit testable requirement.
- **AC-02:** Every Architecture 18 responsibility maps to behavior without introducing schema or UI.
- **AC-03:** All entry, focus, release, channel, response, review, decision, withdrawal, and selection relationships require exact same-client lineage.
- **AC-04:** One current focus and at most one authoritative release are preserved fail closed.
- **AC-05:** Paper, app, and deliberate hybrid each have complete, non-duplicated authority behavior.
- **AC-06:** Soft review due and hard validity expiry cannot be confused.
- **AC-07:** Partial release revision is explicit, item-level, atomic, and history-preserving.
- **AC-08:** Requested signal remains optional, bounded, decision-relevant, and non-judgmental.
- **AC-09:** Ordinary completion and silence create no default trainer queue.
- **AC-10:** Damian remains the only source of adaptation meaning and decision.
- **AC-11:** The complete manual path works without portal, AI, integration, notification, import, or runtime.
- **AC-12:** Client-safe projection contains no trainer-only content and no Studio Las `client_material` other than the exact approved and published version intended for that client and use. Any separately permitted projection of the client's own source, signal, or access state preserves its original type and may remain `unpublished`.
- **AC-13:** Report-ready selection does not generate, interpret, or publish the Stage 7 report.
- **AC-14:** All eighteen fictional cases have an unambiguous expected result and failure condition.
- **AC-15:** The later moderated test and time-budget protocol is executable without real data.
- **AC-16:** The PRD contains no table/field/API/UI/provider/runtime decision.
- **AC-17:** One frozen HEAD/tree passes independent read-only review with `0 P0 / 0 P1`.
- **AC-18:** Damian separately accepts or rejects that exact audited artifact.

## Validation severity

- **P0:** wrong-client exposure or mutation; unauthorized publication; missing required stop/safety boundary; automated trainer decision, diagnosis, or safety clearance.
- **P1:** a non-P0 failure that permits ineligible Stage 5 entry; loses one-current-focus or one-authoritative-release behavior; leaves stale guidance actionable; creates conflicting channel truth; collapses information/review/publication axes; breaks manual completion; makes a required response/question impossible; introduces shame, scoring, fixed curriculum, or automatic progression; leaks Stage 6–8 or implementation authority; or makes the later bounded process materially infeasible against Damian-approved criteria.
- **P2:** non-blocking clarity, consistency, efficiency, or polish weakness that does not compromise authority, dignity, provenance, manual completion, or acceptance-case success.

## Forbidden scope

Do not add in this Draft PRD:

- prototype files, HTML, CSS, JavaScript, tests, fixtures, screenshots, or deployment;
- screens, wireframes, routes, navigation, components, or final copy;
- schema, tables, columns, enums, SQL, migrations, RLS, payloads, APIs, or events;
- Supabase, Auth, MFA, Storage, Edge Functions, staging, production, or real accounts;
- AI provider, model, prompt, execution, simulated AI, or Stage 6 behavior;
- real client data, files, messages, publication, or contact;
- report generation, CRM, booking, payment, pricing, wearable or document ingestion;
- notifications, streaks, badges, rankings, scores, adherence percentages, or engagement loops;
- PR #18 code or branch as product truth or implementation base.

## Blocked decisions

The following remain blocked until separately authorized layers:

- prototype interaction and visual design;
- exact client and trainer surfaces;
- production domain/storage mapping and schema;
- authorization, RLS, audit implementation, retention, deletion, and recovery mechanics;
- provider, model, prompt, payload, region, cost, DPA, subprocessors, and AI runtime;
- notifications and service-level expectations;
- paper retirement implementation method;
- app offline/cache/export behavior;
- report-generation workflow;
- integrations and automated ingestion;
- real data, staging, production, deployment, and implementation.

## PRD exit gate

This Draft becomes eligible for an owner acceptance decision only when:

- the exact Product Brief and Architecture Contract are fully represented without contradiction;
- requirements are testable without selecting UI, schema, provider, or runtime;
- manual paper, app, and hybrid cases preserve one authority and fail closed;
- every required fictional case is complete;
- downstream prototype and moderated-test boundaries are explicit;
- one frozen commit/tree passes independent adversarial read-only review with `0 P0 / 0 P1`;
- Damian separately accepts that exact artifact.

Passing this PRD gate does not authorize a prototype, UI, tests, schema, Supabase, runtime, AI, real data, staging, production, deployment, publication, or implementation.

## Next gate

Publish this PRD only as a Draft PR from the exact authorized base. Independent review must verify the frozen HEAD and tree and report P0/P1/P2 findings.

Do not mark the PR Ready, merge it, prepare a prototype, or begin implementation without Damian's later separate explicit decision covering the exact audited artifact.
