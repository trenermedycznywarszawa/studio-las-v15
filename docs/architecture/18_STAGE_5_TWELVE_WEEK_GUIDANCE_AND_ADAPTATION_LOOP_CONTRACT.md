# 18 Stage 5 Twelve-Week Guidance and Adaptation Loop Architecture Contract

- **Status:** DRAFT ARCHITECTURE CONTRACT — OWNER AUTHORIZED FOR INDEPENDENT AUDIT ONLY
- **Owner:** Damian
- **Stage:** 5
- **Architecture authorization date:** 2026-08-17
- **Exact base:** `product-recovery@3298cbf45ad38f5789b93381bb308c5a46fc3329`
- **Base tree:** `0452df3e4ff330785af9f57b1307e59d34db2774`
- **Product authority:** owner-accepted Stage 5 Product Decision Brief at head `c16ac756af35b3977fc344babcb374fb29e2afe5`, tree `5d51ce05a9945f67eb259419d0f69ea4e6caa780`
- **Contract version:** `stage5-architecture-v1`
- **Schema:** `NOT APPROVED`
- **Provider:** `BLOCKED`
- **PRD, prototype, UI, runtime, real-data, and implementation permission:** none

## Purpose

This contract translates the accepted Stage 5 product truth into domain responsibilities, exact-version boundaries, channel authority, publication behavior, failure rules, and a bounded fictional acceptance model.

It does not design a portal, screen, database, API, notification system, report generator, or automated coach. It does not authorize PRD 005, a prototype, real or simulated AI, Supabase, real client data, publication, deployment, or implementation.

The architecture exists to make this manual loop complete and safe:

> exact current qualifying Stage 4 `START` → current trainer-owned focus → one authoritative guidance release → client action → optional minimum signal or contextual question → Damian review and interpretation → explicit trainer decision → versioned guidance change → selected report-ready evidence

## Authority and conflict rule

This contract is subordinate to:

1. Constitution v1.1;
2. the accepted Product layer, especially `10_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP.md`;
3. Architecture 00–17, especially Architecture 07, 08, 10, and 17;
4. the Source of Truth Registry and Product Recovery Execution Plan.

If this contract appears to create a new product rule, information type, review state, publication state, interface, schema, provider choice, or runtime behavior, the higher layer wins and the apparent addition is invalid.

## Architectural boundary

Stage 5 architecture owns only:

- the responsibility split between Damian, the client, and Studio Las OS;
- entry from one exact current qualifying Stage 4 decision;
- one current focus and one authoritative guidance release;
- exact-version lineage, replacement, withdrawal, and invalidation behavior;
- deliberate paper, app, or hybrid channel authority;
- minimum client input and contextual-question boundaries;
- trainer review and explicit adaptation decisions;
- selection of trainer-only report-ready evidence;
- fail-closed behavior and a future fictional acceptance model.

Stage 5 architecture does not own:

- offer or package construction;
- a fixed twelve-week curriculum;
- UI names, layouts, components, navigation, or copy;
- table, column, policy, endpoint, payload, event-stream, or storage design;
- authentication, RLS, Supabase, provider, deployment, or production decisions;
- Stage 6 AI preparation;
- Stage 7 report generation or publication;
- Stage 8 ingestion, integration, or automation.

## Closed information vocabulary

Stage 5 adds no `information_type`, `review_state`, or `publication_state`.

The nine Architecture 10 information types remain closed:

`source_artifact`, `source_fact`, `extracted_fact`, `trainer_observation`, `ai_hypothesis`, `ai_suggestion`, `trainer_interpretation`, `trainer_decision`, `client_material`.

The review states remain `draft`, `needs_review`, `approved`, `rejected`, and `superseded`. The publication states remain `unpublished`, `published`, and `withdrawn` under the Architecture 10 rules.

Cycle, entry binding, focus activation, guidance release, channel assignment, signal request, review anchor, retirement confirmation, access event, and report-evidence selection are domain roles or operational records. They are not additional information types and must not copy semantic content merely for convenience.

## Domain responsibility map

| Stage 5 concept | Architectural role | Architecture 10 mapping | Authority and visibility |
| --- | --- | --- | --- |
| Qualifying Stage 4 entry | Exact-version entry evidence | `trainer_decision` | Damian-authored; trainer-visible; must be exact current `START` |
| Twelve-week cycle | Operational boundary within the existing Client Process | operational record | Damian opens, pauses, extends, or closes; not client curriculum |
| Current focus | Meaningful current direction | `trainer_decision` | Damian-owned and trainer-only by default |
| Client-safe current focus | Deliberate expression of the focus | exact-version `client_material` | client-visible only after approval and publication |
| Guidance content | Instruction prepared for the client | exact-version `client_material` | Damian approves exact content and use |
| Guidance release | Manifest of the one actionable instruction set | operational publication/activation record referencing exact `client_material` versions | identifies authority but does not become semantic content |
| Channel assignment | Paper/app/hybrid authority and retirement contract | operational record; a change is supported by `trainer_decision` | Damian-owned; client receives only the relevant safe projection |
| Signal request | Bounded request attached to exact guidance | part of `client_material` plus operational expectation | Damian decides whether any response is useful |
| Client response or question | Original client-provided source | `source_artifact` and/or `source_fact` | same-client visibility may be projected safely; no automatic meaning |
| Normalized execution value | Structured representation derived from the source | `extracted_fact` | exact lineage required; machine normalization does not approve meaning |
| Trainer review | Deliberate review of exact current evidence | operational review event | trainer-only |
| Trainer meaning | Contextual interpretation | `trainer_interpretation` | Damian-owned; trainer-only by default |
| Continue, simplify, progress, regress, replace, pause, change channel, refer, or close | Adaptation commitment | `trainer_decision` | Damian-owned; never inferred from completion or time |
| Client-safe revision or review summary | Published Studio Las communication | new exact-version `client_material` | separate approval and publication required |
| Report-ready selection | Exact references selected for later use | operational selection record and, where meaning is added, `trainer_interpretation` | trainer-only; not a Stage 7 report |

## Canonical cycle and exact references

The Stage 5 cycle is a domain boundary inside one client process. It is not a programme template, account, subscription, or database table.

Every persistent or auditable relationship must be resolvable to:

- the same client and client process;
- one stable logical object identity and exact immutable version;
- author and event time;
- complete `derived_from` references where content is derived;
- the exact object or version it supersedes, invalidates, publishes, or withdraws;
- actor, reason, and outcome for operational transitions.

Examples such as `object_id@vN` describe exact-reference semantics only. They do not approve an identifier format or schema.

Current state is resolved from the canonical cycle lineage, not from a caller-supplied `active` flag, copied object, cached projection, URL, or interface state. Paper may be the authoritative instruction source, but its currentness is established by the explicit channel and release decision rather than by the physical survival of a copy. A detached object cannot become current by claiming to be active. A missing, conflicting, foreign-client, or unresolved lineage fails before any state change or publication.

## Entry gate from Stage 4

A Stage 5 cycle may open only when all conditions are true:

1. one exact Stage 4 `trainer_decision` version belongs to the same client process;
2. Damian authored it;
3. its value is exactly `START`;
4. it is the canonical current version, not superseded, invalidated, rejected, or detached;
5. the cycle records an immutable binding to that exact version.

`START_CONDITIONAL` never enters directly. When Damian verifies every recorded condition, he creates a new exact current `START` that explicitly supersedes the exact conditional version. `DEFER_CONSULT`, `NOT_THIS_PRODUCT`, absence of a decision, payment, booking, elapsed time, UI state, or a system suggestion cannot open Stage 5.

If the bound `START` later ceases to be the exact current qualifying version, the cycle fails closed. Active guidance is no longer actionable, client-safe projections must stop presenting it as current, and Damian must make a new explicit decision before the cycle can bind to another exact qualifying `START`. History remains intact; no reference is silently redirected.

## Twelve-week envelope and review anchors

The cycle records a commercial start and review context, not twelve mandatory modules.

Start, approximately week 4, approximately week 8, and week 12 are review anchors. An anchor may create a review-due operational condition only. It cannot:

- change focus;
- progress or regress guidance;
- close or extend the cycle;
- request more data;
- publish a summary;
- infer success, failure, risk, or continuation.

Early finish, pause, referral, and extension require a separate Damian `trainer_decision`. Reaching week 12 without that decision leaves the cycle awaiting review; it does not auto-renew, auto-close, or continue stale guidance silently.

## One current focus

An active cycle has exactly one current focus expressed as an exact Damian `trainer_decision` version.

A focus correction or material change creates a new version or new decision with explicit lineage. The prior focus remains history and ceases to be current. A client-safe focus statement is a separate `client_material`; it cannot expose the trainer-only rationale by changing visibility.

Guidance bound to a superseded or invalidated focus cannot remain current silently. Damian must explicitly revalidate it against the new focus or publish a replacement. Revalidation is a recorded trainer decision; it never changes old provenance.

## Authoritative guidance release

A guidance release is the operational declaration of the exact trainer-approved instruction set that is currently actionable for one cycle. It may reference one or more exact `client_material` items, but the release itself is not a new information type and does not duplicate their content.

Before activation, all conditions must be true:

1. the exact qualifying Stage 4 entry binding remains current;
2. the cycle and exact focus remain current;
3. every client-facing item is the exact intended version;
4. every item is `approved` by Damian for the recorded client and use;
5. publication is a separate deliberate action under Architecture 10;
6. the channel authority and stale-material retirement rule are explicit;
7. dose or completion condition and relevant stop/reduction criteria are complete;
8. any signal request names its decision purpose and exact guidance context;
9. no competing current release exists.

At every observable moment, there is at most one current authoritative release. Whenever the client is expected to act, there is exactly one. Zero current releases are allowed only before first publication or after an explicit pause, invalidation, referral, or closure, and the client-safe projection must not imply that any guidance remains actionable. Preparing v2 does not change v1. Activating v2 must retire v1 as part of one controlled replacement transition; if the transition cannot complete, v2 does not become current.

`Retired release` is an operational condition, not a combined semantic state. The referenced `client_material` versions retain independent Architecture 10 axes: a replaced version becomes `superseded` where applicable, and any previously published version becomes `withdrawn` through its own deliberate withdrawal event. Retirement never changes `information_type` or rewrites the prior approval/publication history.

A material edit to content, dose, stop criteria, signal request, validity, focus expression, or delivery authority creates a new exact `client_material` and/or release version. Approval of v1 never approves v2. Published content is never edited in place.

A `continue` decision may preserve the same release only when nothing material changes. Simplify, progress, regress, replace, pause, channel change, referral, and closure must explicitly state what happens to current guidance. Pause, referral, closure, entry invalidation, or a safety stop withdraws or retires actionable guidance unless Damian creates a narrower safe replacement through the same approval gate.

## Channel authority and stale-material retirement

Damian selects `paper`, `app`, or `deliberate_hybrid` for the exact release. Channel choice is not inferred from client age, account status, prior habit, device availability, or novelty.

### Paper primary

Paper carries the complete authoritative instruction and must remain usable without the app. The operational record identifies the exact paper release and its validity/review context.

When paper v1 is replaced, v2 cannot become current until Damian completes a bounded handover and retirement action for v1. The action may be confirmed return, destruction, visible invalidation, or another later-approved method that makes v1 no longer reasonably actionable. The implementation method is not decided here.

If retirement cannot be confirmed and stale guidance creates material ambiguity or risk, the replacement fails closed: Damian pauses the affected guidance and contacts the client through the approved human path. Architecture must not pretend that a database withdrawal physically removed a paper copy.

### App primary

The app may present the complete exact current release. Withdrawal or replacement must remove the old version from actionable client projections immediately while preserving history. A cache, bookmark, export, or stale projection cannot become authority.

App unavailability does not silently switch authority to paper. Damian either restores the current approved path or makes an explicit channel-change decision and publishes a controlled replacement.

### Deliberate hybrid

A hybrid names one authoritative channel and one bounded secondary role. The secondary role may support an environmental cue, signal capture, question capture, or another explicitly bounded function. It must not carry independently maintained mutable guidance.

Every hybrid declares:

- the authoritative channel;
- the exact secondary role;
- which content may and may not appear secondarily;
- how a stale secondary artifact is retired;
- when Damian will review the channel decision.

If authority is ambiguous, both channels contain independently changing instructions, or either stale version can reasonably appear current, the hybrid is rejected.

## Client action and minimum input

Client action may occur entirely offline. The architecture defaults to no requested digital signal unless Damian has named how the input could change a conversation, guidance decision, safety decision, or later report selection.

When a common execution response is requested, the normalized vocabulary is exactly:

- `done_as_planned`;
- `changed_or_partial`;
- `stopped`;
- `not_done`.

A contextual question or uncertainty is a separate axis. Completing an item does not close its question, and asking a question does not change its execution response.

Every requested input is bound to the exact client, cycle, guidance release, item, and request version. An input submitted after its guidance was retired remains attached to that historical version. It may be reviewed as stale-context evidence but must not be reattached to the current release, interpreted automatically, or mutate current guidance.

The original client source is preserved separately from any normalized `extracted_fact`. A client statement is not trainer meaning. Machine normalization does not approve it. Any source used for a trainer interpretation or decision must be deliberately included in Damian's exact review context; ordinary completion need not create a review queue merely because it exists.

`not_done`, silence, and `stopped` are not failure or non-compliance. No response may create a score, colour judgment, streak, adherence percentage, ranking, automatic escalation, or moral label. A reason or note remains optional unless Damian defined a concrete safety requirement in the exact guidance. Such a requirement may pause continuation when absent; it still cannot diagnose or shame.

## Questions and service boundary

A question is bound to the exact guidance item and release that prompted it. Unresolved and resolved are operational handling states, not chat presence, publication states, or evidence of urgency.

The client-safe projection must communicate that:

- the question path is bounded and contextual;
- it is not an emergency channel;
- no immediate response is promised;
- urgent situations require the appropriate external help rather than waiting for Studio Las OS.

Stage 5 does not authorize unbounded chat, automated replies, diagnosis, safety clearance, or a service-level response promise.

## Client-safe projection responsibilities

A portal is optional and subordinate to the process. Stage 5 architecture assigns only three client-safe responsibilities; these are not screen names or a navigation decision:

1. **Current direction** — present the exact current trainer-approved guidance when the app is authoritative, or clearly identify paper as authoritative without maintaining a second mutable copy.
2. **Respond or ask** — accept only the exact requested response and/or a contextual question, with the non-emergency boundary intact.
3. **Published meaning** — present only exact Damian-approved summaries and, in a later stage, published report material.

The projection must not expose raw trainer rationale, interpretations, report candidates, technical state, compliance analytics, or another client's existence. `Plan` cannot mean a speculative twelve-week calendar, and `Progress` cannot mean raw completion volume. A client who does not use a portal must still receive a complete Studio Las process through the selected channel.

The premium experience is prepared clarity, calm continuity, and Damian's personal interpretation—not more screens, messages, or visible system activity. Growing independence may legitimately reduce app use, signal frequency, and Studio Las support over time.

## Trainer review and adaptation decision

The trainer review context resolves the exact current cycle, entry decision, focus, guidance release, relevant client sources, prior interpretations, and review anchor. A partial or caller-selected record set cannot hide a current question, stop, material change, or conflicting version.

The workspace responsibility is to surface only evidence that can change a near-term decision, including:

- a contextual question;
- `stopped` or `changed_or_partial`;
- an unexpected task-specific response;
- a review anchor;
- an expiring, invalid, or conflicting release;
- selected evidence relevant to later reporting.

Ordinary `done_as_planned`, no-signal guidance, and silence do not create a growing administrative queue by default.

After review Damian creates an explicit `trainer_decision` to continue, simplify, progress, regress, replace, pause, change channel, request a different signal, refer out, or close. The decision preserves the exact evidence considered and uncertainty where relevant. The OS may record and enforce the transition but may not choose, rank, preselect, recommend, or infer the decision in Stage 5.

## Report-ready evidence boundary

Stage 5 may select exact evidence for later reporting. Selection records references, purpose, selector, time, and reason. It does not copy full content, create a report pattern automatically, or publish anything.

When Damian adds meaning, that meaning is a separate `trainer_interpretation`. A 4- or 8-week client-safe summary is a new exact `client_material` that requires its own approval and publication. The Stage 7 report remains a separate later product and architecture responsibility.

Completion volume alone is not report-ready evidence. Selected evidence should help explain guidance tried, client response, Damian's change and reason, meaningful friction or capability, growing independence, and the question the later report must answer.

## Complete manual path

The complete Stage 5 loop must work without a portal, AI, notification, integration, wearable, automated import, or production runtime.

A valid manual path may use paper, conversation, and a bounded manual record while preserving the same authority, exact-reference, retirement, review, decision, and report-selection responsibilities. Technology failure may reduce convenience; it cannot transfer authority, erase provenance, or block Damian from completing the professional process.

No manual fallback may silently weaken wrong-client protection, publication approval, stale-guidance retirement, or the requirement for an explicit trainer decision.

## Failure-state contract

| Failure | Required architectural behavior |
| --- | --- |
| Missing, conditional, deferred, rejected, stale, or invalid Stage 4 entry | Reject cycle opening; no guidance activation |
| Bound `START` later superseded or invalidated | Fail cycle closed; retire actionable guidance; require a new explicit Damian decision and binding |
| Missing or conflicting current focus | Block guidance activation or revision |
| Two releases appear current | Treat as an invariant breach; fail closed instead of choosing by timestamp or channel |
| v2 activation cannot retire v1 | Keep v2 non-current; pause or use the controlled human resolution path |
| Paper retirement cannot be confirmed | Do not claim successful replacement; pause affected guidance when ambiguity or risk is material |
| Hybrid authority is missing or duplicated | Reject the hybrid |
| Unapproved, rejected, superseded, or wrong-use client material | Block publication and activation |
| Late response to retired guidance | Preserve against the old exact version; do not redirect or auto-apply |
| Required client input is unavailable | Preserve the manual question/contact path; do not fabricate completion or meaning |
| App unavailable | No silent channel switch; continue through the current valid manual path or an explicit Damian channel decision |
| Review anchor reached | Mark review due only; no automatic progression, summary, renewal, or closure |
| Week 12 reached without a decision | Await Damian review; do not auto-extend or keep stale guidance silently |
| Client question suggests urgency | Show the non-emergency boundary and appropriate external-help direction; no automated advice |
| Cross-client or unresolved exact reference | Reject before mutation or publication; retain only bounded metadata for audit |
| AI, integration, or automation unavailable | No effect on manual completion because none is required by Stage 5 |
| Time budget fails in testing | Simplify the process before proposing automation |

## Operating-economics validation contract

The Product Brief budgets remain hypotheses:

- client orientation to the current instruction: under 30 seconds;
- contextual signal or question: under 60 seconds;
- trainer publication or simple revision: under 3 minutes;
- trainer review before a session: under 2 minutes.

The future fictional prototype must measure these as observed end-to-end tasks, including orientation, error recovery, version identification, and completion confirmation. Timing must not exclude steps merely because they are inconvenient, and instrumentation must not be designed in this contract.

A missed budget does not justify AI or automation. It first triggers simplification of content, decisions, signals, channel roles, or review work. Damian later approves or revises the operational criterion based on prototype evidence.

## Bounded fictional acceptance model

All future acceptance evidence uses pseudonymous fictional cases and no network, persistence, real accounts, or real client data unless a later layer is separately authorized.

| Case | Required architecture proof | P1 failure example |
| --- | --- | --- |
| `app-primary` | One exact approved release is current; one requested response and one separate contextual question preserve exact lineage | App becomes mandatory product access or cannot identify the current release |
| `paper-primary` | Complete guidance works without the app; signal is absent or separately bounded; replacement includes physical retirement responsibility | Paper depends on the app or old paper remains reasonably actionable |
| `deliberate-hybrid` | One named authoritative channel and one bounded secondary role; no duplicate mutable instruction | Authority is ambiguous or two plans require maintenance |
| `stopped-or-uncertain` | `stopped` and question remain separate, non-shaming sources; Damian records the next decision | State is scored, diagnosed, or automatically changes guidance |
| `version-change` | v2 has new approval and lineage, v1 is retired from action, history remains resolvable | v1 remains active or v2 inherits approval silently |
| `no-signal-required` | Guidance remains complete and does not create a missing-data state | Client is shown incomplete, late, or non-compliant |
| `week-4-adjustment` | Anchor creates review only; Damian explicitly changes focus, dose, channel, or signal and versions the affected material | Calendar position changes the plan automatically |
| `week-8-independence` | Damian may reduce support or change channel because the client can carry more alone | Product pushes more app use or continuation by default |
| `week-12-handoff` | Exact selected evidence becomes a trainer-only package and next-decision question without generating Stage 7 output | Raw adherence or an automatic report is produced |
| `ineligible-stage-4-decision` | Conditional, deferred, rejected, missing, stale, superseded, and invalid entry variants all fail closed | Any non-current exact `START` or non-`START` opens a cycle |
| `entry-invalidated-mid-cycle` | Active release stops being actionable; history remains; new binding requires a new qualifying decision | Guidance continues silently after entry invalidation |
| `late-stale-response` | Response remains attached to the retired item and requires contextual review | Response mutates or is reassigned to current guidance |
| `wrong-client-reference` | Cross-client construction fails before any mutation, visibility, or publication | Any foreign data is revealed or changed |
| `manual-no-portal` | Damian completes entry, guidance, action, review, decision, and evidence selection without app, AI, or integration | Technology becomes a hidden prerequisite |
| `client-safe-boundary` | Trainer-only focus rationale, interpretation, draft, and report candidates never enter the client projection | Raw internal meaning or unpublished material is exposed |

The future fictional prototype must also be moderated with 5–7 representative target users across paper, app, and hybrid scenarios. The sample is for qualitative risk discovery, not statistical proof. Testing must observe:

- whether the person can identify what is current and authoritative;
- whether stop/reduction criteria are understood;
- whether `changed_or_partial`, `stopped`, `not_done`, and question feel non-judgmental;
- whether stale material is recognized as inactive;
- whether the manual and selected-channel paths are complete;
- whether the provisional time budgets are met;
- whether the experience increases clarity and independence rather than screen dependence.

Age alone is not a channel-selection proxy. A P0 or P1 finding blocks the prototype gate regardless of average task success.

## Validation severity

- **P0** — wrong-client exposure or mutation; missing required safety/stop boundary; unauthorized publication; automated trainer decision, diagnosis, or safety clearance.
- **P1** — a non-P0 failure that permits an ineligible Stage 4 entry; loses the one-current-focus or one-authoritative-release invariant; leaves stale guidance actionable; creates conflicting paper/app truth; breaks the complete manual loop; makes a required signal or question impossible; introduces shame, compliance scoring, fixed curriculum, or automatic progression; collapses Architecture 10 information/review/publication axes; leaks Stage 6–8 or implementation authority; or makes the later bounded process materially infeasible against Damian-approved operating criteria.
- **P2** — a non-blocking clarity, consistency, efficiency, or polish weakness that does not compromise authority, dignity, provenance, manual completion, or task success.

Architecture is eligible for owner acceptance only at `0 P0 / 0 P1` on one frozen commit and tree after independent read-only review.

## Architecture exit gate

This Draft is ready for an owner acceptance decision only when:

- it maps every accepted Stage 5 product invariant to one explicit architectural responsibility;
- entry, focus, release, channel, signal, review, decision, withdrawal, and report-selection lineage are exact and fail closed;
- paper, app, and hybrid each preserve one authoritative source without a portal dependency;
- old guidance cannot remain legitimately actionable after replacement or invalidation;
- Architecture 10 types and state axes remain closed and independent;
- the complete manual path needs no AI, integration, runtime, or real data;
- the fictional cases and later user/time validation are testable without designing UI or schema;
- one frozen commit/tree passes independent adversarial review with `0 P0 / 0 P1`;
- Damian separately accepts or rejects that exact artifact.

Passing this gate does not authorize PRD 005, a prototype, tests, schema, Supabase, runtime, real data, deployment, publication, or implementation.

## Forbidden scope

Do not add in this Architecture Draft:

- PRD 005 or a PRD exception;
- screens, wireframes, components, routes, UI copy, HTML, CSS, JavaScript, or prototype code;
- tables, columns, enums, SQL, migrations, RLS, storage paths, API contracts, payloads, or event schemas;
- Supabase, Auth, MFA, Storage, Edge Functions, staging, production, or deployment;
- real or simulated AI, provider selection, model choice, prompts, summaries, or Stage 6 behavior;
- real client data, accounts, files, messages, or publication;
- fixed twelve-week modules, automatic progression, notifications, streaks, scores, adherence percentages, badges, rankings, or pressure;
- unbounded chat, emergency support promises, automated advice, diagnosis, or safety clearance;
- report generation, PDF design, Stage 7 publication, wearable/Tanita/Polar integration, file ingestion, CRM, booking, payment, or pricing;
- PR #18 as product truth or an implementation base.

## Next gate

Publish this contract only as a Draft PR from the exact authorized base. Independent review must verify the frozen HEAD and tree and report P0/P1/P2 findings.

Do not mark the PR Ready, merge it, create PRD 005, prepare a prototype, or begin implementation without Damian's later separate explicit decision covering the exact audited artifact.
