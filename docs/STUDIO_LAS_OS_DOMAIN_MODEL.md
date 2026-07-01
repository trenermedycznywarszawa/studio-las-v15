# Studio Las OS Domain Model

This document defines the business/domain model of Studio Las OS.

It is not a database schema.
It is not an implementation plan.
It is the conceptual map that should guide future product and engineering decisions.

## 1. Core domain principle: Reuse before Create

Studio Las OS follows the principle:

> Reuse before Create.

Before adding a new table, new module, or new domain concept, prove that the existing concepts cannot represent the need in a simple, readable, and safe way.

Existing structures should be considered first:

- `clients`
- `sessions`
- `home_plans`
- `home_plan_items`
- `guidance_events`
- `reports`

New domain concepts are allowed only when they add clear architectural value, not merely implementation convenience.

## 2. Core domain principle: Paper is content, not infrastructure

A paper protocol is first content.

Examples:

- Poranny Reset
- Reset barków
- Wieczorne wyciszenie
- Spacer regeneracyjny
- Oddechowy reset napięcia

These do not need to become database infrastructure immediately.

In the first stage, a paper protocol can be represented as client-specific guidance inside existing home plan structures.

A dedicated protocol library becomes useful only when Studio Las needs:

- many reusable protocols,
- categories,
- search,
- versioning,
- reuse across many clients,
- stable protocol identifiers for reporting.

Until then, `paper_protocols` is DEFERRED.

## 3. Core domain principle: Data is an effect of the process, not the goal

Studio Las OS does not collect data for the sake of data.

The order is:

```text
Paper
  -> client performs offline
  -> app records a short signal
  -> trainer reviews the signal in context
  -> report shows the pattern
  -> trainer makes the next decision
```

Data exists only because a real client process created it.

The app should not create artificial tracking needs.

## 4. Main entities

### 4.1 Trainer

The trainer is the primary meaning-maker in the system.

The trainer:

- diagnoses the process context,
- assigns guidance,
- interprets signals,
- decides what to change,
- creates client-safe summaries,
- writes reports,
- protects the client from overinterpretation.

The trainer is not replaced by the app.

### 4.2 Client

The client is an active Studio Las 1:1 client.

The client:

- participates in the process,
- receives guidance,
- performs assigned work offline,
- records minimal signals,
- reads client-safe summaries and reports.

The client is not a public app user.
The client is not a SaaS customer.
The client is not expected to become a data analyst.

### 4.3 Process

The process is the full Studio Las 1:1 journey.

It includes:

- diagnostic entry,
- first decisions,
- guided work,
- between-session guidance,
- review and report,
- next decision.

The process is larger than the app.

The app supports the process but does not define it.

### 4.4 Session

A session is a formal trainer-client meeting or training unit.

It can include:

- exercises,
- readiness,
- pain/symptom context,
- trainer observation,
- decision,
- client-safe summary,
- next step.

A session is not the same as daily paper-first guidance.

### 4.5 Home Plan

A home plan is the current between-session guidance container for a client.

It can represent:

- what the client should do between sessions,
- the current focus,
- paper-first instructions,
- frequency/duration guidance,
- status of the assigned guidance.

In Paper-first tracking, the home plan is the likely assignment container.

### 4.6 Home Plan Item

A home plan item is a concrete assigned action or instruction.

It can represent:

- an exercise,
- a mobility drill,
- a paper-first protocol step,
- a client-safe cue,
- stop criteria,
- dose/frequency.

In Paper-first tracking, the home plan item is the likely link between an offline protocol and a daily check-in.

### 4.7 Paper Protocol

A paper protocol is an offline instruction pattern.

It may be:

- a reusable content template later,
- a client-specific instruction now,
- a paper guide,
- a checklist,
- a short morning/evening reset.

Paper Protocol is currently a domain concept, not necessarily a database table.

Status:

- DEFERRED as infrastructure.
- ACTIVE as content.

### 4.8 Guidance Event

A guidance event is a dated process signal or marker.

It can represent:

- client check-in,
- daily step,
- trainer marker,
- future paper-first signal.

In Paper-first tracking, a client check-in should likely be stored as a `guidance_events` row with:

- `kind = client_checkin`,
- `completed` as protocol_done,
- structured `payload` for energy/symptom/note.

### 4.9 Report

A report is the pattern layer.

It can represent:

- start map,
- 4-week review,
- 8-week review if later added,
- 12-week review,
- continuation decision.

The report is trainer-authored.

The report should show patterns, not pretend to diagnose.

## 5. Relationship diagram

```text
Trainer
  assigns and interprets
    -> Home Plan
        contains
          -> Home Plan Items
              may include
                -> Paper Protocol content
                    performed offline by
                      -> Client
                          records short signal as
                            -> Guidance Event
                                aggregated/interpreted into
                                  -> Report
                                      supports
                                        -> Next trainer decision
```

Alternative process view:

```text
Client
  belongs to
    -> Studio Las 1:1 Process
        includes
          -> Sessions
          -> Home Plans
          -> Guidance Events
          -> Reports
```

Paper-first flow:

```text
Paper instruction
  -> offline execution
  -> 30-45 second check-in
  -> trainer review
  -> report pattern
  -> next adjustment
```

## 6. Source of truth

| Concept | Source of truth |
| --- | --- |
| Client identity/process status | `clients` |
| Trainer-client relationship | `clients`, `client_trainers`, profiles/RLS |
| Formal session history | `sessions` |
| Trainer session observations | `post_session_observations`, `sessions` |
| Current between-session guidance | `home_plans` |
| Assigned concrete actions | `home_plan_items` |
| Paper protocol content, first stage | `home_plans` / `home_plan_items` content fields |
| Paper protocol reusable library, future | DEFERRED, possible future `paper_protocols` |
| Daily paper-first signal | likely `guidance_events` |
| Report output | `reports` |
| Client-safe visibility | client-safe views/RLS/published summaries |

## 7. What each entity is not

### Trainer is not

- an automated AI coach,
- a hidden implementation detail,
- replaceable by scoring logic.

### Client is not

- a public app user,
- a leaderboard participant,
- a data-entry worker,
- a quantified-self subject.

### Home Plan is not

- a generic workout program,
- a public template marketplace,
- a gamified challenge.

### Home Plan Item is not

- necessarily an exercise only,
- a streak item,
- a habit app task.

### Paper Protocol is not

- automatically a new table,
- a medical prescription,
- a phone-led routine,
- a tracking product.

### Guidance Event is not

- a full diary,
- a life survey,
- an analytics event for marketing,
- a notification trigger.

### Report is not

- a medical diagnosis,
- an automated final truth,
- a raw data dump.

## 8. How Paper-first tracking flows through existing concepts

Step 1: Trainer decides the process focus.

Step 2: Trainer assigns a home plan or home plan item containing paper-first instructions.

Step 3: Client performs the paper protocol offline.

Step 4: Client opens the app later and records a minimal check-in.

Step 5: The check-in becomes a guidance event.

Step 6: Trainer reviews the pattern across time.

Step 7: Report summarizes adherence, energy trend, symptom trend, and trainer interpretation.

Step 8: Trainer adjusts the next stage.

## 9. Rules for adding new domain concepts

A new domain concept may be added only if:

1. It cannot be represented clearly by an existing concept.
2. It has a stable meaning in the Studio Las process.
3. It reduces complexity rather than adding a parallel model.
4. It improves trainer decisions or report quality.
5. It does not weaken the trainer's role.
6. It does not create unnecessary tracking.
7. It can be explained in plain language.
8. It has clear client visibility rules.
9. It has clear RLS/security implications.
10. It does not exist only because it is convenient for implementation.

If these conditions are not met, the concept should remain content, metadata, or an implementation detail.

## 10. Implementation implications

For Paper-first tracking, the implementation should likely begin by:

- reusing `home_plans` as assignment container,
- reusing `home_plan_items` as assigned instruction/action,
- reusing `guidance_events` as daily check-in signal,
- reusing `reports` as pattern output,
- deferring `paper_protocols` as infrastructure.

Do not create a protocol library until there is real operational pressure.

Do not introduce a second assignment model.

Do not introduce a second reporting model.

Do not introduce a habit-tracking model.

## 11. Minimal Paper-first domain payload

For a daily client signal, the domain payload should stay minimal:

```json
{
  "protocol_done": true,
  "energy_score": 7,
  "symptom_score": 3,
  "optional_note": "Krótka notatka klienta"
}
```

Rules:

- `energy_score` must be 0-10.
- `symptom_score` must be 0-10.
- `optional_note` must stay short.
- No long questionnaire.
- No streak.
- No gamification.
- No automatic diagnosis.

## 12. Strategic guardrail

If a future feature cannot be placed clearly in this domain model, it probably should not be implemented yet.

When in doubt:

1. Keep paper as the instruction layer.
2. Keep the app as the signal layer.
3. Keep the trainer as the interpretation layer.
4. Keep the report as the pattern layer.

This protects Studio Las OS from becoming a generic app.
