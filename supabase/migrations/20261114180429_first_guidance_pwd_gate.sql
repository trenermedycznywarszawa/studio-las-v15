-- PREPARED ONLY: Issue #110, first release only. No historical backfill.
begin;

-- Uses the same PWD ordering as the workspace. Runtime codes are translated
-- by save_pwd_workflow before persistence; START is not a runtime synonym.
create function private.first_guidance_start_state(p_client_id uuid)
returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public as $$
declare pwd public.sessions%rowtype;
begin
  if exists (select 1 from public.home_plans
    where client_id = p_client_id and published_at is not null) then
    return jsonb_build_object('required', false, 'allowed', true, 'reason', 'publication_history');
  end if;
  select * into pwd from public.sessions
    where client_id = p_client_id and session_type = 'pwd' and deleted_at is null
    order by date desc, created_at desc, id desc limit 1;
  return jsonb_build_object(
    'required', true,
    'allowed', coalesce(pwd.trainer_decision = 'Dalsze prowadzenie', false),
    'reason', case when pwd.id is null then 'pwd_required'
      when pwd.trainer_decision = 'Dalsze prowadzenie' then 'pwd_allows_start'
      else 'pwd_defers_start' end,
    'pwdSessionId', pwd.id);
end $$;
revoke all on function private.first_guidance_start_state(uuid) from public, anon, authenticated;

create function private.require_first_guidance_start(p_client_id uuid)
returns void language plpgsql security invoker
set search_path = pg_catalog, public, private as $$
begin
  -- save_pwd_workflow updates this row before inserting its decision. Holding
  -- the same lock serializes first publication with a concurrent PWD change.
  perform 1 from public.clients where id = p_client_id and deleted_at is null for update;
  if not found then raise exception 'guidance client unavailable' using errcode = 'P0002'; end if;
  if not (private.first_guidance_start_state(p_client_id)->>'allowed')::boolean then
    raise exception 'first guidance requires a current permitting PWD decision' using errcode = '23514';
  end if;
end $$;
revoke all on function private.require_first_guidance_start(uuid) from public, anon, authenticated;

-- Covers direct writes to PWD as well as the existing atomic workflow. PWD
-- observations, tests, semantics and published guidance remain unchanged.
create function private.serialize_pwd_guidance_start()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare old_client uuid; new_client uuid;
begin
  if tg_op <> 'INSERT' and old.session_type = 'pwd' then old_client := old.client_id; end if;
  if tg_op <> 'DELETE' and new.session_type = 'pwd' then new_client := new.client_id; end if;
  perform id from public.clients where id in (old_client, new_client) order by id for update;
  -- Touch the existing versioned row as well: REPEATABLE READ transactions
  -- must fail serialization rather than keep a pre-decision snapshot.
  update public.clients set updated_at = clock_timestamp() where id in (old_client, new_client);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.serialize_pwd_guidance_start() from public, anon, authenticated;
create trigger sessions_first_guidance_lock before insert or update or delete on public.sessions
for each row execute function private.serialize_pwd_guidance_start();

-- Not just UI: draft creation, approval and activation cannot bypass the gate.
-- Existing lifecycle guards and owner/AAL2 authorization are retained.
create function private.guard_first_guidance_start()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  if tg_op = 'INSERT' then
    perform private.require_first_guidance_start(new.client_id);
  elsif (old.approved_at is null and new.approved_at is not null)
    or (old.published_at is null and new.published_at is not null) then
    perform private.require_first_guidance_start(new.client_id);
  end if;
  return new;
end $$;
revoke all on function private.guard_first_guidance_start() from public, anon, authenticated;
create trigger guidance_plan_start_gate before insert or update on public.home_plans
for each row execute function private.guard_first_guidance_start();

-- Shared existing approval/publication validation; always re-evaluate the PWD,
-- including when a draft was approved before a later deferring decision.
create or replace function private.validate_guidance_set(p_plan_id uuid) returns void
language plpgsql security invoker set search_path = pg_catalog, public, private as $$
declare client uuid;
begin
  select client_id into client from public.home_plans where id = p_plan_id;
  perform private.require_first_guidance_start(client);
  if not exists(select 1 from public.home_plans where id=p_plan_id and status='draft'
    and deleted_at is null and guidance_channel is not null and nullif(btrim(focus),'') is not null) then
    raise exception 'draft guidance purpose and channel are required' using errcode='23514';
  end if;
  if not exists(select 1 from public.home_plan_items where home_plan_id=p_plan_id
    and deleted_at is null and status='active') then
    raise exception 'guidance requires at least one action' using errcode='23514';
  end if;
  if exists(select 1 from public.home_plan_items where home_plan_id=p_plan_id
    and deleted_at is null and status='active' and
    (nullif(btrim(name),'') is null or nullif(btrim(dosage),'') is null or nullif(btrim(stop_criteria),'') is null)) then
    raise exception 'every included action requires name, dose and stop/reduce boundary' using errcode='23514';
  end if;
end $$;

-- Use client -> plan lock order, as publication does, rather than the previous
-- approval plan -> client order. Exact content revision checking is unchanged.
create or replace function public.approve_home_plan_guidance(p_home_plan_id uuid, p_expected_revision integer)
returns public.home_plans language plpgsql security definer
set search_path = pg_catalog, public, private, auth as $$
declare p public.home_plans%rowtype;
begin
  select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null;
  if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
  perform private.require_trainer_aal2_for_guidance(p.client_id);
  perform 1 from public.clients where id=p.client_id for update;
  -- Ownership may have changed while waiting for the client lock.
  perform private.require_trainer_aal2_for_guidance(p.client_id);
  select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null for update;
  if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
  if p_expected_revision is null or p.content_revision<>p_expected_revision then
    raise exception 'guidance changed; reload and review before approval' using errcode='40001';
  end if;
  perform private.validate_guidance_set(p.id);
  if p.approved_at is not null then return p; end if;
  update public.home_plans set approved_at=now(),approved_by=private.current_profile_id()
    where id=p.id returning * into p;
  return p;
end $$;

-- Publication retains its existing release semantics; recheck access after waiting.
create or replace function public.publish_home_plan_guidance(p_home_plan_id uuid)
returns public.home_plans language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare p public.home_plans%rowtype; previous public.home_plans%rowtype; next_version integer; source_client uuid;
begin
 select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null;
 if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
 source_client:=p.client_id;
 perform private.require_trainer_aal2_for_guidance(p.client_id);
 perform 1 from public.clients where id=p.client_id for update;
 perform private.require_trainer_aal2_for_guidance(p.client_id);
 select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null for update;
 if not found or p.client_id is distinct from source_client then
  raise exception 'guidance unavailable' using errcode='P0002';
 end if;
 perform private.validate_guidance_set(p.id);
 if p.approved_at is null or p.approved_by is null then
  raise exception 'exact guidance approval required before separate publication' using errcode='23514';
 end if;
 select * into previous from public.home_plans where client_id=p.client_id
  and status='active' and deleted_at is null for update;
 if found and previous.guidance_channel in ('paper','hybrid')
  and previous.delivery_status is distinct from 'paper_retirement_confirmed' then
  raise exception 'paper or hybrid guidance retirement must be confirmed before replacement' using errcode='23514';
 end if;
 select coalesce(max(release_version),0)+1 into next_version from public.home_plans
  where client_id=p.client_id and published_at is not null;
 if previous.id is not null then
  update public.home_plans set status='archived',superseded_by_home_plan_id=p.id,
   withdrawn_at=now(),withdrawn_by=private.current_profile_id(),withdrawal_reason='Replaced by a separately approved release'
   where id=previous.id;
 end if;
 update public.home_plans set status='active',published_at=now(),published_by=private.current_profile_id(),
  release_version=next_version,supersedes_home_plan_id=previous.id,
  delivery_status=case when guidance_channel in ('paper','hybrid') then 'paper_retirement_unresolved' else 'pending' end
  where id=p.id returning * into p;
 update public.home_plan_items set published_at=now() where home_plan_id=p.id
  and client_id=p.client_id and status='active' and deleted_at is null;
 return p;
end $$;

-- Clone follows the same client -> plan lock order as approval/publication.
create or replace function public.clone_home_plan_guidance(p_home_plan_id uuid)
returns public.home_plans language plpgsql security definer
set search_path = pg_catalog, public, private, auth as $$
declare source_client uuid; p public.home_plans%rowtype; result public.home_plans%rowtype;
begin
  select client_id into source_client from public.home_plans where id=p_home_plan_id and deleted_at is null;
  if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
  perform private.require_trainer_aal2_for_guidance(source_client);
  perform 1 from public.clients where id=source_client and deleted_at is null for update;
  if not found then raise exception 'guidance client unavailable' using errcode='P0002'; end if;
  perform private.require_trainer_aal2_for_guidance(source_client);
  select * into p from public.home_plans
    where id=p_home_plan_id and client_id=source_client and deleted_at is null for update;
  if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
  if p.status not in ('draft', 'active', 'archived') then
    raise exception 'guidance source state unavailable' using errcode='23514';
  end if;
  insert into public.home_plans(client_id,title,focus,frequency,duration,instructions,guidance_channel,status,draft_source_id)
    values(p.client_id,p.title,p.focus,p.frequency,p.duration,p.instructions,p.guidance_channel,'draft',p.id)
    returning * into result;
  insert into public.home_plan_items(home_plan_id,client_id,exercise_id,name,category,region,dosage,frequency,client_cue,stop_criteria,video_url,status,sort_order,trainer_note)
    select result.id,result.client_id,exercise_id,name,category,region,dosage,frequency,client_cue,stop_criteria,video_url,'active',sort_order,trainer_note
    from public.home_plan_items where home_plan_id=p.id and status='active' and deleted_at is null;
  select * into result from public.home_plans where id=result.id;
  return result;
end $$;

-- UI reads the same server predicate, including publication history that is
-- archived/soft-deleted and is therefore absent from the visible plan list.
create or replace function public.trainer_guidance_snapshot(p_client_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,private,auth as $$
begin
  perform private.require_trainer_aal2_for_guidance(p_client_id);
  return jsonb_build_object(
    'startGate', private.first_guidance_start_state(p_client_id),
    'plans',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.home_plans p where p.client_id=p_client_id and p.deleted_at is null),'[]'::jsonb),
    'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order,i.id) from public.home_plan_items i where i.client_id=p_client_id and i.deleted_at is null),'[]'::jsonb));
end $$;
commit;
