# Paper-first Migration Proposal

This document proposes the smallest safe database/RLS path for Paper-first daily check-ins.

No application code was changed.
No SQL was executed.
No migration file was created.
No auth or Supabase config was changed.
No dependencies were added.
No localStorage fallback was removed.
No public layout was changed.
No production data was touched.

## 1. Executive decision

Use existing `guidance_events` for Paper-first daily check-ins.

Do not create these tables now:

- `paper_protocols`
- `client_protocol_assignments`
- `daily_protocol_checkins`
- `protocol_report_snapshots`

Keep `paper_protocols` as DEFERRED infrastructure.

Paper Protocol remains content first. It can be represented inside `home_plans` / `home_plan_items` until a real reusable protocol library is needed.

## 2. Current `guidance_events` schema

Current `guidance_events` table fields:

- `id`
- `client_id`
- `home_plan_item_id`
- `event_date`
- `kind`
- `completed`
- `payload`
- `created_by`
- `created_at`
- `updated_at`
- `deleted_at`

Important current constraints:

- `kind` is currently limited to:
  - `daily_step`
  - `client_checkin`
  - `trainer_marker`
- `home_plan_item_id` + `client_id` has a foreign key to `home_plan_items(id, client_id)`.

This means `client_checkin` already exists as a valid event kind.

## 3. Current `guidance_events` indexes

Current relevant indexes:

- `guidance_events_daily_unique_idx`
- `guidance_events_client_date_idx`

Current unique index protects daily events only for:

- `client_id`
- `home_plan_item_id`
- `kind`
- `event_date`

where:

- `kind = 'daily_step'`
- `deleted_at is null`

There is not yet a dedicated unique index for `kind = 'client_checkin'`.

## 4. Current RLS policies affecting `guidance_events`

Current RLS already enables policies on `guidance_events`.

Trainer policies already exist:

- trainer can select guidance events for accessible clients,
- trainer can insert guidance events for accessible clients,
- trainer can update guidance events for accessible clients.

Current client policies exist, but they are scoped to `kind = 'daily_step'`:

- client select own daily step events,
- client insert own daily step events,
- client update own daily step events.

Therefore Paper-first `client_checkin` requires explicit policy work later if clients should insert/select their own check-ins directly.

## 5. Current client-safe views related to guidance/home plans/reports

Current views already exist for client portal safety:

- `client_portal_summary`
- `client_active_home_plan`
- `client_visible_reports`
- `client_visible_measurements`
- `client_guidance_status`

Most relevant for Paper-first:

- `client_active_home_plan` exposes active published home plan and item details.
- `client_guidance_status` joins active published home plan items with today's `daily_step` event.
- `client_visible_reports` exposes published client-facing reports.

Current `client_guidance_status` is tied to `kind = 'daily_step'`, not `client_checkin`.

## 6. Does `kind = 'client_checkin'` already exist?

Yes.

The current schema already allows `kind = 'client_checkin'`.

This is important because Paper-first check-ins do not require changing the `guidance_events_kind_check` constraint if this remains true in the target database.

## 7. Proposed payload shape

Use `guidance_events` like this:

- `client_id`: client UUID
- `home_plan_item_id`: assigned paper-first item UUID, nullable only if a future design explicitly allows plan-level check-ins
- `event_date`: check-in date
- `kind`: `client_checkin`
- `completed`: protocol_done yes/no
- `payload`: minimal structured data
- `created_by`: current client profile ID for client-created entries

Payload:

```json
{
  "schema": "paper_first_checkin_v1",
  "energy_score": 7,
  "symptom_score": 3,
  "optional_note": "Short client note"
}
```

Do not duplicate `protocol_done` inside `payload` if `completed` is used as the source of truth.

## 8. Proposed validation rules

Validation should exist in the app first and optionally later in SQL constraints/functions if needed.

Rules:

- `kind` must be `client_checkin`.
- `completed` must be true/false.
- `energy_score` must be integer 0-10.
- `symptom_score` must be integer 0-10.
- `optional_note` must be optional and short.
- `payload.schema` should equal `paper_first_checkin_v1`.
- Check-in should relate to an active, published home plan item.
- Client must be active and linked to the client record.

Do not add:

- mood diary,
- sleep diary,
- nutrition diary,
- HRV,
- wearable data,
- long symptom questionnaire,
- streak data,
- badge data.

## 9. Proposed uniqueness rule

Preferred future uniqueness rule:

One active check-in per:

- `client_id`
- `home_plan_item_id`
- `kind`
- `event_date`

where:

- `kind = 'client_checkin'`
- `deleted_at is null`

Potential SQL draft:

```sql
create unique index guidance_events_client_checkin_unique_idx
on public.guidance_events(client_id, home_plan_item_id, kind, event_date)
where kind = 'client_checkin' and deleted_at is null;
```

Do not execute this until approved in a migration task.

## 10. Proposed trainer RLS rule

Current trainer policies likely already cover `client_checkin` because they are not limited to `daily_step`.

Trainer should be able to:

- select check-ins for clients they can access,
- insert check-ins if needed for administrative correction,
- update/soft-delete check-ins for clients they can access.

No immediate trainer RLS change appears required, but this must be confirmed in the target database before execution.

## 11. Proposed client RLS rule

Current client policies are limited to `kind = 'daily_step'`.

A future migration should add or modify policies for `kind = 'client_checkin'`.

Client insert policy should allow insert only when:

- user is a client,
- `client_can_access_client(client_id)` is true,
- `kind = 'client_checkin'`,
- `created_by = current_profile_id()`,
- referenced `home_plan_item_id` belongs to the same client,
- referenced item is active and published,
- parent home plan is active and published,
- both item and plan are not deleted.

Potential SQL draft:

```sql
create policy guidance_events_client_checkin_select
on public.guidance_events
for select to authenticated
using (
  public.is_client()
  and public.client_can_access_client(client_id)
  and kind = 'client_checkin'
  and created_by = public.current_profile_id()
  and deleted_at is null
);

create policy guidance_events_client_checkin_insert
on public.guidance_events
for insert to authenticated
with check (
  public.is_client()
  and public.client_can_access_client(client_id)
  and kind = 'client_checkin'
  and created_by = public.current_profile_id()
  and exists (
    select 1
    from public.home_plan_items hpi
    join public.home_plans hp on hp.id = hpi.home_plan_id
    where hpi.id = guidance_events.home_plan_item_id
      and hpi.client_id = guidance_events.client_id
      and hpi.status = 'active'
      and hpi.published_at is not null
      and hpi.deleted_at is null
      and hp.status = 'active'
      and hp.published_at is not null
      and hp.deleted_at is null
  )
);

create policy guidance_events_client_checkin_update
on public.guidance_events
for update to authenticated
using (
  public.is_client()
  and public.client_can_access_client(client_id)
  and kind = 'client_checkin'
  and created_by = public.current_profile_id()
  and deleted_at is null
)
with check (
  public.is_client()
  and public.client_can_access_client(client_id)
  and kind = 'client_checkin'
  and created_by = public.current_profile_id()
  and deleted_at is null
);
```

Do not execute this until approved in a migration task.

## 12. Is a client-safe view needed?

Probably yes, but not in the first migration unless the UI requires it.

Two options:

### Option A — direct base-table access through RLS

Pros:

- fewer views,
- simpler write path,
- current pattern already allows client `daily_step` policies.

Cons:

- must be very careful with payload content,
- client may see any payload fields allowed by select,
- harder to project only safe fields.

### Option B — add a client-safe check-in view

Possible future view:

- `client_paper_first_checkins`

It could expose only:

- `client_id`
- `home_plan_item_id`
- `event_date`
- `protocol_done`
- `energy_score`
- `symptom_score`
- `optional_note`
- `created_at`

Recommendation:

- For trainer/admin read paths, use base table.
- For client read paths, prefer a client-safe projection when UI needs historical check-ins.
- For client insert, base table insert through RLS is acceptable if payload is strictly shaped.

## 13. localStorage fallback shape

Future localStorage shape should mirror `guidance_events` rather than creating a parallel `dailyProtocolCheckins` model.

Suggested local representation:

```json
{
  "guidanceEvents": [
    {
      "id": "local-guidance-event-id",
      "clientId": "client-id",
      "homePlanItemId": "home-plan-item-id",
      "eventDate": "2026-07-01",
      "kind": "client_checkin",
      "completed": true,
      "payload": {
        "schema": "paper_first_checkin_v1",
        "energy_score": 7,
        "symptom_score": 3,
        "optional_note": "Short note"
      },
      "createdBy": "profile-id-or-local-client",
      "createdAt": "2026-07-01T08:00:00.000Z",
      "updatedAt": "2026-07-01T08:00:00.000Z",
      "deletedAt": null
    }
  ]
}
```

Do not remove existing localStorage fallback.

Do not introduce a separate local `dailyProtocolCheckins` collection unless a later implementation proves it is necessary.

## 14. Manual test plan for future migration

### Database/RLS tests

1. Trainer can select `guidance_events` for own client.
2. Trainer cannot select other trainer's client events.
3. Active client can insert `client_checkin` for own active published item.
4. Active client cannot insert `client_checkin` for another client.
5. Active client cannot insert check-in for unpublished item.
6. Active client cannot insert check-in for archived/deleted item.
7. Active client cannot insert check-in when access is revoked.
8. Duplicate same-day check-in is blocked if unique index is added.
9. Client can select own check-ins only.
10. Client cannot see trainer markers.

### UI/data tests later

1. Existing daily step flow still works.
2. Existing client portal still loads.
3. Existing trainer dashboard still loads.
4. Reports still load.
5. localStorage fallback still loads.
6. Supabase fallback behavior remains clear.

## 15. Risks

### Risk 1 — Payload becomes a junk drawer

Mitigation:

- require `payload.schema = paper_first_checkin_v1`,
- validate allowed keys in app code,
- keep payload minimal.

### Risk 2 — Client sees more than intended

Mitigation:

- client-safe views for read paths,
- strict RLS,
- no trainer notes in payload.

### Risk 3 — Duplicate check-ins

Mitigation:

- add partial unique index for `client_checkin` if product decision requires one check-in per item/day.

### Risk 4 — Breaking existing `daily_step`

Mitigation:

- do not alter existing `daily_step` policies in place unless necessary,
- add separate `client_checkin` policies,
- test existing client guidance flow.

### Risk 5 — Premature protocol library

Mitigation:

- keep `paper_protocols` DEFERRED,
- represent protocol content through current plan/item structures.

## 16. Exact SQL draft if approved later

If approved in a separate migration task, the minimal SQL draft would likely include:

1. Unique index for `client_checkin`.
2. Client select policy for `client_checkin`.
3. Client insert policy for `client_checkin`.
4. Client update policy for `client_checkin`.
5. Optional client-safe view only if UI needs historical client-visible check-ins.

Draft is included above only for review.

Do not execute it from this document.

## 17. What should NOT be implemented yet

Do not implement yet:

- app UI,
- migration execution,
- production SQL,
- new protocol library table,
- new check-in table,
- new report snapshot table,
- new assignment table,
- AI coach,
- push notifications,
- gamification,
- streaks,
- wearable integrations,
- broad daily survey,
- supplement module,
- public marketing change.

## 18. Recommended next step

Next safe step:

Create an actual migration file only after approval.

Recommended next prompt:

```text
Work in repository trenermedycznywarszawa/studio-las-v15.

Create a new SQL migration file for Paper-first client_checkin RLS/index support.

Do not execute SQL.
Do not change application code.
Do not change auth helper code.
Do not change Supabase config.
Do not remove localStorage fallback.
Do not add dependencies.
Do not change public site layout.

Base the migration on docs/PAPER_FIRST_MIGRATION_PROPOSAL.md.

The migration should:
1. Add a partial unique index for guidance_events client_checkin per client/home_plan_item/date where deleted_at is null.
2. Add client select/insert/update policies for guidance_events kind = 'client_checkin'.
3. Avoid changing existing daily_step policies unless absolutely necessary.
4. Include defensive drop policy/index if exists statements where safe.
5. Include comments explaining that paper_protocols remains DEFERRED.

Output:
- one new migration file only
- short report

No SQL execution.
No production data touched.
```
