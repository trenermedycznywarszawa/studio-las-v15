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

insert into public.client_intakes(id,client_id,source,raw_payload) values
 ('81000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','fictional','{"statement":"Original fictional words"}');
select pg_temp.expect_error($q$update public.client_intakes set raw_payload='{}' where id='81000000-0000-4000-8000-000000000001'$q$,'23514');
select pg_temp.expect_error($q$update public.client_intakes set source='rewritten' where id='81000000-0000-4000-8000-000000000001'$q$,'23514');
select pg_temp.expect_error($q$update public.client_intakes set deleted_at=now() where id='81000000-0000-4000-8000-000000000001'$q$,'23514');
update public.client_intakes set trainer_notes='Separate trainer clarification',main_goal='Normalized trainer summary' where id='81000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select raw_payload->>'statement'='Original fictional words' and trainer_notes='Separate trainer clarification' from public.client_intakes where id='81000000-0000-4000-8000-000000000001'),'source remains independent of normalized fields');
reset role;
select pg_temp.expect_error($q$delete from public.client_intakes where id='81000000-0000-4000-8000-000000000001'$q$,'23514');
select 'IMPORTED_INTAKE_SOURCE_SQL_PASS' as result;
rollback;
