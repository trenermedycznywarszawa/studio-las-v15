-- Add an explicit client request to the existing immutable response workflow.
-- Existing 4-argument clients keep working; no historical intent is inferred.
begin;
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
  if e.home_plan_item_id is distinct from p_home_plan_item_id or e.payload->>'note' is distinct from v_text or coalesce((e.payload->>'contact_requested')::boolean,false) is distinct from p_contact_requested
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

create or replace function public.save_client_guidance_response(p_home_plan_item_id uuid,p_home_plan_id uuid,p_response text,p_submission_id uuid)
returns jsonb language sql security invoker set search_path=pg_catalog,public as $$
 select public.save_client_guidance_response(p_home_plan_item_id,p_home_plan_id,p_response,p_submission_id,false);
$$;
revoke all on function public.save_client_guidance_response(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.save_client_guidance_response(uuid,uuid,text,uuid) to authenticated;
-- Keep the existing client projection on the same business day as the write.
alter function private.client_portal_snapshot() set timezone to 'Europe/Warsaw';
commit;
