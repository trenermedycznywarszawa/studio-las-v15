# Trainer Attention read model V0

Status: **design + pure in-browser model only**. No production integration, no database migration.

## Decision

For the first real-data experiment, do **not** add a new table and do **not** create a production RPC.

Use a small cross-client source snapshot built from existing trainer-readable records, then pass it through the existing Studio Las signal rules in JavaScript.

This is deliberately different from calling `getClientWorkspace(clientId)` for every client.

The V0 objective is one question only:

> Kto dzisiaj wymaga mojej uwagi i dlaczego?

## Why this is the smallest safe option

Current code already has the domain rules that turn factual source records into signals requiring trainer review:

- `collectAttentionSignals()` in `assets/os/decision-support.js`;
- `collectWorkspaceSignals()` in `assets/os/trainer-signals.js`;
- `withoutReviewedSignals()` for preserving review/contact state.

Duplicating those rules in SQL would create two sources of truth for the meaning of a signal. Fetching every full client workspace would create an N+1 read pattern and expose far more context than the attention screen needs.

V0 therefore keeps interpretation rules in one place and reduces the read surface.

## Fail-closed snapshot boundary

`assets/os/trainer-attention-snapshot.js` defines the only accepted cross-client snapshot shape.

The model requires all six sources:

1. `clients`
2. `sessions`
3. `trainingLoad`
4. `preSessionChecks`
5. `guidanceEvents`
6. `signalReviews`

Missing source arrays, malformed source identities, invalid review outcomes, a review missing `contact_resolved_at`, or a row referencing a client outside the snapshot are errors. They must stop the inbox from rendering.

`assembleTrainerAttentionSnapshot()` is an **all-or-nothing application boundary**, not a database transaction. A future real-data adapter may execute the six reads concurrently, but it must not convert a failed/rejected read into `[]` and must not render a partial inbox.

This protects against the most dangerous false negative: a missing `signalReviews` read making an unresolved `contact_required` situation look quiet.

## Pure model already added

`assets/os/trainer-attention-model.js` accepts the validated snapshot and returns:

- `attention` — open factual situations requiring trainer review;
- `reviewSoon` — explicit upcoming `next_review_date` facts;
- `quiet` — clients without an open recorded exception, with an explicit disclaimer that this is not proof that everything is fine;
- factual counts for the current view.

It never returns a coaching recommendation, readiness score, diagnosis, progression/regression decision or plan change.

## Revision semantics while contact is open

Signal instance identity includes source revision. Therefore an edited source row may create a new current signal key while an earlier revision still has an unresolved `contact_required` review.

The inbox must not silently drop either fact and must not imply that they are two unrelated client problems.

V0 display rule:

- preserve the unresolved contact;
- group only signals that share the same client, signal type, source type and source row id;
- ignore source revision only for this **display grouping**;
- mark the item `sourceChangedSinceContact=true` and retain related signal keys;
- never close or rewrite the historical review automatically.

Do **not** deduplicate only by `sourceId`, because one session can legitimately produce several different signal types.

## V0 source snapshot contract

The future repository read should request only the columns needed by the existing rules.

### `clients`

Transfer:

- `id`
- `name`
- `status`
- `stage`
- `next_session_date`
- `next_review_date`

Not needed for the inbox: full intake, motivation, fears, health history, contraindications, reports or measurements.

### `sessions`

Transfer:

- `id`
- `client_id`
- `date`
- `vas_before`
- `vas_after`
- `readiness`
- `sleep_quality`
- `updated_at`

Do not fetch the full session narrative for the cross-client inbox.

### `training_load_observations`

Transfer:

- `id`
- `client_id`
- `observed_at`
- `rpe`
- `zone_high_min`
- `updated_at`

### `pre_session_checks`

Transfer:

- `id`
- `client_id`
- `check_date`
- `red_flag_concern`
- `new_symptoms`
- `updated_at`

### `guidance_events`

Query predicate:

- `kind = client_checkin`

Transfer:

- `id`
- `client_id`
- `event_date`
- `created_at`
- only the extracted note used by the existing client-observation rule, not the complete `payload` JSON.

`collectWorkspaceSignals()` accepts this minimal `note` projection while remaining backward-compatible with the existing per-client `payload.note` shape.

### `trainer_signal_reviews`

Transfer:

- `id`
- `client_id`
- `signal_key`
- `outcome`
- `contact_resolved_at`

A still-open `contact_required` review must remain visible even if the original signal source row is no longer present in the source read.

`reviewed_at`, broad guidance payloads and unrelated session/context fields are not needed for V0.

## No arbitrary time window in the first correctness test

Do not silently use “last 30 days” or a similar window before we prove it cannot hide an unresolved signal.

For the initial staging experiment, correctness is more important than optimization: read the minimum columns required for the currently active trainer portfolio and measure payload size and latency.

Only after we know the real data shape may we introduce a bounded server-side source view. A time window is unacceptable if it can make an unreviewed exception disappear.

## Security contract before any real-data preview

The real-data version is blocked until staging proves the exact future projections against every source table.

Mandatory matrix for **each** of the six reads:

1. trainer-owner at AAL2 can read allowed rows;
2. trainer at AAL2 cannot read another trainer's client rows;
3. trainer at AAL1 receives no protected rows / access is denied according to the deployed policy;
4. client at AAL2 cannot read the cross-client trainer projection;
5. anonymous access is denied;
6. a client identity for client A cannot observe client B.

Pay special attention to `guidance_events` and `trainer_signal_reviews`; passing `clients` and `sessions` alone does not prove the inbox contract.

Additional requirements:

- the attention read writes nothing;
- no attention payload is stored in localStorage or another offline cache;
- only the columns above are transferred;
- opening an item loads the existing per-client workspace rather than copying its full context into the inbox.

Existing RLS must be verified on staging; its presence in migration files is not sufficient evidence that the deployed policies behave as required.

## Correctness contract

For the same staging data, the cross-client inbox and the existing per-client signal path must agree on whether a factual signal is open.

Required comparison cases:

- new client response;
- reviewed signal that should disappear;
- `contact_required` review that remains open until contact is resolved;
- open contact whose original source row is absent;
- source revision changes while an earlier contact remains open;
- urgent manual trainer-check signal;
- ordinary review-level signal;
- information-only signal that should not dominate the attention inbox;
- Review due today / overdue;
- upcoming Review;
- client with no open recorded exception;
- one failed source read must block the whole inbox.

If the new inbox disagrees with the existing per-client path, integration stops. Do not “fix” the discrepancy in presentation code.

## Ordering

No numerical client priority score.

Semantic order only:

1. existing `urgent-review` facts;
2. unresolved trainer contact;
3. other open review signals;
4. Review due/overdue;
5. upcoming Review is shown separately and does not compete with open exceptions.

Within the same semantic class, recency may be used as a stable display order. This is navigation, not a claim about clinical or coaching importance.

## Operational effect to test

Hypothesis: the inbox reduces coach search time and active context switching because the trainer begins with exceptions rather than opening every client.

Measure during quiet launch:

- time from opening Studio Las OS to identifying who needs review;
- number of client workspaces opened without a resulting decision/action;
- number of open exceptions missed by the inbox;
- number of false-attention items that create unnecessary coach work.

The inbox is a failure if it increases CAH or ACL by creating more review work than it removes.

## When V0 should be replaced

A server-side read model/RPC becomes justified only if measured payload, latency or portfolio growth makes the batched minimal reads materially inefficient.

If that happens, the server layer should normalize **source facts**, not invent a second set of coaching rules. Any production migration remains behind the separate backup/restore gate.

## Stop signs

Do not integrate if any implementation requires:

- fetching every full client workspace;
- broad health-history payloads in the inbox;
- a client priority/readiness score;
- duplicated signal interpretation rules in SQL and JavaScript;
- autonomous plan recommendations;
- weakening AAL2/RLS boundaries;
- rendering a partial snapshot after one source read fails;
- a production migration before backup/restore readiness.
