-- Studio Las OS 9.0 - clients SELECT RLS smoke test for INSERT ... RETURNING
-- Requires migrations 001-009.
-- Run as a privileged database role that can SET ROLE to authenticated.
-- Test writes are wrapped in a transaction and rolled back.

select '009 clients select RLS owner helper checks' as test_phase;

do $test$
declare
  actual bigint;
begin
  select count(*) into actual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'clients'
    and policyname = 'clients_select_trainer'
    and cmd = 'SELECT'
    and position('is_current_trainer_profile' in qual) > 0
    and position('trainer_can_access_client' in qual) > 0;
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: clients_select_trainer uses owner helper OR trainer_can_access_client, got %', actual;
  end if;
end;
$test$;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '277d6162-60cf-4263-80c8-8e0732749957', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"277d6162-60cf-4263-80c8-8e0732749957","role":"authenticated"}', true);

select public.is_current_trainer_profile('11111111-1111-4111-8111-111111111111') as helper_allows;

insert into public.clients (owner_trainer_id, name, deleted_at)
values (
  '11111111-1111-4111-8111-111111111111',
  'RLS returning smoke test client',
  null
)
returning id, owner_trainer_id, name, deleted_at;

rollback;

select 'Studio Las OS 9.0 migration 009 client select RLS test completed' as result;
