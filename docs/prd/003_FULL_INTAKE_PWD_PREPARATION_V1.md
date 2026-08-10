# PRD 003 — Full Intake to PWD Preparation v1

- **Status:** BROWSER AUDIT PASS — READY FOR OWNER MERGE DECISION
- **Stage:** 3 — contract and fictional workflow prototype only
- **Base:** `product-recovery@040bce6303c9138ba3b1af6366def54c21bd157c`

## Problem

A detailed intake mixes client goals, health-related statements, preferences, missing information, and conditional topics. Reading it as one long form encourages memory errors and makes it hard to see provenance. Turning it directly into an AI summary creates a different risk: a fluent brief can hide unanswered questions, contradictions, uncertain extraction, or unreviewed test suggestions.

Damian needs one coherent trainer-only preparation surface that reduces searching while preserving exact source wording, uncertainty, and his authority.

## Primary user and job

Damian is the only user of this prototype.

> When a client has completed the adaptive intake, help me prepare the PWD from one traceable brief, so I can decide what still needs clarification and what may be worth observing without treating AI output as truth or a test prescription.

## Success definition

- every meaningful claim points to an exact source/response version;
- missing, declined, not applicable, and not asked remain distinct;
- contradictions remain visible;
- every machine derivative is individually reviewable;
- candidate PWD domains contain purpose, observation, stop criteria, and decision impact;
- Damian explicitly decides whether preparation is ready;
- the path works without AI;
- fictional preparation can be completed in one coherent surface without cross-case leakage.

No conversion metric, diagnostic accuracy, readiness score, or number of approved tests is a success metric.

## In scope

- 26-prompt core contract and four conditional module profiles;
- 15 fictional fixtures;
- immutable fictional submissions and versioned responses;
- deterministic fictional assisted preparation;
- manual preparation fallback;
- reviewed facts, gaps, conflicts, hypotheses, questions, and candidate domains;
- trainer-only brief assembly;
- explicit readiness decision with rationale/evidence;
- version history and invalidation;
- keyboard and 360 px behavior;
- session-only reset.

## Out of scope

- public/client questionnaire UI;
- real client data and contact identity;
- PAR-Q+ reproduction;
- diagnosis, safety clearance, automated qualification, automatic test selection, load/dose prescription;
- AI runtime/provider/model;
- database/schema/SQL/migrations/RLS/storage;
- send, publish, export, booking, analytics, or production;
- actual PWD execution and Stage 4 decision.

## Screens

### 1. Source

- fictional case selector;
- immutable source metadata and warning;
- response list with prompt id, answer state, client authorship, and exact ref;
- conditional module states;
- choice of fictional assisted or manual preparation.

### 2. Review

- sections for facts, gaps/conflicts, coaching hypotheses, PWD questions, and candidate observation domains;
- original source remains visible/read-only;
- each machine item can be approved, edited into a trainer-authored version, or rejected;
- rejected/superseded history remains inspectable;
- malformed or unresolved items block brief assembly.

### 3. Brief

- nine contract sections in one trainer-only view;
- exact source links/refs on every item;
- visible unknowns and non-inference limits;
- no client-safe or send surface;
- deliberate `Assemble new brief version` action.

### 4. Readiness

- three equal-authority radio options, none selected;
- required rationale;
- eligible exact-version evidence selection;
- save creates a versioned `trainer_decision`;
- upstream change invalidates the active brief and decision;
- history remains visible.

## Functional requirements

1. The system enforces the nine-value information vocabulary.
2. The system enforces 26 core prompt identifiers and rejects a `42 questions` assertion.
3. Response states use a closed vocabulary.
4. Conditional modules require explicit activation evidence.
5. Source and response objects remain immutable.
6. Editing creates a new trainer-authored derivative.
7. Review transitions create new versions.
8. Rejected, pending, malformed, flagged, or placeholder derivatives cannot enter the ready brief.
9. Contradictions preserve both exact response refs.
10. Candidate observation domains require four semantic fields.
11. No candidate domain is automatically approved or turned into a performed test.
12. The brief uses nine fixed sections and contains no hidden auto-decision.
13. Readiness options are equal authority and unselected by default.
14. Decision save requires rationale and reviewed evidence.
15. Material upstream change invalidates brief and decision.
16. Manual fallback remains complete.
17. Cross-case references fail closed.
18. Prompt injection remains inert source text.
19. Audit events contain metadata only.
20. The runtime contains no network, persistence, send, publish, booking, or Supabase integration.

## Required fictional cases

Cases `01`–`15` map one-to-one to the architecture acceptance matrix. Cases `01`, `04`, `05`, `10`, `11`, `12`, `13`, `14`, and `15` require end-to-end execution; remaining cases require deliberate review.

## Independent delegated audit

The auditor must use a real browser on desktop and 360 CSS px, complete the required cases, test keyboard-only operation, trigger validation errors, inspect histories, confirm invalidation, and verify no horizontal overflow or external requests.

The result may be `PASS`, `PASS WITH CORRECTIONS`, or `FAIL`. `PASS` is prototype evidence only. Damian retains the merge, schema, provider, real-data, staging, production, and Stage 4 gates.
