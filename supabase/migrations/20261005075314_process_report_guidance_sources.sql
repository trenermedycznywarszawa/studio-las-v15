-- Add published guidance as dated report evidence; keep all authorization and publication gates.
begin;
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
  if source_table not in ('sessions','assessment_results','guidance_events','body_measurements','training_load_observations','home_plans') or source_table is null then
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
   when 'home_plans' then
    if source_row->>'published_at' is null then raise exception 'published guidance required' using errcode='22023'; end if;
    source_date:=source_row->>'published_at'; excerpt:=concat_ws(E'\n',source_row->>'title',source_row->>'focus',source_row->>'instructions',source_row->>'frequency',source_row->>'duration');
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
