# 10 Information Provenance and Approval Contract

**Status:** Stage 1 contract candidate — owner review required
**Scope:** information meaning, provenance, review, versioning, and client publication
**Implementation permission:** none

## Purpose

This contract prevents source truth, AI output, trainer meaning, trainer decisions, and client communication from collapsing into one ambiguous record.

It defines semantic objects and rules. It does not approve a database schema, table name, migration, user interface, AI provider, or production use.

## Authority and invariant

This contract is subordinate to Constitution v1.1, Product, and the earlier Architecture layer. It specializes the permanent rule:

> Damian remains accountable for interpretation, decisions, and publication to the client.

Every information object has three independent axes:

1. `information_type` — what the information is;
2. `review_state` — where that exact version is in Damian's review process;
3. `publication_state` — whether that exact approved version is available to the client.

Changing one axis never changes either of the other two.

## Common information envelope

Every persistent or auditable information object must be capable of carrying the following conceptual metadata. Optionality depends on the information type, but omission must be deliberate rather than accidental.

| Field | Contract |
| --- | --- |
| Stable identity | Identifies the logical object independently of its version. |
| `information_type` | Exactly one value from the closed Stage 1 vocabulary below. |
| Author | Identity of the person or service that created the version. |
| Author type | `Damian`, `client`, `system`, `ai_runtime`, or identified external source. A runtime acting for Damian is not recorded as Damian. |
| `created_at` | Time the version was recorded. |
| `event_at` | Time the described event occurred, when different from creation time. |
| Subject | Client and/or Studio Las process to which the information is alleged to relate. |
| Source identity | The source object or event from which the content came. |
| Source locator | Exact page, section, form field, message range, file coordinate, measurement field, or equivalent locator. |
| `derived_from` | One or more immutable references to every input version used to derive the object. |
| Version | Immutable version identifier and sequence. |
| `supersedes` | Reference to the prior version when this version replaces it. |
| `review_state` | One allowed review state, attached to this exact version. |
| `publication_state` | One allowed publication state, attached to this exact version. |
| Visibility | Effective audience derived from type and states, never inferred from a generic UI flag alone. |
| Uncertainty | Extraction quality, matching uncertainty, or hypothesis uncertainty when applicable. |
| Approval record | Approver, time, exact version, approved use, and deliberate action when approval is required. |
| Audit references | Events that created, reviewed, approved, rejected, superseded, published, withdrew, corrected, or deleted the object. |

The conceptual envelope does not imply one implementation structure. `SCHEMA — NOT APPROVED`.

## Information types

The allowed Stage 1 types are:

1. `source_artifact` — the original source artifact, preserved separately from interpretations and extraction;
2. `source_fact` — information stated directly in a source;
3. `extracted_fact` — structured information extracted from a source;
4. `trainer_observation` — a selected observation made by Damian;
5. `ai_hypothesis` — a provisional hypothesis prepared by AI;
6. `ai_suggestion` — a proposed question, test, exercise, message, or action;
7. `trainer_interpretation` — meaning assigned by Damian;
8. `trainer_decision` — a decision made by Damian;
9. `client_material` — content prepared for a particular client-facing use.

`client_material` remains the same information type while it is drafted, awaiting review, approved, rejected, superseded, unpublished, published, or withdrawn.

Names such as `client_safe_draft`, `client_safe_publication`, `published_material`, or any type containing a review or publication state are forbidden.

## Type contracts

| Type | Author and provenance | Default visibility and review | Uncertainty | Correction and publication |
| --- | --- | --- | --- | --- |
| `source_artifact` | Original sender/system plus acquisition actor; content hash and acquisition context required. | Trainer/system only; review concerns identity and integrity, not approval of every claim. | Matching, completeness, or integrity uncertainty may be recorded. | Never overwritten. A corrected/replaced artifact is a new version or object with an explicit relation. It is not directly published as Studio Las guidance merely because the client supplied it. |
| `source_fact` | Human or system transcription of a statement in one source; exact locator required. | Trainer-only by default; review is required before decision use when material. | No confidence score may alter what the source says. Disputes are separate annotations or versions. | Correction preserves the original and creates a traceable corrected version. Client use requires a new `client_material`. |
| `extracted_fact` | Human or AI extraction; `derived_from` must reach the exact source version and locator. | `needs_review` when machine-extracted; trainer-only. | Extraction confidence may describe extraction or mapping quality only. | Correction creates a new version and never changes the source. Client use requires a new `client_material`. |
| `trainer_observation` | Damian; event time is required when the observation concerns a session or test. | Trainer-only by default. | Uncertainty may describe limits of observation. | Corrections are versioned. It does not become a fact stated by a source. Client use requires a new `client_material`. |
| `ai_hypothesis` | AI runtime with provider/model/run metadata and full input provenance. | `needs_review`; trainer-only. | Uncertainty and missing evidence must remain visible. | It cannot be approved into a fact, interpretation, or decision by status change. Damian may create a separate interpretation or decision derived from it. Never directly publishable. |
| `ai_suggestion` | AI runtime with provider/model/run metadata and input provenance. | `needs_review`; trainer-only. | Rationale, limits, and missing context must be visible where safety-relevant. | Acceptance means only that Damian chose to use or adapt it. A separate `trainer_decision` and/or `client_material` is required. Never directly publishable. |
| `trainer_interpretation` | Damian; may be derived from facts, observations, hypotheses, and conversation. | Trainer-only by default; Damian owns it. | Uncertainty is explicit where relevant. | It remains interpretation after review. Client communication requires a separate `client_material`. |
| `trainer_decision` | Damian; the recorded deliberate action must be distinguishable from a suggestion. | Trainer-visible; approved only by Damian. | Decision rationale may include uncertainty without weakening authorship. | Corrections and changed decisions are new versions or new decisions with `supersedes`. Client communication requires a separate `client_material`. |
| `client_material` | Damian or an identified drafting actor, including AI; every input version is linked through `derived_from`. | Defaults to `needs_review` and `unpublished`. | Source limitations that matter to the intended use must survive transformation. | Only the exact Damian-approved version may be published. Rejection blocks publication; edits after approval require a new version and new approval; withdrawal preserves publication history. |

## Independent state axes

### Review state

The closed vocabulary is:

- `draft` — incomplete work not yet offered for review;
- `needs_review` — a complete enough version awaiting Damian's deliberate review;
- `approved` — Damian approved this exact version for a recorded purpose;
- `rejected` — Damian rejected this exact version;
- `superseded` — a later version replaced this version.

Allowed transitions:

- `draft` → `needs_review`;
- `draft` → `rejected`;
- `needs_review` → `approved`;
- `needs_review` → `rejected`;
- `draft`, `needs_review`, or `approved` → `superseded` when a new version is created;
- `rejected` → `superseded` only to preserve lineage to a replacement, never to rehabilitate the rejected version.

An edit to approved content creates a new version whose state is `draft` or `needs_review`; it never edits the approved version in place.

### Publication state

The closed vocabulary is:

- `unpublished` — not available on a client surface;
- `published` — the exact approved version is available for its approved client/use;
- `withdrawn` — previously published and no longer available to the client.

Allowed transitions for `client_material` only:

- `unpublished` → `published` after the publication gate passes;
- `published` → `withdrawn` after a deliberate withdrawal action.

All other information types remain `unpublished`. A `client_material` may not return from `withdrawn` to `published`; republication requires a new version and a new approval decision.

## Creating client material

Content derived from `ai_hypothesis`, `ai_suggestion`, `trainer_observation`, `trainer_interpretation`, `trainer_decision`, or any other source information must be created as a new, separate object:

```text
information_type: client_material
review_state: needs_review
publication_state: unpublished
```

The new object must contain `derived_from` links to every exact information version used. Transformation must not:

- change the type of any source object;
- turn an AI hypothesis into a fact;
- turn an AI suggestion into Damian's decision;
- turn trainer interpretation into source fact;
- overwrite source material;
- omit a material source merely because it weakens the draft.

For multiple-source material, `derived_from` is a set, not a single convenient citation. If one source is later marked incorrect, unavailable, withdrawn, or mismatched to the client, the dependent material becomes `needs_review` and, if already published, must be withdrawn or explicitly revalidated by Damian before any replacement is published.

## Publication gate

`publication_state: published` is allowed only when all conditions are true:

1. `information_type` is `client_material`;
2. `review_state` is `approved`;
3. an approval event records Damian as approver;
4. the event records approval time and intended use/client;
5. the content hash or equivalent immutable version identity exactly matches the version being published;
6. every required `derived_from` relation is present and resolvable, or a recorded exception has been explicitly reviewed by Damian;
7. the version has not been rejected or superseded after approval;
8. publication is a separate deliberate action, not a side effect of approval by AI, the system, or Damian.

Approval means only:

> Damian approved this exact version for the recorded use or publication.

It does not confirm the truth of every source claim, change provenance, convert a hypothesis to fact, convert a suggestion to decision, or authorize another use.

## Forbidden transitions and invariants

The system must prohibit at least:

- `ai_hypothesis` → `published`;
- `ai_suggestion` → `published`;
- changing `information_type` by changing `review_state`;
- changing `information_type` by changing `publication_state`;
- `review_state: rejected` together with `publication_state: published`;
- publication without Damian's recorded approval;
- publication of a version different from the approved version;
- silent editing of approved or published content;
- automatic publication after AI/system approval or after Damian's review approval alone;
- treating approved client communication as verified source truth;
- removing required provenance before publication;
- overwriting an original artifact or fact with an extraction, correction, interpretation, or draft;
- treating a missing source as permission to hide uncertainty.

## Withdrawal

`publication_state: withdrawn` must preserve:

- evidence that the version was previously published;
- original publication time and actor;
- withdrawal time and decision actor;
- reason for withdrawal;
- original approval and version identity;
- provenance and `derived_from` links;
- the audit trail.

Withdrawal must immediately remove the material from client-visible projections. It does not delete the record, change `information_type`, rewrite provenance, or imply that every underlying source is false.

## Corrections, versions, and source loss

- Correcting extraction creates a new `extracted_fact` version linked to the same source and `supersedes` the incorrect extraction.
- Correcting a trainer object creates a new version and preserves authorship/history.
- Replacing client material creates a new `client_material` version, new review state, and new publication action.
- A missing or inaccessible source is an integrity condition, not an invitation to detach the derivative. Dependent objects remain linked and are flagged for review.
- Deletion requests are handled under the lifecycle contract. Deletion must not be simulated by silently removing lineage.

## Required audit events

The conceptual audit vocabulary includes:

- object/version created;
- extraction completed, partial, failed, or corrected;
- source-to-subject association proposed, confirmed, rejected, or changed;
- review requested, approved, rejected, or superseded;
- `derived_from` added, removed, or found unresolved;
- client material published or withdrawn;
- attempted forbidden transition;
- source invalidated or made unavailable;
- model/provider/version changed for a generated object.

Audit metadata must identify actor, time, object, exact version, action, outcome, and reason where applicable. Raw health content must not be copied into ordinary audit logs.

## Manual fallback

Damian can complete every process without AI by reading the original source, recording selected facts or observations, making a decision, drafting `client_material`, approving its exact version, and publishing it deliberately. Lack of AI may reduce convenience, never authority or process continuity.

## Exit conditions owned by this contract

This contract is satisfied only when:

- the nine information types remain distinct;
- `client_material` is the only client-content type;
- all derived content preserves complete `derived_from` lineage;
- review and publication are independent;
- approval binds to one immutable version and one use;
- no AI object can be published directly;
- withdrawal preserves history;
- implementation and schema remain unapproved.
