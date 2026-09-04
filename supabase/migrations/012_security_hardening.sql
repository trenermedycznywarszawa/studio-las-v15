-- Studio Las OS - canonical security hardening
--
-- Purpose:
-- 1. make Supabase the only production data store,
-- 2. remove the legacy local access-code model,
-- 3. replace layered client-access patches with one auditable contract,
-- 4. expose client data only through narrow authenticated RPC functions,
-- 5. preserve trainer ownership and soft-delete semantics,
-- 6. prevent assistant trainers from changing identity/account assignments.
--
-- This migration is additive with respect to health/process data. It does not
-- delete client records. It does remove the obsolete client access credential
-- table because authentication is delegated exclusively to Supabase Auth.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Canonical engagement vocabulary
-- ---------------------------------------------------------------------------

alter table public.clients
  add column if not exists engagement_type text;

update public.clients
set engagement_type = case
  when package = 'Diagnostyka' then 'diagnostic_visit'
  when package in ('FUNDAMENT', 'ROZWÓJ', 'VIP Clinical') then 'twelve_week_process'
  when status = 'archived' then 'continuation'
  else 'twelve_week_process'
end
where engagement_type is null;

alter table public.clients
  alter column engagement_type set default 'twelve_week_process';

alter table public.clients
  alter column engagement_type set not null;

alter table public.clients
  drop constraint if exists clients_engagement_type_check;

alter table public.clients
  add constraint clients_engagement_type_check
  check (engagement_type in ('diagnostic_visit', 'twelve_week_process', 'continuation'));

comment on column public.clients.package is
  'Legacy display label retained for migration compatibility. New code must use engagement_type.';

comment on column public.clients.engagement_type is
  'Canonical cooperation type: diagnostic_visit, twelve_week_process, continuation.';

-- Stop with an explicit message instead of silently choosing one relationship
-- when historical data contains ambiguous active client-account mappings.
do $$
begin
  if exists (
    select 1
    from public.client_users
    where status = 'active'
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Security hardening blocked: one auth profile is linked to multiple active clients';
  end if;

  if exists (
    select 1
    from public.client_users
    where status = 'active'
    group by client_id
    having count(*) > 1
  ) then
    raise exception 'Security hardening blocked: one client record is linked to multiple active auth profiles';
  end if;
end;
$$;

-- One active application account per client and one active client per account.
-- Revoked historical links remain available for audit/history.
create unique index if not exists client_users_one_active_client_per_user_idx
  on public.client_users(user_id)
  where status = 'active';

create unique index if not exists client_users_one_active_user_per_client_idx
  on public.client_users(client_id)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- Remove obsolete access-code authentication
-- ---------------------------------------------------------------------------

drop table if exists public.client_access_credentials cascade;

-- ---------------------------------------------------------------------------
-- Canonical identity and authorization helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id
  from public.profiles p
  where auth.uid() is not null
    and p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles p
    where auth.uid() is not null
      and p.auth_user_id = auth.uid()
      and p.role = 'trainer'
  );
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles p
    where auth.uid() is not null
      and p.auth_user_id = auth.uid()
      and p.role = 'client'
  );
$$;

create or replace function public.trainer_owns_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clients c
    where public.is_trainer()
      and c.id = p_client_id
      and c.owner_trainer_id = public.current_profile_id()
      and c.deleted_at is null
  );
$$;

create or replace function public.trainer_can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clients c
    where public.is_trainer()
      and c.id = p_client_id
      and c.deleted_at is null
      and (
        c.owner_trainer_id = public.current_profile_id()
        or exists (
          select 1
          from public.client_trainers ct
          where ct.client_id = c.id
            and ct.trainer_id = public.current_profile_id()
        )
      )
  );
$$;

create or replace function public.client_can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.client_users cu
    join public.clients c on c.id = cu.client_id
    where public.is_client()
      and cu.client_id = p_client_id
      and cu.user_id = public.current_profile_id()
      and cu.status = 'active'
      and c.status = 'active'
      and c.deleted_at is null
  );
$$;

revoke all on function public.current_profile_id() from public, anon;
revoke all on function public.is_trainer() from public, anon;
revoke all on function public.is_client() from public, anon;
revoke all on function public.trainer_owns_client(uuid) from public, anon;
revoke all on function public.trainer_can_access_client(uuid) from public, anon;
revoke all on function public.client_can_access_client(uuid) from public, anon;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_trainer() to authenticated;
grant execute on function public.is_client() to authenticated;
grant execute on function public.trainer_owns_client(uuid) to authenticated;
grant execute on function public.trainer_can_access_client(uuid) to authenticated;
grant execute on function public.client_can_access_client(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Least-privilege schema and table baseline
-- ---------------------------------------------------------------------------

revoke create on schema public from public, anon, authenticated;
revoke all on schema public from anon;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
grant usage on schema public to authenticated;

-- Reset authenticated privileges, then grant only what the current runtime uses.
revoke all on all tables in schema public from authenticated;

-- Profiles stay self-readable. Role and auth_user_id are not updateable because
-- the grant remains column-scoped.
grant select on public.profiles to authenticated;
grant update(display_name, email) on public.profiles to authenticated;

-- Client identity ownership cannot be changed through a browser PATCH. INSERT
-- is protected by RLS; UPDATE is deliberately column-scoped and excludes id,
-- owner_trainer_id, legacy_id, package, created_at, and updated_at.
grant select, insert on public.clients to authenticated;
grant update(
  name,
  contact,
  email,
  phone,
  engagement_type,
  stage,
  stage_raw,
  start_date,
  next_session_date,
  next_review_date,
  goal,
  motivation,
  fears,
  health_status,
  contraindications,
  red_flags_text,
  communication_profile,
  next_milestone,
  working_hypothesis,
  status,
  deleted_at
) on public.clients to authenticated;

grant select, insert, update on public.client_trainers to authenticated;
grant select, insert, update on public.client_users to authenticated;
grant select, insert, update on public.client_intakes to authenticated;
grant select, insert, update on public.sessions to authenticated;
grant select, insert, update on public.pre_session_checks to authenticated;
grant select, insert, update on public.post_session_observations to authenticated;
grant select, insert, update on public.client_tasks to authenticated;
grant select, insert, update on public.client_documents to authenticated;
grant select, insert, update on public.body_measurements to authenticated;
grant select, insert, update on public.training_load_observations to authenticated;
grant select, insert, update on public.assessment_results to authenticated;
grant select, insert, update on public.exercises to authenticated;
grant select, insert, update on public.home_plans to authenticated;
grant select, insert, update on public.home_plan_items to authenticated;
grant select, insert, update on public.guidance_events to authenticated;
grant select, insert, update on public.guidance_pilots to authenticated;
grant select, insert, update on public.guidance_pilot_feedback to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert, update on public.legacy_import_batches to authenticated;
grant select, insert, update on public.legacy_import_records to authenticated;

-- Force RLS on every table containing identity, contact, health, process, or
-- trainer-only data. This prevents accidental owner-context bypasses in normal
-- application use. The service role remains an explicit administrative bypass.
do $$
declare
  table_name text;
  sensitive_tables text[] := array[
    'profiles',
    'clients',
    'client_trainers',
    'client_users',
    'client_intakes',
    'sessions',
    'pre_session_checks',
    'post_session_observations',
    'client_tasks',
    'client_documents',
    'body_measurements',
    'training_load_observations',
    'assessment_results',
    'exercises',
    'home_plans',
    'home_plan_items',
    'guidance_events',
    'guidance_pilots',
    'guidance_pilot_feedback',
    'reports',
    'legacy_import_batches',
    'legacy_import_records'
  ];
begin
  foreach table_name in array sensitive_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Canonical client record policies
-- ---------------------------------------------------------------------------

drop policy if exists clients_select_trainer on public.clients;
drop policy if exists clients_insert_trainer on public.clients;
drop policy if exists clients_update_trainer on public.clients;
drop policy if exists clients_select_client on public.clients;

-- The experimental helper is still referenced by migrations 007-010 policies.
-- Drop those policies first, then remove the helper without CASCADE so an
-- unexpected dependency stops the migration rather than being removed silently.
drop function if exists public.is_current_trainer_profile(uuid);

create policy clients_select_trainer on public.clients
  for select to authenticated
  using (
    public.is_trainer()
    and public.trainer_can_access_client(id)
    and deleted_at is null
  );

create policy clients_insert_trainer on public.clients
  for insert to authenticated
  with check (
    public.is_trainer()
    and owner_trainer_id = public.current_profile_id()
    and package is null
    and deleted_at is null
  );

create policy clients_update_trainer on public.clients
  for update to authenticated
  using (
    public.is_trainer()
    and public.trainer_can_access_client(id)
    and deleted_at is null
  )
  with check (
    public.is_trainer()
    and public.trainer_can_access_client(id)
  );

-- ---------------------------------------------------------------------------
-- Owner-only identity and account-assignment policies
-- ---------------------------------------------------------------------------

-- An assistant trainer may read the assignment needed to work with an assigned
-- client, but only the owner trainer may add or change trainer assignments.
drop policy if exists client_trainers_select_trainer on public.client_trainers;
drop policy if exists client_trainers_insert_trainer on public.client_trainers;
drop policy if exists client_trainers_update_trainer on public.client_trainers;
drop policy if exists client_trainers_insert_owner on public.client_trainers;
drop policy if exists client_trainers_update_owner on public.client_trainers;

create policy client_trainers_select_trainer on public.client_trainers
  for select to authenticated
  using (
    public.is_trainer()
    and public.trainer_can_access_client(client_id)
  );

create policy client_trainers_insert_owner on public.client_trainers
  for insert to authenticated
  with check (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
    and exists (
      select 1
      from public.profiles p
      where p.id = trainer_id
        and p.role = 'trainer'
    )
  );

create policy client_trainers_update_owner on public.client_trainers
  for update to authenticated
  using (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
  )
  with check (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
    and exists (
      select 1
      from public.profiles p
      where p.id = trainer_id
        and p.role = 'trainer'
    )
  );

-- A client may read only their own active link. Only the owner trainer may
-- create, revoke, or change a client-account relationship.
drop policy if exists client_users_select_related on public.client_users;
drop policy if exists client_users_insert_trainer on public.client_users;
drop policy if exists client_users_update_trainer on public.client_users;
drop policy if exists client_users_insert_owner on public.client_users;
drop policy if exists client_users_update_owner on public.client_users;

create policy client_users_select_related on public.client_users
  for select to authenticated
  using (
    (
      public.is_trainer()
      and public.trainer_can_access_client(client_id)
    )
    or (
      public.is_client()
      and user_id = public.current_profile_id()
      and status = 'active'
    )
  );

create policy client_users_insert_owner on public.client_users
  for insert to authenticated
  with check (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
    and exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and p.role = 'client'
    )
  );

create policy client_users_update_owner on public.client_users
  for update to authenticated
  using (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
  )
  with check (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
    and exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and p.role = 'client'
    )
  );

-- ---------------------------------------------------------------------------
-- Remove direct client access to process tables
-- ---------------------------------------------------------------------------

-- Direct client writes to guidance_events are removed. The RPC below derives
-- the client identity from Auth, validates every field, and prevents arbitrary
-- JSON payloads.
drop policy if exists guidance_events_client_select on public.guidance_events;
drop policy if exists guidance_events_client_insert on public.guidance_events;
drop policy if exists guidance_events_client_update on public.guidance_events;
drop policy if exists guidance_events_client_checkin_select on public.guidance_events;
drop policy if exists guidance_events_client_checkin_insert on public.guidance_events;
drop policy if exists guidance_events_client_checkin_update on public.guidance_events;

-- ---------------------------------------------------------------------------
-- Remove old client-safe views. Client access now uses explicit RPC contracts.
-- ---------------------------------------------------------------------------

drop view if exists public.client_guidance_status;
drop view if exists public.client_visible_measurements;
drop view if exists public.client_visible_reports;
drop view if exists public.client_active_home_plan;
drop view if exists public.client_portal_summary;

-- ---------------------------------------------------------------------------
-- Client-safe RPC projection
-- ---------------------------------------------------------------------------

create or replace function public.client_portal_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile_id uuid;
  v_client_id uuid;
  v_snapshot jsonb;
begin
  if auth.uid() is null or not public.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;

  v_profile_id := public.current_profile_id();

  select cu.client_id
  into v_client_id
  from public.client_users cu
  join public.clients c on c.id = cu.client_id
  where cu.user_id = v_profile_id
    and cu.status = 'active'
    and c.status = 'active'
    and c.deleted_at is null
  limit 1;

  if v_client_id is null or not public.client_can_access_client(v_client_id) then
    raise exception 'active client access not found' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'client', jsonb_build_object(
      'firstName', split_part(trim(c.name), ' ', 1),
      'engagementType', c.engagement_type,
      'stage', c.stage,
      'stageLabel', case c.stage
        when 1 then 'Diagnostyka i punkt startowy'
        when 2 then 'Plan i pierwsze decyzje'
        when 3 then 'Prowadzona praca 1:1'
        when 4 then 'Raport i decyzja co dalej'
        else 'Proces Studio Las'
      end,
      'startDate', c.start_date,
      'nextSessionDate', c.next_session_date,
      'goal', c.goal,
      'nextMilestone', c.next_milestone
    ),
    'homePlan', coalesce((
      select jsonb_build_object(
        'title', hp.title,
        'focus', hp.focus,
        'frequency', hp.frequency,
        'duration', hp.duration,
        'instructions', hp.instructions,
        'publishedAt', hp.published_at,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', hpi.id,
            'name', hpi.name,
            'category', hpi.category,
            'region', hpi.region,
            'dosage', hpi.dosage,
            'frequency', hpi.frequency,
            'clientCue', hpi.client_cue,
            'stopCriteria', hpi.stop_criteria,
            'videoUrl', hpi.video_url,
            'sortOrder', hpi.sort_order
          ) order by hpi.sort_order, hpi.created_at)
          from public.home_plan_items hpi
          where hpi.home_plan_id = hp.id
            and hpi.client_id = v_client_id
            and hpi.status = 'active'
            and hpi.published_at is not null
            and hpi.deleted_at is null
        ), '[]'::jsonb)
      )
      from public.home_plans hp
      where hp.client_id = v_client_id
        and hp.status = 'active'
        and hp.published_at is not null
        and hp.deleted_at is null
      order by hp.published_at desc
      limit 1
    ), 'null'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', r.type,
        'title', r.title,
        'content', r.content,
        'publishedAt', r.published_at
      ) order by r.published_at desc)
      from public.reports r
      where r.client_id = v_client_id
        and r.audience = 'client'
        and r.status = 'published'
        and r.published_at is not null
        and r.deleted_at is null
    ), '[]'::jsonb),
    'measurements', coalesce((
      select jsonb_agg(m.row_data order by m.measured_on desc)
      from (
        select
          bm.measured_at as measured_on,
          jsonb_build_object(
            'type', 'body',
            'date', bm.measured_at,
            'source', bm.source,
            'summary', bm.client_summary,
            'metrics', jsonb_strip_nulls(jsonb_build_object(
              'weightKg', bm.weight_kg,
              'fatPercent', bm.fat_percent,
              'muscleMassKg', bm.muscle_mass_kg,
              'bodyWaterPercent', bm.body_water_percent,
              'visceralFatRating', bm.visceral_fat_rating,
              'bmi', bm.bmi
            ))
          ) as row_data
        from public.body_measurements bm
        where bm.client_id = v_client_id
          and bm.client_visible = true
          and bm.published_at is not null
          and bm.deleted_at is null
        union all
        select
          tlo.observed_at as measured_on,
          jsonb_build_object(
            'type', 'training_load',
            'date', tlo.observed_at,
            'source', tlo.source,
            'summary', tlo.client_summary,
            'metrics', jsonb_strip_nulls(jsonb_build_object(
              'sessionType', tlo.session_type,
              'durationMin', tlo.duration_min,
              'hrAvg', tlo.hr_avg,
              'hrMax', tlo.hr_max,
              'rpe', tlo.rpe
            ))
          ) as row_data
        from public.training_load_observations tlo
        where tlo.client_id = v_client_id
          and tlo.client_visible = true
          and tlo.published_at is not null
          and tlo.deleted_at is null
      ) m
    ), '[]'::jsonb),
    'latestAgreement', coalesce((
      select jsonb_build_object(
        'summary', s.client_summary,
        'nextStep', s.client_next_step,
        'publishedAt', s.published_at
      )
      from public.sessions s
      where s.client_id = v_client_id
        and s.client_visible = true
        and s.published_at is not null
        and s.deleted_at is null
      order by s.date desc, s.created_at desc
      limit 1
    ), 'null'::jsonb)
  )
  into v_snapshot
  from public.clients c
  where c.id = v_client_id;

  return v_snapshot;
end;
$$;

revoke all on function public.client_portal_snapshot() from public, anon;
grant execute on function public.client_portal_snapshot() to authenticated;

-- ---------------------------------------------------------------------------
-- Validated client check-in RPC
-- ---------------------------------------------------------------------------

-- Remove an earlier draft signature if this migration was tested before its
-- final form. The final contract never accepts client_id from the browser.
drop function if exists public.save_client_checkin(uuid, uuid, boolean, smallint, smallint, text);

create or replace function public.save_client_checkin(
  p_home_plan_item_id uuid,
  p_protocol_done boolean,
  p_energy_score smallint,
  p_symptom_score smallint,
  p_note text default null
)
returns table(event_date date, created_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile_id uuid;
  v_client_id uuid;
  v_note text;
begin
  if auth.uid() is null or not public.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;

  v_profile_id := public.current_profile_id();

  select cu.client_id
  into v_client_id
  from public.client_users cu
  join public.clients c on c.id = cu.client_id
  where cu.user_id = v_profile_id
    and cu.status = 'active'
    and c.status = 'active'
    and c.deleted_at is null
  limit 1;

  if v_client_id is null or not public.client_can_access_client(v_client_id) then
    raise exception 'client access denied' using errcode = '42501';
  end if;

  if p_energy_score is null or p_energy_score < 0 or p_energy_score > 10 then
    raise exception 'energy score must be between 0 and 10' using errcode = '22023';
  end if;

  if p_symptom_score is null or p_symptom_score < 0 or p_symptom_score > 10 then
    raise exception 'symptom score must be between 0 and 10' using errcode = '22023';
  end if;

  v_note := nullif(left(trim(coalesce(p_note, '')), 500), '');

  if not exists (
    select 1
    from public.home_plan_items hpi
    join public.home_plans hp on hp.id = hpi.home_plan_id
    where hpi.id = p_home_plan_item_id
      and hpi.client_id = v_client_id
      and hpi.status = 'active'
      and hpi.published_at is not null
      and hpi.deleted_at is null
      and hp.client_id = v_client_id
      and hp.status = 'active'
      and hp.published_at is not null
      and hp.deleted_at is null
  ) then
    raise exception 'active published plan item required' using errcode = '22023';
  end if;

  return query
  insert into public.guidance_events (
    client_id,
    home_plan_item_id,
    event_date,
    kind,
    completed,
    payload,
    created_by
  ) values (
    v_client_id,
    p_home_plan_item_id,
    current_date,
    'client_checkin',
    p_protocol_done,
    jsonb_strip_nulls(jsonb_build_object(
      'protocolDone', p_protocol_done,
      'energyScore', p_energy_score,
      'symptomScore', p_symptom_score,
      'note', v_note
    )),
    v_profile_id
  )
  on conflict (client_id, home_plan_item_id, kind, event_date)
    where kind = 'client_checkin' and deleted_at is null
  do nothing
  returning guidance_events.event_date, guidance_events.created_at;

  if not found then
    raise exception 'check-in already recorded for this item today' using errcode = '23505';
  end if;
end;
$$;

revoke all on function public.save_client_checkin(uuid, boolean, smallint, smallint, text) from public, anon;
grant execute on function public.save_client_checkin(uuid, boolean, smallint, smallint, text) to authenticated;

-- Production clients use Supabase Auth accounts. Provisioning and revocation are
-- administrative actions and must never be implemented with a service-role key
-- in browser code.

commit;
