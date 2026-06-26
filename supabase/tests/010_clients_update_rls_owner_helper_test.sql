-- Studio Las OS 9.0 - clients UPDATE RLS smoke test
-- Requires migrations 001-010.
-- Run as a privileged database role that can SET ROLE to authenticated.
-- Test writes are wrapped in a transaction and rolled back.

select '010 clients update RLS owner helper checks' as test_phase;

do $test$
declare
  actual bigint;
begin
  select count(*) into actual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'clients'
    and policyname = 'clients_update_trainer'
    and cmd = 'UPDATE'
    and position('is_current_trainer_profile' in qual) > 0
    and position('is_current_trainer_profile' in with_check) > 0;
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: clients_update_trainer uses owner helper for USING and WITH CHECK, got %', actual;
  end if;
end;
$test$;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '277d6162-60cf-4263-80c8-8e0732749957', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"277d6162-60cf-4263-80c8-8e0732749957","role":"authenticated"}', true);

select public.is_current_trainer_profile('11111111-1111-4111-8111-111111111111') as helper_allows;

update public.clients
set
  name = 'RLS update smoke test client',
  updated_at = now()
where id = '86b72bc5-98f6-490e-9725-4cc5242ae76f'
returning id, owner_trainer_id, name, updated_at;

rollback;

select 'Studio Las OS 9.0 migration 010 client update RLS test completed' as result;
