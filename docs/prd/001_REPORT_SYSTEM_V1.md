# PRD 001 — Report System v1

## Purpose

Report System v1 defines the first client-safe Studio Las report created after a guided process, especially after the 12-week program.

The report exists to help the trainer show what changed, what patterns appeared, what decisions were made, and what should happen next.

The report is not the product. The trainer-led Studio Las Method is the product. The report is a client-safe synthesis of the process.

## Product principle

The report shows patterns. The trainer gives meaning. Numbers are evidence, not the product.

Core rule:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

Under Constitution v1.1 this is a design heuristic. Report evidence may come from paper-, app-, or hybrid-delivered guidance; trainer review and publication authority remain unchanged.

The report should make the client feel guided, not judged.

## User roles

### Trainer

The trainer owns interpretation, client-safe wording, report approval, and the next decision.

The trainer uses the report to:

- review the process,
- choose meaningful evidence,
- explain patterns,
- decide what should happen next,
- preserve learning for future work.

### Client

The client receives a calm explanation of the process and the next step.

The client should see what became clearer, easier, safer, more stable, or still worth attention.

### Studio Las OS

Studio Las OS may organize selected source material and preserve report-ready signals.

Studio Las OS must not create final meaning, diagnose, judge progress, or release a report without trainer approval.

## When the report is created

Report System v1 focuses on the main 12-week process report.

A report may be prepared when:

- a 12-week process is closing,
- the trainer needs to decide whether to continue, change, reduce, pause, refer, or finish,
- enough source material exists to show patterns without forcing extra data collection.

Short 4-week or 8-week reviews may be considered later, but v1 should not require them.

## Inputs

The report may use selected, trainer-reviewed inputs:

- client starting context,
- stated goals or desired recovery,
- trainer hypotheses,
- session observations,
- selected client signals recorded through paper-, app-, or hybrid-delivered guidance,
- selected measurements that clarify a pattern or decision,
- relevant process changes,
- trainer decisions,
- client-safe milestones,
- final trainer interpretation,
- next-step recommendation.

Not every input must appear in every report. The trainer decides what is relevant.

## Trainer review

Before a report becomes client-facing, the trainer must review:

- whether each included claim is supported by source material,
- whether the pattern is explained in human language,
- whether raw notes or private reasoning should remain trainer-only,
- whether any measurement is useful evidence rather than decoration,
- whether the wording avoids shame, alarm, medical certainty, and overclaiming,
- whether uncertainty is handled honestly,
- whether the report supports a clear next decision.

The report may not cross the client-safe publication boundary until the trainer approves it.

## Client-facing output

The client-facing report should include only client-safe content.

The report may include:

- a short process summary,
- where the client started,
- what the trainer and client were working toward,
- the most relevant patterns observed across the process,
- selected evidence that supports those patterns,
- meaningful changes in function, confidence, tolerance, consistency, or understanding,
- what still needs attention,
- the trainer's next recommendation,
- a simple next-step plan.

The report should be calm, clear, and useful. It should not overwhelm the client with raw data.

## Non-goals

Report System v1 must not become:

- an automatic diagnosis,
- a medical report,
- a fitness dashboard,
- a scorecard,
- a gamified achievement summary,
- a leaderboard,
- a streak or compliance system,
- a fitness-age metric,
- a generic PDF export,
- an AI-generated replacement for trainer judgment.

## Safety and privacy boundaries

The report must protect trainer-only and client-sensitive information.

The client must not see by default:

- raw trainer notes,
- private hypotheses,
- uncertainty notes,
- internal risk reasoning,
- technical identifiers,
- logs,
- implementation metadata,
- raw AI output,
- other clients' data,
- internal business notes.

Measurements may appear only when they help explain a pattern or decision. They must not be framed as a verdict on the client.

The report must not make medical diagnosis claims, treatment claims, or promises of outcomes.

## Functional requirements

Report System v1 must support:

1. Selecting report-relevant source material.
2. Organizing selected material around patterns, not volume.
3. Preserving trainer interpretation separately from raw source material.
4. Marking which content is trainer-only and which is client-safe.
5. Preparing a client-safe working version for trainer review.
6. Requiring trainer approval before release.
7. Showing the final report as a closed process artifact.
8. Supporting a next decision: continue, change focus, reduce support, maintain independently, schedule review, refer, pause, or finish.

## Data requirements

Report System v1 needs only the minimum data required to support a trainer-led report:

- client identity and process context,
- process start and report date,
- selected goals or desired recovery,
- selected observations,
- selected client signals,
- selected measurements,
- selected trainer decisions,
- selected pattern statements,
- trainer-approved client-facing interpretation,
- next recommendation,
- report approval state,
- final released report content.

Data collection must not expand just to fill a report template.

Existing implementation structures should be treated as audit inputs, not as the final schema.

## Out of scope for v1

The following must wait for later PRDs:

- detailed UI screen design,
- database schema design,
- migrations,
- Supabase changes,
- automatic report generation,
- AI-generated conclusions,
- PDF layout rules,
- client self-service report editing,
- scoring models,
- badges, streaks, rankings, or achievements,
- fitness-age or readiness scores,
- wearable data integrations,
- cross-client comparison,
- medical documentation workflows,
- billing, package, or pricing logic,
- public website copy.

## Success criteria

Report System v1 is successful when:

- the trainer can create a client-safe 12-week report without losing ownership of meaning,
- the report shows patterns rather than raw volume,
- the report connects evidence to interpretation,
- the report supports a concrete next decision,
- the client feels guided rather than judged,
- sensitive trainer-only material stays private,
- implementation can proceed later without turning the report into a dashboard or automated judgment system.

## Open questions

1. What is the smallest report format that is useful after a 12-week process?
2. Should v1 include only the 12-week report, or also allow an internal trainer-only draft for earlier reviews?
3. Which existing signals are reliable enough to support v1 report patterns?
4. What exact approval states are needed before implementation?
5. Should released reports be editable, versioned, or immutable after trainer approval?
