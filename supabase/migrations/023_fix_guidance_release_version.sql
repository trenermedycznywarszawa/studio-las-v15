-- Studio Las OS — correct release numbering without changing draft semantics.
-- A draft is not a released guidance version. This migration supersedes the
-- publish function from 022 for environments where 022 was already applied.

begin;

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
    raise exception 'guidance needs at least one action with dose and stop/reduce boundary'
      using errcode = '23514';
  end if;

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

  -- Only a plan with published_at is a release. Drafts must not consume or skip
  -- release numbers.
  select coalesce(max(release_version), 0) + 1
  into v_next_version
  from public.home_plans
  where client_id = v_draft.client_id
    and published_at is not null;

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
      delivery_status = case
        when guidance_channel in ('paper', 'hybrid') then 'paper_retirement_unresolved'
        else 'pending'
      end,
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

revoke all on function public.publish_home_plan_guidance(uuid) from public, anon;
grant execute on function public.publish_home_plan_guidance(uuid) to authenticated;

commit;
