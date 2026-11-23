# PRD 004 — PWD Decision Conversation v1

- **Status:** OWNER ACCEPTED AND MERGED — FICTITIOUS PROTOTYPE CONTRACT ONLY
- **Stage:** 4A
- **Task ID:** `conduct_pwd_and_record_trainer_decision`
- **Contract version:** `stage4-v1`
- **User:** Damian, trainer and decision owner
- **Runtime authorization:** none
- **Owner acceptance and merge date:** 2026-08-16
- **Accepted head:** `ad101c87e4eca13ce18517ec9cc8b9277392756b`
- **Accepted tree:** `41747abd450c60e6f9a2b8c85fb41dae04a1efca`
- **Merge commit:** `149fb9538a2491bed5cbf71c6885fe789247d541`
- **Pull request:** PR #25
- **Independent audit / regression:** `0 P0 / 0 P1`; `52/52 PASS`

## Job to be done

When Damian conducts a First Diagnostic Visit, help him keep exact source context, selected observations, the client's reaction, his interpretation, conversation preparation, and the final decision distinct so he can have a calm professional conversation and record what happens next without diagnosis or sales pressure.

## Preconditions

- one active pseudonymous fictional case;
- one exact current Stage 3 `READY_TO_PREPARE_PWD` handoff;
- all data supplied by bundled fictional fixtures;
- no real source file or client identity;
- no network or persistence.

## Functional requirements

### FR-01 — Exact handoff

The workspace displays the current handoff version and lineage. A foreign or inactive handoff is rejected.

### FR-02 — Optional Tanita

A fixture may contain no Tanita package. When present, Damian explicitly chooses `comparable`, `not_comparable`, or `unknown` and records why. No option is selected automatically.
A Tanita fact is valid decision evidence only with an active interpretation that names the exact current fictional package, fact versions, and workspace. Not using Tanita never blocks the workflow.

### FR-03 — Selected observation

Damian explicitly selects a candidate from the handoff and records `performed`, `skipped`, or `stopped`. The prototype does not define a canonical catalogue or select a candidate automatically.

### FR-04 — Information separation

Trainer observation, client reaction, trainer interpretation, and trainer decision are separate objects and separate controls. The UI may not merge their authorship or meaning.

### FR-05 — Conversation modes

Damian explicitly selects assisted or manual mode. Assisted mode creates deterministic simulated suggestions marked `needs_review`; manual mode creates none. Both reach the decision step.
Each preparation is a new versioned run. Re-preparing preserves prior runs and all suggestion/review versions instead of replacing arrays or identities.

### FR-06 — Suggestion review

Every simulated suggestion requires approve, edit, or reject. Editing creates a Damian-authored version. Pending suggestions block completion of the conversation review, not the manual workflow.
The pure domain decision command rejects an active pending suggestion even if UI controls are bypassed or incorrectly enabled.

### FR-07 — Explicit decision

The four decisions are equal and unselected. Saving requires a rationale and exact current evidence. The application never calls a decision function without Damian's submitted value.
Repeated saves append decision versions with `supersedes`; prior content and `derived_from` remain immutable and resolvable. Trainer interpretation follows the same append-only correction rule.

### FR-08 — Conditional start

`START_CONDITIONAL` requires at least one Damian-authored condition. Each condition requires text and a verification method. The system does not propose conditions.

### FR-09 — Follow-up draft

Damian may create a trainer-only unpublished draft after saving a decision. The prototype has no send or publication mechanism.
The draft permanently names the exact decision version used at creation; a later correction cannot reinterpret its origin as the new version.

### FR-10 — Invalidation

A simulated material handoff change invalidates the active workspace and decision, retains all versions in history, and requires a new workspace before another decision.
The old handoff is rejected. The replacement workspace can be created only from the exact new active handoff and preserves the invalidation chain.

### FR-11 — Isolation and untrusted text

Cross-case references fail before mutation. Prompt-injection-like source text is rendered as inert text and cannot change instructions.

## Non-functional requirements

- Polish trainer-facing interface;
- desktop and exact 360 × 900 CSS px without horizontal page overflow;
- complete keyboard operation, visible focus, understandable errors and empty states;
- minimum practical touch target of 44 CSS px;
- semantic headings, fieldsets, legends, labels, status and alert regions;
- deterministic fixture reset;
- no external requests, cookies, localStorage, sessionStorage, IndexedDB, or service worker;
- small modules and a testable pure domain layer.

## Fictional cases

| ID | Purpose |
| --- | --- |
| `fictional-01` | complete evidence with comparable Tanita |
| `fictional-02` | conditional-start conversation and unknown comparability |
| `fictional-03` | defer/consult with no Tanita |
| `fictional-04` | need outside current Studio Las scope |
| `fictional-05` | skipped and stopped observations with not-comparable Tanita |
| `fictional-06` | full manual path without AI |
| `fictional-07` | prompt-injection-like client statement remains inert |
| `fictional-08` | cross-case reference rejection |
| `fictional-09` | material handoff change invalidates downstream state |

Cases do not encode an expected automatic decision. Their purpose labels help an auditor reach each contract branch; Damian still selects every decision.

## Acceptance tests

1. The decision list is exactly four values and has no checked/default value.
2. Each decision saves only after explicit input, rationale, and exact evidence.
3. `START_CONDITIONAL` rejects missing or unverifiable conditions.
4. Tanita is optional; all three comparability values require Damian's action.
5. Observation execution supports performed, skipped, and stopped without fabricated results.
6. Observation, reaction, interpretation, and decision retain distinct information types and authors.
7. Assisted suggestions begin `needs_review`; approve/edit/reject append history.
8. Manual mode creates zero AI objects and remains complete.
9. Foreign references leave target state byte-for-byte unchanged.
10. Source text resembling instructions is not executed.
11. A handoff change invalidates the active workspace and decision while retaining previous versions.
12. Follow-up remains trainer-only, unpublished, and technically unsendable.
13. Static checks find no network, persistence, runtime integration, send, publish, price, payment, or booking behavior.
14. Real-browser desktop and 360 × 900 checks pass with keyboard and visible focus.
15. Independent read-only audit of the exact commit/tree finds zero P0/P1.
16. Interpretation and decision v1/v2 keep distinct content, exact references, `superseded` and `supersedes` lineage.
17. A follow-up from decision v1 still names v1 after decision v2 is saved.
18. Re-preparing the conversation creates a new run without removing earlier suggestion or review history.
19. Domain decision save rejects any active `needs_review` suggestion.
20. Tanita facts without the exact active package comparability interpretation are rejected; no-Tanita remains valid.
21. After a handoff v1→v2 change, v1 is rejected and the replacement workspace derives exactly from v2.
22. Same-length manual notes receive distinct deterministic identities, nested lineage is immutable, and screen transitions move focus to the active heading.

## Forbidden scope

Real data, real AI, PDF upload/parser/OCR, network, persistence, Supabase, Auth, MFA, RLS, Storage, Edge Functions, schema, SQL, migrations, staging, production, deployment, sending, publication, pricing, payment, booking, automatic diagnosis, automatic qualification, automatic test choice, PR #18 code, and PR #18 as a base.

## Definition of Done for the audited Draft — historical gate

- documents and prototype agree on `stage4-v1`;
- tests and browser checks pass on one exact head/tree;
- all fixtures are fictional and pseudonymous;
- the diff contains only the approved files;
- the PR remained Draft through the independent audit;
- the README records validation and the independent-audit procedure;
- merge required a later, separate Damian decision.

## Governance closure

On 2026-08-16 Damian accepted Stage 4A as `OWNER ACCEPTED AND MERGED — FICTITIOUS PROTOTYPE CONTRACT ONLY`. The independent audit of exact accepted head `ad101c87e4eca13ce18517ec9cc8b9277392756b` and tree `41747abd450c60e6f9a2b8c85fb41dae04a1efca` reported `0 P0 / 0 P1`; Stage 4A reached `52/52 PASS`; PR #25 merged as commit `149fb9538a2491bed5cbf71c6885fe789247d541`.

This Stage 4A closure did not by itself authorize runtime or another stage. The later read-only Stage 4 Completion Gate on 2026-08-16 mapped every Stage 4 roadmap requirement and the exit gate to the accepted prototype evidence and found no remaining product-contract gap. The earlier phrase `Tanita PDF ingestion` is resolved by the canonical Stage 8 rule: approved document-ingestion automation and Tanita import-reliability evaluation occur only after manual flows work. Stage 4 is therefore `OWNER ACCEPTED, MERGED AND CLOSED — BOUNDED FICTIONAL PROTOTYPE CONTRACT ONLY`; Stage 4A remains its delivery-slice and evidence name, and no Stage 4B is required.

This decision does not authorize runtime, real AI, real Tanita ingestion, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, real data, staging, production, deployment, publication, integration with `main`, or Stage 5. Starting Stage 5 requires a separate explicit owner decision.

## P1 re-audit contract addendum

### FR-12 — Canonical session authority

An immutable session aggregate resolves every exact reference and current lineage tip. Domain functions reject absent, conflicting, stale, detached, cross-case, or wrong-role records even when the caller supplies `status: active`.

### FR-13 — Exact conversation run completeness

A decision names one exact active run. Its supplied record set must equal the complete current set resolved from the aggregate. Empty or incomplete assisted sets, missing expected suggestions, pending review, and no active run reject. A real manual run with zero AI records passes. Manual options name one exact run, and a new run invalidates prior-run options plus dependent active decision/follow-up without deleting history.

### FR-14 — Continuous handoff, workspace, and Tanita lineage

A later handoff requires the exact invalidated predecessor workspace and the replacement records `supersedes`. Preserved stale-active handoff objects and disconnected chains reject. Tanita package source and facts are bound to the exact current handoff/workspace; v1 material rejects in a v2-derived workspace at comparability and decision save.

### FR-15 — Explicit client source review

Client `source_fact` begins `needs_review`. Damian explicitly approves or rejects the exact version. Only the exact approved version may enter an interpretation or decision directly or transitively; no capture path auto-approves it.

### Required regressions

- empty or partial assisted `conversationRecords` rejects;
- no active run rejects and genuine zero-AI manual run passes;
- run 1 manual options are not active in run 2;
- a new run invalidates dependent active decision/follow-up;
- preserved handoff v1 and handoff v2 without predecessor reject;
- v1 Tanita package/fact rejects in the v2 workspace;
- unreviewed client `source_fact` rejects and its exact Damian-approved version passes.
