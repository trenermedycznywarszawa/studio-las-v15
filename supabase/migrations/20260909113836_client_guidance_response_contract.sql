-- Preserve historical data while exposing exact current identity and saved-state evidence.
begin;
create or replace function public.client_portal_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile_id uuid;
  v_client_id uuid;
  v_snapshot jsonb;
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
    raise exception 'active client access not found' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'serverDate', current_date,
    'client', jsonb_build_object(
      'firstName', split_part(trim(c.name), ' ', 1),
      'engagementType', c.engagement_type,
      'stage', c.stage,
      'stageLabel', case c.stage
        when 1 then 'Diagnostyka i punkt startowy'
        when 2 then 'Plan i pierwsze decyzje'
        when 3 then 'Prowadzona praca 1:1'
        when 4 then 'Raport i decyzja co dalej'
        else 'Proces Studio Las'
      end,
      'startDate', c.start_date,
      'nextSessionDate', c.next_session_date,
      'goal', c.goal,
      'nextMilestone', c.next_milestone
    ),
    'homePlan', coalesce((
      select jsonb_build_object(
        'id', hp.id,
        'releaseVersion', hp.release_version,
        'contentRevision', hp.content_revision,
        'guidanceChannel', hp.guidance_channel,
        'approvedAt', hp.approved_at,
        'title', hp.title,
        'focus', hp.focus,
        'frequency', hp.frequency,
        'duration', hp.duration,
        'instructions', hp.instructions,
        'publishedAt', hp.published_at,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', hpi.id,
            'publishedAt', hpi.published_at,
            'todayResponse', (select jsonb_build_object('id',e.id,'eventDate',e.event_date,
              'savedAt',e.created_at,'text',e.payload->>'note','legacyCompleted',e.completed)
              from public.guidance_events e where e.client_id=v_client_id and e.home_plan_item_id=hpi.id
              and e.kind='client_checkin' and e.event_date=current_date and e.deleted_at is null),
            'name', hpi.name,
            'category', hpi.category,
            'region', hpi.region,
            'dosage', hpi.dosage,
            'frequency', hpi.frequency,
            'clientCue', hpi.client_cue,
            'stopCriteria', hpi.stop_criteria,
            'videoUrl', hpi.video_url,
            'sortOrder', hpi.sort_order
          ) order by hpi.sort_order, hpi.created_at)
          from public.home_plan_items hpi
          where hpi.home_plan_id = hp.id
            and hpi.client_id = v_client_id
            and hpi.status = 'active'
            and hpi.published_at is not null
            and hpi.deleted_at is null
        ), '[]'::jsonb)
      )
      from public.home_plans hp
      where hp.client_id = v_client_id
        and hp.status = 'active'
        and hp.published_at is not null
        and hp.deleted_at is null
      order by hp.published_at desc
      limit 1
    ), 'null'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', r.type,
        'title', r.title,
        'content', r.content,
        'publishedAt', r.published_at
      ) order by r.published_at desc)
      from public.reports r
      where r.client_id = v_client_id
        and r.audience = 'client'
        and r.status = 'published'
        and r.published_at is not null
        and r.deleted_at is null
    ), '[]'::jsonb),
    'measurements', coalesce((
      select jsonb_agg(m.row_data order by m.measured_on desc)
      from (
        select
          bm.measured_at as measured_on,
          jsonb_build_object(
            'type', 'body',
            'date', bm.measured_at,
            'source', bm.source,
            'summary', bm.client_summary,
            'metrics', jsonb_strip_nulls(jsonb_build_object(
              'weightKg', bm.weight_kg,
              'fatPercent', bm.fat_percent,
              'muscleMassKg', bm.muscle_mass_kg,
              'bodyWaterPercent', bm.body_water_percent,
              'visceralFatRating', bm.visceral_fat_rating,
              'bmi', bm.bmi
            ))
          ) as row_data
        from public.body_measurements bm
        where bm.client_id = v_client_id
          and bm.client_visible = true
          and bm.published_at is not null
          and bm.deleted_at is null
        union all
        select
          tlo.observed_at as measured_on,
          jsonb_build_object(
            'type', 'training_load',
            'date', tlo.observed_at,
            'source', tlo.source,
            'summary', tlo.client_summary,
            'metrics', jsonb_strip_nulls(jsonb_build_object(
              'sessionType', tlo.session_type,
              'durationMin', tlo.duration_min,
              'hrAvg', tlo.hr_avg,
              'hrMax', tlo.hr_max,
              'rpe', tlo.rpe
            ))
          ) as row_data
        from public.training_load_observations tlo
        where tlo.client_id = v_client_id
          and tlo.client_visible = true
          and tlo.published_at is not null
          and tlo.deleted_at is null
      ) m
    ), '[]'::jsonb),
    'latestAgreement', coalesce((
      select jsonb_build_object(
        'summary', s.client_summary,
        'nextStep', s.client_next_step,
        'publishedAt', s.published_at
      )
      from public.sessions s
      where s.client_id = v_client_id
        and s.client_visible = true
        and s.published_at is not null
        and s.deleted_at is null
      order by s.date desc, s.created_at desc
      limit 1
    ), 'null'::jsonb)
  )
  into v_snapshot
  from public.clients c
  where c.id = v_client_id;

  return v_snapshot;
end;
$$;

revoke all on function public.client_portal_snapshot() from public, anon;
grant execute on function public.client_portal_snapshot() to authenticated;


-- The response is optional to submit, but a submitted statement must have meaning.
-- No completion score is invented from free text. Old scores remain untouched.
create or replace function public.save_client_guidance_response(p_home_plan_item_id uuid,p_home_plan_id uuid,p_response text,p_submission_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare v_profile_id uuid; v_client_id uuid; v_text text:=nullif(btrim(p_response),''); e public.guidance_events%rowtype; replay boolean:=false;
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
 if p_submission_id is null or v_text is null or length(v_text)>500 then
  raise exception 'response text (1-500 characters) and submission identity required' using errcode='22023';
 end if;
 select * into e from public.guidance_events where id=p_submission_id and client_id=v_client_id and created_by=v_profile_id;
 if found then
  if e.home_plan_item_id is distinct from p_home_plan_item_id or e.payload->>'note' is distinct from v_text
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
   values(p_submission_id,v_client_id,p_home_plan_item_id,current_date,'client_checkin',null,jsonb_build_object('note',v_text,'format','observation-v1'),v_profile_id)
   on conflict do nothing returning * into e;
  if not found then
   select * into e from public.guidance_events where client_id=v_client_id and home_plan_item_id=p_home_plan_item_id
    and kind='client_checkin' and event_date=current_date and deleted_at is null;
   if not found then raise exception 'submission identity conflict' using errcode='23505'; end if;
   replay:=true;
  end if;
 end if;
 return jsonb_build_object('id',e.id,'eventDate',e.event_date,'savedAt',e.created_at,'text',e.payload->>'note','legacyCompleted',e.completed,'alreadySaved',replay);
end $$;
revoke all on function public.save_client_guidance_response(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.save_client_guidance_response(uuid,uuid,text,uuid) to authenticated;
comment on function public.save_client_guidance_response(uuid,uuid,text,uuid) is 'Auth-derived original narrative, exact immutable item, one response per item/server day, idempotent retries. No inferred adherence status.';

commit;
