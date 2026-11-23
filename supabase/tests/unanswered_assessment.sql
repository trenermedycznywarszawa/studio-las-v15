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

insert into public.assessment_results(client_id,performed_at,test_name) values
 ('c1000000-0000-4000-8000-000000000001',current_date,'Fictional unanswered');
select pg_temp.assert_true((select quality is null and pain_before is null from public.assessment_results where test_name='Fictional unanswered'),'omitted answer remains null');
insert into public.assessment_results(client_id,performed_at,test_name,quality,pain_before) values
 ('c1000000-0000-4000-8000-000000000001',current_date,'Fictional explicit','dobrze tolerowane',0);
select pg_temp.assert_true((select quality='dobrze tolerowane' and pain_before=0 from public.assessment_results where test_name='Fictional explicit'),'explicit answer and zero preserved');
select pg_temp.expect_error($q$insert into public.assessment_results(client_id,performed_at,test_name,quality) values ('c1000000-0000-4000-8000-000000000001',current_date,'Invalid','invented')$q$,'23514');
select 'UNANSWERED_ASSESSMENT_SQL_PASS' as result;
rollback;
