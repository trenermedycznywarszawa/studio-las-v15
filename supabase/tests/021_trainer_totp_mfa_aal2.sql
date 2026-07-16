-- Studio Las OS - trainer TOTP MFA / AAL2 regression tests
-- Run after migrations 001-021 and supabase/dev/seed_test_data.sql.
-- All writes are rolled back.

begin;

do $test$
declare
  public_gate_count integer;
begin
  select count(*)
  into public_gate_count
  from pg_policies
  where schemaname = 'public'
    and policyname = 'trainer_totp_aal2_gate'
    and permissive = 'RESTRICTIVE'
    and roles @> array['authenticated']::name[];

  if public_gate_count <> 21 then
    raise exception 'ASSERTION FAILED: expected 21 restrictive trainer AAL2 policies, found %',
      public_gate_count;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'studio_las_documents_trainer_totp_aal2_gate'
      and permissive = 'RESTRICTIVE'
  ) then
    raise exception 'ASSERTION FAILED: Storage trainer AAL2 gate is missing';
  end if;

  if not has_function_privilege(
    'authenticated',
    'private.trainer_mfa_satisfied()',
    'EXECUTE'
  ) then
    raise exception 'ASSERTION FAILED: authenticated policies cannot execute the MFA predicate';
  end if;

  if has_function_privilege('anon', 'private.trainer_mfa_satisfied()', 'EXECUTE') then
    raise exception 'ASSERTION FAILED: anon can execute the MFA predicate';
  end if;
end;
$test$;

rollback;

-- Trainer A at AAL1 can read only the own profile needed to bootstrap MFA.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);

do $test$
declare
  actual bigint;
  got_expected_error boolean := false;
begin
  select count(*) into actual
  from public.profiles
  where auth_user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer AAL1 cannot bootstrap own profile';
  end if;

  select count(*) into actual from public.clients;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer AAL1 can read clients';
  end if;

  select count(*) into actual from public.sessions;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer AAL1 can read sessions';
  end if;

  begin
    perform public.trainer_client_access_status(
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1'::uuid
    );
  exception when insufficient_privilege then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: trainer AAL1 executed access status RPC';
  end if;

  got_expected_error := false;
  begin
    insert into public.sessions (id, client_id, legacy_id, date)
    values (
      'af210000-0000-4000-8000-000000000001',
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
      'mfa_aal1_forbidden_insert',
      date '2026-09-21'
    );
  exception when insufficient_privilege then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: trainer AAL1 inserted a session';
  end if;
end;
$test$;

rollback;

-- Trainer A at AAL2 retains tenant isolation and can use trainer operations.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

do $test$
declare
  actual bigint;
  access_state jsonb;
begin
  select count(*) into actual
  from public.clients
  where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer AAL2 cannot read own client';
  end if;

  select count(*) into actual
  from public.clients
  where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer AAL2 crossed tenant boundary';
  end if;

  select public.trainer_client_access_status(
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1'::uuid
  ) into access_state;
  if access_state is null or jsonb_typeof(access_state) <> 'object' then
    raise exception 'ASSERTION FAILED: trainer AAL2 access status RPC failed';
  end if;

  insert into public.sessions (id, client_id, legacy_id, date)
  values (
    'af210000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'mfa_aal2_allowed_insert',
    date '2026-09-22'
  );
end;
$test$;

rollback;

-- Client A keeps the AAL1 portal contract and does not gain base-table access.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',
  true
);

do $test$
declare
  actual bigint;
  snapshot jsonb;
begin
  select public.client_portal_snapshot() into snapshot;
  if snapshot is null or jsonb_typeof(snapshot) <> 'object' then
    raise exception 'ASSERTION FAILED: client AAL1 portal snapshot failed';
  end if;

  select count(*) into actual from public.clients;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client AAL1 gained base clients access';
  end if;
end;
$test$;

rollback;

select 'Studio Las OS trainer TOTP MFA / AAL2 tests completed' as test_result;
