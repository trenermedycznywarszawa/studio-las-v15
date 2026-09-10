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

do $$ declare snapshot jsonb; saved jsonb; repeated jsonb; begin
 snapshot:=public.client_portal_snapshot();
 perform pg_temp.assert_true(snapshot->'homePlan'->>'id'='d1000000-0000-4000-8000-000000000001','exact release id');
 perform pg_temp.assert_true(snapshot->'homePlan'->>'releaseVersion'='1' and snapshot->'homePlan'->>'contentRevision'='4','published revision identity');
 perform pg_temp.assert_true(snapshot->'homePlan'->'items'->0->'todayResponse'='null'::jsonb,'nothing saved initially');
 perform pg_temp.expect_error($q$select public.save_client_guidance_response('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000099','Reduced as agreed','f1000000-0000-4000-8000-000000000001')$q$,'22023');
 saved:=public.save_client_guidance_response('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Fictional: reduced as agreed; stopped at the boundary.','f1000000-0000-4000-8000-000000000001');
 perform pg_temp.assert_true(saved->>'id'='f1000000-0000-4000-8000-000000000001' and saved->>'alreadySaved'='false','new response saved');
 perform pg_temp.assert_true(saved->'legacyCompleted'='null'::jsonb,'reduced response is not classified as failure');
 repeated:=public.save_client_guidance_response('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Fictional: reduced as agreed; stopped at the boundary.','f1000000-0000-4000-8000-000000000001');
 perform pg_temp.assert_true(repeated->>'id'=saved->>'id' and repeated->>'alreadySaved'='true','retry returns same original');
 repeated:=public.save_client_guidance_response('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Different second statement','f1000000-0000-4000-8000-000000000002');
 perform pg_temp.assert_true(repeated->>'text'=saved->>'text' and repeated->>'alreadySaved'='true','second tab cannot overwrite today');
 perform pg_temp.expect_error($q$select public.save_client_guidance_response('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Changed retry','f1000000-0000-4000-8000-000000000001')$q$,'22023');
 snapshot:=public.client_portal_snapshot();
 perform pg_temp.assert_true(exists(select 1 from jsonb_array_elements(snapshot->'homePlan'->'items') item where item->>'id'='e1000000-0000-4000-8000-000000000001' and item->'todayResponse'->>'id'=saved->>'id'),'saved state visible after reload');
 perform pg_temp.assert_true(not ((snapshot->'homePlan'->'items'->0) ? 'trainer_note'),'trainer context excluded');
end $$;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.save_client_guidance_response('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Unrelated','f1000000-0000-4000-8000-000000000001')$q$,'22023');
reset role;
update public.client_users set status='revoked' where user_id='b1000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.save_client_guidance_response('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Fictional: reduced as agreed; stopped at the boundary.','f1000000-0000-4000-8000-000000000001')$q$,'42501');
select pg_temp.expect_error('select public.client_portal_snapshot()','42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
select pg_temp.expect_error($q$select public.save_client_guidance_response(null,null,'Trainer cannot fabricate',null)$q$,'42501');
reset role;
set local role anon;
select pg_temp.expect_error($q$select public.save_client_guidance_response(null,null,'Anonymous',null)$q$,'42501');
reset role;
select 'CLIENT_RESPONSE_CONTRACT_SQL_PASS' as result;
rollback;
