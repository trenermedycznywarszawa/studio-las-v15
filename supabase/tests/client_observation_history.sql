-- Fictional, rollback-only SQL regression. Never run on production.
begin;
create function pg_temp.expect_error(command text, expected text) returns void
language plpgsql as $$
declare actual text;
begin
 begin execute command; exception when others then actual:=sqlstate; end;
 if actual is distinct from expected then
  raise exception 'Expected %, got % for %',expected,coalesce(actual,'success'),command;
 end if;
end $$;
create function pg_temp.assert_true(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'Assertion failed: %',label; end if; end $$;
insert into auth.users(id,email) values
 ('a1000000-0000-4000-8000-000000000001','rebuild-owner@example.invalid'),
 ('a1000000-0000-4000-8000-000000000002','rebuild-client-a@example.invalid'),
 ('a1000000-0000-4000-8000-000000000003','rebuild-client-b@example.invalid'),
 ('a1000000-0000-4000-8000-000000000004','rebuild-unrelated-trainer@example.invalid');
insert into public.profiles(id,auth_user_id,role) values
 ('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','trainer'),
 ('b1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','client'),
 ('b1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000003','client'),
 ('b1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000004','trainer');
insert into public.clients(id,owner_trainer_id,name) values
 ('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Fictional A'),
 ('c1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000004','Fictional B');
insert into public.client_users(client_id,user_id,status) values
 ('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','active'),
 ('c1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000003','active');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
insert into public.home_plans(id,client_id,title,focus,guidance_channel,status) values
 ('d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Fictional guidance','Practice an agreed action','app','draft');
select pg_temp.expect_error($q$select public.approve_home_plan_guidance('d1000000-0000-4000-8000-000000000001',1)$q$,'23514');
select pg_temp.expect_error($q$update public.home_plans set status='active',published_at=now() where id='d1000000-0000-4000-8000-000000000001'$q$,'42501');
insert into public.home_plan_items(id,home_plan_id,client_id,name,dosage,stop_criteria) values
 ('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Action A','3 repetitions','Stop at agreed boundary'),
 ('e1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Action B',null,null);
select pg_temp.expect_error($q$select public.approve_home_plan_guidance('d1000000-0000-4000-8000-000000000001',3)$q$,'23514');
select pg_temp.expect_error($q$select public.publish_home_plan_guidance('d1000000-0000-4000-8000-000000000001')$q$,'23514');
update public.home_plan_items set dosage='2 repetitions',stop_criteria='Agreed boundary' where id='e1000000-0000-4000-8000-000000000002';
select pg_temp.expect_error($q$select public.approve_home_plan_guidance('d1000000-0000-4000-8000-000000000001',3)$q$,'40001');
select pg_temp.expect_error($q$select public.publish_home_plan_guidance('d1000000-0000-4000-8000-000000000001')$q$,'23514');
select pg_temp.assert_true((public.approve_home_plan_guidance('d1000000-0000-4000-8000-000000000001',4)).approved_at is not null,'approval recorded');
select pg_temp.expect_error($q$update public.home_plan_items set dosage='99 repetitions' where id='e1000000-0000-4000-8000-000000000001'$q$,'23514');
select pg_temp.expect_error($q$update public.home_plans set instructions='Changed after approval' where id='d1000000-0000-4000-8000-000000000001'$q$,'23514');
select pg_temp.expect_error($q$insert into public.home_plan_items(home_plan_id,client_id,name) values('d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Unreviewed')$q$,'23514');
select pg_temp.assert_true((public.publish_home_plan_guidance('d1000000-0000-4000-8000-000000000001')).published_at is not null,'publication recorded');
select pg_temp.expect_error($q$update public.home_plans set status='draft',approved_at=null,published_at=null where id='d1000000-0000-4000-8000-000000000001'$q$,'42501');
select pg_temp.expect_error($q$update public.home_plan_items set published_at=null where id='e1000000-0000-4000-8000-000000000001'$q$,'42501');
select set_config('studio_las.guidance_write','true',true);
select pg_temp.expect_error($q$update public.home_plans set status='archived' where id='d1000000-0000-4000-8000-000000000001'$q$,'42501');

select pg_temp.assert_true(jsonb_array_length(public.trainer_guidance_snapshot('c1000000-0000-4000-8000-000000000001')->'items')=2,'consistent guidance projection');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select * from public.save_client_checkin('e1000000-0000-4000-8000-000000000001',true,5::smallint,2::smallint,'Fictional original response');

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$ declare e public.guidance_events%rowtype; n public.guidance_observation_notes%rowtype; subject text; level text; begin
 select * into strict e from public.guidance_events where home_plan_item_id='e1000000-0000-4000-8000-000000000001';
 perform pg_temp.expect_error(format('update public.guidance_events set payload=%L::jsonb where id=%L','{"note":"overwritten"}',e.id),'23514');
 perform pg_temp.expect_error(format('update public.guidance_events set kind=%L where id=%L','trainer_marker',e.id),'23514');
 perform pg_temp.expect_error(format('update public.guidance_events set deleted_at=now() where id=%L',e.id),'23514');
 perform pg_temp.expect_error(format('select public.add_guidance_observation_note(%L,%L,%L,null)',e.id,'correction','Clarification'),'23514');
 select * into n from public.add_guidance_observation_note(e.id,'correction','Client clarified: two repetitions','Fictional follow-up clarification');
 perform pg_temp.assert_true(n.created_by='b1000000-0000-4000-8000-000000000001' and n.created_at is not null and n.observation_id=e.id,'correction attribution');
 perform public.add_guidance_observation_note(e.id,'trainer_interpretation','Discuss dose at next session',null);
 perform pg_temp.assert_true((select payload=e.payload and completed is not distinct from e.completed from public.guidance_events where id=e.id),'original preserved');
 perform pg_temp.assert_true((select count(*)=2 from public.guidance_observation_notes where observation_id=e.id),'owner sees separate additions');
 foreach subject in array array['a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003'] loop
  level:=case when subject like '%0004' then 'aal2' else 'aal1' end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated','aal',level)::text,true);
  perform pg_temp.expect_error(format('select public.add_guidance_observation_note(%L,%L,%L,null)',e.id,'trainer_interpretation','Unauthorized'),'42501');
  perform pg_temp.assert_true(not exists(select 1 from public.guidance_observation_notes),'unauthorized cannot read notes: '||subject);
 end loop;
end $$;
reset role;
select pg_temp.expect_error($q$update public.guidance_observation_notes set body='silently changed'$q$,'23514');
select pg_temp.expect_error('delete from public.guidance_observation_notes','23514');
select pg_temp.expect_error($q$delete from public.guidance_events where kind='client_checkin'$q$,'23514');
select 'CLIENT_OBSERVATION_HISTORY_SQL_PASS' as result;
rollback;
