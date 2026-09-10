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

insert into public.trainer_signal_reviews(id,client_id,signal_key,outcome,actor_profile_id) values
 ('91000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','symptom::session::2026-09-09::exact-source','contact_required','b1000000-0000-4000-8000-000000000001');
select pg_temp.expect_error($q$insert into public.trainer_signal_reviews(client_id,signal_key,outcome,actor_profile_id,contact_resolved_at) values('c1000000-0000-4000-8000-000000000001','forged-source','contact_required','b1000000-0000-4000-8000-000000000001',now())$q$,'42501');
select pg_temp.expect_error($q$select public.resolve_trainer_signal_contact('91000000-0000-4000-8000-000000000001','')$q$,'22023');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.resolve_trainer_signal_contact('91000000-0000-4000-8000-000000000001','No MFA')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}',true);
select pg_temp.expect_error($q$select public.resolve_trainer_signal_contact('91000000-0000-4000-8000-000000000001','Wrong trainer')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select pg_temp.expect_error($q$select public.resolve_trainer_signal_contact('91000000-0000-4000-8000-000000000001','Client')$q$,'42501');
select pg_temp.assert_true(not exists(select 1 from public.trainer_signal_reviews),'client cannot read review');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$ declare r public.trainer_signal_reviews%rowtype; begin
 select * into r from public.resolve_trainer_signal_contact('91000000-0000-4000-8000-000000000001','Fictional contact: clarified the response.');
 perform pg_temp.assert_true(r.contact_resolved_by='b1000000-0000-4000-8000-000000000001' and r.contact_resolved_at is not null and r.outcome='contact_required','attributed completion preserves original review');
 select * into r from public.resolve_trainer_signal_contact(r.id,'Different retry');
 perform pg_temp.assert_true(r.contact_resolution_note='Fictional contact: clarified the response.','repeat cannot rewrite contact');
end $$;
select pg_temp.expect_error($q$update public.trainer_signal_reviews set contact_resolved_at=null$q$,'42501');
reset role;
select pg_temp.expect_error($q$update public.trainer_signal_reviews set contact_resolution_note='Altered'$q$,'23514');
set local role anon;
select pg_temp.expect_error($q$select public.resolve_trainer_signal_contact('91000000-0000-4000-8000-000000000001','Anonymous')$q$,'42501');
reset role;
select 'SIGNAL_CONTACT_SQL_PASS' as result;
rollback;
