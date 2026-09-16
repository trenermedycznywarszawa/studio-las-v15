-- Studio Las OS - regression test for owner assignment writes under FORCE RLS
-- Run after migration 017 in a disposable database with the standard fictional fixtures.

select 'owner trainer can revoke own client link under forced RLS' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
begin
  update public.client_users
  set status = 'revoked'
  where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1'
    and user_id = '33333333-3333-4333-8333-333333333333';

  get diagnostics actual = row_count;
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: owner trainer could not revoke own client link, rows %', actual;
  end if;
end;
$test$;
rollback;

select 'other trainer cannot change foreign client link' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
begin
  update public.client_users
  set status = 'revoked'
  where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';

  get diagnostics actual = row_count;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: foreign trainer changed client link, rows %', actual;
  end if;
end;
$test$;
rollback;

select 'role helper is narrow and protected' as test_phase;

do $test$
declare
  helper_oid oid := to_regprocedure('private.profile_has_role(uuid,text)');
  helper_config text[];
  is_security_definer boolean;
begin
  if helper_oid is null then
    raise exception 'ASSERTION FAILED: private.profile_has_role is missing';
  end if;

  select p.proconfig, p.prosecdef
  into helper_config, is_security_definer
  from pg_proc p
  where p.oid = helper_oid;

  if not is_security_definer then
    raise exception 'ASSERTION FAILED: role helper is not SECURITY DEFINER';
  end if;

  if helper_config is null or not exists (
    select 1 from unnest(helper_config) cfg where cfg like 'search_path=%'
  ) then
    raise exception 'ASSERTION FAILED: role helper has no fixed search_path';
  end if;

  if has_function_privilege('anon', helper_oid, 'EXECUTE') then
    raise exception 'ASSERTION FAILED: anon can execute role helper';
  end if;
end;
$test$;

select 'Studio Las OS owner assignment regression tests completed' as test_result;
