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

insert into public.sessions(id,client_id,date,trainer_observation,trainer_decision) values
 ('71000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','2026-06-01','Fictional starting capability','Discussed boundary'),
 ('71000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','2026-07-01','Fictional midpoint capability','Adjusted session'),
 ('71000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000001','2026-08-24','Fictional current capability','Discuss next step');
create function pg_temp.report_input() returns jsonb language sql as $$ select jsonb_build_object(
 'start_goal','Fictional valued activity','start_capability','Fictional starting boundary','change','Trainer described change',
 'interpretation','PRIVATE trainer interpretation','decision','PRIVATE deliberate decision','current_capability','Fictional meaningful capability',
 'next_step','Agreed next review','client_material','CLIENT authored material only') $$;
create function pg_temp.report_sources() returns jsonb language sql as $$ select jsonb_agg(jsonb_build_object('table','sessions','id',id,'updated_at',updated_at) order by date) from public.sessions where id::text like '71000000-%' $$;
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input(),'[]')$q$,'22023');
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input()-'interpretation',pg_temp.report_sources())$q$,'22023');
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input(),jsonb_set(pg_temp.report_sources(),'{0,updated_at}','"2000-01-01T00:00:00Z"'))$q$,'40001');
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input(),jsonb_set(pg_temp.report_sources(),'{0,table}','"profiles"'))$q$,'22023');
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input(),jsonb_build_array(pg_temp.report_sources()->0,pg_temp.report_sources()->0,pg_temp.report_sources()->0))$q$,'22023');
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input(),pg_temp.report_sources()||pg_temp.report_sources()||pg_temp.report_sources())$q$,'22023');
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input(),jsonb_set(pg_temp.report_sources(),'{0,id}','"71000000-0000-4000-8000-000000000099"'))$q$,'42501');
select set_config('test.report_id',(public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Fictional 12-week report',pg_temp.report_input(),jsonb_set(pg_temp.report_sources(),'{0,excerpt}','"FORGED EXCERPT"'))).id::text,true);
select pg_temp.assert_true((select status='draft' and approved_at is null and published_at is null and jsonb_array_length(evidence_snapshot)=3 from public.reports where id=current_setting('test.report_id')::uuid),'create is unpublished and unapproved');
select pg_temp.assert_true((select evidence_snapshot::text not like '%FORGED EXCERPT%' from public.reports where id=current_setting('test.report_id')::uuid),'server ignores forged excerpt');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.assert_true((select jsonb_array_length(public.client_portal_snapshot()->'reports')=0),'draft invisible to client');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
select pg_temp.expect_error($q$update public.reports set status='published',published_at=now() where id=current_setting('test.report_id')::uuid$q$,'42501');
select pg_temp.expect_error($q$select public.transition_evidence_report(current_setting('test.report_id')::uuid,'publish',(select updated_at from public.reports where id=current_setting('test.report_id')::uuid))$q$,'22023');
select pg_temp.expect_error($q$select public.transition_evidence_report(current_setting('test.report_id')::uuid,'approve','2000-01-01')$q$,'40001');
update public.sessions set trainer_observation='Later trainer correction' where id='71000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select evidence_snapshot->0->>'excerpt' like 'Fictional starting capability%' from public.reports where id=current_setting('test.report_id')::uuid),'captured original survives later trainer edit');
select (public.transition_evidence_report(current_setting('test.report_id')::uuid,'approve',(select updated_at from public.reports where id=current_setting('test.report_id')::uuid))).status;
select pg_temp.expect_error($q$select public.transition_evidence_report(current_setting('test.report_id')::uuid,'publish','2000-01-01')$q$,'40001');
select pg_temp.assert_true((select approved_at is not null and published_at is null from public.reports where id=current_setting('test.report_id')::uuid),'approval is separate');
select pg_temp.expect_error($q$update public.reports set content='Changed after approval' where id=current_setting('test.report_id')::uuid$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.transition_evidence_report(current_setting('test.report_id')::uuid,'publish',now())$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}',true);
select pg_temp.expect_error($q$select public.transition_evidence_report(current_setting('test.report_id')::uuid,'publish',now())$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
select (public.transition_evidence_report(current_setting('test.report_id')::uuid,'publish',(select updated_at from public.reports where id=current_setting('test.report_id')::uuid))).status;
select pg_temp.expect_error($q$update public.reports set content='Changed published material' where id=current_setting('test.report_id')::uuid$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.assert_true((select count(*)=0 from public.reports),'client cannot read raw working notes');
select pg_temp.assert_true((select (public.client_portal_snapshot()->'reports'->0->>'content')='CLIENT authored material only'),'client sees only authored material');
select pg_temp.assert_true((select public.client_portal_snapshot()::text not like '%PRIVATE%'),'private interpretation absent from client snapshot');
select pg_temp.expect_error($q$select public.transition_evidence_report(current_setting('test.report_id')::uuid,'withdraw',now(),'Client attempt')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
select pg_temp.assert_true((select jsonb_array_length(public.client_portal_snapshot()->'reports')=0),'unrelated client sees no report');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
select pg_temp.expect_error($q$select public.transition_evidence_report(current_setting('test.report_id')::uuid,'withdraw',now(),'')$q$,'22023');
select (public.transition_evidence_report(current_setting('test.report_id')::uuid,'withdraw',(select updated_at from public.reports where id=current_setting('test.report_id')::uuid),'Fictional correction required')).status;
select pg_temp.assert_true((select status='archived' and withdrawn_by='b1000000-0000-4000-8000-000000000001' and content='CLIENT authored material only' from public.reports where id=current_setting('test.report_id')::uuid),'withdrawal preserves authored historical content');
select set_config('test.new_report_id',(public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Fictional new draft',pg_temp.report_input(),pg_temp.report_sources())).id::text,true);
select pg_temp.assert_true(current_setting('test.new_report_id')<>current_setting('test.report_id'),'new draft has independent identity');
select pg_temp.assert_true((select approved_at is null and published_at is null from public.reports where id=current_setting('test.new_report_id')::uuid),'new draft does not inherit approval');
select pg_temp.assert_true((select status='archived' and evidence_snapshot->0->>'excerpt' like 'Fictional starting capability%' from public.reports where id=current_setting('test.report_id')::uuid),'new draft preserves old evidence and withdrawal');
reset role;
update public.client_users set status='revoked' where client_id='c1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.client_portal_snapshot()$q$,'42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
insert into public.home_plans(id,client_id,title,focus,guidance_channel,status) values ('98000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Fictional guidance','Source goal','app','draft');
insert into public.home_plan_items(client_id,home_plan_id,name,dosage,stop_criteria) values ('c1000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000001','Agreed task','2 repetitions','Agreed boundary');
create function pg_temp.plan_sources() returns jsonb language sql as $$ select (pg_temp.report_sources()-2)||jsonb_build_array(jsonb_build_object('table','home_plans','id',id,'updated_at',updated_at,'excerpt','FORGED')) from public.home_plans where id='98000000-0000-4000-8000-000000000001' $$;
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input(),pg_temp.plan_sources())$q$,'22023');
select public.approve_home_plan_guidance('98000000-0000-4000-8000-000000000001',(select content_revision from public.home_plans where id='98000000-0000-4000-8000-000000000001'));
select public.publish_home_plan_guidance('98000000-0000-4000-8000-000000000001');
select set_config('test.guidance_report_id',(public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Guidance source report',pg_temp.report_input(),pg_temp.plan_sources())).id::text,true);
select pg_temp.assert_true((select evidence_snapshot->2->>'table'='home_plans' and evidence_snapshot->2->>'excerpt' like 'Fictional guidance%' and evidence_snapshot::text not like '%FORGED%' and approved_at is null from public.reports where id=current_setting('test.guidance_report_id')::uuid),'published guidance captured by server in unapproved draft');
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report',pg_temp.report_input(),jsonb_set(pg_temp.plan_sources(),'{2,updated_at}','"2000-01-01"'))$q$,'40001');
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000002','Report',pg_temp.report_input(),pg_temp.plan_sources())$q$,'42501');
set local role anon;
select pg_temp.expect_error($q$select public.create_evidence_report('c1000000-0000-4000-8000-000000000001','Report','{}','[]')$q$,'42501');
select 'PROCESS_REPORT_GUIDANCE_SQL_PASS' as result;
rollback;
