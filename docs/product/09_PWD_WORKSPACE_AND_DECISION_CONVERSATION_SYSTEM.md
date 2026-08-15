# 09 PWD Workspace and Decision Conversation System

- **Status:** OWNER AUTHORIZED FOR DRAFT FICTITIOUS PROTOTYPE ONLY
- **Owner:** Damian
- **Stage:** 4A
- **Task:** `conduct_pwd_and_record_trainer_decision`
- **Contract version:** `stage4-v1`

## Purpose

The First Diagnostic Visit (PWD) workspace helps Damian conduct one careful professional conversation and record one explicit next decision. It is not a diagnostic engine, qualification score, sales funnel, medical record, canonical test catalogue, or automated offer recommender.

The product flow is:

> current Stage 3 handoff → selected PWD evidence → observation and client reaction → trainer interpretation → optional conversation support → Damian's decision → optional trainer-only follow-up draft

The workspace reduces searching and accidental conflation. It does not replace Damian's conversation, observation, professional responsibility, or judgement.

## Entry contract

Stage 4A accepts one current, exact-version Stage 3 handoff. The handoff must belong to the same fictional case, remain active, and carry Damian's `READY_TO_PREPARE_PWD` decision. A material handoff change invalidates the active workspace and downstream decision while preserving history.
After handoff v1 is superseded by v2, v1 cannot create a workspace. The replacement workspace must derive from exact active v2 and preserve the visible invalidation lineage.

The prototype does not claim that every real PWD must begin from an application workflow. It demonstrates the information and decision boundary only.

## One PWD context

The workspace may combine:

1. reviewed interview facts, gaps, conflicts, questions, and candidate observation domains from the Stage 3 handoff;
2. an optional pre-prepared fictional Tanita package;
3. a small fictional set of observation candidates selected explicitly by Damian;
4. performed, skipped, and stopped observation states;
5. client reaction as a source statement separate from trainer observation;
6. Damian's interpretation and uncertainty;
7. deterministic simulated conversation options or a complete manual alternative;
8. one explicit decision and rationale;
9. an optional unpublished trainer-only follow-up draft.

## Tanita boundary

Tanita is optional and must earn its place by supporting the current decision. Its absence does not block the workflow.

For a provided fictional package Damian explicitly records one of:

- `comparable` — the visible fictional context is sufficient for the intended comparison;
- `not_comparable` — the comparison should not be used as equivalent evidence;
- `unknown` — comparability cannot currently be established.

No value is inferred or preselected. The prototype does not upload, parse, OCR, quarantine, store, interpret, diagnose from, or publish a PDF. It uses a pre-prepared fictional package only.
Visible Tanita facts do not become decision evidence by themselves: Damian's active comparability interpretation must refer to the exact current fictional package and fact versions. The workflow remains complete when Tanita is unused.

## Observation boundary

Stage 4A does not establish a canonical catalogue of functional tests. A fixture contains a small set of candidate observation domains handed off from Stage 3. Damian chooses whether to use each candidate.

The execution states are `performed`, `skipped`, and `stopped`.

A recorded observation states what Damian noticed. A client reaction states what the fictional client communicated. Trainer interpretation remains a separate object. No observation or result establishes diagnosis, medical clearance, or automatic eligibility.

## Conversation support

The assisted path contains deterministic fictional `ai_suggestion` records. Every suggestion starts `needs_review` and requires `approve`, `edit`, or `reject`. Suggestions may help Damian phrase a question, explain uncertainty, or prepare a calm conversation. They may not generate a decision, generate start conditions, select a default result, diagnose, or pressure a sale.

The full manual path works with no AI suggestions at all. Damian may write his own conversation notes and proceed.
Every preparation is a separate versioned run. Re-preparing never deletes earlier suggestions or reviews; it closes active records from the prior run and creates distinct identities for the new run. The decision gate is enforced by pure domain logic, not only by UI disabled state.


## Decision contract

The four values are equal and unselected by default:

- `START` — Studio Las is an appropriate direction and no named condition remains that blocks starting;
- `START_CONDITIONAL` — the direction is accepted, but starting is blocked until every recorded condition is explicitly and verifiably satisfied;
- `DEFER_CONSULT` — no start decision has been made; additional information, time, or consultation comes first;
- `NOT_THIS_PRODUCT` — the client's current need does not match the Studio Las method or scope.

Only Damian creates the decision, rationale, evidence selection, and any `START_CONDITIONAL` conditions. Conditions require both a statement and a verification method. The system never proposes them.
Corrections to trainer interpretation and decision are append-only. Prior versions remain readable with their original immutable `derived_from`; dependent active records are explicitly invalidated when their exact source version changes.


## Follow-up boundary

When an immediate start decision is inappropriate, Damian may prepare a draft for later use. It remains trainer-only, `draft`, `unpublished`, not sendable by the prototype, and separate from the trainer decision and private reasoning.

A follow-up draft permanently derives from the exact decision version used to create it. Correcting the decision cannot retarget an existing draft.

No send, publish, email, SMS, booking, payment, or client-portal action exists.

## Product boundaries

Stage 4A does not authorize real client or Tanita data; upload, OCR, parsing, malware processing, Storage, or retention decisions; an AI provider or runtime; network or persistence; Supabase, schema, SQL, migrations, Auth, MFA, RLS, Edge Functions, staging, production, deployment, publication, sending, pricing, payment, booking, automatic diagnosis, qualification, test selection, or decision; or PR #18 as a base or product truth.

## Stage 4A exit gate

On fictional cases Damian can review one exact Stage 3 handoff, work with or without Tanita, record selected observation outcomes without conflating information types, complete the workflow without AI, review every simulated AI suggestion, and save one explicit evidence-backed decision with no default or automatic recommendation.

The interface supports a calm professional conversation, does not pressure a sale, does not turn measurements or tests into diagnosis, works at desktop and 360 × 900 CSS px with keyboard and visible focus, and passes an independent read-only audit with no P0/P1.

Passing this gate does not close the full Stage 4 ingestion/runtime problem and does not authorize merge, real ingestion, runtime, schema, real data, staging, production, or deployment.

## Canonical session safeguards

The immutable session aggregate, rather than a caller-supplied status field, determines current exact references and lineage tips. A later handoff requires the exact invalidated workspace predecessor and records `supersedes`; preserved stale objects and disconnected chains fail closed.
The package source is bound to the exact current handoff and workspace. Earlier package/fact versions fail closed after a v1→v2 handoff transition.
A client reaction is a `source_fact needs_review`. Damian explicitly reviews its exact version; no automatic approval occurs. An unreviewed source fact cannot reach an interpretation or decision directly or through another record.
Every manual option belongs to one exact run. Starting a new run closes prior-run options and invalidates its active dependent decision/follow-up while keeping their lineage visible.
Decision save resolves the complete record set for the exact active run from the aggregate. Empty or partial assisted sets, pending suggestions, and missing runs reject; a genuine zero-AI manual run passes.
