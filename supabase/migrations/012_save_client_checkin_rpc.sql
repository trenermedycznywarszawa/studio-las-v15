-- Paper-first client_checkin RPC persistence
--
-- PostgREST table upsert can pass an on_conflict column list, but migration 011
-- relies on a partial unique index:
--
--   (client_id, home_plan_item_id, kind, event_date)
--   where kind = 'client_checkin' and deleted_at is null
--
-- PostgreSQL needs the partial-index predicate in the ON CONFLICT target to
-- infer that arbiter. Keeping the predicate inside this RPC avoids relying on
-- a REST table upsert that cannot safely express the full conflict target.
--
-- This function is SECURITY DEFINER because V1 intentionally does not grant
-- clients a direct UPDATE policy for client_checkin rows. The function performs
-- its own narrow authorization check before the idempotent insert/update.

create or replace function public.save_client_checkin(
  p_client_id uuid,
  p_home_plan_item_id uuid,
  p_event_date date,
  p_completed boolean
)
returns public.guidance_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_item_allowed boolean;
  v_event public.guidance_events%rowtype;
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

  if p_client_id is null
    or p_home_plan_item_id is null
    or p_event_date is null
    or p_completed is null
  then
    raise exception 'client_id, home_plan_item_id, event_date and completed are required.'
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

  -- guidance_events.created_by references public.profiles(id), not auth.users(id).
  -- current_profile_id() is the existing RLS-compatible identity for auth.uid().
  insert into public.guidance_events as ge (
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
    p_completed,
    jsonb_build_object(
      'completed', p_completed,
      'source', 'client_panel',
      'updated_from_ui', true
    ),
    v_profile_id,
    null
  )
  on conflict (client_id, home_plan_item_id, kind, event_date)
  where kind = 'client_checkin' and deleted_at is null
  do update set
    completed = excluded.completed,
    payload = excluded.payload,
    updated_at = now(),
    deleted_at = null
  where ge.created_by = v_profile_id
  returning ge.* into v_event;

  if not found then
    raise exception 'Existing client check-in was not created by the authenticated client.'
      using errcode = '42501';
  end if;

  return v_event;
end;
$$;

comment on function public.save_client_checkin(uuid, uuid, date, boolean)
  is 'Idempotently saves a client-created Paper-first check-in via RPC so the partial unique index predicate and V1 client immutability rule stay enforced.';

revoke all on function public.save_client_checkin(uuid, uuid, date, boolean) from public;
grant execute on function public.save_client_checkin(uuid, uuid, date, boolean) to authenticated;
