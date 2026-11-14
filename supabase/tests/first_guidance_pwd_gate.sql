-- PREPARED, NOT RUN. Synthetic/rollback-only, isolated LOCAL database only.
-- Requires the repository schema and proposed first_guidance_pwd_gate migration.
-- Do not execute on staging/production. No real fixture rows are reused.
begin;
create function pg_temp.assert_true(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'Assertion failed: %',label; end if; end $$;
create function pg_temp.expect_error(command text, expected text) returns void language plpgsql as $$
declare actual text;
begin
  begin execute command; exception when others then actual:=sqlstate; end;
  if actual is distinct from expected then raise exception 'Expected %, got %: %',expected,coalesce(actual,'success'),command; end if;
end $$;
insert into auth.users(id,email) values
 ('a1100000-0000-4000-8000-000000000001','gate-owner@example.invalid'),
 ('a1100000-0000-4000-8000-000000000002','gate-other@example.invalid'),
 ('a1100000-0000-4000-8000-000000000003','gate-client@example.invalid');
insert into public.profiles(id,auth_user_id,role) values
 ('b1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','trainer'),
 ('b1100000-0000-4000-8000-000000000002','a1100000-0000-4000-8000-000000000002','trainer'),
 ('b1100000-0000-4000-8000-000000000003','a1100000-0000-4000-8000-000000000003','client');
insert into public.clients(id,owner_trainer_id,name,legacy_id) values
 ('c1100000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000001','Synthetic new',null),
 ('c1100000-0000-4000-8000-000000000002','b1100000-0000-4000-8000-000000000001','Synthetic legacy','gate-legacy');

create function pg_temp.decision(code text, day_offset integer) returns void language plpgsql as $$
begin
 perform public.save_pwd_workflow('c1100000-0000-4000-8000-000000000001',current_date+day_offset,
  'Synthetic goal','Synthetic meaning','Synthetic boundaries','Trainer interpretation',code,'Synthetic next step','[]'::jsonb);
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1100000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);

-- A: Missing PWD is not permission, including an imported/historical identity.
select pg_temp.expect_error($q$insert into public.home_plans(client_id,title,focus,guidance_channel,status)
 values('c1100000-0000-4000-8000-000000000001','First','Purpose','app','draft')$q$,'23514');
select pg_temp.expect_error($q$insert into public.home_plans(client_id,title,focus,guidance_channel,status)
 values('c1100000-0000-4000-8000-000000000002','Legacy first','Purpose','app','draft')$q$,'23514');
select pg_temp.assert_true(public.trainer_guidance_snapshot('c1100000-0000-4000-8000-000000000002')->'startGate'->>'reason'='pwd_required','legacy has no implicit exception');

do $$
declare code text; day_offset integer:=0;
begin
 foreach code in array array['defer_or_refer','clarify_or_observe','prepare_guidance_later'] loop
  day_offset:=day_offset+1;
  perform pg_temp.decision(code,day_offset);
  perform pg_temp.assert_true(not (public.trainer_guidance_snapshot('c1100000-0000-4000-8000-000000000001')->'startGate'->>'allowed')::boolean,'deferring decision denies start');
  perform pg_temp.expect_error($q$insert into public.home_plans(client_id,title,focus,guidance_channel,status)
   values('c1100000-0000-4000-8000-000000000001','Forbidden draft','Purpose','app','draft')$q$,'23514');
 end loop;
end $$;

-- B: later conscious permitting PWD creates a draft, exact revision approval.
select pg_temp.decision('continue_guidance',10);
insert into public.home_plans(id,client_id,title,focus,guidance_channel,status) values
 ('d1100000-0000-4000-8000-000000000001','c1100000-0000-4000-8000-000000000001','First','Purpose','app','draft');
insert into public.home_plan_items(home_plan_id,client_id,name,dosage,stop_criteria,status) values
 ('d1100000-0000-4000-8000-000000000001','c1100000-0000-4000-8000-000000000001','Action','2 repetitions','Stop at agreed boundary','active');
select pg_temp.expect_error($q$select public.approve_home_plan_guidance('d1100000-0000-4000-8000-000000000001',0)$q$,'40001');
select public.approve_home_plan_guidance(id,content_revision) from public.home_plans where id='d1100000-0000-4000-8000-000000000001';

-- A: decision changed after approval; bypassing the UI must not publish.
select pg_temp.decision('defer_or_refer',11);
select pg_temp.expect_error($q$select public.publish_home_plan_guidance('d1100000-0000-4000-8000-000000000001')$q$,'23514');
select pg_temp.expect_error($q$select public.approve_home_plan_guidance('d1100000-0000-4000-8000-000000000001',2)$q$,'23514');
select pg_temp.expect_error($q$select public.clone_home_plan_guidance('d1100000-0000-4000-8000-000000000001')$q$,'23514');
select pg_temp.assert_true(not exists(select 1 from public.home_plans where published_at is not null),'no first publication after changed PWD');
select pg_temp.expect_error($q$update public.home_plans set published_at=now(),status='active'
 where id='d1100000-0000-4000-8000-000000000001'$q$,'42501');

-- B: a later explicit decision unblocks; a backdated entry does not silently
-- replace the current PWD under the existing workspace date-first ordering.
select pg_temp.decision('continue_guidance',12);
select pg_temp.decision('defer_or_refer',-1);
select pg_temp.assert_true((public.trainer_guidance_snapshot('c1100000-0000-4000-8000-000000000001')->'startGate'->>'allowed')::boolean,'same existing PWD order');
select public.publish_home_plan_guidance('d1100000-0000-4000-8000-000000000001');

-- Once published, later deferral does not withdraw history or introduce a
-- new gate on an established relationship. Explicit paper retirement remains.
select pg_temp.decision('defer_or_refer',13);
select pg_temp.assert_true(public.trainer_guidance_snapshot('c1100000-0000-4000-8000-000000000001')->'startGate'->>'reason'='publication_history','history exemption');
select pg_temp.assert_true(exists(select 1 from public.home_plans where id='d1100000-0000-4000-8000-000000000001' and status='active'),'no automatic withdrawal');
do $$
declare p public.home_plans%rowtype; successor public.home_plans%rowtype;
begin
 select * into p from public.clone_home_plan_guidance('d1100000-0000-4000-8000-000000000001');
 update public.home_plans set guidance_channel='paper' where id=p.id;
 select * into p from public.home_plans where id=p.id;
 perform public.approve_home_plan_guidance(p.id,p.content_revision);
 perform public.publish_home_plan_guidance(p.id);
 select * into successor from public.clone_home_plan_guidance(p.id);
 perform public.approve_home_plan_guidance(successor.id,successor.content_revision);
 perform pg_temp.expect_error(format('select public.publish_home_plan_guidance(%L)',successor.id),'23514');
 perform public.confirm_home_plan_paper_retirement(p.id);
 perform public.publish_home_plan_guidance(successor.id);
 perform public.withdraw_home_plan_guidance(successor.id);
end $$;
select pg_temp.assert_true(public.trainer_guidance_snapshot('c1100000-0000-4000-8000-000000000001')->'startGate'->>'reason'='publication_history','archived publication still counts');

-- A: retain owner/AAL2 boundary and private helper non-exposure.
select pg_temp.expect_error($q$select private.first_guidance_start_state('c1100000-0000-4000-8000-000000000001')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1100000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.publish_home_plan_guidance('d1100000-0000-4000-8000-000000000001')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1100000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
select pg_temp.expect_error($q$select public.approve_home_plan_guidance('d1100000-0000-4000-8000-000000000001',2)$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1100000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.trainer_guidance_snapshot('c1100000-0000-4000-8000-000000000001')$q$,'42501');
reset role;
set local role anon;
select pg_temp.expect_error($q$select public.publish_home_plan_guidance('d1100000-0000-4000-8000-000000000001')$q$,'42501');
reset role;
select 'FIRST_GUIDANCE_PWD_GATE_SQL_PASS (single-connection; concurrency separate)' as result;
rollback;
