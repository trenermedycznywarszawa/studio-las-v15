-- Studio Las OS 9.0 - clients insert RLS claim helper diagnostics
-- Requires migrations 001-007 and supabase/dev/seed_test_data.sql.
-- Run as a privileged database role that can SET ROLE to authenticated.
-- Test writes are wrapped in a transaction and rolled back.

select '007 clients insert RLS claim helper checks' as test_phase;

do $test$
declare
  actual bigint;
begin
  select count(*) into actual
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'is_current_trainer_profile'
    and p.prosecdef = true
    and p.provolatile = 's';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: is_current_trainer_profile exists, is stable, and is SECURITY DEFINER, got %', actual;
  end if;

  if not has_function_privilege('authenticated', 'public.is_current_trainer_profile(uuid)', 'EXECUTE') then
    raise exception 'ASSERTION FAILED: authenticated can execute is_current_trainer_profile(uuid)';
  end if;

  select count(*) into actual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'clients'
    and policyname = 'clients_insert_trainer'
    and cmd = 'INSERT'
    and position('is_current_trainer_profile' in with_check) > 0;
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: clients_insert_trainer uses helper, got %', actual;
  end if;
end;
$test$;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

select auth.uid() as diagnostic_auth_uid;
select current_setting('request.jwt.claim.sub', true) as diagnostic_claim_sub;
select public.is_current_trainer_profile('11111111-1111-4111-8111-111111111111') as diagnostic_helper_allows_trainer_a;

do $test$
declare
  actual bigint;
  got_expected_error boolean;
begin
  if not public.is_current_trainer_profile('11111111-1111-4111-8111-111111111111') then
    raise exception 'ASSERTION FAILED: trainer A helper accepts own profile';
  end if;

  if public.is_current_trainer_profile('22222222-2222-4222-8222-222222222222') then
    raise exception 'ASSERTION FAILED: trainer A helper rejects another trainer profile';
  end if;

  insert into public.clients (id, legacy_id, owner_trainer_id, name)
  values (
    'af700000-0000-4000-8000-000000000007',
    'rls_test_007_client_insert_trainer_a',
    '11111111-1111-4111-8111-111111111111',
    'RLS 007 insert smoke'
  );

  select count(*) into actual
  from public.clients
  where id = 'af700000-0000-4000-8000-000000000007'
    and owner_trainer_id = '11111111-1111-4111-8111-111111111111';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer A can insert own client, got %', actual;
  end if;

  got_expected_error := false;
  begin
    insert into public.clients (id, legacy_id, owner_trainer_id, name)
    values (
      'af700000-0000-4000-8000-000000000008',
      'rls_test_007_client_insert_wrong_trainer',
      '22222222-2222-4222-8222-222222222222',
      'RLS 007 rejected insert smoke'
    );
  exception
    when insufficient_privilege then
      got_expected_error := true;
    when check_violation then
      got_expected_error := true;
  end;

  if got_expected_error is not true then
    raise exception 'ASSERTION FAILED: trainer A cannot insert client for another trainer';
  end if;
end;
$test$;

rollback;

select 'Studio Las OS 9.0 migration 007 client insert RLS claim helper test completed' as result;
