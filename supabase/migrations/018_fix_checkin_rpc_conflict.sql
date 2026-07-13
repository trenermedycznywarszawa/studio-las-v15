-- Studio Las OS - fix save_client_checkin PL/pgSQL output-column conflict
--
-- The table-returning function exposes an output column named event_date. Inside
-- PL/pgSQL that name is also a variable, which makes the partial-index ON CONFLICT
-- target ambiguous. Preserve the public RPC signature and let the unique index
-- raise unique_violation; translate it into the existing user-safe error.

begin;

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

  begin
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
    returning guidance_events.event_date, guidance_events.created_at;
  exception when unique_violation then
    raise exception 'check-in already recorded for this item today' using errcode = '23505';
  end;
end;
$$;

revoke all on function public.save_client_checkin(uuid, boolean, smallint, smallint, text) from public, anon;
grant execute on function public.save_client_checkin(uuid, boolean, smallint, smallint, text) to authenticated;

comment on function public.save_client_checkin(uuid, boolean, smallint, smallint, text) is
  'Auth-derived client check-in. One active check-in per assigned item per day; duplicate writes fail closed.';

commit;
