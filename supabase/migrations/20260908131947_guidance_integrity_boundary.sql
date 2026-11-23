-- September 8: no historical approval/content backfill.
begin;
alter table public.home_plans
 add column content_revision integer not null default 1 check(content_revision>0),
 add column approved_at timestamptz,
 add column approved_by uuid references public.profiles(id),
 add column published_by uuid references public.profiles(id),
 add column withdrawn_by uuid references public.profiles(id),
 add column withdrawal_reason text,
 add column draft_source_id uuid references public.home_plans(id);

-- INVOKER is essential: current_user must retain the actual caller role.
-- A custom GUC/JWT flag is never sufficient to bypass this guard.
create function private.guard_guidance_plan() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
 privileged boolean := current_user=pg_get_userbyid((select relowner from pg_class where oid='public.home_plans'::regclass));
 meta text[]:=array['updated_at','status','delivery_status','delivery_recorded_at','withdrawn_at','withdrawn_by','withdrawal_reason','superseded_by_home_plan_id','published_at','published_by','release_version','supersedes_home_plan_id','approved_at','approved_by','content_revision'];
begin
 if tg_op='DELETE' then
  if old.approved_at is not null or old.published_at is not null then
   raise exception 'approved guidance history cannot be deleted' using errcode='23514';
  end if;
  return old;
 end if;
 if tg_op='INSERT' then
  if not privileged and (new.status<>'draft' or new.published_at is not null
    or new.approved_at is not null or new.approved_by is not null or new.published_by is not null
    or new.withdrawn_at is not null or new.withdrawn_by is not null or new.withdrawal_reason is not null
    or new.delivery_status<>'pending' or new.delivery_recorded_at is not null
    or new.release_version<>1 or new.content_revision<>1 or new.draft_source_id is not null
    or new.supersedes_home_plan_id is not null or new.superseded_by_home_plan_id is not null) then
   raise exception 'guidance lifecycle requires a controlled operation' using errcode='42501';
  end if;
  return new;
 end if;
 if new.id<>old.id or new.client_id<>old.client_id or new.created_at<>old.created_at
    or new.draft_source_id is distinct from old.draft_source_id then
  raise exception 'guidance identity is immutable' using errcode='23514';
 end if;
 if not privileged and
   (to_jsonb(new)-array['title','focus','frequency','duration','instructions','guidance_channel','updated_at','deleted_at'])
   is distinct from
   (to_jsonb(old)-array['title','focus','frequency','duration','instructions','guidance_channel','updated_at','deleted_at']) then
  raise exception 'guidance lifecycle requires a controlled operation' using errcode='42501';
 end if;
 if old.approved_at is not null or old.published_at is not null then
  if (to_jsonb(new)-meta) is distinct from (to_jsonb(old)-meta) then
   raise exception 'approved content is immutable; create a new draft' using errcode='23514';
  end if;
  if new.approved_at is distinct from old.approved_at or new.approved_by is distinct from old.approved_by
     or new.content_revision<>old.content_revision then
   raise exception 'approval identity is immutable' using errcode='23514';
  end if;
  if old.published_at is not null and (new.published_at is distinct from old.published_at
    or new.published_by is distinct from old.published_by or new.release_version<>old.release_version
    or new.supersedes_home_plan_id is distinct from old.supersedes_home_plan_id) then
   raise exception 'publication identity is immutable' using errcode='23514';
  end if;
 elsif (to_jsonb(new)-meta) is distinct from (to_jsonb(old)-meta) then
  new.content_revision:=old.content_revision+1;
 end if;
 return new;
end $$;
revoke all on function private.guard_guidance_plan() from public,anon,authenticated;
create trigger guidance_plan_guard before insert or update or delete on public.home_plans
for each row execute function private.guard_guidance_plan();

create function private.guard_guidance_item() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare privileged boolean:=current_user=pg_get_userbyid((select relowner from pg_class where oid='public.home_plans'::regclass));
begin
 if tg_op='UPDATE' and (new.id<>old.id or new.client_id<>old.client_id
  or new.home_plan_id<>old.home_plan_id or new.created_at<>old.created_at) then
  raise exception 'guidance item identity is immutable' using errcode='23514';
 end if;
 if not privileged and tg_op<>'DELETE' then
  if tg_op='INSERT' and new.published_at is not null then
   raise exception 'item publication requires controlled publication' using errcode='42501';
  elsif tg_op='UPDATE' and new.published_at is distinct from old.published_at then
   raise exception 'item publication requires controlled publication' using errcode='42501';
  end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.guard_guidance_item() from public,anon,authenticated;

-- All task changes serialize against the approval/publication parent lock.
create function private.lock_guidance_item_content() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.home_plans%rowtype; plan_id uuid;
begin
 plan_id:=case when tg_op='DELETE' then old.home_plan_id else new.home_plan_id end;
 select * into p from public.home_plans where id=plan_id for update;
 if not found then raise exception 'guidance parent required' using errcode='23503'; end if;
 if p.approved_at is not null or p.published_at is not null then
  if tg_op<>'UPDATE' then raise exception 'approved action set is immutable' using errcode='23514'; end if;
  if (to_jsonb(new)-array['updated_at','published_at']) is distinct from
     (to_jsonb(old)-array['updated_at','published_at']) then
   raise exception 'approved action content is immutable' using errcode='23514';
  end if;
  if old.published_at is not null and new.published_at is distinct from old.published_at then
   raise exception 'action publication identity is immutable' using errcode='23514';
  end if;
 else
  update public.home_plans set content_revision=content_revision+1 where id=plan_id;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.lock_guidance_item_content() from public,anon,authenticated;
create trigger guidance_item_00_guard before insert or update or delete on public.home_plan_items
for each row execute function private.guard_guidance_item();
create trigger guidance_item_10_lock before insert or update or delete on public.home_plan_items
for each row execute function private.lock_guidance_item_content();

create function private.validate_guidance_set(p_plan_id uuid) returns void
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
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
revoke all on function private.validate_guidance_set(uuid) from public,anon,authenticated;

create function public.approve_home_plan_guidance(p_home_plan_id uuid,p_expected_revision integer)
returns public.home_plans language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare p public.home_plans%rowtype;
begin
 select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null for update;
 if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
 perform private.require_trainer_aal2_for_guidance(p.client_id);
 if p_expected_revision is null or p.content_revision<>p_expected_revision then
  raise exception 'guidance changed; reload and review before approval' using errcode='40001';
 end if;
 perform private.validate_guidance_set(p.id);
 if p.approved_at is not null then return p; end if;
 update public.home_plans set approved_at=now(),approved_by=private.current_profile_id()
 where id=p.id returning * into p;
 return p;
end $$;
revoke all on function public.approve_home_plan_guidance(uuid,integer) from public,anon;
grant execute on function public.approve_home_plan_guidance(uuid,integer) to authenticated;

create or replace function public.publish_home_plan_guidance(p_home_plan_id uuid)
returns public.home_plans language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare p public.home_plans%rowtype; previous public.home_plans%rowtype; next_version integer;
begin
 select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null;
 if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
 perform private.require_trainer_aal2_for_guidance(p.client_id);
 perform 1 from public.clients where id=p.client_id for update;
 select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null for update;
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

create function public.clone_home_plan_guidance(p_home_plan_id uuid)
returns public.home_plans language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare p public.home_plans%rowtype; result public.home_plans%rowtype;
begin
 select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null for update;
 if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
 perform private.require_trainer_aal2_for_guidance(p.client_id);
 insert into public.home_plans(client_id,title,focus,frequency,duration,instructions,guidance_channel,status,draft_source_id)
 values(p.client_id,p.title,p.focus,p.frequency,p.duration,p.instructions,p.guidance_channel,'draft',p.id)
 returning * into result;
 insert into public.home_plan_items(home_plan_id,client_id,exercise_id,name,category,region,dosage,frequency,client_cue,stop_criteria,video_url,status,sort_order,trainer_note)
 select result.id,result.client_id,exercise_id,name,category,region,dosage,frequency,client_cue,stop_criteria,video_url,'active',sort_order,trainer_note
 from public.home_plan_items where home_plan_id=p.id and status='active' and deleted_at is null;
 select * into result from public.home_plans where id=result.id;
 return result;
end $$;
revoke all on function public.clone_home_plan_guidance(uuid) from public,anon;
grant execute on function public.clone_home_plan_guidance(uuid) to authenticated;

-- Explicit equivalent of production recovery cleanup; no historical renaming.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke all on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end $$;
drop function if exists public.save_client_checkin(uuid,uuid,date,boolean);
comment on column public.home_plans.content_revision is 'Exact draft revision reviewed; item changes increment under parent lock. Not a release number.';
comment on column public.home_plans.approved_at is 'Separate deliberate approval. Legacy NULL does not invent historical approval.';


-- One SQL statement supplies the draft revision and exactly the items reviewed.
create function public.trainer_guidance_snapshot(p_client_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,private,auth as $$
begin
 perform private.require_trainer_aal2_for_guidance(p_client_id);
 return jsonb_build_object(
  'plans',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.home_plans p where p.client_id=p_client_id and p.deleted_at is null),'[]'::jsonb),
  'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order,i.id) from public.home_plan_items i where i.client_id=p_client_id and i.deleted_at is null),'[]'::jsonb));
end $$;
revoke all on function public.trainer_guidance_snapshot(uuid) from public,anon;
grant execute on function public.trainer_guidance_snapshot(uuid) to authenticated;

create or replace function public.withdraw_home_plan_guidance(p_home_plan_id uuid)
returns public.home_plans language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare p public.home_plans%rowtype;
begin
 select * into p from public.home_plans where id=p_home_plan_id and deleted_at is null for update;
 if not found then raise exception 'guidance unavailable' using errcode='P0002'; end if;
 perform private.require_trainer_aal2_for_guidance(p.client_id);
 if p.status<>'active' then raise exception 'only active guidance can be withdrawn' using errcode='23514'; end if;
 update public.home_plans set status='archived',withdrawn_at=now(),withdrawn_by=private.current_profile_id(),
 withdrawal_reason='Trainer deliberately withdrew current guidance'
 where id=p.id returning * into p;
 return p;
end $$;

commit;

