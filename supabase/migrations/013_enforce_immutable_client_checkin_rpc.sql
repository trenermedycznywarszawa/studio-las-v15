-- Studio Las OS 9.0
-- Enforce immutable Paper-first client_checkin RPC contract.
--
-- Migration 012 introduced an idempotent upsert RPC for the client UI.
-- V1 product semantics are stricter: a client-created check-in is an
-- insert-only process signal. A second same client/item/date signal must be
-- rejected, not treated as a toggle or update.

create or replace function public.save_client_checkin(
  p_client_id uuid,
  p_home_plan_item_id uuid,
  p_event_date date,
  p_completed boolean
)
returns public.guidance_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile_id uuid;
  v_item_allowed boolean;
  v_event public.guidance_events%rowtype;
  v_protocol_done boolean := p_completed;
  v_energy_score integer := null;
  v_symptom_score integer := null;
  v_optional_note text := null;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to save a client check-in.'
      using errcode = '28000';
  end if;

  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'Authenticated user is not mapped to a Studio Las profile.'
      using errcode = '42501';
  end if;

  if not public.is_client() then
    raise exception 'Only an authenticated client can save a client check-in.'
      using errcode = '42501';
  end if;

  if p_client_id is null
    or p_home_plan_item_id is null
    or p_event_date is null
    or v_protocol_done is null
  then
    raise exception 'client_id, home_plan_item_id, event_date and protocol_done are required.'
      using errcode = '22023';
  end if;

  if not public.client_can_access_client(p_client_id) then
    raise exception 'Authenticated client cannot save check-ins for this client.'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.home_plan_items hpi
    join public.home_plans hp on hp.id = hpi.home_plan_id
    where hpi.id = p_home_plan_item_id
      and hpi.client_id = p_client_id
      and hpi.status = 'active'
      and hpi.published_at is not null
      and hpi.deleted_at is null
      and hp.status = 'active'
      and hp.published_at is not null
      and hp.deleted_at is null
  )
  into v_item_allowed;

  if not coalesce(v_item_allowed, false) then
    raise exception 'Client check-in must reference an active published home-plan item for this client.'
      using errcode = '42501';
  end if;

  if v_energy_score is not null and (v_energy_score < 0 or v_energy_score > 10) then
    raise exception 'energy_score must be an integer from 0 to 10 or null.'
      using errcode = '22023';
  end if;

  if v_symptom_score is not null and (v_symptom_score < 0 or v_symptom_score > 10) then
    raise exception 'symptom_score must be an integer from 0 to 10 or null.'
      using errcode = '22023';
  end if;

  if v_optional_note is not null and length(v_optional_note) > 500 then
    raise exception 'optional_note must be 500 characters or shorter.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.guidance_events ge
    where ge.client_id = p_client_id
      and ge.home_plan_item_id = p_home_plan_item_id
      and ge.kind = 'client_checkin'
      and ge.event_date = p_event_date
      and ge.deleted_at is null
  ) then
    raise exception 'client_checkin_already_exists'
      using errcode = '23505';
  end if;

  begin
    insert into public.guidance_events (
      client_id,
      home_plan_item_id,
      kind,
      event_date,
      completed,
      payload,
      created_by,
      deleted_at
    )
    values (
      p_client_id,
      p_home_plan_item_id,
      'client_checkin',
      p_event_date,
      v_protocol_done,
      jsonb_build_object(
        'schema', 'paper_first_checkin_v1',
        'protocol_done', v_protocol_done,
        'energy_score', v_energy_score,
        'symptom_score', v_symptom_score,
        'optional_note', v_optional_note
      ),
      v_profile_id,
      null
    )
    returning * into v_event;
  exception
    when unique_violation then
      raise exception 'client_checkin_already_exists'
        using errcode = '23505';
  end;

  return v_event;
end;
$$;

comment on function public.save_client_checkin(uuid, uuid, date, boolean)
  is 'Insert-only client-created Paper-first check-in RPC. V1 rejects duplicate client/item/date signals and stores the minimal paper_first_checkin_v1 payload.';

revoke all on function public.save_client_checkin(uuid, uuid, date, boolean) from public;
revoke all on function public.save_client_checkin(uuid, uuid, date, boolean) from anon;
revoke all on function public.save_client_checkin(uuid, uuid, date, boolean) from authenticated;
grant execute on function public.save_client_checkin(uuid, uuid, date, boolean) to authenticated;
