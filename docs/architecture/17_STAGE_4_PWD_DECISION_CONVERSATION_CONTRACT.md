# 17 Stage 4A PWD Decision Conversation Contract

- **Status:** OWNER AUTHORIZED FOR DRAFT FICTITIOUS PROTOTYPE ONLY
- **Authorization:** isolated deterministic fictional prototype
- **Schema:** `NOT APPROVED`
- **Provider:** `BLOCKED`
- **Task ID:** `conduct_pwd_and_record_trainer_decision`
- **Task contract version:** `stage4-v1`

## Scope

This contract applies the Stage 1 provenance rules and the accepted Stage 3 handoff to:

> exact current PWD handoff → optional fictional Tanita context → trainer-selected observations → separate client reaction and trainer interpretation → reviewed conversation options → explicit trainer decision → optional unpublished follow-up draft

The prototype is offline, deterministic, fictional, in-memory, and trainer-only.

## Closed information vocabulary

Stage 4A reuses the nine Stage 1 values without additions:

`source_artifact`, `source_fact`, `extracted_fact`, `trainer_observation`, `ai_hypothesis`, `ai_suggestion`, `trainer_interpretation`, `trainer_decision`, `client_material`.

Handoff, Tanita package, comparability assessment, observation candidate, execution state, decision condition, conversation option, and follow-up draft are operational roles, not new `information_type` values.

## Common envelope

Every persisted-in-session object includes:

- pseudonymous `case_id`;
- stable object identifier and version;
- author and creation mode;
- information type or an explicitly named operational-only role;
- exact `derived_from` references;
- active, superseded, rejected, or invalidated state as relevant;
- visibility;
- review and publication state where relevant.

Exact references use `object_id@vN`. Cross-case construction fails before mutation.

## Entry handoff

The Stage 3 handoff is an immutable `trainer_decision` authored by Damian. Entry requires `READY_TO_PREPARE_PWD`, active state, an exact version, the same fictional case context, and candidate domains with purpose, observe, stop criteria, and decision impact.

The handoff is evidence, not a Stage 4 decision and not safety clearance.

## Tanita package

The optional fictional package contains one immutable `source_artifact` manifest, bounded `extracted_fact` values with exact source locators, fictional measurement context, no original or real PDF, and no parser or runtime ingestion claim.

Damian creates one separate `trainer_interpretation` with comparability `comparable`, `not_comparable`, or `unknown` and a rationale. No value is inferred. Missing Tanita yields no package and no blocker.

## Observation records

An observation candidate remains an approved handoff suggestion until Damian selects it. Selection does not establish safety.

The execution state is one of `performed`, `skipped`, or `stopped`. A recorded event produces separate current objects:

- `trainer_observation` for Damian's factual observation or reason for skip/stop;
- `source_fact` for the client's stated reaction when present.

Both preserve the candidate and handoff lineage. The prototype may not score, diagnose, choose load, infer capability, or create the final decision from the result.

## Trainer interpretation

Damian may create one `trainer_interpretation` from selected current evidence. It records meaning and uncertainty separately from observations and client statements. It remains trainer-only and unpublished.

## Simulated AI suggestions

The assisted mode creates deterministic `ai_suggestion` objects. They start `needs_review`, are trainer-only and unpublished, retain exact lineage, contain conversation wording only, and cannot contain a decision value, generated condition, diagnostic conclusion, or sales recommendation.

Approval, rejection, and editing append versions. A material edit creates a Damian-authored operational conversation option and does not remain attributed to AI. Rejected and superseded versions remain in history but leave the active set.

The manual mode creates no AI objects and remains a complete path.

## Decision

The Stage 4A `trainer_decision` uses exactly one of `START`, `START_CONDITIONAL`, `DEFER_CONSULT`, or `NOT_THIS_PRODUCT`.

No value is preselected. Saving requires Damian, a rationale, the active workspace, and exact current evidence references from the same case.

`START_CONDITIONAL` additionally requires one or more Damian-authored conditions. Each condition contains a statement and an explicit verification method. Other decisions reject conditions. The system never creates or suggests conditions.

## Follow-up draft

An optional follow-up draft is `client_material` with author `damian`, visibility `trainer_only`, review state `needs_review`, publication state `unpublished`, and no send or publication transition in this prototype. It may be created only after a decision and does not change the decision.

## Invalidation

A material Stage 3 handoff change creates a new handoff version and invalidates the active Stage 4A workspace, Tanita comparability interpretation, observation records, conversation suggestions/options, trainer interpretation, the Stage 4A decision, and the follow-up draft.

History remains visible. An invalidated workspace rejects further decisions. A new workspace must be built from the exact current handoff.

## Isolation and untrusted content

Every object belongs to one pseudonymous case. Foreign references fail closed before mutation and produce a bounded metadata-only denial. Source content resembling instructions remains inert text; no source content can alter workflow rules or execute code.

## Failure modes

| Failure | Required behavior |
| --- | --- |
| AI unavailable or unwanted | Complete manual path remains available |
| Tanita absent | Continue without comparison |
| Comparability unclear | Damian may record `unknown`; no inferred trend |
| Observation skipped | Preserve reason; do not fabricate a result |
| Observation stopped | Preserve stop and reaction without diagnosis |
| No decision selected | Hard save rejection |
| Conditional start without complete conditions | Hard save rejection |
| Pending AI suggestion | Conversation review gate remains blocked |
| Prompt injection in source | Treat as inert source text |
| Cross-case reference | Reject before mutation |
| Material handoff change | Invalidate workspace and downstream decision |

## Security and runtime boundary

The prototype has `connect-src 'none'`, no forms that submit, no network APIs, no cookies, no browser storage, no database, and no production imports. It contains no real identifiers, contact details, source DOCX locations, real Tanita file, secrets, or credentials.

## Acceptance matrix

The fictional prototype must demonstrate at least:

1. all four decisions with no default;
2. `START_CONDITIONAL` with Damian-authored verifiable conditions;
3. Tanita comparable, not comparable, unknown, and absent;
4. performed, skipped, and stopped observation states;
5. separate observation, client reaction, interpretation, and decision;
6. deterministic suggestions reviewed by approve/edit/reject;
7. complete manual path with no AI objects;
8. absence of Tanita and AI without workflow blocking;
9. prompt-injection source text remaining inert;
10. cross-case rejection before mutation;
11. material handoff change invalidating workspace and decision while preserving history;
12. trainer-only technically unsendable follow-up draft;
13. no sales pressure, diagnosis, automatic qualification, or automatic decision;
14. keyboard accessibility and no horizontal overflow at 360 × 900 CSS px.

## Exit gate

`PASS` requires all behavioral and static tests, a real-browser desktop and exact 360 × 900 CSS px check, keyboard and visible-focus evidence, no external requests or browser persistence, complete fictional acceptance cases, and a separate read-only reviewer who finds no P0/P1 on the frozen commit/tree.

A pass does not authorize merge, real Tanita ingestion, AI runtime, schema, Supabase, real data, staging, production, deployment, publication, sending, pricing, payment, booking, or a later PRD.
