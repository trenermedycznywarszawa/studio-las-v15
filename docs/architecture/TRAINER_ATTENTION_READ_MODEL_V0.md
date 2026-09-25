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

## Pure model already added

`assets/os/trainer-attention-model.js` accepts a minimal snapshot and returns:

- `attention` — open factual situations requiring trainer review;
- `reviewSoon` — explicit upcoming `next_review_date` facts;
- `quiet` — clients without an open recorded exception, with an explicit disclaimer that this is not proof that everything is fine;
- factual counts for the current view.

It never returns a coaching recommendation, readiness score, diagnosis, progression/regression decision or plan change.

## V0 source snapshot contract

The future repository read should request only the columns needed by the existing rules.

### `clients`

Required:

- `id`
- `name`
- `status`
- `stage`
- `next_session_date`
- `next_review_date`

Not needed for the inbox: full intake, motivation, fears, health history, contraindications, reports or measurements.

### `sessions`

Required only for existing signal rules:

- `id`
- `client_id`
- `date`
- `vas_before`
- `vas_after`
- `readiness`
- `sleep_quality`
- `created_at`
- `updated_at`

Do not fetch the full session narrative for the cross-client inbox.

### `training_load_observations`

Required:

- `id`
- `client_id`
- `observed_at`
- `rpe`
- `zone_high_min`
- `created_at`
- `updated_at`

### `pre_session_checks`

Required:

- `id`
- `client_id`
- `check_date`
- `red_flag_concern`
- `new_symptoms`
- `created_at`
- `updated_at`

### `guidance_events`

Required only for client responses that can become an open trainer signal:

- `id`
- `client_id`
- `event_date`
- `kind`
- `payload.note`
- `created_at`
- `updated_at`

The real query should restrict this source to the event kinds used by the attention model rather than loading unrelated guidance history.

### `trainer_signal_reviews`

Required:

- `id`
- `client_id`
- `signal_key`
- `outcome`
- `reviewed_at`
- `contact_resolved_at`

A still-open `contact_required` review must remain visible even if the original signal is old.

## No arbitrary time window in the first correctness test

Do not silently use “last 30 days” or a similar window before we prove it cannot hide an unresolved signal.

For the initial staging experiment, correctness is more important than optimization: read the minimum columns required for the currently active trainer portfolio and measure payload size and latency.

Only after we know the real data shape may we introduce a bounded server-side source view. A time window is unacceptable if it can make an unreviewed exception disappear.

## Security contract before any real-data preview

The real-data version is blocked until staging proves all of the following:

1. trainer AAL2 can read the source snapshot for clients they are allowed to manage;
2. trainer AAL1 is denied where the existing Studio Las security model requires AAL2;
3. client role cannot read the cross-client snapshot;
4. anonymous access is denied;
5. the attention read does not write anything;
6. no attention payload is stored in localStorage or another offline cache;
7. only the minimal columns above are transferred;
8. opening an item loads the existing per-client workspace rather than copying its full context into the inbox.

Existing RLS must be verified on staging; its presence in migration files is not sufficient evidence that the deployed policies behave as required.

## Correctness contract

For the same staging data, the cross-client inbox and the existing per-client signal path must agree on whether a factual signal is open.

Required comparison cases:

- new client response;
- reviewed signal that should disappear;
- `contact_required` review that remains open until contact is resolved;
- urgent manual trainer-check signal;
- ordinary review-level signal;
- information-only signal that should not dominate the attention inbox;
- Review due today / overdue;
- upcoming Review;
- client with no open recorded exception.

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
- a production migration before backup/restore readiness.
