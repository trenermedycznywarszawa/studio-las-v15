# Schema Gap Analysis: Paper-first Process Tracking

This document analyzes whether Paper-first Process Tracking should create new tables or reuse existing Studio Las OS structures.

No application code was changed.
No migrations were created.
No SQL was executed.
No auth or Supabase config was changed.

## 1. Core decision

Do not create the four proposed tables as a bundle.

The minimal path is to reuse the existing process structures first:

- `home_plans`
- `home_plan_items`
- `guidance_events`
- `reports`

New tables should be added only after a separate explicit migration review proves that existing structures are insufficient.

## 2. Current schema summary

The current Supabase schema already contains process concepts that overlap strongly with Paper-first tracking:

- `clients` — client identity and process ownership.
- `client_intakes` — diagnostic/intake context.
- `sessions` — formal training sessions.
- `pre_session_checks` — trainer-side pre-session decision support.
- `post_session_observations` — trainer-side session observations.
- `client_tasks` — simple client tasks.
- `client_documents` — documents/materials.
- `body_measurements` — measurement history.
- `training_load_observations` — manual Polar/training load observations.
- `assessment_results` — movement/assessment results.
- `exercises` — exercise library.
- `home_plans` — between-session guidance assigned to clients.
- `home_plan_items` — concrete assigned items/instructions.
- `guidance_events` — dated guidance/check-in/marker events.
- `guidance_pilots` — guidance process pilot structure.
- `guidance_pilot_feedback` — pilot feedback.
- `reports` — trainer/client report storage.

Most relevant existing structures:

- `home_plans` already gives a client-level container for between-session work.
- `home_plan_items` already gives a concrete assignment layer.
- `guidance_events` already gives a dated event layer with `kind` and `payload`.
- `reports` already gives a report output layer.

## 3. Decision matrix

| Proposed table | Decision | Reason |
| --- | --- | --- |
| `paper_protocols` | DEFERRED | Paper protocols are content before they are infrastructure. A reusable protocol library may be useful later, but not for the first implementation. |
| `client_protocol_assignments` | Reuse existing `home_plans` / `home_plan_items` | Assignments can be represented as between-session guidance without creating a parallel assignment system. |
| `daily_protocol_checkins` | Extend existing `guidance_events` later | `guidance_events` already supports dated guidance events and a `payload`. A `client_checkin` event can likely carry the minimal signal. |
| `protocol_report_snapshots` | Reuse existing `reports` | Reports already exist and should remain the report output layer unless immutable structured snapshots become necessary later. |

## 4. Overlap analysis

### 4.1 `paper_protocols`

Conceptual role:

- reusable protocol template,
- example: Poranny Reset, Reset barków, Wieczorne wyciszenie,
- stores offline instructions and estimated duration.

Current overlap:

- `home_plans.instructions` can store plan-level offline instructions,
- `home_plan_items.client_cue` can store concrete client-safe instructions,
- `home_plan_items.stop_criteria` can store safety rules,
- current app can already assign client-specific guidance without a protocol library.

Decision:

- DEFERRED.

Why not OPEN QUESTION:

- The first version does not need a reusable protocol library.
- Paper Protocol is initially content, not infrastructure.
- A table becomes useful only when there are enough reusable protocols to require versioning, categorization, search, reuse, or lifecycle management.

Future trigger for reconsideration:

- 10-20 reusable protocols exist,
- multiple clients use the same protocol template,
- the trainer needs version history,
- protocol categories become operationally useful,
- reports need stable protocol identifiers across clients.

### 4.2 `client_protocol_assignments`

Conceptual role:

- assigns a protocol to a client,
- stores start/end dates,
- stores assignment reason,
- stores status.

Current overlap:

- `home_plans.client_id` links guidance to a client,
- `home_plans.status` can represent active/draft/archived,
- `home_plans.focus` can represent assignment focus,
- `home_plans.instructions` can represent paper-first instructions,
- `home_plan_items` can represent concrete assigned components.

Decision:

- Reuse existing `home_plans` / `home_plan_items`.

Potential later extension:

- add clearer paper-first metadata only if needed,
- avoid a new assignment table until current structures are insufficient.

### 4.3 `daily_protocol_checkins`

Conceptual role:

- records daily minimal signal after offline protocol.

Minimum signal:

- date,
- client_id,
- protocol/item reference,
- protocol_done yes/no,
- energy_score 0-10,
- symptom_score 0-10,
- optional_note,
- created_at.

Current overlap:

- `guidance_events.client_id` links event to client,
- `guidance_events.home_plan_item_id` can link to assigned item,
- `guidance_events.event_date` stores the date,
- `guidance_events.kind` already allows `client_checkin`,
- `guidance_events.completed` can store done yes/no,
- `guidance_events.payload` can store energy/symptom/optional note,
- existing unique index already protects daily events for `daily_step`, but not necessarily for `client_checkin`.

Decision:

- Extend existing `guidance_events` later.

Open implementation detail:

- Decide whether check-ins should be unique per client/item/date.
- If yes, a new partial unique index may be needed for `kind = 'client_checkin'`.
- RLS must allow clients to insert only their own check-ins.

### 4.4 `protocol_report_snapshots`

Conceptual role:

- freezes report-ready summary for a period.

Current overlap:

- `reports.client_id` already links report to client,
- `reports.type` already supports report categories,
- `reports.audience` separates trainer/client outputs,
- `reports.status` and `published_at` already support draft/published flow,
- `reports.content` can store trainer-authored summary.

Decision:

- Reuse existing `reports`.

Future trigger for reconsideration:

- reports need structured machine-readable snapshot fields,
- immutable report inputs need to be preserved separately from final narrative,
- AI-assisted trainer analysis requires stable structured report source data.

## 5. RLS implications

Paper-first check-ins will require careful RLS work.

Required future behavior:

- Trainer can read/write guidance for their clients.
- Active client can read only their own client-safe assignment.
- Active client can insert only their own check-in.
- Active client cannot read trainer notes.
- Inactive/revoked client cannot access the app or insert new check-ins.
- No client can access another client's data.

Likely RLS targets:

- `home_plans`
- `home_plan_items`
- `guidance_events`
- client-safe views related to guidance

Do not implement RLS changes without a separate explicit migration task.

## 6. Client visibility implications

Client should see:

- assigned paper-first instruction,
- client-safe protocol summary,
- stop criteria written safely,
- simple check-in form,
- published report/client summary when ready.

Client should not see:

- full trainer notes,
- internal assignment reasoning unless rewritten for client,
- raw risk notes,
- unpublished reports,
- other clients' events,
- internal payload fields not meant for client.

Client visibility must be explicit.

## 7. localStorage fallback implications

Current OS still has `localStorage` fallback.

Any paper-first implementation must preserve it.

Future local state shape should mirror the minimal Supabase shape:

```json
{
  "guidanceEvents": [
    {
      "id": "local-id",
      "clientId": "client-id",
      "homePlanItemId": "item-id",
      "eventDate": "2026-07-01",
      "kind": "client_checkin",
      "completed": true,
      "payload": {
        "energy_score": 7,
        "symptom_score": 3,
        "optional_note": "Short note"
      },
      "createdAt": "2026-07-01T08:00:00.000Z"
    }
  ]
}
```

Do not remove or break existing local state migration functions.

## 8. Recommended minimal database path

The safest future path is:

1. Use `home_plans` as the active between-session guidance container.
2. Use `home_plan_items` for assigned paper-first instruction items.
3. Store daily check-ins as `guidance_events` with `kind = 'client_checkin'`.
4. Store minimal signal in `guidance_events.payload`.
5. Use `reports` for trainer-authored 4/8/12-week summaries.
6. Defer `paper_protocols` until reusable protocol library pressure is real.

## 9. Migration risks

Risks if we add new tables too early:

- duplicate assignment model,
- duplicate report model,
- unclear source of truth,
- more RLS surface area,
- harder client-safe views,
- harder localStorage fallback,
- higher chance of breaking current OS.

Risks if we reuse existing tables carelessly:

- overloaded `payload`,
- unclear event uniqueness,
- weak typing for energy/symptom scores,
- hidden coupling to current UI,
- harder future analytics if payload shape is inconsistent.

Mitigation:

- document payload shape strictly,
- add validation in app logic later,
- add indexes/RLS only through explicit migration review,
- keep check-in minimal.

## 10. What not to implement yet

Do not implement yet:

- `paper_protocols` table,
- `client_protocol_assignments` table,
- `daily_protocol_checkins` table,
- `protocol_report_snapshots` table,
- RLS changes,
- SQL migrations,
- check-in UI,
- protocol assignment UI,
- AI report analysis,
- wearable ingestion,
- push notifications,
- gamification,
- streaks,
- broad daily surveys.

## 11. Exact next implementation prompt only if safe

Before implementation, create the domain model document.

Recommended next prompt:

```text
Work in repository trenermedycznywarszawa/studio-las-v15.

Do not change application code.
Do not create migrations.
Do not change auth.
Do not change Supabase config.
Do not remove localStorage fallback.
Do not add dependencies.
Do not change public site layout.

Task:
Create docs/STUDIO_LAS_OS_DOMAIN_MODEL.md.

The document should define the business/domain model of Studio Las OS, not the database model.

Include:
1. Core domain principle: Reuse before Create
2. Core domain principle: Paper is content, not infrastructure
3. Core domain principle: Data is an effect of the process, not the goal
4. Main entities: Trainer, Client, Process, Session, Home Plan, Home Plan Item, Paper Protocol, Guidance Event, Report
5. Relationship diagram in text form
6. Source of truth for each concept
7. What each entity is NOT
8. How Paper-first tracking flows through existing concepts
9. Rules for adding new domain concepts
10. Implementation implications

Output only the markdown document.
No code changes.
No SQL execution.
```
