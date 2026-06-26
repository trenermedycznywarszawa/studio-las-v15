-- Studio Las OS 9.0 - minimal clients INSERT RLS smoke test
-- Requires migrations 001-008.
-- Run as a privileged database role that can SET ROLE to authenticated.
-- Test writes are wrapped in a transaction and rolled back.

select '008 clients insert RLS policy minimal checks' as test_phase;

do $test$
declare
  actual bigint;
begin
  if not has_table_privilege('authenticated', 'public.clients', 'SELECT') then
    raise exception 'ASSERTION FAILED: authenticated has SELECT on clients';
  end if;

  if not has_table_privilege('authenticated', 'public.clients', 'INSERT') then
    raise exception 'ASSERTION FAILED: authenticated has INSERT on clients';
  end if;

  if not has_table_privilege('authenticated', 'public.clients', 'UPDATE') then
    raise exception 'ASSERTION FAILED: authenticated has UPDATE on clients';
  end if;

  select count(*) into actual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'clients'
    and policyname = 'clients_insert_trainer'
    and cmd = 'INSERT'
    and position('is_current_trainer_profile' in with_check) > 0
    and position('deleted_at' in with_check) = 0;
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: clients_insert_trainer uses helper and does not check deleted_at, got %', actual;
  end if;

  select count(*) into actual
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'clients'
    and t.tgisinternal is false
    and (t.tgtype::int & 2) = 2
    and (t.tgtype::int & 4) = 4;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: public.clients has unexpected BEFORE INSERT trigger count %', actual;
  end if;
end;
$test$;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '277d6162-60cf-4263-80c8-8e0732749957', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"277d6162-60cf-4263-80c8-8e0732749957","role":"authenticated"}', true);

select auth.uid() as diagnostic_auth_uid;
select current_setting('request.jwt.claim.sub', true) as diagnostic_claim_sub;
select public.is_current_trainer_profile('11111111-1111-4111-8111-111111111111') as helper_allows;

insert into public.clients (owner_trainer_id, name, deleted_at)
values (
  '11111111-1111-4111-8111-111111111111',
  'RLS smoke test client',
  null
)
returning id, owner_trainer_id, name, deleted_at;

rollback;

select 'Studio Las OS 9.0 migration 008 client insert RLS test completed' as result;
