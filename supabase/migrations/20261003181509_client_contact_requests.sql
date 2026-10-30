-- Separate immutable questions from the daily check-in; existing unique indexes stay intact.
begin;
alter table public.guidance_events drop constraint guidance_events_kind_check;
alter table public.guidance_events add constraint guidance_events_kind_check
 check(kind in ('daily_step','client_checkin','trainer_marker','client_contact_request'));
create or replace function private.guard_client_observation() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if tg_op='INSERT' then
  if new.kind in ('client_checkin','daily_step','client_contact_request') and current_user<>pg_get_userbyid((select relowner from pg_class where oid='public.guidance_events'::regclass)) then
   raise exception 'client observations require the client response operation' using errcode='42501';
  end if;
  return new;
 end if;
 if old.kind in ('client_checkin','daily_step','client_contact_request') then
  raise exception 'original client observation is immutable; append an attributed correction' using errcode='23514';
 end if;
 if tg_op='UPDATE' and new.kind in ('client_checkin','daily_step','client_contact_request') then
  raise exception 'trainer interpretation cannot become a client observation' using errcode='23514';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.guard_client_observation() from public,anon,authenticated;
create or replace function public.add_guidance_observation_note(p_observation_id uuid,p_kind text,p_body text,p_reason text default null)
returns public.guidance_observation_notes language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare source public.guidance_events%rowtype; result public.guidance_observation_notes%rowtype;
begin
 select * into source from public.guidance_events where id=p_observation_id;
 if not found then raise exception 'observation unavailable' using errcode='P0002'; end if;
 perform private.require_trainer_aal2_for_guidance(source.client_id);
 if source.kind not in ('client_checkin','daily_step','client_contact_request') then
  raise exception 'original client observation required' using errcode='22023';
 end if;
 insert into public.guidance_observation_notes(observation_id,kind,body,reason,created_by)
 values(source.id,p_kind,btrim(p_body),nullif(btrim(p_reason),''),private.current_profile_id()) returning * into result;
 return result;
end $$;
revoke all on function public.add_guidance_observation_note(uuid,text,text,text) from public,anon;
grant execute on function public.add_guidance_observation_note(uuid,text,text,text) to authenticated;

create function public.save_client_contact_request(p_home_plan_item_id uuid,p_home_plan_id uuid,p_question text,p_submission_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare v_profile_id uuid; v_client_id uuid; v_text text:=nullif(btrim(p_question),''); e public.guidance_events%rowtype; replay boolean:=false;
begin
 if auth.uid() is null or not private.is_client() then raise exception 'client authentication required' using errcode='42501'; end if;
 v_profile_id:=private.current_profile_id();
 select cu.client_id into v_client_id from public.client_users cu join public.clients c on c.id=cu.client_id
 where cu.user_id=v_profile_id and cu.status='active' and c.status='active' and c.deleted_at is null
 limit 1 for share of cu,c;
 if v_client_id is null or not private.client_can_access_client(v_client_id) then raise exception 'client access denied' using errcode='42501'; end if;
 if p_submission_id is null or v_text is null or length(v_text)>500 then raise exception 'question (1-500 characters) and submission identity required' using errcode='22023'; end if;
 select * into e from public.guidance_events where id=p_submission_id and client_id=v_client_id and created_by=v_profile_id;
 if found then replay:=true;
 else
  perform 1 from public.home_plans hp join public.home_plan_items i on i.home_plan_id=hp.id
   where hp.id=p_home_plan_id and hp.client_id=v_client_id and hp.status='active' and hp.published_at is not null and hp.deleted_at is null
    and i.id=p_home_plan_item_id and i.client_id=v_client_id and i.status='active' and i.published_at is not null and i.deleted_at is null
   for share of hp,i;
  if not found then raise exception 'current published prescription required; refresh guidance' using errcode='22023'; end if;
  insert into public.guidance_events(id,client_id,home_plan_item_id,event_date,kind,completed,payload,created_by)
   values(p_submission_id,v_client_id,p_home_plan_item_id,(now() at time zone 'Europe/Warsaw')::date,'client_contact_request',null,
    jsonb_build_object('note',v_text,'format','contact-request-v1','contact_requested',true),v_profile_id)
   on conflict(id) do nothing returning * into e;
  if not found then
   select * into e from public.guidance_events where id=p_submission_id and client_id=v_client_id and created_by=v_profile_id;
   if not found then raise exception 'submission identity unavailable' using errcode='22023'; end if;
   replay:=true;
  end if;
 end if;
 if e.kind<>'client_contact_request' or e.home_plan_item_id is distinct from p_home_plan_item_id
  or e.payload->>'note' is distinct from v_text
  or (select home_plan_id from public.home_plan_items where id=e.home_plan_item_id) is distinct from p_home_plan_id then
  raise exception 'submission identity already used for a different statement' using errcode='22023';
 end if;
 return jsonb_build_object('id',e.id,'homePlanItemId',e.home_plan_item_id,'eventDate',e.event_date,'savedAt',e.created_at,'text',e.payload->>'note','alreadySaved',replay);
end $$;
revoke all on function public.save_client_contact_request(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.save_client_contact_request(uuid,uuid,text,uuid) to authenticated;

-- No client id parameter: only the authenticated person's own source statements.
create function public.client_contact_requests() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,private,auth as $$
declare v_profile_id uuid; v_client_id uuid; result jsonb;
begin
 if auth.uid() is null or not private.is_client() then raise exception 'client authentication required' using errcode='42501'; end if;
 v_profile_id:=private.current_profile_id();
 select cu.client_id into v_client_id from public.client_users cu join public.clients c on c.id=cu.client_id
 where cu.user_id=v_profile_id and cu.status='active' and c.status='active' and c.deleted_at is null limit 1;
 if v_client_id is null or not private.client_can_access_client(v_client_id) then raise exception 'client access denied' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'homePlanItemId',e.home_plan_item_id,
  'eventDate',e.event_date,'savedAt',e.created_at,'text',e.payload->>'note') order by e.created_at desc,e.id desc),'[]'::jsonb)
 into result from public.guidance_events e where e.client_id=v_client_id and e.created_by=v_profile_id
 and e.kind='client_contact_request' and e.deleted_at is null;
 return result;
end $$;
revoke all on function public.client_contact_requests() from public,anon;
grant execute on function public.client_contact_requests() to authenticated;

create or replace function public.client_portal_snapshot() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare v_snapshot jsonb;
begin
 if auth.uid() is null or not private.is_client() then raise exception 'client authentication required' using errcode='42501'; end if;
 v_snapshot:=private.client_portal_snapshot();
 return v_snapshot || jsonb_build_object('questionnaires',public.client_questionnaire_assignments(),'contactRequests',public.client_contact_requests());
end $$;
revoke all on function public.client_portal_snapshot() from public,anon;
grant execute on function public.client_portal_snapshot() to authenticated;
create or replace function public.save_client_guidance_response(p_home_plan_item_id uuid,p_home_plan_id uuid,p_response text,p_submission_id uuid,p_contact_requested boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare v_profile_id uuid; v_client_id uuid; v_text text:=nullif(btrim(p_response),''); e public.guidance_events%rowtype; replay boolean:=false; v_day date := (now() at time zone 'Europe/Warsaw')::date;
begin
 if auth.uid() is null or not private.is_client() then
  raise exception 'client authentication required' using errcode='42501';
 end if;
 v_profile_id:=private.current_profile_id();
 -- Lock access and client together so revocation/replacement cannot interleave
 -- between applicability validation and the persisted original response.
 select cu.client_id into v_client_id from public.client_users cu join public.clients c on c.id=cu.client_id
 where cu.user_id=v_profile_id and cu.status='active' and c.status='active' and c.deleted_at is null
 limit 1 for share of cu,c;
 if v_client_id is null or not private.client_can_access_client(v_client_id) then
  raise exception 'client access denied' using errcode='42501';
 end if;
 if p_contact_requested is null or p_submission_id is null or v_text is null or length(v_text)>500 then
  raise exception 'response text (1-500 characters) and submission identity required' using errcode='22023';
 end if;
 select * into e from public.guidance_events where id=p_submission_id and client_id=v_client_id and created_by=v_profile_id;
 if found then
  if e.kind<>'client_checkin' or e.home_plan_item_id is distinct from p_home_plan_item_id or e.payload->>'note' is distinct from v_text or coalesce((e.payload->>'contact_requested')::boolean,false) is distinct from p_contact_requested
     or (select home_plan_id from public.home_plan_items where id=e.home_plan_item_id) is distinct from p_home_plan_id then
   raise exception 'submission identity already used for a different statement' using errcode='22023';
  end if;
  replay:=true;
 else
  perform 1 from public.home_plans hp join public.home_plan_items i on i.home_plan_id=hp.id
   where hp.id=p_home_plan_id and hp.client_id=v_client_id and hp.status='active' and hp.published_at is not null and hp.deleted_at is null
   and i.id=p_home_plan_item_id and i.client_id=v_client_id and i.status='active' and i.published_at is not null and i.deleted_at is null
   for share of hp;
  if not found then raise exception 'current published prescription required; refresh guidance' using errcode='22023'; end if;
  insert into public.guidance_events(id,client_id,home_plan_item_id,event_date,kind,completed,payload,created_by)
   values(p_submission_id,v_client_id,p_home_plan_item_id,v_day,'client_checkin',null,jsonb_build_object('note',v_text,'format','observation-v2','contact_requested',p_contact_requested),v_profile_id)
   on conflict do nothing returning * into e;
  if not found then
   select * into e from public.guidance_events where client_id=v_client_id and home_plan_item_id=p_home_plan_item_id
    and kind='client_checkin' and event_date=v_day and deleted_at is null;
   if not found then raise exception 'submission identity conflict' using errcode='23505'; end if;
   replay:=true;
  end if;
 end if;
 return jsonb_build_object('id',e.id,'eventDate',e.event_date,'savedAt',e.created_at,'text',e.payload->>'note','legacyCompleted',e.completed,'alreadySaved',replay,'contactRequested',coalesce((e.payload->>'contact_requested')::boolean,false));
end $$;
revoke all on function public.save_client_guidance_response(uuid,uuid,text,uuid,boolean) from public,anon;
grant execute on function public.save_client_guidance_response(uuid,uuid,text,uuid,boolean) to authenticated;


create or replace function public.create_evidence_report(p_client_id uuid,p_title text,p_report jsonb,p_sources jsonb)
returns public.reports language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare item jsonb; captured jsonb:='[]'; source_row jsonb; source_date text; excerpt text;
 source_table text; source_id uuid; field text; r public.reports%rowtype;
begin
 perform private.require_trainer_aal2_for_guidance(p_client_id);
 if jsonb_typeof(p_report) is distinct from 'object' or jsonb_typeof(p_sources) is distinct from 'array' then
  raise exception 'manual report and evidence required' using errcode='22023';
 end if;
 if jsonb_array_length(p_sources) not between 3 and 7 then
  raise exception 'choose 3 to 7 dated evidence records' using errcode='22023';
 end if;
 foreach field in array array['start_goal','start_capability','change','interpretation','decision','current_capability','next_step','client_material'] loop
  if nullif(btrim(p_report->>field),'') is null or length(p_report->>field)>12000 then
   raise exception 'manual report field required: %',field using errcode='22023';
  end if;
 end loop;
 if nullif(btrim(p_title),'') is null or length(p_title)>240 then raise exception 'title required' using errcode='22023'; end if;
 if (select count(distinct (x->>'table',x->>'id')) from jsonb_array_elements(p_sources) x)<>jsonb_array_length(p_sources) then
  raise exception 'evidence must identify distinct records' using errcode='22023';
 end if;
 for item in select * from jsonb_array_elements(p_sources) loop
  source_table:=item->>'table'; source_id:=(item->>'id')::uuid; source_row:=null;
  if source_table not in ('sessions','assessment_results','guidance_events','body_measurements','training_load_observations') or source_table is null then
   raise exception 'unsupported evidence source' using errcode='22023';
  end if;
  -- Identifier comes only from the fixed whitelist, and all reads bind the owned client.
  execute format('select to_jsonb(s) from public.%I s where id=$1 and client_id=$2 and deleted_at is null for share',source_table)
   into source_row using source_id,p_client_id;
  if source_row is null then raise exception 'evidence unavailable for this client' using errcode='42501'; end if;
  if nullif(item->>'updated_at','') is null or (item->>'updated_at')::timestamptz is distinct from (source_row->>'updated_at')::timestamptz then
   raise exception 'evidence changed; refresh and review again' using errcode='40001';
  end if;
  case source_table
   when 'sessions' then source_date:=source_row->>'date'; excerpt:=concat_ws(E'\n',source_row->>'trainer_observation',source_row->>'trainer_decision',source_row->>'client_summary');
   when 'assessment_results' then source_date:=source_row->>'performed_at'; excerpt:=concat_ws(E'\n',source_row->>'test_name',source_row->>'result_text',source_row->>'interpretation');
   when 'guidance_events' then
    if source_row->>'kind' not in ('client_checkin','daily_step','client_contact_request') then raise exception 'original client response required' using errcode='22023'; end if;
    source_date:=source_row->>'event_date'; excerpt:=coalesce(source_row->'payload'->>'note',source_row->'payload'->>'response');
   when 'body_measurements' then source_date:=source_row->>'measured_at'; excerpt:=concat_ws(E'\n',source_row->>'trainer_interpretation',source_row->>'client_summary');
   when 'training_load_observations' then source_date:=source_row->>'observed_at'; excerpt:=concat_ws(E'\n',source_row->>'trainer_note',source_row->>'client_summary');
  end case;
  if nullif(btrim(excerpt),'') is null or source_date is null then raise exception 'dated descriptive evidence required' using errcode='22023'; end if;
  captured:=captured||jsonb_build_array(jsonb_build_object('table',source_table,'id',source_id,'date',source_date,
   'source_updated_at',source_row->>'updated_at','excerpt',left(excerpt,12000),'captured_at',now()));
 end loop;
 insert into public.reports(client_id,type,audience,status,title,content,created_by,workflow_version,evidence_snapshot,trainer_working_notes)
 values(p_client_id,'twelveWeeks','client','draft',btrim(p_title),btrim(p_report->>'client_material'),private.current_profile_id(),1,captured,
   jsonb_build_object('start_goal',p_report->>'start_goal','start_capability',p_report->>'start_capability','change',p_report->>'change',
    'interpretation',p_report->>'interpretation','decision',p_report->>'decision','current_capability',p_report->>'current_capability','next_step',p_report->>'next_step'))
 returning * into r;
 return r;
end $$;
revoke all on function public.create_evidence_report(uuid,text,jsonb,jsonb) from public,anon;
grant execute on function public.create_evidence_report(uuid,text,jsonb,jsonb) to authenticated;

commit;
