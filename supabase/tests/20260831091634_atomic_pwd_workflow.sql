-- Executable synthetic integration regression for atomic PWD persistence.
-- Run only after all migrations on the canonical isolated non-production staging.
-- The outer transaction rolls back every synthetic mutation.

begin;

create or replace function pg_temp.reject_pwd_rollback_marker()
returns trigger
language plpgsql
as $$
begin
  if new.test_name = 'PWD_ROLLBACK_MARKER' then
    raise exception 'synthetic forced assessment failure';
  end if;
  return new;
end;
$$;

create trigger reject_pwd_rollback_marker
before insert on public.assessment_results
for each row execute function pg_temp.reject_pwd_rollback_marker();

create temporary table pwd_test_fixture as
select
  owner_a.id as owner_a_profile_id,
  owner_a.auth_user_id as owner_a_auth_id,
  owner_b.auth_user_id as owner_b_auth_id,
  client.id as client_id
from public.profiles owner_a
join public.clients client
  on client.owner_trainer_id = owner_a.id
 and client.deleted_at is null
cross join public.profiles owner_b
where owner_a.email = 'trainer.a@example.test'
  and owner_a.role = 'trainer'
  and owner_b.email = 'trainer.b@example.test'
  and owner_b.role = 'trainer'
order by client.created_at
limit 1;

grant select on table pwd_test_fixture to authenticated;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', p.auth_user_id,
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
)
from public.profiles p
where p.email = 'trainer.a@example.test'
  and p.role = 'trainer';

set local role authenticated;

do $test$
declare
  v_client_id uuid;
  v_owner_a uuid;
  v_owner_b_auth uuid;
  v_owner_a_auth uuid;
  v_result jsonb;
  v_session_id uuid;
  v_home_plan_count bigint;
  v_goal_before text;
  v_motivation_before text;
  v_session_count bigint;
  v_assessment_count bigint;
begin
  select owner_a_profile_id, owner_a_auth_id, owner_b_auth_id, client_id
  into strict v_owner_a, v_owner_a_auth, v_owner_b_auth, v_client_id
  from pg_temp.pwd_test_fixture;

  select count(*) into v_home_plan_count
  from public.home_plans
  where client_id = v_client_id;
  select count(*) into v_session_count
  from public.sessions
  where client_id = v_client_id;

  v_result := public.save_pwd_workflow(
    v_client_id,
    date '2026-08-31',
    'SYNTHETIC: swobodne wejście po schodach',
    'SYNTHETIC: samodzielne wyjście z domu',
    'SYNTHETIC: spokojne tempo i możliwość przerwania',
    'SYNTHETIC: obserwacja wymaga decyzji trenera',
    'clarify_or_observe',
    'SYNTHETIC: wrócić do pytania podczas następnej rozmowy',
    jsonb_build_array(
      jsonb_build_object(
        'observationType', 'goal_task',
        'name', 'Wejście po schodach',
        'resultText', 'Jedno piętro w spokojnym tempie',
        'reactionText', 'Tempo było akceptowalne',
        'referenceId', null
      ),
      jsonb_build_object(
        'observationType', 'trainer_observation',
        'name', 'Własna obserwacja trenera',
        'resultText', 'Klient sam zwolnił przy niepewności',
        'reactionText', null,
        'referenceId', null
      )
    )
  );

  v_session_id := (v_result ->> 'sessionId')::uuid;
  if v_session_id is null or (v_result ->> 'observationCount')::integer <> 2 then
    raise exception 'FAIL: success result does not identify one PWD session and two observations';
  end if;
  if (select count(*) from public.sessions where client_id = v_client_id) <> v_session_count + 1 then
    raise exception 'FAIL: success did not create exactly one session';
  end if;
  if (select goal from public.clients where id = v_client_id)
       <> 'SYNTHETIC: swobodne wejście po schodach'
     or (select motivation from public.clients where id = v_client_id)
       <> 'SYNTHETIC: samodzielne wyjście z domu' then
    raise exception 'FAIL: success did not update client goal and motivation';
  end if;

  if not exists (
    select 1 from public.sessions
    where id = v_session_id
      and client_id = v_client_id
      and session_type = 'pwd'
      and trainer_decision = 'Dodatkowe wyjaśnienie lub obserwacja'
  ) then
    raise exception 'FAIL: PWD session was not persisted with the exact trainer decision';
  end if;

  if (
    select count(*) from public.assessment_results
    where session_id = v_session_id
      and client_id = v_client_id
      and observation_type in ('goal_task', 'trainer_observation')
      and trainer_decision = 'obserwuj'
      and next_step is null
  ) <> 2 then
    raise exception 'FAIL: observations are not exactly linked or carry copied decision semantics';
  end if;

  if not exists (
    select 1 from public.assessment_results
    where session_id = v_session_id
      and observation_type = 'goal_task'
      and test_name = 'Wejście po schodach'
      and result_text = 'Jedno piętro w spokojnym tempie'
      and reaction_text = 'Tempo było akceptowalne'
  ) then
    raise exception 'FAIL: observation type/name/result/reaction did not round-trip';
  end if;

  if (select count(*) from public.home_plans where client_id = v_client_id) <> v_home_plan_count then
    raise exception 'FAIL: PWD changed home plans';
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_owner_a_auth, 'role', 'authenticated', 'aal', 'aal1')::text,
    true
  );
  begin
    perform public.save_pwd_workflow(
      v_client_id, current_date, 'x', 'x', 'x', 'x',
      'continue_guidance', 'x', '[]'::jsonb
    );
    raise exception 'FAIL: AAL1 executed save_pwd_workflow';
  exception
    when insufficient_privilege then null;
  end;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_owner_b_auth, 'role', 'authenticated', 'aal', 'aal2')::text,
    true
  );
  begin
    perform public.save_pwd_workflow(
      v_client_id, current_date, 'x', 'x', 'x', 'x',
      'continue_guidance', 'x', '[]'::jsonb
    );
    raise exception 'FAIL: non-owner trainer executed save_pwd_workflow';
  exception
    when insufficient_privilege then null;
  end;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_owner_a_auth, 'role', 'authenticated', 'aal', 'aal2')::text,
    true
  );

  select goal, motivation into v_goal_before, v_motivation_before
  from public.clients where id = v_client_id;
  select count(*) into v_session_count
  from public.sessions where client_id = v_client_id;
  select count(*) into v_assessment_count
  from public.assessment_results where client_id = v_client_id;

  begin
    perform public.save_pwd_workflow(
      v_client_id,
      date '2026-08-31',
      'SYNTHETIC: goal that must roll back',
      'SYNTHETIC: motivation that must roll back',
      'SYNTHETIC: rollback context',
      'SYNTHETIC: rollback interpretation',
      'continue_guidance',
      'SYNTHETIC: rollback next step',
      jsonb_build_array(jsonb_build_object(
        'observationType', 'trainer_observation',
        'name', 'PWD_ROLLBACK_MARKER',
        'resultText', 'This insert must fail',
        'reactionText', null,
        'referenceId', null
      ))
    );
    raise exception 'FAIL: forced rollback call unexpectedly succeeded';
  exception
    when others then
      if sqlerrm = 'FAIL: forced rollback call unexpectedly succeeded' then
        raise;
      end if;
  end;

  if (select goal from public.clients where id = v_client_id) is distinct from v_goal_before
     or (select motivation from public.clients where id = v_client_id) is distinct from v_motivation_before then
    raise exception 'FAIL: client update survived forced observation failure';
  end if;
  if (select count(*) from public.sessions where client_id = v_client_id) <> v_session_count then
    raise exception 'FAIL: session survived forced observation failure';
  end if;
  if (select count(*) from public.assessment_results where client_id = v_client_id) <> v_assessment_count then
    raise exception 'FAIL: assessment survived forced observation failure';
  end if;
end;
$test$;

reset role;
rollback;