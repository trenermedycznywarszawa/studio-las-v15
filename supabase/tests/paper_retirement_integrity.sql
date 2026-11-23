-- Fictional, rollback-only regression for one-way paper retirement.
begin;

create function pg_temp.expect_error(command text, expected text) returns void
language plpgsql as $$
declare actual text;
begin
  begin execute command; exception when others then actual := sqlstate; end;
  if actual is distinct from expected then
    raise exception 'Expected %, got % for %', expected, coalesce(actual, 'success'), command;
  end if;
end $$;

insert into auth.users(id,email) values
  ('a9100000-0000-4000-8000-000000000001','paper-retirement-owner@example.invalid');
insert into public.profiles(id,auth_user_id,role) values
  ('b9100000-0000-4000-8000-000000000001','a9100000-0000-4000-8000-000000000001','trainer');
insert into public.clients(id,owner_trainer_id,name) values
  ('c9100000-0000-4000-8000-000000000001','b9100000-0000-4000-8000-000000000001','Fictional paper retirement');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a9100000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);

insert into public.home_plans(id,client_id,title,focus,guidance_channel,status) values
  ('d9100000-0000-4000-8000-000000000001','c9100000-0000-4000-8000-000000000001','Paper guidance','Fictional purpose','paper','draft');
insert into public.home_plan_items(id,home_plan_id,client_id,name,dosage,stop_criteria) values
  ('e9100000-0000-4000-8000-000000000001','d9100000-0000-4000-8000-000000000001','c9100000-0000-4000-8000-000000000001','Action','1 repetition','Stop');

select public.approve_home_plan_guidance(
  'd9100000-0000-4000-8000-000000000001',
  (select content_revision from public.home_plans where id='d9100000-0000-4000-8000-000000000001')
);
select public.publish_home_plan_guidance('d9100000-0000-4000-8000-000000000001');
select public.confirm_home_plan_paper_retirement('d9100000-0000-4000-8000-000000000001');

select pg_temp.expect_error(
  $q$select public.record_home_plan_guidance_delivery('d9100000-0000-4000-8000-000000000001','pending')$q$,
  '23514'
);
select pg_temp.expect_error(
  $q$select public.record_home_plan_guidance_delivery('d9100000-0000-4000-8000-000000000001','recorded')$q$,
  '23514'
);
select pg_temp.expect_error(
  $q$select public.record_home_plan_guidance_delivery('d9100000-0000-4000-8000-000000000001','paper_retirement_unresolved')$q$,
  '23514'
);

do $$ begin
  if (select delivery_status from public.home_plans where id='d9100000-0000-4000-8000-000000000001') <> 'paper_retirement_confirmed' then
    raise exception 'confirmed paper retirement was reopened';
  end if;
end $$;

select 'PAPER_RETIREMENT_INTEGRITY_PASS' as result;
rollback;
