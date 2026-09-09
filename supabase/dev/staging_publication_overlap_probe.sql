-- Temporary staging-only harness. Never part of production migrations.
-- Requires the isolated a300/b300/c300/d300/e300 fictional fixture.
begin;
do $$ begin
 if not exists(select 1 from public.clients where id='c3000000-0000-4000-8000-000000000001' and name='Fictional publication overlap 2026-09-09') then
  raise exception 'isolated staging fixture required';
 end if;
end $$;
create function public.staging_rebuild_publication_probe(p_action text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare holder integer;
begin
 if auth.uid() is distinct from 'a3000000-0000-4000-8000-000000000001'::uuid then
  raise exception 'isolated fixture account required' using errcode='42501';
 end if;
 perform private.require_trainer_aal2_for_guidance('c3000000-0000-4000-8000-000000000001');
 if p_action='publish' then
  perform set_config('application_name','studio_las_overlap_publication',true);
  perform public.approve_home_plan_guidance('d3000000-0000-4000-8000-000000000001',2);
  perform public.publish_home_plan_guidance('d3000000-0000-4000-8000-000000000001');
  perform pg_sleep(5);
  raise exception 'EXPECTED_PROBE_ROLLBACK pid %',pg_backend_pid() using errcode='P0001';
 elsif p_action='edit' then
  select pid into holder from pg_stat_activity where application_name='studio_las_overlap_publication'
   and pid<>pg_backend_pid() and wait_event='PgSleep';
  if holder is null then raise exception 'OVERLAP_NOT_OBSERVED'; end if;
  perform set_config('lock_timeout','500ms',true);
  begin
   update public.home_plan_items set dosage='Unreviewed concurrent edit' where id='e3000000-0000-4000-8000-000000000001';
   raise exception 'CONCURRENT_EDIT_NOT_BLOCKED';
  exception when lock_not_available then
   return jsonb_build_object('blocked',true,'holderPid',holder,'editorPid',pg_backend_pid(),'observedAt',clock_timestamp());
  end;
 else raise exception 'unknown test action' using errcode='22023';
 end if;
end $$;
revoke all on function public.staging_rebuild_publication_probe(text) from public,anon;
grant execute on function public.staging_rebuild_publication_probe(text) to authenticated;
commit;
