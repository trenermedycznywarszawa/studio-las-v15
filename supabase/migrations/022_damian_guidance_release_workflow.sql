-- Studio Las OS — Damian-only current guidance workflow.
-- Reuses home_plans as the only mutable source of current guidance.

begin;

alter table public.home_plans
  add column if not exists guidance_channel text,
  add column if not exists release_version integer not null default 1,
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists delivery_recorded_at timestamptz,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists supersedes_home_plan_id uuid references public.home_plans(id),
  add column if not exists superseded_by_home_plan_id uuid references public.home_plans(id);

alter table public.home_plans
  drop constraint if exists home_plans_guidance_channel_check,
  add constraint home_plans_guidance_channel_check
    check (guidance_channel is null or guidance_channel in ('app', 'paper', 'hybrid')),
  drop constraint if exists home_plans_delivery_status_check,
  add constraint home_plans_delivery_status_check
    check (delivery_status in ('pending', 'recorded', 'paper_retirement_unresolved', 'paper_retirement_confirmed')),
  drop constraint if exists home_plans_release_version_check,
  add constraint home_plans_release_version_check check (release_version >= 1);

create or replace function private.require_trainer_aal2_for_guidance(p_client_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public, private, auth
as $$
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;

  if auth.uid() is null or not private.is_trainer() or not private.trainer_owns_client(p_client_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_trainer_aal2_for_guidance(uuid) from public, anon, authenticated;

create or replace function public.publish_home_plan_guidance(p_home_plan_id uuid)
returns public.home_plans
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_draft public.home_plans%rowtype;
  v_previous public.home_plans%rowtype;
  v_result public.home_plans%rowtype;
  v_next_version integer;
  v_has_previous boolean := false;
begin
  select * into v_draft
  from public.home_plans
  where id = p_home_plan_id and deleted_at is null
  for update;

  if not found then
    raise exception 'guidance draft not found' using errcode = 'P0002';
  end if;
  perform private.require_trainer_aal2_for_guidance(v_draft.client_id);

  if v_draft.status <> 'draft' then
    raise exception 'only a draft guidance can be published' using errcode = '23514';
  end if;
  if v_draft.guidance_channel is null then
    raise exception 'guidance channel is required' using errcode = '23514';
  end if;
  if nullif(trim(v_draft.focus), '') is null then
    raise exception 'guidance purpose is required' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.home_plan_items item
    where item.home_plan_id = v_draft.id
      and item.client_id = v_draft.client_id
      and item.deleted_at is null
      and item.status = 'active'
      and nullif(trim(item.name), '') is not null
      and nullif(trim(item.dosage), '') is not null
      and nullif(trim(item.stop_criteria), '') is not null
  ) then
    raise exception 'guidance needs at least one action with dose and stop/reduce boundary' using errcode = '23514';
  end if;

  -- The client row serializes concurrent releases for one client. The partial
  -- unique index remains the database backstop against two active plans.
  perform 1 from public.clients where id = v_draft.client_id for update;
  select * into v_previous
  from public.home_plans
  where client_id = v_draft.client_id and status = 'active' and deleted_at is null
  for update;
  v_has_previous := found;

  if v_has_previous
     and v_previous.guidance_channel in ('paper', 'hybrid')
     and v_previous.delivery_status is distinct from 'paper_retirement_confirmed' then
    raise exception 'paper or hybrid guidance retirement must be confirmed before replacement'
      using errcode = '23514';
  end if;

  select coalesce(max(release_version), 0) + 1 into v_next_version
  from public.home_plans where client_id = v_draft.client_id;

  if v_has_previous then
    update public.home_plans
    set status = 'archived', superseded_by_home_plan_id = v_draft.id
    where id = v_previous.id;
  end if;

  update public.home_plans
  set status = 'active',
      published_at = now(),
      release_version = v_next_version,
      supersedes_home_plan_id = v_previous.id,
      delivery_status = case when guidance_channel in ('paper', 'hybrid') then 'paper_retirement_unresolved' else 'pending' end,
      delivery_recorded_at = null,
      withdrawn_at = null
  where id = v_draft.id
  returning * into v_result;

  update public.home_plan_items
  set published_at = now()
  where home_plan_id = v_draft.id
    and client_id = v_draft.client_id
    and deleted_at is null
    and status = 'active';

  return v_result;
end;
$$;

create or replace function public.withdraw_home_plan_guidance(p_home_plan_id uuid)
returns public.home_plans
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare v_result public.home_plans%rowtype;
begin
  select * into v_result from public.home_plans
  where id = p_home_plan_id and deleted_at is null for update;
  if not found then raise exception 'guidance not found' using errcode = 'P0002'; end if;
  perform private.require_trainer_aal2_for_guidance(v_result.client_id);
  if v_result.status <> 'active' then raise exception 'only active guidance can be withdrawn' using errcode = '23514'; end if;
  update public.home_plans set status = 'archived', withdrawn_at = now()
  where id = v_result.id returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.record_home_plan_guidance_delivery(
  p_home_plan_id uuid,
  p_delivery_status text
)
returns public.home_plans
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare v_result public.home_plans%rowtype;
begin
  if p_delivery_status not in ('pending', 'recorded', 'paper_retirement_unresolved') then
    raise exception 'invalid guidance delivery status' using errcode = '22023';
  end if;
  select * into v_result from public.home_plans
  where id = p_home_plan_id and deleted_at is null for update;
  if not found then raise exception 'guidance not found' using errcode = 'P0002'; end if;
  perform private.require_trainer_aal2_for_guidance(v_result.client_id);
  if v_result.status <> 'active' then raise exception 'delivery can be recorded only for active guidance' using errcode = '23514'; end if;
  update public.home_plans
  set delivery_status = p_delivery_status,
      delivery_recorded_at = case when p_delivery_status = 'recorded' then now() else null end
  where id = v_result.id returning * into v_result;
  return v_result;
end;
$$;


create or replace function public.confirm_home_plan_paper_retirement(
  p_home_plan_id uuid
)
returns public.home_plans
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare v_result public.home_plans%rowtype;
begin
  select * into v_result from public.home_plans
  where id = p_home_plan_id and deleted_at is null for update;
  if not found then raise exception 'guidance not found' using errcode = 'P0002'; end if;
  perform private.require_trainer_aal2_for_guidance(v_result.client_id);
  if v_result.status <> 'active' then raise exception 'paper retirement can be confirmed only for active guidance' using errcode = '23514'; end if;
  if v_result.guidance_channel not in ('paper', 'hybrid') then
    raise exception 'paper retirement applies only to active paper or hybrid guidance' using errcode = '23514';
  end if;
  update public.home_plans
  set delivery_status = 'paper_retirement_confirmed',
      delivery_recorded_at = now()
  where id = v_result.id returning * into v_result;
  return v_result;
end;
$$;
revoke all on function public.publish_home_plan_guidance(uuid) from public, anon;
revoke all on function public.withdraw_home_plan_guidance(uuid) from public, anon;
revoke all on function public.record_home_plan_guidance_delivery(uuid, text) from public, anon;
revoke all on function public.confirm_home_plan_paper_retirement(uuid) from public, anon;
grant execute on function public.publish_home_plan_guidance(uuid) to authenticated;
grant execute on function public.withdraw_home_plan_guidance(uuid) to authenticated;
grant execute on function public.record_home_plan_guidance_delivery(uuid, text) to authenticated;
grant execute on function public.confirm_home_plan_paper_retirement(uuid) to authenticated;

comment on column public.home_plans.guidance_channel is
  'Damian-selected guidance channel: app, paper, or hybrid. Not a client-delivery claim.';
comment on column public.home_plans.delivery_status is
  'Metadata-only delivery state; it stores neither guidance text nor health information.';

commit;
