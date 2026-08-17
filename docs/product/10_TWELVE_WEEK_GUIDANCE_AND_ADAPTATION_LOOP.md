# 10 Twelve-Week Guidance and Adaptation Loop

- **Status:** DRAFT PRODUCT DECISION BRIEF — OWNER AUTHORIZED STAGE 5 PLANNING ONLY
- **Owner:** Damian
- **Stage:** 5
- **Planning authorization date:** 2026-08-17
- **Entry point:** closed Stage 4 product contract on `product-recovery@f16840a6300c9cf396af172df9d053497c2dd774`
- **Implementation permission:** none
- **Architecture, PRD, schema, runtime, real-data, and deployment permission:** none

## Purpose

This brief defines the product truth that Stage 5 must prove before architecture, PRD, prototype, or implementation may begin.

Stage 5 is not a client-portal project and not a prewritten twelve-week exercise programme. It is the trainer-led guidance and adaptation loop that begins with an eligible Stage 4 decision, preserves one current direction, returns only decision-relevant client signals, and prepares selected evidence for the later report stage.

The portal is one possible client-safe projection of this loop. It is not the product and is not mandatory for every client.

## Real problem

Across a twelve-week commercial and review envelope, Damian must be able to:

1. preserve the current process focus;
2. give the client one clear, trainer-approved instruction through the least burdensome channel;
3. request no more signal than the next decision needs;
4. interpret action, non-action, change, stopping, and questions without moral judgment;
5. revise guidance without leaving competing active versions;
6. retain selected evidence for 4-, 8-, and 12-week review;
7. increase client independence rather than app dependence.

The core loop is:

> eligible Stage 4 decision → current focus → trainer-approved guidance → client action → optional minimal signal or question → trainer review → explicit trainer decision → versioned guidance change → report-ready evidence

## Product outcome

Stage 5 succeeds when the client knows what matters now and how to ask for help, while Damian can see enough to make the next decision without becoming a data clerk.

Premium value comes from prepared clarity, calm continuity, and personal interpretation. More screens, messages, metrics, and visible activity do not increase value by default; they can make Studio Las look like an ordinary fitness application and create hidden delivery work.

## Entry gate from Stage 4

Stage 5 may start only from one exact current Stage 4 `trainer_decision` version for the same client process whose value is `START`.

- An exact current `START` may enter Stage 5, and the Stage 5 cycle is bound to that exact decision version.
- `START_CONDITIONAL` never enters Stage 5 directly. After Damian explicitly verifies every recorded condition, he creates a new exact current `START` version that explicitly supersedes the exact `START_CONDITIONAL` version. Both versions and their exact-version lineage remain preserved.
- `DEFER_CONSULT` may not enter until a later eligible Stage 4 decision exists.
- `NOT_THIS_PRODUCT` may not enter Stage 5.

If the qualifying `START` version is later superseded or invalidated, no Stage 5 guidance may continue silently. The cycle fails closed until Damian makes an explicit decision and binds the cycle to the exact current qualifying `START` version.

A UI flag, payment, booking, elapsed time, or system suggestion cannot substitute for the exact qualifying trainer decision.

## Twelve-week boundary

Twelve weeks is the standard commercial and review envelope. It is not a fixed clinical sequence and not twelve pre-authored content modules.

Stage 5 uses four review anchors:

1. **Start** — establish the current focus, channel, and first minimum-effective guidance.
2. **Around week 4** — test whether the direction is useful and remove early friction.
3. **Around week 8** — review the emerging pattern and whether the client can carry more responsibility.
4. **Around week 12** — close the cycle into a report-ready evidence package and next-decision question.

Anchors trigger review, never automatic progression. The process may pause, refer out, finish early, or extend only through a separate trainer decision.

## Current focus

Each active cycle has one current trainer-owned focus. It answers:

> What does this person most need now to move with more trust and less chaos?

The focus may change by an explicit Damian decision. Prior focus versions remain part of process history when they explain a meaningful change. The system must not infer focus from completion, measurement, calendar position, or AI.

## One authoritative guidance version

At any moment there is exactly one authoritative current instruction set for the client.

Damian selects one primary channel for the plan or task:

- `paper`;
- `app`;
- `deliberate_hybrid`.

A hybrid is allowed only when:

- one channel is explicitly authoritative;
- the secondary channel has a different, bounded role;
- the retirement rule for stale material is defined;
- the same plan is not independently maintained twice.

A new guidance version supersedes the previous version. The old version remains auditable but must no longer look actionable to the client. Printing, displaying, or exporting guidance does not create a second source of product truth.

## Guidance contract

Stage 5 prefers the minimum effective guidance set. One useful assignment is better than a full-looking programme that creates confusion.

Each assigned guidance item must define:

- clear client-safe instruction;
- current purpose or focus;
- dose or completion condition;
- stop or reduction criteria when relevant;
- primary channel and authoritative plan version;
- validity or next review point;
- whether any client signal is requested;
- which optional result field could change a trainer decision.

Minimum, standard, or extended variants may exist only when Damian deliberately assigns them. They are not universal levels and do not create automatic progression.

## Client action and signal contract

Client action may occur entirely offline. App use is justified only when it reduces uncertainty, improves accessibility, preserves continuity, or captures a decision-relevant response.

When a response is requested, the smallest common execution vocabulary is:

- `done_as_planned`;
- `changed_or_partial`;
- `stopped`;
- `not_done`.

A question or uncertainty is a separate axis. The client may complete an item and still ask a question.

Task-specific repetitions, duration, load, RPE, discomfort, confidence, or another response may appear only when Damian has defined how that value could change a conversation, guidance decision, safety decision, or later report.

`not_done` is not failure. `stopped` is not non-compliance. Neither state receives a score, colour judgment, streak consequence, or automated interpretation. A reason or note remains optional unless a concrete safety contract requires it.

Some guidance requires no digital signal. The absence of requested data must not make the plan appear incomplete.

## Questions and response boundary

A client question belongs to the exact guidance item and plan version that prompted it. It preserves unresolved/resolved operational state without becoming unbounded chat.

The surface must explain:

- the expected response path;
- that it is not an emergency channel;
- what kind of situation requires urgent external help rather than an app message.

No automated client-facing advice, diagnosis, or safety clearance is permitted.

## Trainer review and decision

The trainer workspace should surface only information that can change a near-term decision:

- a question;
- a stopped or changed task;
- an unexpected task-specific response;
- a review anchor;
- a stale or expiring guidance version;
- selected evidence that may matter to the report.

Silence and ordinary completion should not create a growing administrative queue by default.

After review Damian may explicitly decide to:

- continue;
- simplify;
- progress;
- regress;
- replace;
- pause;
- change channel;
- request a different signal;
- refer out;
- close the current cycle.

The OS preserves the decision and its exact evidence. It does not make, rank, or recommend the decision in Stage 5.

## Client-safe surface responsibilities

The first client-safe projection has only three responsibilities. These are product responsibilities, not mandatory screen names:

1. **Now** — show the current trainer-approved instruction, or clearly state that paper is authoritative.
2. **Respond or ask** — capture only the requested response or a contextual question.
3. **Published summaries** — show only Damian-approved 4-/8-week summaries and, later, the Stage 7 report.

`Plan` must mean the current authoritative guidance, not a speculative twelve-week calendar. `Progress` must mean trainer-approved pattern interpretation, not raw adherence, completion charts, or metric dashboards.

The interface must remain quiet, narrow, keyboard operable, readable at 360 × 900 CSS px, and practical for touch. Age alone must not be used to assume digital incapacity; channel selection and usability must be tested with representative users.

## Information and provenance mapping

This brief adds no new Stage 1 `information_type`.

| Stage 5 concept | Existing information contract |
| --- | --- |
| Client-provided response or question | exact `source_artifact` and/or `source_fact` |
| Structured normalized result | `extracted_fact` derived from the exact client source version |
| Session or guidance observation by Damian | `trainer_observation` |
| Damian's contextual meaning | `trainer_interpretation` |
| Damian's current-focus decision | `trainer_decision` |
| Client-safe expression of the current focus | exact-version `client_material` |
| Continue, simplify, progress, regress, pause, refer, or close | `trainer_decision` |
| Client-facing instruction or review summary | exact-version `client_material` |
| Focus activation, retirement, or validity change | operational record, not a new information type |
| Plan-version activation, retirement, review due, or access event | operational record, not a new information type |

Every client-facing guidance version defaults to `needs_review` and `unpublished` until the existing publication gate passes. Editing an approved or published plan creates a new version and requires new approval. Published content is never changed silently.

## Report-ready boundary

Stage 5 does not build the Stage 7 report.

It must preserve enough selected evidence for the later report to explain:

- what guidance was tried;
- how the client responded;
- what Damian changed and why;
- what friction or capability pattern became meaningful;
- what the client can increasingly do independently;
- what question the 12-week report and next decision must answer.

Completion volume alone is not report-ready evidence. Candidate patterns remain trainer-only until Damian interprets and approves client-safe material.

## Operating economics

Stage 5 must reduce or tightly bound hidden service work.

A ten-minute weekly administrative loop adds two hours of trainer work per client over twelve weeks. That cost scales linearly while creating no visible premium value unless it improves a real decision.

The following are provisional validation budgets, not promises:

- client orientation to the current instruction: under 30 seconds;
- contextual signal or question entry: under 60 seconds;
- trainer publication or revision of a simple guidance version: under 3 minutes;
- trainer review of decision-relevant changes before a session: under 2 minutes.

Failure against these budgets requires simplification before adding automation.

## Evidence and unverified assumptions

Canonical evidence supports trainer authority, one selected channel, minimum signals, exact provenance, client-safe publication, report-ready patterns, and independence over engagement.

External evidence is calibration only:

- WHO warns that digital interventions do not replace functioning human services and that maintaining paper and digital systems can increase worker burden;
- systematic reviews of mobile-health design support simple hierarchy, readability, and direct usability testing with older adults;
- digital self-monitoring and prompts can change adherence, which is why Studio Las must not deploy them without proving that adherence is the right target for the current client and decision;
- WCAG 2.2 Level AA is the baseline conformance level. The 44 × 44 CSS px target comes from SC 2.5.5 Target Size (Enhanced), Level AAA, and is a deliberate usability goal for the future fictional prototype rather than a general minimum WCAG threshold.

External calibration references:

- WHO, *Recommendations on digital interventions for health system strengthening*: https://www.who.int/publications/i/item/9789241550505
- Gomez-Hernandez et al., *Design Guidelines of Mobile Apps for Older Adults — Systematic Review*: https://mhealth.jmir.org/2023/1/e43186
- Mair et al., *Effective Behavior Change Techniques in Digital Health Interventions*: https://pmc.ncbi.nlm.nih.gov/articles/PMC10498822/
- W3C, *WCAG 2.2 Target Size (Enhanced)*: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html

Important assumptions remain unverified:

- how many target clients prefer paper, app, or hybrid;
- which signals actually change Damian's weekly decisions;
- how often guidance changes in real practice;
- how much weekly administrative time Damian can sustain;
- whether clients understand `stopped`, `changed`, and `not done` without judgment;
- whether a contextual question flow creates a manageable service expectation.

The later fictional prototype must test these assumptions with 5–7 representative target users before any production implementation or runtime authorization. Tests use fictional, non-sensitive scenarios only. This is qualitative risk discovery, not statistical validation. The Stage 5 Architecture Contract must define how the future prototype will test them; the tests are not a prerequisite for drafting that contract.

## Validation severity

- **P0** — wrong-client exposure, unsafe or missing required stop boundary, unauthorized publication, automatic trainer decision, diagnosis, or cross-client mutation.
- **P1** — a non-P0 failure that does one or more of the following:
  - allows Stage 5 entry from anything other than the exact current qualifying `START` version;
  - prevents the client from identifying the current authoritative instruction or leaves a stale version actionable;
  - creates conflicting paper/app truth;
  - introduces a fixed curriculum or automatic progression;
  - makes a required signal impossible to submit or uses language that creates shame or pressure;
  - makes the complete manual loop depend on a portal, AI, integration, or automation;
  - prevents the complete manual loop from reaching an explicit trainer decision;
  - violates Architecture 10 provenance or collapses `information_type`, `review_state`, and `publication_state`, unless the consequence is already P0;
  - blurs a stage or authorization boundary in a way that could permit unapproved downstream work;
  - makes the complete manual loop materially infeasible against the operational criteria later approved for the downstream prototype gate.
- **P2** — non-blocking clarity, polish, efficiency, or consistency weakness that does not compromise the method or task completion.

Owner acceptance requires `0 P0 / 0 P1` on one frozen product-document commit after independent read-only review.

## Required fictional cases

These are binding downstream acceptance scenarios for the future Architecture Contract, PRD, and fictional prototype. They are not claimed as completed evidence for this Product Decision Brief.

1. `app-primary` — current guidance, one requested response, and a contextual question.
2. `paper-primary` — complete client guidance works without the app; any later signal is optional and separately defined.
3. `deliberate-hybrid` — paper provides a bounded environmental cue while the named authoritative source remains singular.
4. `stopped-or-uncertain` — the client stops or asks without shame, and Damian records the next decision.
5. `version-change` — a material decision creates v2, retires v1 from client action, and preserves history.
6. `no-signal-required` — guidance remains complete without tracking.
7. `week-4-adjustment` — an early review changes focus, dose, channel, or requested signal.
8. `week-8-independence` — support is reduced or the channel changes because the client can carry more alone.
9. `week-12-handoff` — selected evidence becomes a trainer-only report-ready package without generating the report.
10. `ineligible-stage-4-decision` — `START_CONDITIONAL`, `DEFER_CONSULT`, `NOT_THIS_PRODUCT`, and a missing, stale, superseded, or invalidated `START` fail closed until an exact current qualifying `START` version exists.

## Product Decision Brief exit gate

This Draft is ready for a separate owner acceptance decision only when:

- it maps Stage 5 to the accepted Constitution, Product, Architecture, and Stage 4 entry truth;
- the real trainer and client jobs, product boundaries, channel authority, minimum signal, report-ready boundary, operating economics, and rejected alternatives are explicit;
- no screen, schema, PRD, AI, or implementation decision is smuggled into the Product layer;
- the required future fictional cases and downstream prototype exit gate are testable without real data;
- one frozen commit/tree passes independent read-only semantic review with `0 P0 / 0 P1`;
- Damian confirms that the product direction is useful enough to authorize one Architecture Contract.

Passing this brief gate does not automatically authorize Architecture. The next layer still requires a separate explicit owner decision.

## Downstream Stage 5 prototype exit gate

The future Architecture Contract, PRD, and fictional prototype must eventually prove:

- the exact current qualifying Stage 4 `START` version and its invalidation behavior are enforced;
- Damian can establish one current focus and publish one authoritative guidance version;
- paper, app, and deliberate hybrid each work without duplicate truth;
- the client can understand the current instruction and stop/reduction criteria;
- a client can act without opening the app when the selected channel permits it;
- requested responses preserve the exact item and plan version;
- done, changed/partial, stopped, not done, and question remain non-judgmental;
- a guidance correction preserves v1 and makes only v2 actionable;
- Damian can record the next decision without automatic progression;
- review anchors produce selected report-ready evidence rather than adherence metrics;
- trainer-only content never reaches a client-safe projection;
- the complete manual path works without AI, notifications, integrations, or automation;
- moderated tests with 5–7 representative target users find no P0/P1 orientation, comprehension, accessibility, or dignity failure;
- the provisional client and trainer time budgets are tested, then either approved or deliberately revised by Damian; failure requires simplification rather than premature automation;
- Damian confirms that the loop reduces rather than adds cognitive and administrative burden.

Passing the later prototype gate does not authorize schema, Supabase, real client data, staging, production, deployment, or publication.

## Forbidden scope

Do not add during this planning brief:

- architecture objects or schema commitments;
- PRD 005;
- HTML, CSS, JavaScript, tests, or prototype screens;
- Supabase, Auth, MFA, RLS, Storage, Edge Functions, SQL, or migrations;
- real client data or real account access;
- real AI, simulated AI, weekly AI preparation, or automatic summaries;
- automatic progression, regression, safety clearance, or diagnosis;
- push notifications, reminders, streaks, adherence percentages, points, badges, rankings, or shame states;
- twelve prewritten weekly modules or a generic programme library;
- unbounded chat, emergency messaging, automated client advice, or response-time promises;
- raw progress charts, wearable dashboards, Polar or Tanita integration;
- booking, payment, CRM, pricing, sales, or continuation pressure;
- Stage 6, Stage 7, or Stage 8 implementation.

## What this decision rejects

This brief explicitly rejects:

- portal-first planning;
- engagement as the primary success metric;
- completion as a proxy for progress;
- a fixed twelve-week curriculum;
- app access as the product;
- duplicate paper and digital plans;
- AI before the manual loop is proven;
- using Stage 5 to recover PR #18's fixed information architecture.

PR #18 remains frozen technical evidence only.

## Next gate

After independent review and separate owner acceptance of this Product Decision Brief, the next permitted artifact is one Stage 5 Architecture Contract.

Architecture must define domain responsibilities, exact-version lineage, publication/withdrawal behavior, channel authority, client-safe projections, trainer decisions, failure states, and a bounded fictional acceptance model.

PRD 005, prototype work, implementation, and runtime remain blocked until separate later decisions.
