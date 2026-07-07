# 04 Client-Safe Surfaces

## Purpose

This document defines which information may be shown to the client in Studio Las OS and which information must remain trainer-only.

It protects the client from confusion, anxiety, shame, overinterpretation, and accidental exposure of private trainer reasoning.

It also protects Studio Las from turning the client interface into a dashboard, diagnosis tool, habit tracker, or self-monitoring system.

## Core principle

Client-facing does not mean raw.

Client-facing means intentionally rewritten, safe, calm, and useful.

The client should see what helps them act with more clarity and trust.

The client should not see everything the trainer knows, thinks, questions, or records.

## Authority

This document is subordinate to:

1. `docs/constitution/README.md`
2. `docs/product/README.md`
3. `docs/product/00_PRODUCT_MODEL.md`
4. `docs/product/01_CLIENT_JOURNEY.md`
5. `docs/product/02_STUDIO_LAS_METHOD.md`
6. `docs/product/06_HOME_GUIDANCE_SYSTEM.md`
7. `docs/architecture/00_ARCHITECTURE_PRINCIPLES.md`
8. `docs/architecture/03_ARCHITECTURAL_OBJECTS.md`

## Client-safe definition

A surface is client-safe when it is:

- intentionally written for the client,
- calm,
- understandable,
- non-shaming,
- non-diagnostic unless legally/clinically appropriate,
- free from internal trainer reasoning,
- free from raw risk notes,
- free from technical identifiers,
- useful for action or understanding,
- aligned with the current stage of the process.

A surface is not client-safe just because the client can technically access it.

## Client-safe information categories

The client may see:

1. Assigned guidance  
   What to do, when to do it, what to notice, and when to stop or reduce.

2. Client-safe summaries  
   Short explanations written or approved by the trainer.

3. Published reports  
   Final or intentionally shared report content.

4. Selected process status  
   Simple orientation such as current focus, next review, or next step.

5. Their own short signals  
   Only when showing them does not create tracking pressure.

6. Materials intentionally assigned by the trainer  
   PDFs, instructions, or educational notes prepared for the client.

7. Access state experience  
   The client may know whether they currently have access, but should not see internal access logic.

## Trainer-only information categories

The following must be trainer-only by default:

- full trainer notes,
- private hypotheses,
- internal risk notes,
- raw intake flags,
- private decision logic,
- uncertainty notes,
- draft reports,
- raw logs,
- technical identifiers,
- implementation metadata,
- other clients' information,
- hidden data quality notes,
- AI draft output before trainer review,
- internal pricing or business notes.

Trainer-only means not visible in client UI, client-safe views, downloadable client materials, URLs, logs, or shared screenshots.

## Surface types

## 1. Paper guide

### Role

The paper guide carries the morning.

It tells the client what to do offline.

### Client may see

- protocol name,
- purpose,
- simple instructions,
- time estimate,
- stop criteria,
- what to notice,
- when to record a short signal later.

### Client must not see

- trainer's private hypothesis,
- internal risk reasoning,
- all possible protocol alternatives,
- scoring logic,
- pressure language.

### Architecture rule

Paper must work without the app.

The paper guide is not a dashboard printed on paper.

## 2. Client app view

### Role

The app records the signal and gives simple orientation.

It does not guide the morning ritual.

### Client may see

- today's assigned guidance summary,
- minimal signal entry,
- simple process orientation,
- client-safe summaries,
- assigned materials,
- published reports.

### Client must not see

- raw trainer notes,
- hypothesis details,
- risk flags,
- internal scoring,
- compliance rankings,
- automated interpretation,
- other client data.

### Architecture rule

The client app view should be quiet and narrow.

It should not invite exploration, comparison, optimization, or self-diagnosis.

## 3. Client signal entry

### Role

A short recording surface after offline action.

### Client may see

- one clear question,
- one selected signal when needed,
- one optional note,
- save confirmation.

### Client must not see

- streaks,
- points,
- red warnings,
- compliance score,
- comparison with previous days unless trainer-approved,
- automated meaning.

### Architecture rule

Signal entry should take less than one minute.

The signal is for trainer interpretation, not client self-scoring.

## 4. Client-safe summary

### Role

A short explanation written for the client.

### Client may see

- what matters now,
- what to focus on,
- what changed,
- what to avoid for now,
- what the next step is.

### Client must not see

- raw internal reasoning,
- speculative hypotheses,
- alarming wording,
- medical certainty beyond scope,
- hidden concerns not yet discussed.

### Architecture rule

A summary is client-safe only after trainer intention.

Do not auto-convert trainer notes into client summaries.

## 5. Published report

### Role

The report shows the pattern and supports the next decision.

### Client may see

- starting point,
- process summary,
- meaningful changes,
- selected measurements with interpretation,
- client-safe pattern explanation,
- remaining limits,
- next decision,
- trainer note.

### Client must not see

- raw data dumps,
- draft notes,
- internal uncertainty not prepared for discussion,
- AI-generated verdicts,
- diagnostic claims outside scope,
- private trainer-only rationale.

### Architecture rule

A report is published intentionally.

Draft report content is trainer-only.

## 6. Trainer workspace

### Role

The trainer workspace is not client-safe by default.

It exists to support interpretation, memory, and decisions.

### Client may see

Nothing from the trainer workspace unless explicitly converted into a client-safe surface.

### Client must not see

- trainer notes,
- hypotheses,
- internal decisions,
- report drafts,
- technical or sync metadata,
- raw observation timelines.

### Architecture rule

Do not reuse trainer workspace components directly in the client view.

Client-safe surfaces require a separate visibility decision.

## Client-safe transformation

Some information can move from trainer-only to client-safe only through transformation.

Example:

Trainer-only:

> Client avoids loaded knee flexion. Fear response is probably limiting exposure more than tissue capacity. Need gradual exposure, no aggressive load yet.

Client-safe:

> This week we will keep the knee work calm and gradual. The goal is to rebuild trust in the movement before increasing difficulty.

The transformation removes:

- private hypothesis language,
- diagnostic implication,
- excessive certainty,
- internal reasoning.

It preserves:

- useful direction,
- safety,
- clarity,
- next action.

## Visibility decision matrix

| Information type | Trainer-only | Client-safe possible | Client default |
| --- | --- | --- | --- |
| Trainer hypothesis | yes | yes, rewritten | no |
| Raw trainer notes | yes | rarely, rewritten | no |
| Risk notes | yes | only if clinically/ethically appropriate | no |
| Assigned guidance | rationale yes | yes | yes |
| Client signal | yes | limited | sometimes |
| Measurements | yes | yes, interpreted | not raw by default |
| Report draft | yes | after publication | no |
| Published report | no | yes | yes |
| Technical metadata | yes | no | no |
| Access state | yes | limited | experiential only |

## Client-safe copy rules

Use language that is:

- calm,
- simple,
- specific,
- human,
- non-shaming,
- action-oriented,
- uncertainty-aware,
- free from hype.

Avoid:

- "score",
- "failure",
- "bad result",
- "diagnosis",
- "AI recommends",
- "you must",
- "you broke the streak",
- "optimize",
- "compliance",
- "warning" unless genuinely necessary for safety.

## Data access implications

Client-safe surfaces require explicit data boundaries.

Future implementation must ensure:

- client-safe views do not include trainer-only fields,
- raw trainer notes are never reused in client components,
- report drafts are not visible before publication,
- other clients' records are impossible to access,
- sensitive data is not exposed in URLs, logs, or browser globals,
- client access is revoked when cooperation ends.

## Architecture implications

Any future feature must define:

1. Is this trainer-only, client-safe, or shared operational information?
2. Who writes it?
3. Who approves it for client visibility?
4. Can it create anxiety if shown raw?
5. Can it be misunderstood as diagnosis?
6. Can it create compliance pressure?
7. Does the client need it now?
8. Can it remain in conversation or paper instead?

If visibility is unclear, default to trainer-only.

## Anti-patterns

Do not build:

- shared raw note fields,
- client dashboards full of numbers,
- automatic client summaries from trainer notes,
- AI-generated advice shown to clients,
- compliance charts,
- streak views,
- red warning-heavy status screens,
- client-visible internal hypotheses,
- client-visible risk flags without trainer mediation,
- generic wellness self-monitoring panels.

## Final rule

Client-safe is not a permission flag.

Client-safe is an editorial and architectural decision.

The client should see less than the trainer, but what they see should be clearer, calmer, and more useful.
