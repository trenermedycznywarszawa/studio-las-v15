# 04 Measurement System

## Purpose

This document defines the Studio Las measurement system.

It answers:

- what we measure,
- why we measure it,
- when we measure it,
- what we intentionally do not measure,
- why more data is not automatically better.

This document is not a database schema.

It is not a dashboard specification.

It is not a wearable integration plan.

It defines the product logic of measurement.

## Core principle

Studio Las measures only what can support a better trainer decision, client clarity, or future report.

Measurement is not the product.

Measurement serves interpretation.

If a measurement does not change a decision, reduce fear, clarify progress, or support a report, it should not be collected.

## Measurement doctrine

More data can create more noise.

More tracking can increase anxiety.

More numbers can weaken trust in the body if they replace lived experience.

Studio Las does not measure everything because Studio Las is not a quantified-self system.

The trainer chooses the few signals that matter now.

## What we measure

Studio Las may measure or record:

- baseline client context,
- pain or symptom-relevant information,
- movement observations,
- functional tests,
- selected body composition measurements,
- session time,
- RPE,
- heart rate observations when useful,
- training load tolerance,
- client confidence or fear signals,
- home guidance completion signal,
- trainer notes,
- report-relevant changes.

The exact measurement depends on the client and the current process stage.

## Why we measure

Studio Las measures to:

1. Establish a starting point  
   The trainer and client need a shared reference.

2. Notice change  
   Some changes are visible only across time.

3. Protect safety  
   Signals may show when to regress, pause, or refer out.

4. Improve decisions  
   Measurement should help the trainer choose the next step.

5. Reduce uncertainty  
   The client should understand progress without becoming dependent on numbers.

6. Build the report  
   Reports need selected evidence, not unlimited tracking.

## When we measure

Measurement should happen at meaningful points, not constantly.

Common points:

- diagnostic entry,
- start of a process cycle,
- selected sessions when the trainer needs a signal,
- after home guidance when a short signal matters,
- 4-week review,
- 8-week review,
- 12-week report,
- when the trainer needs to change direction.

Constant measurement is not the default.

## What we do not measure by default

Studio Las does not measure by default:

- daily weight,
- daily calories,
- step-count goals,
- sleep scores,
- readiness scores,
- HRV dashboards,
- streaks,
- points,
- badges,
- leaderboards,
- social comparison metrics,
- wearable streams,
- every set and repetition as a client-facing performance log,
- every subjective state as a score.

These may create false precision, anxiety, or app dependence.

## Why we do not measure everything

The Studio Las client often needs less chaos, not more self-monitoring.

For a person returning after pain, injury, treatment, fear, or inactivity, too much measurement can shift attention away from trust and toward control.

Studio Las measurement should help the client understand the body, not monitor the body obsessively.

The trainer should decide what is worth recording.

## Measurement hierarchy

The hierarchy is:

1. Human context
2. Trainer observation
3. Client-reported signal
4. Selected objective measurement
5. App record
6. Report pattern

The app record is not the highest truth.

It is one layer of evidence.

## Good measurement criteria

A measurement is useful when it is:

- connected to a trainer decision,
- understandable for the client,
- safe to collect,
- not excessive,
- repeatable enough to compare,
- report-ready,
- aligned with the current process stage.

A measurement is weak when it is:

- collected because the system can collect it,
- interesting but not actionable,
- likely to increase anxiety,
- too complex for the client,
- disconnected from the report,
- used as motivation pressure.

## Client-facing measurement

The client should not see every internal measurement.

Client-facing measurement should be simple and calming.

It should help the client understand:

- where they started,
- what changed,
- what they can now do,
- what still needs guidance,
- what the next step is.

The client does not need a raw dashboard.

The client needs interpreted meaning.

## Trainer-facing measurement

The trainer may need more detail than the client.

Trainer-facing measurement may include:

- session notes,
- load tolerance,
- RPE,
- HR observations,
- movement quality,
- pain response,
- adherence barriers,
- uncertainty,
- hypothesis changes,
- report flags.

These records exist to support professional judgment.

They should not become client pressure.

## Measurement and privacy

Studio Las handles sensitive operational health data.

Measurement must be minimal, purposeful, and protected.

Do not collect sensitive data unless it supports the process.

Do not expose sensitive data in URLs, logs, notifications, or unnecessary client-facing surfaces.

Do not collect data for future curiosity.

## Anti-measurement

Studio Las measurement must not become:

- biohacking dashboard,
- wearable command center,
- daily scoring system,
- compliance scoreboard,
- client surveillance,
- gamification engine,
- pseudo-medical diagnosis layer.

## Implication for Studio Las OS

Studio Las OS should make it easy to record selected signals.

It should not encourage more tracking by default.

Any new field should pass this test:

1. Who uses this field?
2. What decision can it change?
3. Does the client need to see it?
4. Does it support a report?
5. Is it safe and necessary to store?
6. Could it increase anxiety or screen dependence?

If the field does not pass, it should not be added.
