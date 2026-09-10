-- Manual report authorship with captured evidence and separate approval/publication.
begin;
alter table public.reports
 add column workflow_version integer,
 add column evidence_snapshot jsonb,
 add column trainer_working_notes jsonb,
 add column approved_at timestamptz,
 add column approved_by uuid references public.profiles(id),
 add column published_by uuid references public.profiles(id),
 add column withdrawn_at timestamptz,
 add column withdrawn_by uuid references public.profiles(id),
 add column withdrawal_reason text;
create index report_approval_actor_idx on public.reports(approved_by) where approved_by is not null;
create index report_publication_actor_idx on public.reports(published_by) where published_by is not null;
create index report_withdrawal_actor_idx on public.reports(withdrawn_by) where withdrawn_by is not null;
create function private.guard_report_release() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare privileged boolean := current_user=pg_get_userbyid((select relowner from pg_class where oid='public.reports'::regclass));
begin
 if tg_op='DELETE' then
  if old.approved_at is not null or old.published_at is not null then
   raise exception 'reviewed report is historical evidence' using errcode='23514';
  end if;
  return old;
 end if;
 if tg_op='INSERT' then
  if (new.workflow_version is not null or new.status<>'draft' or new.approved_at is not null
      or new.approved_by is not null or new.published_at is not null or new.published_by is not null
      or new.withdrawn_at is not null or new.withdrawn_by is not null or new.withdrawal_reason is not null
      or new.evidence_snapshot is not null or new.trainer_working_notes is not null) and not privileged then
   raise exception 'report lifecycle requires controlled operation' using errcode='42501';
  end if;
  return new;
 end if;
 if new.id is distinct from old.id or new.client_id is distinct from old.client_id then
  raise exception 'report identity is immutable' using errcode='23514';
 end if;
 if not privileged and (old.workflow_version is not null or new.workflow_version is not null
   or new.status is distinct from old.status or new.approved_at is distinct from old.approved_at
   or new.approved_by is distinct from old.approved_by or new.published_at is distinct from old.published_at
   or new.published_by is distinct from old.published_by or new.evidence_snapshot is distinct from old.evidence_snapshot
   or new.trainer_working_notes is distinct from old.trainer_working_notes
   or new.withdrawn_at is distinct from old.withdrawn_at or new.withdrawn_by is distinct from old.withdrawn_by
   or new.withdrawal_reason is distinct from old.withdrawal_reason) then
  raise exception 'report lifecycle requires controlled operation' using errcode='42501';
 end if;
 if (old.approved_at is not null or old.published_at is not null) and
  (to_jsonb(new)-array['updated_at','status','published_at','published_by','withdrawn_at','withdrawn_by','withdrawal_reason'])
   is distinct from (to_jsonb(old)-array['updated_at','status','published_at','published_by','withdrawn_at','withdrawn_by','withdrawal_reason']) then
  raise exception 'approved report content and evidence are frozen' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function private.guard_report_release() from public,anon,authenticated;
create trigger report_release_guard before insert or update or delete on public.reports
for each row execute function private.guard_report_release();

create function public.create_evidence_report(p_client_id uuid,p_title text,p_report jsonb,p_sources jsonb)
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
    if source_row->>'kind' not in ('client_checkin','daily_step') then raise exception 'original client response required' using errcode='22023'; end if;
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

create function public.transition_evidence_report(p_report_id uuid,p_action text,p_expected_updated_at timestamptz,p_reason text default null)
returns public.reports language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare r public.reports%rowtype;
begin
 select * into r from public.reports where id=p_report_id for update;
 if not found then raise exception 'report unavailable' using errcode='P0002'; end if;
 perform private.require_trainer_aal2_for_guidance(r.client_id);
 if r.workflow_version is distinct from 1 or r.deleted_at is not null then raise exception 'manual evidence report required' using errcode='22023'; end if;
 if r.updated_at is distinct from p_expected_updated_at then raise exception 'report changed; review again' using errcode='40001'; end if;
 if p_action='approve' then
  if r.status<>'draft' or r.approved_at is not null then raise exception 'unapproved draft required' using errcode='22023'; end if;
  update public.reports set approved_at=now(),approved_by=private.current_profile_id() where id=r.id returning * into r;
 elsif p_action='publish' then
  if r.status<>'draft' or r.approved_at is null then raise exception 'separate approval required before publication' using errcode='22023'; end if;
  update public.reports set status='published',published_at=now(),published_by=private.current_profile_id() where id=r.id returning * into r;
 elsif p_action='withdraw' then
  if r.status<>'published' or nullif(btrim(p_reason),'') is null or length(p_reason)>1000 then raise exception 'published report and withdrawal reason required' using errcode='22023'; end if;
  update public.reports set status='archived',withdrawn_at=now(),withdrawn_by=private.current_profile_id(),withdrawal_reason=btrim(p_reason) where id=r.id returning * into r;
 else raise exception 'unsupported report action' using errcode='22023'; end if;
 return r;
end $$;
revoke all on function public.transition_evidence_report(uuid,text,timestamptz,text) from public,anon;
grant execute on function public.transition_evidence_report(uuid,text,timestamptz,text) to authenticated;
comment on column public.reports.evidence_snapshot is 'Server-captured dated excerpts with source identity/revision. Trainer records may later change; this report preserves what was reviewed. Not part of the client-safe projection.';
comment on column public.reports.trainer_working_notes is 'Manual interpretation and decision, separate from explicitly authored client content. No automatic interpretation or publication.';
commit;
