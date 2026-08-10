# 08 Full Intake and PWD Preparation System

- **Status:** STAGE 3 BROWSER AUDIT PASS — READY FOR OWNER MERGE DECISION
- **Owner:** Damian
- **Recovered source date:** 2026-07-29

## Purpose

The full intake exists to prepare Damian for a good First Diagnostic Visit (PWD). It is not a diagnosis, a qualification score, a personality test, or a sales-conversion instrument.

The product flow is:

> adaptive full intake → reviewed facts, gaps, and conflicts → trainer-only brief → candidate PWD questions and observation domains → Damian's explicit readiness decision

The brief reduces searching and remembering. It does not replace reading the source, speaking with the client, screening, observing the person, or making the decision.

## Recovered owner sources

The Stage 0 audit described the following documents but could not inspect them. They were recovered on 2026-08-10 and are now the source evidence for this candidate contract:

| Source | SHA-256 | Role |
| --- | --- | --- |
| `04_Studio-Las_Ankiety-i-brief-AI_v2.docx` | `66b495053e72d8f742b6bcc6dc1b2c40ff473752e0e8315da1e51b25607be785` | Full intake, adaptive modules, and trainer-brief requirements |
| `03_Studio-Las_Proces-klienta-i-PWD_v2.docx` | `8ecc7addbb38002c51c9424e91bbe0dde61ecc091ab812b9c5d1ef50094203fc` | Client process, PWD structure, observation domains, and decision boundaries |

The recovered files do **not** define an approved 42-question form. Source `04` defines 26 core prompts and four conditional module descriptions. Therefore `42 questions` is rejected as an unsupported implementation assumption.

## Adaptive intake doctrine

1. The client sees only questions that have a legitimate purpose in the current process.
2. Missing, unanswered, not applicable, declined, and contradictory are different states.
3. A conditional module is not activated by stereotype, sex-based duplication, or AI inference.
4. A response remains the client's statement. Extraction does not turn it into a confirmed cause or diagnosis.
5. Health-related answers may direct Damian's attention, but the system does not establish safety or make a medical decision.
6. No response creates a score, readiness grade, neurotype, conversion probability, or automatic next step.
7. The full intake remains usable without AI.

## Canonical core — 26 prompts

The stable identifiers below are contract identifiers, not database fields.

### A. Goal and context

| ID | Purpose |
| --- | --- |
| `A1` | Most important practical result for the next 12 weeks |
| `A2` | Two or three currently limited activities |
| `A3` | Previous attempts and what helped or discouraged |
| `A4` | Realistic capacity for one studio meeting and one short independent task weekly |

### B. Safety and current care

| ID | Purpose |
| --- | --- |
| `B1` | Current activity restrictions or conditions given by a health professional |
| `B2` | Current symptoms that caused effort to stop or be deferred |
| `B3` | Recent procedure, hospitalization, injury, or treatment change relevant to effort |
| `B4` | Medicines or recommendations relevant to safe effort, with purpose explained |
| `B5` | Optional coordination details, only when the client wants coordination |

### C. Movement history and tolerance

| ID | Purpose |
| --- | --- |
| `C1` | Activity during the last three months |
| `C2` | Movement the client likes and avoids |
| `C3` | Usual response after moderate effort |
| `C4` | Concerning reactions during or after effort, including timing |

### D. Coaching profile

| ID | Purpose |
| --- | --- |
| `D1` | Preferred balance of calm explanation and short instruction |
| `D2` | Preferred response when a task is difficult |
| `D3` | Conditions that most discourage participation |
| `D4` | Preference for stable rhythm versus variation |
| `D5` | Preference for knowing the reason versus only the next step |
| `D6` | Client-defined sign that the first-visit pace is appropriate |

This is a provisional coaching hypothesis, not a neurotype or stable personality classification. It must be checked in practice and may change after two or three sessions.

### E. Function and reference point

| ID | Purpose |
| --- | --- |
| `E1` | Self-reported difficulty, 0–10, across the named daily-function domains |
| `E2` | Most important activity to observe during PWD |
| `E3` | Current distance or duration before a clear worsening of symptoms |

### F. Sleep, stress, daily movement, and feasibility

| ID | Purpose |
| --- | --- |
| `F1` | Self-rated recovery after sleep, 0–10 |
| `F2` | Work rhythm, caring duties, or stress affecting regular participation |
| `F3` | Days per week with 20–30 minutes available for movement or an independent task |
| `F4` | One organizational barrier to account for from the start |

## Conditional modules

Conditional modules are bounded purpose profiles. Their final client-facing wording remains a candidate until owner review.

| Module | Activation rule | Minimum relevant scope | Forbidden behavior |
| --- | --- | --- | --- |
| `pregnancy_postpartum` | Client deliberately states that the topic currently applies | stage/time since birth, relevant professional recommendations, current effort-related symptoms, birth context only when it may change the decision | infer pregnancy, collect unrelated reproductive history, auto-plan |
| `oncology` | Client states current or previous oncology care may affect effort | active/completed care, current recommendations, effort-related symptoms, known restrictions, coordinating professional if wanted | collect full history by default, infer prognosis, auto-clear effort |
| `service_test` | Client's practical goal is a named service fitness test | formation, exact test and date, current result, relevant injury history, available time and equipment | mix into the main calm-return offer, promise passing, use neurotype language |
| `pain_injury` | Client reports active pain, injury, treatment, or limitation relevant to effort | location, onset, variability, previous management, current limitations, signals requiring trainer review/consultation | diagnose, assert a cause, prescribe treatment, auto-select tests |

`not_applicable` must be recorded explicitly. A module that was never asked is `not_asked`, not `not_applicable`.

## Trainer brief

The trainer-only brief contains exactly these sections:

1. client's practical goal in the client's own words;
2. reviewed facts relevant to effort and PWD preparation;
3. missing information and contradictions;
4. signals requiring Damian's review, possible deferral, consultation, or document request — without diagnosis;
5. coaching hypotheses and coaching-profile suggestions marked `needs_review`;
6. prioritized questions for Damian to consider asking;
7. candidate PWD observation domains;
8. the explicit readiness decision Damian still has to make;
9. what is unknown and what must not be inferred.

Every item preserves exact-version `derived_from` references. A brief section cannot hide rejected, unresolved, or contradictory source states.

## Candidate PWD observation domain

A candidate is useful only if it contains:

- `purpose`: why this domain may matter to the client's stated goal;
- `observe`: what Damian may deliberately watch;
- `stop_criteria`: what would stop or change the observation;
- `decision_impact`: which trainer decision the result could inform;
- `derived_from`: exact source/response versions;
- `author`, `review_state`, and uncertainty;
- an explicit `approve`, `edit`, or `reject` action by Damian.

The system may suggest a domain such as sit-to-stand or effort tolerance. It must not automatically prescribe a test, load, number of repetitions, or safety status.

## Explicit trainer decision

Stage 3 ends with one deliberate `trainer_decision`:

- `READY_TO_PREPARE_PWD`;
- `NEEDS_CLARIFICATION`;
- `DEFER_OR_CONSULT_BEFORE_PWD`.

No value is preselected. Saving requires a rationale and exact evidence versions. This decision prepares the next human step; it is not the Stage 4 PWD outcome (`START`, `START CONDITIONAL`, `DEFER/CONSULT`, `NOT THIS PRODUCT`).

## Product boundaries

Stage 3 does not authorize:

- a final public questionnaire;
- schema, SQL, migrations, RLS, or storage;
- real client data;
- AI provider/model selection or AI runtime;
- copying PAR-Q+ into Studio Las;
- automatic safety clearance, diagnosis, qualification, test selection, or program design;
- sending, publishing, booking, or contact;
- staging or production deployment;
- Stage 4.

## Exit gate

On fictional cases Damian can prepare one coherent PWD brief, trace every meaningful claim to a response/source version, see all important gaps and conflicts, reject unsuitable suggestions, complete the workflow without AI, and make the readiness decision himself.
