-- Studio Las OS - post-hardening RLS role scenarios
--
-- Prerequisites in a disposable/test Supabase project:
--   1. apply migrations 001 through 011,
--   2. run supabase/dev/seed_test_data.sql,
--   3. apply migration 012_security_hardening.sql,
--   4. run 012_security_hardening_audit.sql,
--   5. run this file as a privileged role that can SET ROLE.
--
-- Every write is wrapped in a transaction and rolled back.

select 'trainer A isolation and protected ownership columns' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
  got_expected_error boolean;
begin
  select count(*) into actual
  from public.clients
  where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer A must see client A, got %', actual;
  end if;

  select count(*) into actual
  from public.clients
  where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer A must not see client B, got %', actual;
  end if;

  got_expected_error := false;
  begin
    update public.clients
    set owner_trainer_id = '22222222-2222-4222-8222-222222222222'
    where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: browser trainer cannot update owner_trainer_id';
  end if;

  got_expected_error := false;
  begin
    insert into public.sessions (id, client_id, legacy_id, date)
    values (
      'af100000-0000-4000-8000-000000000001',
      'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
      'hardening_wrong_trainer_insert',
      date '2026-08-01'
    );
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: trainer A inserted a session for client B';
  end if;

  update public.client_users
  set status = 'revoked'
  where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  get diagnostics actual = row_count;
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: owner trainer A must be able to revoke own client account link, got %', actual;
  end if;
end;
$test$;
rollback;

select 'trainer B cross-tenant and owner-only assignment checks' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
begin
  select count(*) into actual
  from public.clients
  where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer B must see client B, got %', actual;
  end if;

  select count(*) into actual
  from public.clients
  where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer B must not see client A, got %', actual;
  end if;

  update public.client_users
  set status = 'revoked'
  where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  get diagnostics actual = row_count;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer B changed client A account link, rows %', actual;
  end if;

  update public.client_trainers
  set trainer_id = '22222222-2222-4222-8222-222222222222'
  where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  get diagnostics actual = row_count;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer B changed client A trainer assignment, rows %', actual;
  end if;
end;
$test$;
rollback;

select 'client A RPC projection and write boundary' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
  snapshot jsonb;
  item_id uuid;
  got_expected_error boolean;
begin
  select public.client_portal_snapshot() into snapshot;

  if snapshot is null or jsonb_typeof(snapshot) <> 'object' then
    raise exception 'ASSERTION FAILED: client A snapshot is missing';
  end if;

  if not (snapshot ? 'client') or not (snapshot ? 'homePlan') then
    raise exception 'ASSERTION FAILED: client A snapshot lacks required sections';
  end if;

  if (snapshot -> 'client') ? 'id' then
    raise exception 'ASSERTION FAILED: client snapshot exposes technical client id';
  end if;

  if snapshot::text ~* '(red_flags_text|contraindications|working_hypothesis|trainer_observation|trainer_decision|trainer_interpretation|trainer_note|trainer_notes|raw_payload|owner_trainer_id)' then
    raise exception 'ASSERTION FAILED: client snapshot contains trainer-only field';
  end if;

  select count(*) into actual from public.clients;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A can read base clients table, got %', actual;
  end if;

  select count(*) into actual from public.sessions;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A can read base sessions table, got %', actual;
  end if;

  item_id := nullif(snapshot #>> '{homePlan,items,0,id}', '')::uuid;
  if item_id is null then
    raise exception 'ASSERTION FAILED: seeded client A has no published home-plan item';
  end if;

  select count(*) into actual
  from public.save_client_checkin(item_id, true, 6::smallint, 2::smallint, 'transactional RLS test');
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client A valid check-in was not recorded, got %', actual;
  end if;

  got_expected_error := false;
  begin
    perform public.save_client_checkin(
      '99999999-9999-4999-8999-999999999999'::uuid,
      true,
      6::smallint,
      2::smallint,
      'wrong item'
    );
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: client A used an unassigned home-plan item';
  end if;

  got_expected_error := false;
  begin
    insert into public.guidance_events (
      client_id,
      home_plan_item_id,
      event_date,
      kind,
      completed,
      payload,
      created_by
    ) values (
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
      item_id,
      current_date,
      'client_checkin',
      true,
      '{"unvalidated":true}'::jsonb,
      '33333333-3333-4333-8333-333333333333'
    );
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: client A bypassed the check-in RPC';
  end if;
end;
$test$;
rollback;

select 'client B receives only an auth-derived snapshot' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
  snapshot jsonb;
begin
  select public.client_portal_snapshot() into snapshot;

  if snapshot is null or jsonb_typeof(snapshot) <> 'object' then
    raise exception 'ASSERTION FAILED: client B snapshot is missing';
  end if;

  if (snapshot -> 'client') ? 'id' then
    raise exception 'ASSERTION FAILED: client B snapshot exposes technical client id';
  end if;

  select count(*) into actual from public.body_measurements;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client B can read base measurements table, got %', actual;
  end if;

  select count(*) into actual from public.reports;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client B can read base reports table, got %', actual;
  end if;
end;
$test$;
rollback;

select 'revoked client relationship blocks access immediately' as test_phase;

begin;
update public.client_users
set status = 'revoked'
where user_id = '33333333-3333-4333-8333-333333333333'
  and client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $test$
declare
  got_expected_error boolean := false;
begin
  begin
    perform public.client_portal_snapshot();
  exception when others then
    got_expected_error := true;
  end;

  if not got_expected_error then
    raise exception 'ASSERTION FAILED: revoked client relationship retained portal access';
  end if;
end;
$test$;
rollback;

select 'anonymous role has no client RPC access' as test_phase;

begin;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $test$
declare
  got_expected_error boolean := false;
begin
  begin
    perform public.client_portal_snapshot();
  exception when others then
    got_expected_error := true;
  end;

  if not got_expected_error then
    raise exception 'ASSERTION FAILED: anon executed client_portal_snapshot';
  end if;
end;
$test$;
rollback;

select 'Studio Las OS post-hardening role tests completed' as test_result;
