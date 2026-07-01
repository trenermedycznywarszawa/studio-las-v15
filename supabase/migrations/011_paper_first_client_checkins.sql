-- Studio Las OS 9.0
-- Paper-first process tracking: client_checkin support.
--
-- This migration intentionally reuses public.guidance_events instead of creating
-- paper_protocols, client_protocol_assignments, daily_protocol_checkins, or
-- protocol_report_snapshots.
--
-- Product rule:
-- Paper guides the morning. Trainer gives meaning. App records the signal.
-- Report shows the pattern.
--
-- paper_protocols remains DEFERRED. Paper Protocol is content first, not
-- infrastructure.
--
-- V1 immutability rule:
-- Clients may insert and select their own client_checkin rows, but clients may
-- not update client_checkins. Corrections remain trainer-owned for V1.
--
-- IMPORTANT BEFORE EXECUTION:
-- Run a duplicate audit in a test database before applying this migration:
--
-- select client_id, home_plan_item_id, kind, event_date, count(*)
-- from public.guidance_events
-- where kind = 'client_checkin' and deleted_at is null
-- group by client_id, home_plan_item_id, kind, event_date
-- having count(*) > 1;

-- One active Paper-first check-in per client / assigned home-plan item / day.
-- This mirrors the existing daily_step uniqueness model, but keeps the rule
-- separate so existing daily_step behavior is not modified.
--
-- The home_plan_item_id is intentionally constrained by the RLS insert policy
-- below: client-created client_checkin rows must reference an active,
-- published home_plan_item inside an active, published home_plan. This prevents
-- client-created null-item check-ins even though the base column is nullable for
-- other guidance event kinds.
create unique index if not exists guidance_events_client_checkin_unique_idx
  on public.guidance_events(client_id, home_plan_item_id, kind, event_date)
  where kind = 'client_checkin' and deleted_at is null;

-- Keep this migration additive for client_checkin. Do not alter existing
-- daily_step policies here.
drop policy if exists guidance_events_client_checkin_select on public.guidance_events;
drop policy if exists guidance_events_client_checkin_insert on public.guidance_events;
drop policy if exists guidance_events_client_checkin_update on public.guidance_events;

-- Active clients may read only their own Paper-first check-ins.
-- Trainer access is already handled by the existing trainer guidance_events
-- policies and is intentionally not duplicated here.
create policy guidance_events_client_checkin_select on public.guidance_events
  for select to authenticated
  using (
    public.is_client()
    and public.client_can_access_client(client_id)
    and kind = 'client_checkin'
    and created_by = public.current_profile_id()
    and deleted_at is null
  );

-- Active clients may insert a Paper-first check-in only for their own active,
-- published home-plan item inside an active, published home plan.
create policy guidance_events_client_checkin_insert on public.guidance_events
  for insert to authenticated
  with check (
    public.is_client()
    and public.client_can_access_client(client_id)
    and kind = 'client_checkin'
    and created_by = public.current_profile_id()
    and home_plan_item_id is not null
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
