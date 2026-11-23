# 03 Architectural Objects

## Purpose

This document defines the core architectural objects of Studio Las OS.

These are not database tables.

These are not UI components.

These are not JavaScript classes.

They are stable domain-level concepts that translate the Studio Las Method into architecture.

A future database table, view, payload, UI section, or report section may represent one of these objects, but the object itself exists before implementation.

## Core principle

Architectural objects describe meaning.

Database objects describe storage.

UI objects describe presentation.

Code objects describe implementation.

Do not confuse these layers.

## Object evaluation rule

Every architectural object must answer:

1. What does this mean in the Studio Las Method?
2. What trainer decision does it support?
3. What minimum signal does it need?
4. Who creates it?
5. Who owns it?
6. Who may see it?
7. Does it need persistence?
8. Does it need history?
9. Can it support a report pattern?
10. What must the OS not do with it?

If an object cannot answer these questions, it is not ready for implementation.

---

# 1. Client

## Definition

A person currently or historically guided through the Studio Las 1:1 process.

A client is not a user account first.

A client is a person in a guided relationship.

## Trainer decision supported

What does this person need next, given their context, history, goals, fears, and current capacity?

## Created by

Trainer or system during intake/onboarding.

## Owned by

Studio Las operationally.

The person owns their dignity, privacy, and right to safe treatment of their data.

## Visibility

Trainer-visible by default.

Client-visible only through safe surfaces such as summaries, assigned guidance, and published reports.

## Persistence

Yes.

Client records are part of continuity, access control, reports, and long-term process memory.

## History

Yes, but only where operationally justified.

Avoid storing unnecessary personal details.

## Report use

Provides starting context, process continuity, and final report framing.

## OS must not

- reduce the client to metrics,
- expose private notes,
- use client data for marketing profiling,
- treat client access as a standalone SaaS account.

---

# 2. Client Process

## Definition

The guided arc of work with a client across a defined period or phase.

The process connects diagnosis, hypotheses, sessions, home guidance, signals, measurements, reports, and next decisions.

## Trainer decision supported

What phase is this client in, and what should the process focus on now?

## Created by

Trainer.

## Owned by

Trainer / Studio Las.

## Visibility

Trainer-visible by default.

Client may see a simplified process map or client-safe stage summary.

## Persistence

Yes.

The process is the main continuity structure.

## History

Yes.

Major changes in process focus should be preserved.

## Report use

The report explains what happened across the process and what the process revealed.

## OS must not

- turn the process into a rigid program template,
- auto-progress stages,
- create a parallel app journey separate from trainer guidance.

---

# 3. Trainer Hypothesis

## Definition

A temporary working interpretation that helps the trainer choose the next intervention.

A hypothesis is not a medical diagnosis.

It is a tool for action and review.

## Trainer decision supported

Which explanation should guide the next session, home guidance, measurement, or referral decision?

## Created by

Trainer.

## Owned by

Trainer.

## Visibility

Trainer-only by default.

Client-facing only after being rewritten as a safe explanation.

## Persistence

Sometimes.

Store when it supports continuity, review, or report interpretation.

Do not store every fleeting thought.

## History

Prefer append-only or change history when hypotheses guide major decisions.

## Report use

A client-safe version may explain what was tested and what was learned.

## OS must not

- label hypotheses as diagnoses,
- expose private hypotheses by default,
- auto-generate hypotheses as authority,
- treat a hypothesis as permanent truth.

---

# 4. Session Observation

## Definition

A selected observation from a coached 1:1 session that may affect future decisions.

It is not a full transcript of the session.

It is not a performance log by default.

## Trainer decision supported

Should the trainer progress, regress, repeat, simplify, pause, refer out, or change focus?

## Created by

Trainer.

## Owned by

Trainer / Studio Las.

## Visibility

Trainer-visible by default.

Client may see a client-safe summary.

## Persistence

Yes, when the observation may matter later.

No, for observations that are not decision-relevant.

## History

Yes for decision-relevant observations.

## Report use

Session observations help show changes, tolerance, fear reduction, load response, and decision shifts.

## OS must not

- force exhaustive exercise logging,
- create a client performance dashboard,
- imply that completion equals success,
- expose raw trainer notes accidentally.

---

# 5. Home Guidance

## Definition

Trainer-assigned guidance for the client between sessions.

It has one trainer-selected primary channel and one authoritative instruction version. It may be delivered through paper, the app, or a deliberate hybrid.

## Trainer decision supported

What should the client do outside the studio, and what should they notice before the next review?

## Created by

Trainer.

## Owned by

Trainer.

## Visibility

Client-safe guidance is visible to the client.

Trainer rationale remains trainer-only unless intentionally summarized.

## Persistence

Yes, when assigned as part of the process.

## History

Yes, when it affects report patterns or process continuity.

## Report use

Shows how between-session guidance contributed to continuity, independence, or friction.

## OS must not

- make paper or the app a universal morning interface regardless of the client and task,
- add push notifications,
- add streaks or compliance pressure,
- turn home guidance into a habit tracker.

---

# 6. Client Signal

## Definition

The smallest client-provided information that may help the trainer interpret the process.

A signal is not a judgment of the client.

A signal is not a score of human value.

## Trainer decision supported

Is the current guidance working, unclear, too hard, too easy, unsafe, or creating friction?

## Created by

Client.

## Owned by

The signal comes from the client, but Studio Las stores it only to support the process.

## Visibility

Trainer-visible.

Client may see their own signal only if doing so does not create pressure, anxiety, or tracking behavior.

## Persistence

Sometimes.

Persist only if the signal may support a decision or report pattern.

## History

Yes when repeated signals may reveal a pattern.

## Report use

Client signals may reveal adherence friction, fear, tolerance, confidence, or independence trends.

## OS must not

- turn signals into streaks,
- show compliance dashboards,
- shame missed days,
- collect universal daily scores by default,
- over-interpret signals automatically.

---

# 7. Measurement

## Definition

Selected objective or subjective information that clarifies baseline, change, safety, or report patterns.

Measurement is not the product.

Measurement serves interpretation.

## Trainer decision supported

Does this measurement change what the trainer should do next?

## Created by

Trainer, system, or manually entered device observation.

## Owned by

Studio Las operationally, under privacy and minimization constraints.

## Visibility

Trainer-visible by default.

Client-visible only when interpreted safely.

## Persistence

Yes when it supports comparison, safety, or report patterns.

No when it is merely interesting.

## History

Yes for meaningful repeated measurements.

## Report use

Measurements support the report only when they clarify a meaningful change or decision.

## OS must not

- become a quantified-self dashboard,
- integrate wearables by default,
- collect everything,
- present raw numbers without interpretation,
- use measurement as pressure.

---

# 8. Trainer Interpretation

## Definition

The meaning the trainer gives to observations, signals, and measurements in context.

This is where professional judgment lives.

## Trainer decision supported

What does the available signal mean for this client now?

## Created by

Trainer.

AI may later assist drafting or organization, but not authority.

## Owned by

Trainer.

## Visibility

Trainer-only by default.

Client-facing only after the trainer writes a safe summary.

## Persistence

Yes when it explains a decision, report, or change in direction.

## History

Prefer preserving interpretation changes when they affect major decisions.

## Report use

Trainer interpretation turns raw history into a pattern and next decision.

## OS must not

- automate final meaning,
- expose private reasoning by default,
- let AI become the source of authority,
- publish trainer-only notes as client summaries.

---

# 9. Report Pattern

## Definition

A repeated or meaningful signal across time that helps explain what the process revealed.

A report pattern is not raw data volume.

It is interpreted change.

## Trainer decision supported

What did we learn across this process, and what should happen next?

## Created by

Trainer, supported by OS records.

## Owned by

Trainer / Studio Las until published as a client report.

## Visibility

Trainer-only while in draft.

Client-visible only when published as client-safe report content.

## Persistence

Yes.

Report patterns should survive as part of the process record.

## History

Yes, especially when part of published reports.

## Report use

This object is central to the report.

## OS must not

- treat attendance as the pattern,
- treat data volume as the pattern,
- auto-publish patterns,
- exaggerate certainty,
- generate diagnostic conclusions.

---

# 10. Next Decision

## Definition

The decision that closes one cycle and defines what happens next.

Examples:

- continue,
- change focus,
- increase independence,
- reduce support,
- refer out,
- pause,
- finish.

## Trainer decision supported

What is the most responsible next step for this person?

## Created by

Trainer, often after discussion with the client.

## Owned by

Trainer / Studio Las.

## Visibility

Client-safe decision summary should usually be visible to the client.

Trainer-only rationale may remain private.

## Persistence

Yes.

The next decision is a major continuity artifact.

## History

Yes.

Do not silently overwrite major decisions.

## Report use

The report should culminate in the next decision.

## OS must not

- auto-progress the client,
- push continuation as default,
- hide uncertainty,
- replace trainer judgment,
- treat more Studio Las as always better.

---

# 11. Client-Safe Summary

## Definition

A version of trainer meaning intentionally written for the client.

It is not the same as raw trainer notes.

## Trainer decision supported

What should the client understand now without becoming overwhelmed, anxious, or misled?

## Created by

Trainer.

AI may later assist drafting only if trainer-reviewed.

## Owned by

Trainer / Studio Las.

## Visibility

Client-visible after intentional publication.

## Persistence

Yes when shared with the client.

Drafts may be mutable until published.

## History

Published summaries should be preserved.

## Report use

Client-safe summaries may become report sections or bridge between sessions.

## OS must not

- expose raw notes as summaries,
- use medical claims beyond scope,
- overstate certainty,
- create fear or shame.

---

# 12. Access State

## Definition

The current authorization relationship between the client and Studio Las OS.

Access is part of the 1:1 service, not a standalone subscription.

## Trainer decision supported

Should this person currently have access to Studio Las OS?

## Created by

Trainer/system/admin.

## Owned by

Studio Las.

## Visibility

Internal by default.

Client may experience access state through login/access behavior.

## Persistence

Yes.

Access state is operationally important.

## History

Yes where needed for accountability and support.

## Report use

Usually none, except process continuity or access revocation context.

## OS must not

- allow inactive clients to keep process access by default,
- treat app access as a product sold separately,
- expose other client data through access mistakes.

---

# Object relationship map

The core relationship is:

```text
Client
  -> Client Process
      -> Trainer Hypothesis
      -> Session Observation
      -> Home Guidance
          -> Client Signal
      -> Measurement
      -> Trainer Interpretation
      -> Report Pattern
      -> Next Decision
```

Client-Safe Summary and Access State cut across the process:

```text
Trainer Interpretation -> Client-Safe Summary -> Client-facing surface
Access State -> controls whether client-facing surfaces are available
```

## Object-to-surface guidance

| Object | Paper | Conversation | App record | Trainer-only | Client-safe | Report |
| --- | --- | --- | --- | --- | --- | --- |
| Client | no | yes | yes | yes | limited | yes |
| Client Process | no | yes | yes | yes | limited | yes |
| Trainer Hypothesis | no | yes | sometimes | yes | only rewritten | yes |
| Session Observation | no | yes | yes | yes | summary only | yes |
| Home Guidance | yes | yes | yes | rationale only | yes | yes |
| Client Signal | no | sometimes | yes | yes | limited | yes |
| Measurement | no | yes | yes | yes | interpreted only | yes |
| Trainer Interpretation | no | yes | yes | yes | rewritten only | yes |
| Report Pattern | no | yes | yes | draft | yes when published | yes |
| Next Decision | no | yes | yes | rationale | summary | yes |
| Client-Safe Summary | no | yes | yes | draft | yes | yes |
| Access State | no | no | yes | yes | no | rarely |

## What this document does not decide

This document does not decide:

- table names,
- columns,
- RLS policies,
- UI layout,
- JavaScript structure,
- Supabase migration strategy,
- report template design,
- AI implementation.

Those decisions come later.

## Future implementation warning

Do not ask Codex to create database tables directly from these objects.

A future schema gap analysis must first compare these objects to existing structures.

The correct question is not:

> Which tables should we create?

The correct question is:

> Which architectural objects are already represented safely, and where are the real gaps?

## Final rule

Architectural objects protect meaning.

Implementation must preserve that meaning.

If storage or UI distorts an object, the implementation is wrong even if the code works.
