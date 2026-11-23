-- A confirmed paper retirement is a historical fact. Ordinary delivery metadata
-- updates must not reopen it.
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

  select * into v_result
  from public.home_plans
  where id = p_home_plan_id and deleted_at is null
  for update;

  if not found then
    raise exception 'guidance not found' using errcode = 'P0002';
  end if;

  perform private.require_trainer_aal2_for_guidance(v_result.client_id);

  if v_result.status <> 'active' then
    raise exception 'delivery can be recorded only for active guidance' using errcode = '23514';
  end if;

  if v_result.delivery_status = 'paper_retirement_confirmed' then
    raise exception 'confirmed paper retirement is historical and cannot be reopened' using errcode = '23514';
  end if;

  update public.home_plans
  set delivery_status = p_delivery_status,
      delivery_recorded_at = case when p_delivery_status = 'recorded' then now() else null end
  where id = v_result.id
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.record_home_plan_guidance_delivery(uuid, text) from public, anon;
grant execute on function public.record_home_plan_guidance_delivery(uuid, text) to authenticated;

comment on function public.record_home_plan_guidance_delivery(uuid, text) is
  'Owner/AAL2 delivery metadata update. A confirmed paper retirement is a one-way historical fact and cannot be reopened by the application.';
