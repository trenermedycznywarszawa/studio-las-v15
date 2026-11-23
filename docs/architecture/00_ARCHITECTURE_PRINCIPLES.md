# 00 Architecture Principles

## Purpose

This document defines the architecture principles for Studio Las OS.

Architecture is the translation layer between Studio Las Method and implementation.

It exists to prevent the project from jumping directly from product ideas into screens, tables, or code.

## Core architecture statement

Studio Las OS must support the trainer-led method without becoming the method.

The OS is not the product.

The OS is not the coach.

The OS is not the report's meaning.

The OS is a purposeful support system that may present trainer-approved guidance, preserve selected signals, protect continuity, prepare the trainer, and help reveal patterns.

## Authority

This architecture is subordinate to:

1. Constitution
2. Product
3. Architecture
4. PRD
5. Implementation
6. Code

If an architectural decision conflicts with Product, Product wins.

If an architectural decision conflicts with Constitution, Constitution wins.

## Product design heuristic

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

Architecture must preserve the intent, not a mandatory order of interfaces. Paper, the app, or a deliberate hybrid may carry guidance. The trainer remains accountable for meaning and publication.

## Principle 1 — Trainer decision first

Every OS capability must begin with a trainer decision.

Do not ask first:

- what screen should we build,
- what table should we create,
- what feature would be useful,
- what can Supabase store,
- what can AI generate.

Ask first:

> What decision does the trainer need to make better?

If there is no trainer decision, the feature is not ready.

## Principle 2 — Minimum signal

After identifying the trainer decision, define the smallest signal required.

A signal may be:

- client completed / did not complete something,
- pain response,
- confidence response,
- trainer observation,
- RPE,
- session note,
- selected measurement,
- report-relevant change.

The system should record the smallest useful signal, not the largest possible dataset.

## Principle 3 — Correct surface before implementation

Before building, decide where the information belongs:

- paper,
- conversation,
- app guidance,
- app record,
- trainer-only note,
- client-safe summary,
- report.

Many things should not be in the app.

Some things should stay in conversation.

Some things should stay trainer-only.

Some things should exist only in the final report.

## Principle 4 — Deliberate channel selection

Architecture must support paper, app, or hybrid guidance without making any channel universal.

Each task needs one authoritative instruction source. A hybrid must give the secondary channel a distinct role and a safe way to retire stale instructions.

Channel choice belongs to Product and the trainer workflow, not to database convenience.

## Principle 5 — App as purposeful tool, not engagement engine

The app may present current trainer-approved guidance, support a checklist, record task-specific results, collect questions, and prepare context for the trainer.

It should not become:

- a feed,
- a daily dashboard,
- a motivation engine,
- a habit tracker,
- a compliance scoreboard,
- a source of automated meaning.

The app may guide and record. The trainer approves the guidance and gives meaning.

## Principle 6 — Reports drive useful data

Data should be collected because it helps trainer decisions and future reports.

Do not collect fields because they are interesting.

Do not collect fields because they may be useful someday.

Do not collect fields because dashboards expect them.

If a field cannot support a report pattern or decision, it should not be added.

## Principle 7 — Client-safe by design

Client-facing surfaces must be intentionally safe.

The client may see:

- assigned instructions,
- short client-safe summaries,
- published reports,
- simple signals they are asked to record,
- calm explanations.

The client should not see by default:

- full trainer notes,
- private hypotheses,
- raw risk notes,
- internal decision logic,
- unpublished reports,
- other clients' data,
- technical identifiers,
- raw logs.

Client visibility must be explicit, not accidental.

## Principle 8 — Trainer workspace is the center of meaning

The trainer workspace should help the trainer:

- remember context,
- compare signals over time,
- review hypotheses,
- adjust guidance,
- prepare reports,
- make the next decision.

It should not overwhelm the trainer during real 1:1 work.

More data is not automatically better.

## Principle 9 — Reuse before new schema

The current OS already contains structures for clients, sessions, home plans, guidance events, measurements, and reports.

Before adding new tables, architecture must prove that existing structures are insufficient.

Default direction:

- reuse existing concepts,
- extend carefully only when justified,
- avoid parallel systems,
- avoid database-first design.

## Principle 10 — Boring first version

The first implementation of any architectural area should be smaller than expected.

A good first version should feel almost boring:

- one clear trainer decision,
- one minimal signal,
- one safe recording path,
- one trainer review path,
- one report implication.

If a feature feels impressive, it is probably too large.

## Principle 11 — No hidden automation of judgment

Automation may assist organization.

Automation must not replace interpretation.

AI may support trainer analysis, summarization, option generation, and drafting, but:

- trainer owns final meaning,
- AI remains trainer-facing,
- client does not receive an AI coach,
- AI does not make medical conclusions,
- AI does not decide progression automatically,
- AI separates source facts from hypotheses and suggestions,
- AI cannot publish or contact the client without an explicit trainer-approved workflow.

## Principle 12 — Small reversible changes

Architecture should lead to small, reversible implementation steps.

Avoid:

- broad refactors,
- framework migration,
- auth changes,
- Supabase config changes,
- public site layout changes,
- production data changes,
- migrations without architecture approval.

## Architecture decision checklist

Before approving architecture, answer:

1. Which Constitution rule governs this decision?
2. Which Product document governs this decision?
3. What trainer decision does this support?
4. What is the minimum signal?
5. Where does the signal belong?
6. Which channel is primary, and why is it right for this client and task?
7. What should remain trainer-only?
8. What may be client-facing?
9. How will this support a future report?
10. What existing structure can we reuse?
11. What must not be built?
12. What is the smallest safe first version?

## Final principle

Architecture must make Studio Las OS quieter, not louder.

The best architecture protects the method from feature chaos.
