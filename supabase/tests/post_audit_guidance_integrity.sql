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
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.trainer_guidance_snapshot('c1000000-0000-4000-8000-000000000001')$q$,'42501');
select pg_temp.expect_error($q$select public.save_client_checkin('e1000000-0000-4000-8000-000000000001',true,5::smallint,2::smallint,null)$q$,'22023');
reset role;
update public.client_users set status='revoked' where user_id='b1000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.save_client_checkin('e1000000-0000-4000-8000-000000000001',true,5::smallint,2::smallint,null)$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$
declare copy public.home_plans%rowtype;
begin
 select * into copy from public.clone_home_plan_guidance('d1000000-0000-4000-8000-000000000001');
 if copy.approved_at is not null or copy.published_at is not null or copy.status<>'draft'
   or copy.draft_source_id<>'d1000000-0000-4000-8000-000000000001' then raise exception 'clone inherited approval'; end if;
 -- A single included action is valid; the other is deliberately excluded.
 update public.home_plan_items set status='archived' where home_plan_id=copy.id and name='Action B';
 select * into copy from public.home_plans where id=copy.id;
 perform public.approve_home_plan_guidance(copy.id,copy.content_revision);
 perform public.publish_home_plan_guidance(copy.id);
 if not exists(select 1 from public.home_plans where id='d1000000-0000-4000-8000-000000000001' and status='archived' and published_at is not null) then raise exception 'history lost'; end if;
end $$;
select pg_temp.assert_true(exists(select 1 from public.guidance_events e join public.home_plan_items i on i.id=e.home_plan_item_id
 where i.id='e1000000-0000-4000-8000-000000000001' and i.dosage='3 repetitions' and e.payload->>'note'='Fictional original response'),'response still references original prescription');
do $$
declare p public.home_plans%rowtype; successor public.home_plans%rowtype;
begin
 select * into p from public.clone_home_plan_guidance('d1000000-0000-4000-8000-000000000001');
 update public.home_plans set guidance_channel='paper' where id=p.id;
 select * into p from public.home_plans where id=p.id;
 perform public.approve_home_plan_guidance(p.id,p.content_revision);
 perform public.publish_home_plan_guidance(p.id);
 perform public.record_home_plan_guidance_delivery(p.id,'recorded');
 select * into successor from public.clone_home_plan_guidance(p.id);
 perform public.approve_home_plan_guidance(successor.id,successor.content_revision);
 perform pg_temp.expect_error(format('select public.publish_home_plan_guidance(%L)',successor.id),'23514');
 perform public.confirm_home_plan_paper_retirement(p.id);
 perform public.publish_home_plan_guidance(successor.id);
 perform public.withdraw_home_plan_guidance(successor.id);
 if not exists(select 1 from public.home_plans where id=successor.id and withdrawn_by='b1000000-0000-4000-8000-000000000001'
   and withdrawal_reason is not null and published_at is not null) then raise exception 'withdrawal metadata missing'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.clone_home_plan_guidance('d1000000-0000-4000-8000-000000000001')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}',true);
select pg_temp.expect_error($q$select public.clone_home_plan_guidance('d1000000-0000-4000-8000-000000000001')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.publish_home_plan_guidance('d1000000-0000-4000-8000-000000000001')$q$,'42501');
do $$ begin if exists(select 1 from public.home_plan_items) then raise exception 'client can read trainer base rows'; end if; end $$;
reset role;
set local role anon;
select pg_temp.expect_error($q$select public.publish_home_plan_guidance('d1000000-0000-4000-8000-000000000001')$q$,'42501');
reset role;
select 'GUIDANCE_INTEGRITY_SQL_PASS' as result;
rollback;

