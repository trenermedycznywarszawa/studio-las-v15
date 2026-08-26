# openGym mobile guidance execution pattern — Studio Las reference

- **Status:** RESEARCH REFERENCE ONLY — NOT PRODUCT AUTHORITY, NOT IMPLEMENTATION AUTHORIZATION
- **Captured:** 2026-08-26
- **External reference:** `https://gitlab.com/DuarteSantos8/opengym`
- **External project license at review time:** AGPL-3.0
- **Studio Las use rule:** study behavior and interaction patterns; independently re-design/re-implement. Do not copy source code, UI code, assets, text, or data structures into Studio Las without a separate license review.
- **Primary future use:** possible client-side execution surface inside the Stage 5 Guidance Loop.

## Why this reference exists

openGym is a workout tracker, while Studio Las is a trainer-led decision and guidance system. The product models are different. The useful part for Studio Las is not its gym-tracker identity but its **mobile execution engine**: how a pre-existing instruction becomes an active session, how the user sees one current action, records what actually happened with few taps, handles timed work, moves through the sequence, and completes or stops early without destroying history.

This document extracts that interaction pattern only. It does not make openGym a dependency or a product template.

## Observed openGym execution pattern

The reviewed implementation exposes several useful behaviors:

1. A planned routine can be converted into an **active workout state** rather than being edited directly while the user performs it.
2. The active state tracks a current position, entries, their completion state, start time, and progress.
3. The mobile surface emphasizes the **current exercise/unit**, while previous/next navigation remains available.
4. Each action carries only fields relevant to its mode: repetitions/load, timed hold, or cardio duration/speed.
5. Values are pre-filled from the plan/history and can be adjusted with low-friction controls instead of requiring repeated typing.
6. Completion is an explicit action. Finishing a step may move the flow forward, start rest, or complete the session.
7. Timed work records **what actually happened**. If a 45-second target is stopped at 38 seconds, the recorded result becomes 38 seconds rather than falsely crediting the target.
8. The flow separates planned values from executed values.
9. A session can be modified during execution, but destructive actions require confirmation and completed work is treated as meaningful history.
10. A session can be ended before all planned work is complete; early completion is represented explicitly instead of forcing fake completion.
11. The interface keeps execution feedback immediate through progress, completion marks, timer, vibration/sound and automatic navigation.

## What Studio Las should preserve

The following pattern is valuable and should be considered when a client execution surface is eventually authorized:

> **published guidance → active execution instance → one current action → minimal actual-response capture → optional contextual signal → next action → explicit finish/stop → trainer review**

The important architectural distinction is:

- **published guidance** remains the authoritative trainer-approved instruction;
- **execution instance** is an operational record of the client's attempt;
- **actual response** never rewrites the prescription;
- **client completion** never creates trainer meaning or automatically changes future guidance.

## Studio Las adaptation: minimum mobile execution surface

A future Studio Las execution surface should be substantially simpler than openGym.

### 1. Start

The client sees one exact current Studio Las guidance release and a clear action such as:

- `Start today's guidance`
- `Start 20-minute walk`
- `Start mobility sequence`

Starting creates an execution instance bound to the exact published guidance release/item version. It must not create a new guidance version.

### 2. Current action card

Show one main action at a time. Minimum content:

- action name;
- short client-safe purpose when useful;
- dose: repetitions / time / distance / simple instruction;
- stop or reduction rule when relevant;
- optional demonstration/media later, if separately approved;
- a large primary completion control.

Avoid exposing trainer-only reasoning, diagnostic labels, progression logic, scores or unnecessary history.

### 3. Actual versus planned

The engine should preserve both:

- `planned`: what Damian published;
- `actual`: what the client says occurred.

Examples:

- planned `10 repetitions`, actual `8`;
- planned `30 minutes`, actual `18 minutes`;
- planned `45-second hold`, actual timer `37 seconds`.

The actual value is evidence, not an automatic judgment of success/failure.

### 4. Minimal response vocabulary

The existing Stage 5 architecture remains authoritative. For common guidance execution the normalized response stays:

- `done_as_planned`
- `changed_or_partial`
- `stopped`
- `not_done`

Detailed numbers or time are optional evidence attached only where Damian deliberately requested them. Do not require detailed set-by-set logging by default.

### 5. Timed actions

Borrow the behavioral principle, not the implementation:

- timer starts from the prescribed target;
- client may stop early;
- system records actual elapsed time;
- stopping early does not automatically label the outcome as unsafe, failed, regressed or non-compliant;
- the client can optionally select/report the appropriate bounded response.

### 6. Sequence navigation

For multi-item guidance:

- one current action is visually dominant;
- previous and next remain available;
- completion can advance to the next action;
- skipping/stopping must remain possible;
- the system must never force completion merely to reach the end.

### 7. Finish

Finishing creates a bounded execution summary, not a progress score.

Potential client-facing output:

- `Zapisane.`
- `Damian zobaczy to przed kolejną decyzją.`
- optional open question/contact path.

Potential trainer-side evidence:

- exact guidance version attempted;
- start/end timestamp where useful;
- requested normalized execution response;
- requested actual values only;
- client question/context, kept separate from execution status.

## Existing Studio Las Atlas changes the opportunity

Studio Las should **not** treat the future Guidance Player as a reason to create a new exercise library from scratch.

Earlier Studio Las OS work already established a substantial Atlas foundation sourced from the existing spreadsheets and video links. Historical working material records:

- `10.2024-Atlas-cwiczen-byd797p.xlsx` with 1107 hyperlinks / 1107 recognized video links;
- `ATLAS-ĆWICZEŃ.xlsx` with 879 hyperlinks / 878 recognized video links;
- 1985 recognized source video links in total;
- an Atlas layer that previously contained 108 exercises plus fields for muscle mapping, client-facing naming, dosage, instructions, stop criteria, regressions, progressions, contraindications, source and quality status;
- video-link infrastructure such as `STUDIO_LAS_EXERCISE_VIDEO_LINKS`, `isValidVideoUrl()` and `mergeExerciseVideoLinks()`;
- a prior product rule that the **Atlas is for the trainer, while the client sees only assigned guidance/tasks**.

This means the strategic problem is no longer “build a video exercise library.” The problem is **curation, confidence and workflow**.

### Source warehouse versus reviewed Studio Las exercise

The source spreadsheets and their video links should be treated as a **content warehouse**, not as a client-facing catalog.

A future reviewed Studio Las exercise may reference an exact source video only when the mapping is sufficiently confident. The previous safety rule remains valuable:

> **A wrong video is worse than no video.**

Therefore matching must not guess among similar variants. Exact normalized names and obvious aliases may support high-confidence mapping; ambiguous variants remain unresolved until Damian reviews them.

The useful future distinction is:

```text
SOURCE ATLAS / VIDEO WAREHOUSE
        ↓ reviewed mapping
STUDIO LAS EXERCISE
  client-safe name
  exact demonstration/video
  instruction
  planned dose defaults
  stop/reduction criteria
  optional regression/progression knowledge
  quality status
        ↓ Damian selects for current purpose
GUIDANCE ITEM
        ↓ client execution
GUIDANCE PLAYER
```

The client never needs to browse or manage the warehouse.

## Atlas → Guidance → Execution → Signal → Brief → Decision

The strongest future Studio Las pattern is the following end-to-end chain:

> **Atlas → Guidance → Execution → Signal → Brief → Decision**

Each layer has a different responsibility.

### Atlas = knowledge about an exercise

The Atlas is trainer-side reusable content and metadata. It may contain:

- technical/internal name;
- client-safe name;
- exact reviewed video URL;
- default dosage suggestion;
- tempo or breathing note where useful;
- client instruction;
- common mistakes;
- stop/reduction criteria;
- regressions/progressions as trainer knowledge;
- contraindication/context notes;
- muscle/pattern metadata;
- source and quality status.

Atlas content is not automatically a client prescription.

### Guidance = Damian's current decision

A Guidance item is created only when Damian deliberately selects/adapts Atlas content for one exact client, current focus and current period.

The Guidance item owns the **current prescription**, for example:

- `Goblet squat`
- `3 × 8`
- `easy/moderate effort`
- `2 times before the next meeting`
- exact client-safe cue;
- exact stop/reduction rule;
- exact reviewed demonstration link when useful.

Defaults from the Atlas may reduce typing, but they never bypass Damian's approval or turn reusable content into an automatic prescription.

### Execution = simple mobile doing

The future Guidance Player should consume the approved Guidance item rather than expose Atlas complexity.

A client should see something closer to:

```text
Goblet squat
[video]

Today: 3 × 8

Remember:
Knees follow the direction of the feet.

Stop/reduce if:
Knee discomfort clearly increases.

[Start]
```

During execution, the player may guide one set/action at a time, preserve planned versus actual values, provide a timer where relevant, and permit partial/stopped/not-done outcomes without forcing fake completion.

### Signal = what actually happened

Execution produces only bounded evidence that may help the next decision.

Examples:

- done as planned;
- changed or partial;
- stopped;
- not done;
- actual repetitions or elapsed time when explicitly requested;
- separate client question or contextual note.

The signal is not an adherence grade and does not automatically trigger progression, regression, diagnosis, praise, warning or plan change.

### Brief = decision preparation for Damian

Before the next contact/session, relevant execution evidence can be summarized into the trainer's short Session Brief.

The purpose is not to produce an exercise diary. It is to answer:

> **What happened since the last decision that Damian should know before making the next one?**

Only bounded, decision-relevant evidence should surface. Full execution history should remain available only when genuinely needed.

### Decision = trainer interpretation and next step

Damian interprets the signal in context and decides whether to:

- continue;
- simplify;
- progress;
- regress;
- replace;
- pause;
- change channel;
- refer;
- close.

No execution state or Atlas metadata can make this decision automatically.

## Why this is stronger than copying a workout app

Conventional workout products often optimize for:

```text
exercise library → program → sets/reps → completion → history/progress
```

Studio Las should optimize for:

```text
trainer knowledge → current decision → clear client action → real-world evidence → trainer interpretation → next decision
```

The difference is important: **the exercise is a tool inside a decision loop, not the product's organizing principle.**

The practical consequence is that Studio Las does not need thousands of client-ready exercises. A smaller reviewed set of high-use Studio Las exercises can be far more valuable if every item has a correct demonstration, client-safe instruction, usable stop criteria and reliable mapping. The wider source Atlas can remain available as a warehouse for deliberate expansion when a real client need appears.

This reinforces the earlier Studio Las rule:

> **Do not add more exercises without a strong reason. Improve confidence, quality and workflow first.**

## State model to remember

This is a conceptual pattern only, not an approved schema.

```text
GUIDANCE RELEASE (immutable published authority)
        |
        v
EXECUTION INSTANCE
  status: not_started | active | finished | stopped
  exact guidance reference
  started_at / ended_at if useful
        |
        +--> ACTION ATTEMPT 1
        |      planned dose
        |      actual evidence if requested
        |      execution response
        |
        +--> ACTION ATTEMPT 2
        |      ...
        |
        +--> CLIENT CONTEXT / QUESTION
               separate axis; never inferred meaning
```

Important: these labels are research vocabulary and do not add approved Architecture 10 information types, review states, publication states, or database tables.

## What NOT to import from openGym

Do not let this reference pull Studio Las toward a conventional fitness tracker. Specifically avoid making the following default product behavior:

- detailed logging of every set, repetition and kilogram;
- personal records / best-weight emphasis;
- automatic progression or deload decisions;
- exercise-history optimization as the main value proposition;
- body-weight graphs as a core navigation concept;
- completion percentages treated as adherence scores;
- streaks, rankings, badges, shame states or gamification;
- unrestricted freestyle exercise building for the client;
- automatic substitution, progression or regression;
- live surveillance of client activity as a default expectation.

Any future presence/activity telemetry would require a separate necessity, privacy and proportionality decision. The openGym heartbeat/admin-presence pattern is specifically **not** adopted by this reference.

## The Studio Las version of the engine

If implemented later, the engine should optimize for this question:

> **Can the client understand exactly what to do now, record only the information that may help Damian make the next decision, and finish without turning Studio Las into a tracking job?**

The target interaction is therefore closer to:

```text
Open current guidance
    ↓
Start
    ↓
One clear action
    ↓
Do it
    ↓
Done as planned / changed / stopped / not done
    ↓
(optional requested actual value or question)
    ↓
Next action
    ↓
Finish
    ↓
Evidence waits for Damian review
```

rather than:

```text
routine → exercise → set → reps → weight → PR → automatic progression
```

## Future acceptance criteria

Before any client execution engine is considered ready, it should be possible to demonstrate with fictional data that:

1. a published exact guidance version creates an execution instance without mutating the guidance;
2. the client can complete a simple one-action instruction in a few obvious taps;
3. a timed action records actual duration if stopped early;
4. a partial/stopped/not-done response remains valid and does not block finishing;
5. no completion event changes the trainer's focus, dose, progression, regression, safety interpretation or next guidance automatically;
6. a contextual question is stored separately from execution status;
7. stale/replaced guidance cannot silently remain the active actionable instruction;
8. the trainer can see only the bounded evidence needed for review;
9. the surface remains usable without exposing trainer-only rationale;
10. the flow works well on a phone with large tap targets and minimal typing;
11. a reviewed Atlas exercise can prefill client-safe content into a draft Guidance item without publishing it automatically;
12. an ambiguous Atlas/video mapping remains unresolved rather than guessing a variant;
13. changing Atlas defaults never mutates an already published Guidance release;
14. the client cannot browse trainer-only Atlas metadata through the Guidance Player;
15. execution evidence can appear in the Session Brief without being converted into an automatic interpretation or progression decision.

## Decision for future Studio Las work

**KEEP AS REFERENCE.**

When the project reaches an authorized client execution implementation, start from this document and the current Stage 5 product/architecture authority. Use openGym only to re-check interaction ideas. Independently design the Studio Las implementation around minimal guidance execution and trainer decision quality.

The most valuable extracted principle is:

> **Do not ask the client to manage a training database. Give them one clear current action, capture what actually happened with minimum friction, and return the evidence to Damian for interpretation.**

The Studio Las-specific extension is:

> **Use the existing Atlas as reusable trainer knowledge, not as the client product. Damian turns reviewed Atlas content into one current Guidance instruction; the client executes it simply; the resulting evidence returns to Damian for the next decision.**
