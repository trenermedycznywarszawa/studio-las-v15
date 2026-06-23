-- Studio Las OS 9.0 - client-safe views
-- These views intentionally hide raw clinical/trainer fields.
-- They are intentional projection views for the client portal. They keep the
-- default security-definer behavior because clients must not receive direct
-- RLS select policies on sensitive base process tables. Safety depends on:
-- security_barrier, auth-scoped helper predicates, safe column projection, and
-- SELECT-only grants on these views.

drop view if exists public.client_guidance_status;
drop view if exists public.client_visible_measurements;
drop view if exists public.client_visible_reports;
drop view if exists public.client_active_home_plan;
drop view if exists public.client_portal_summary;

create view public.client_portal_summary
with (security_barrier = true, security_invoker = false)
as
select
  c.id as client_id,
  c.name,
  split_part(trim(c.name), ' ', 1) as first_name,
  c.stage,
  case c.stage
    when 1 then 'Diagnostyka'
    when 2 then 'Fundament'
    when 3 then 'Budowanie sprawności'
    when 4 then 'Utrwalanie'
    else 'Proces'
  end as stage_label,
  c.start_date,
  c.next_session_date,
  c.goal,
  hp.id as active_home_plan_id,
  hp.title as active_home_plan_title,
  hp.focus as active_home_plan_focus,
  coalesce(count(hpi.id), 0)::integer as active_home_plan_item_count,
  max(r.published_at) as latest_report_published_at
from public.clients c
left join public.home_plans hp
  on hp.client_id = c.id
  and hp.status = 'active'
  and hp.published_at is not null
  and hp.deleted_at is null
left join public.home_plan_items hpi
  on hpi.home_plan_id = hp.id
  and hpi.status = 'active'
  and hpi.published_at is not null
  and hpi.deleted_at is null
left join public.reports r
  on r.client_id = c.id
  and r.audience = 'client'
  and r.status = 'published'
  and r.published_at is not null
  and r.deleted_at is null
where c.deleted_at is null
  and c.status = 'active'
  and (
    public.client_can_access_client(c.id)
    or public.trainer_can_access_client(c.id)
  )
group by c.id, c.name, c.stage, c.start_date, c.next_session_date, c.goal, hp.id, hp.title, hp.focus;

create view public.client_active_home_plan
with (security_barrier = true, security_invoker = false)
as
select
  hp.client_id,
  hp.id as home_plan_id,
  hp.title,
  hp.focus,
  hp.frequency,
  hp.duration,
  hp.instructions,
  hp.published_at as plan_published_at,
  hpi.id as item_id,
  hpi.name as item_name,
  hpi.category,
  hpi.region,
  hpi.dosage,
  hpi.frequency as item_frequency,
  hpi.client_cue,
  hpi.stop_criteria,
  hpi.video_url,
  hpi.sort_order,
  hpi.added_at,
  hpi.published_at as item_published_at
from public.home_plans hp
join public.home_plan_items hpi on hpi.home_plan_id = hp.id
where hp.status = 'active'
  and hp.published_at is not null
  and hp.deleted_at is null
  and hpi.status = 'active'
  and hpi.published_at is not null
  and hpi.deleted_at is null
  and (
    public.client_can_access_client(hp.client_id)
    or public.trainer_can_access_client(hp.client_id)
  );

create view public.client_visible_reports
with (security_barrier = true, security_invoker = false)
as
select
  r.client_id,
  r.id as report_id,
  r.type,
  r.title,
  r.content,
  r.published_at,
  r.created_at
from public.reports r
where r.audience = 'client'
  and r.status = 'published'
  and r.published_at is not null
  and r.deleted_at is null
  and (
    public.client_can_access_client(r.client_id)
    or public.trainer_can_access_client(r.client_id)
  );

create view public.client_visible_measurements
with (security_barrier = true, security_invoker = false)
as
select
  bm.client_id,
  bm.id as measurement_id,
  'body'::text as measurement_type,
  bm.measured_at as measured_on,
  bm.source,
  jsonb_strip_nulls(jsonb_build_object(
    'weightKg', bm.weight_kg,
    'fatPercent', bm.fat_percent,
    'muscleMassKg', bm.muscle_mass_kg,
    'bodyWaterPercent', bm.body_water_percent,
    'visceralFatRating', bm.visceral_fat_rating,
    'bmi', bm.bmi
  )) as metrics,
  bm.client_summary,
  null::text as load_direction,
  bm.published_at
from public.body_measurements bm
where bm.client_visible = true
  and bm.published_at is not null
  and bm.deleted_at is null
  and (
    public.client_can_access_client(bm.client_id)
    or public.trainer_can_access_client(bm.client_id)
  )
union all
select
  tlo.client_id,
  tlo.id as measurement_id,
  'training_load'::text as measurement_type,
  tlo.observed_at as measured_on,
  tlo.source,
  jsonb_strip_nulls(jsonb_build_object(
    'sessionType', tlo.session_type,
    'durationMin', tlo.duration_min,
    'hrAvg', tlo.hr_avg,
    'hrMax', tlo.hr_max,
    'zoneHighMin', tlo.zone_high_min,
    'rpe', tlo.rpe
  )) as metrics,
  tlo.client_summary,
  case tlo.load_decision
    when 'zwiększ' then 'spokojny krok do przodu'
    when 'utrzymaj' then 'utrzymujemy obecny kierunek'
    when 'zmniejsz' then 'zmniejszamy bodziec'
    when 'regeneracyjnie' then 'stawiamy na regenerację'
    when 'obserwuj' then 'obserwujemy reakcję'
    else null
  end as load_direction,
  tlo.published_at
from public.training_load_observations tlo
where tlo.client_visible = true
  and tlo.published_at is not null
  and tlo.deleted_at is null
  and (
    public.client_can_access_client(tlo.client_id)
    or public.trainer_can_access_client(tlo.client_id)
  );

create view public.client_guidance_status
with (security_barrier = true, security_invoker = false)
as
select
  hpi.client_id,
  hp.id as home_plan_id,
  hpi.id as home_plan_item_id,
  hpi.name as title,
  concat_ws(' · ', nullif(hpi.dosage, ''), nullif(hpi.frequency, '')) as dose,
  hpi.client_cue as cue,
  hpi.stop_criteria as stop_criteria,
  hpi.video_url,
  current_date as event_date,
  coalesce(ge.completed, false) as completed_today,
  ge.updated_at as completed_updated_at
from public.home_plan_items hpi
join public.home_plans hp on hp.id = hpi.home_plan_id
left join public.guidance_events ge
  on ge.client_id = hpi.client_id
  and ge.home_plan_item_id = hpi.id
  and ge.kind = 'daily_step'
  and ge.event_date = current_date
  and ge.deleted_at is null
where hp.status = 'active'
  and hp.published_at is not null
  and hp.deleted_at is null
  and hpi.status = 'active'
  and hpi.published_at is not null
  and hpi.deleted_at is null
  and (
    public.client_can_access_client(hpi.client_id)
    or public.trainer_can_access_client(hpi.client_id)
  );

revoke all on public.client_portal_summary from public, anon;
revoke all on public.client_active_home_plan from public, anon;
revoke all on public.client_visible_reports from public, anon;
revoke all on public.client_visible_measurements from public, anon;
revoke all on public.client_guidance_status from public, anon;

grant select on public.client_portal_summary to authenticated;
grant select on public.client_active_home_plan to authenticated;
grant select on public.client_visible_reports to authenticated;
grant select on public.client_visible_measurements to authenticated;
grant select on public.client_guidance_status to authenticated;
