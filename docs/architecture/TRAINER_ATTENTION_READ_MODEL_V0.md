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

Every field named by the executable `transfer` contract must be present on each mapped row. Signal-bearing values such as `vas_before`, `readiness`, `rpe`, `zone_high_min`, `red_flag_concern`, `new_symptoms` and the extracted guidance `note` may legitimately be `null`, but the property itself must not be missing. This prevents a broken projection or mapper from silently turning missing evidence into a quiet client.

`assembleTrainerAttentionSnapshot()` is an **all-or-nothing application boundary**, not a database transaction. A future real-data adapter may execute the six reads concurrently, but it must not convert a failed/rejected read into `[]` and must not render a partial inbox.

This protects against the most dangerous false negative: a missing `signalReviews` read making an unresolved `contact_required` situation look quiet.

## Studio-local business date

`buildTrainerAttentionModel()` requires an explicit `today` value in Studio-local calendar form (`YYYY-MM-DD`). It must not infer the business date from `new Date().toISOString()`.

The future caller is responsible for deriving the date in the Studio business timezone (`Europe/Warsaw`) before building the inbox. This prevents a Review due after local midnight from being temporarily treated as tomorrow because UTC is still on the previous date.

## Pure model already added

`assets/os/trainer-attention-model.js` accepts the validated snapshot and returns:

- `attention` — open factual situations requiring trainer review;
- `reviewSoon` — explicit upcoming `next_review_date` facts;
- `quiet` — clients without an open recorded exception, with an explicit disclaimer that this is not proof that everything is fine;
- factual counts for the current view.

It never returns a coaching recommendation, readiness score, diagnosis, progression/regression decision or plan change.

Information-level signals are normally hidden from the main inbox, but an information-level signal with an unresolved `contact_required` review must remain visible. The open contact takes precedence over the original signal display level.

## Revision semantics while contact is open

Signal instance identity includes source revision. Therefore an edited source row may create a new current signal key while an earlier revision still has an unresolved `contact_required` review.

The inbox must not silently drop either fact and must not imply that they are two unrelated client problems.

V0 display rule:

- preserve the unresolved contact;
- group only signals that share the same client, signal type, source type and source row id;
- ignore source revision only for this **display grouping**;
- compare the unresolved contact against currently generated source revisions **before review filtering**, so a newer revision that was already reviewed still marks the historical open contact as changed;
- mark the item `sourceChangedSinceContact=true` and retain related signal keys;
- never close or rewrite the historical review automatically.

Do **not** deduplicate only by `sourceId`, because one session can legitimately produce several different signal types.

## V0 source snapshot contract

`getTrainerAttentionReadContract()` in `assets/os/trainer-attention-snapshot.js` is the executable source-read contract for the future adapter. It defines the table, deterministic order, query predicates, concrete PostgREST `select` expression and mapped transfer fields for every source.

### Soft-delete parity is mandatory

The existing per-client workspace excludes soft-deleted rows. The cross-client Attention read must preserve that same boundary.

At the **query boundary**, require `deleted_at=is.null` for:

- `clients`;
- `sessions`;
- `training_load_observations`;
- `pre_session_checks`;
- `guidance_events`.

`trainer_signal_reviews` does not use a `deleted_at` field in the current schema and must not invent one.

`deleted_at` is a **filter-only field**. Do not transfer it into the Trainer Attention snapshot. A deleted source row must be excluded before mapping into the six source arrays, so it cannot resurrect as a new attention signal.

The future repository read should request only the columns needed by the existing rules.

### `clients`

Query predicate:

- `deleted_at = is.null`

Transfer:

- `id`
- `name`
- `status`
- `stage`
- `next_session_date`
- `next_review_date`

Not needed for the inbox: full intake, motivation, fears, health history, contraindications, reports or measurements.

### `sessions`

Query predicate:

- `deleted_at = is.null`

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

Query predicate:

- `deleted_at = is.null`

Transfer:

- `id`
- `client_id`
- `observed_at`
- `rpe`
- `zone_high_min`
- `updated_at`

### `pre_session_checks`

Query predicate:

- `deleted_at = is.null`

Transfer:

- `id`
- `client_id`
- `check_date`
- `red_flag_concern`
- `new_symptoms`
- `updated_at`

### `guidance_events`

Query predicates:

- `deleted_at = is.null`
- `kind = client_checkin`

The PostgREST projection must encode the JSON extraction directly:

- `note:payload->>note`

Mapped transfer fields:

- `id`
- `client_id`
- `event_date`
- `created_at`
- `note`

Do **not** fetch the complete `payload` JSON merely to extract the note in application code. `collectWorkspaceSignals()` accepts the minimal aliased `note` projection while remaining backward-compatible with the existing per-client `payload.note` shape.

### `trainer_signal_reviews`

Query predicates:

- no soft-delete predicate in the current schema.

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

## Exhaustive pagination contract

Every source read must be exhaustive and deterministically ordered. A short page is **not** proof that the source is complete because PostgREST/Supabase may apply a server-side row cap.

The future adapter must:

- request a stable order for each source;
- continue pagination until an **empty page**, not merely until `rows.length < requestedLimit`;
- fail closed if any page errors or returns an invalid shape;
- use `collectTrainerAttentionPages()` (or an equivalent implementation with the same stop rule);
- prove the behavior on staging with a fixture larger than the effective API row cap / page size.

The V0 snapshot is not a transactional database snapshot. If source rows mutate while pages are being read, the next refresh must converge. The first correctness goal is to prevent silent truncation from hiding historical open contacts or resurrecting already-reviewed signals.

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
- all soft-deletable source queries apply `deleted_at=is.null` before mapping rows;
- opening an item loads the existing per-client workspace rather than copying its full context into the inbox.

Existing RLS must be verified on staging; its presence in migration files is not sufficient evidence that the deployed policies behave as required.

## Correctness contract

For the same staging data, the cross-client inbox and the existing per-client signal path must agree on whether a factual signal is open.

Required comparison cases:

- new client response;
- reviewed signal that should disappear;
- `contact_required` review that remains open until contact is resolved;
- information-level signal with an unresolved `contact_required` review;
- open contact whose original source row is absent;
- source revision changes while an earlier contact remains open;
- newer source revision was already reviewed, while an older `contact_required` remains unresolved: one contact item stays visible and explicitly reports source revision drift;
- urgent manual trainer-check signal;
- ordinary review-level signal;
- information-only signal without an open contact that should not dominate the attention inbox;
- Review due today / overdue using an explicit Studio-local date;
- upcoming Review;
- client with no open recorded exception;
- one failed source read must block the whole inbox;
- a mapped row missing any transfer field must fail closed, while present nullable values remain valid;
- paginated source larger than one server-capped page must remain complete;
- a soft-deleted client/source row must not appear in the source snapshot or Attention output;
- the generated `guidance_events` select must use the `payload->>note` alias rather than request a nonexistent `note` column or the full JSON payload.

If the new inbox disagrees with the existing per-client path, integration stops. Do not “fix” the discrepancy in presentation code.

## Ordering

No numerical client priority score.

Semantic order only:

1. existing `urgent-review` facts;
2. unresolved trainer contact, including contact attached to an information-level source signal;
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

A server-side read model/RPC becomes justified only if measured payload, latency or portfolio growth makes the V0 batched reads materially inefficient.

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
- accepting a mapped row with a missing transfer field;
- omitting `deleted_at=is.null` on any soft-deletable source read;
- requesting a nonexistent `guidance_events.note` column or transferring the full payload instead of using the JSON extraction alias;
- assuming a short page means pagination is complete;
- deriving the business date from UTC instead of Studio-local calendar time;
- a production migration before backup/restore readiness.
