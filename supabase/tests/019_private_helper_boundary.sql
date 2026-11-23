-- Studio Las OS - regression tests for the non-exposed authorization helpers
-- Run after migration 019 with the standard fictional fixtures.

begin;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $test$
declare
  own_count integer;
  foreign_count integer;
  blocked boolean := false;
begin
  select count(*) into own_count
  from public.clients
  where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';

  select count(*) into foreign_count
  from public.clients
  where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';

  if own_count <> 1 or foreign_count <> 0 then
    raise exception 'ASSERTION FAILED: moving helpers changed trainer RLS isolation';
  end if;

  begin
    perform public.is_trainer();
  exception when insufficient_privilege then
    blocked := true;
  end;

  if not blocked then
    raise exception 'ASSERTION FAILED: authenticated caller executed public helper wrapper';
  end if;
end;
$test$;

rollback;

begin;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $test$
declare
  snapshot jsonb;
  blocked boolean := false;
begin
  select public.client_portal_snapshot() into snapshot;

  if snapshot is null or jsonb_typeof(snapshot) <> 'object' then
    raise exception 'ASSERTION FAILED: private helpers broke the client snapshot';
  end if;

  begin
    perform public.client_can_access_client('aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1');
  exception when insufficient_privilege then
    blocked := true;
  end;

  if not blocked then
    raise exception 'ASSERTION FAILED: authenticated caller executed public access helper wrapper';
  end if;
end;
$test$;

rollback;

do $test$
declare
  public_definer_count integer;
  private_dependency_count integer;
begin
  select count(*) into public_definer_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and p.proname in (
      'current_profile_id',
      'is_trainer',
      'is_client',
      'trainer_owns_client',
      'trainer_can_access_client',
      'client_can_access_client',
      'storage_object_client_id',
      'client_can_read_document_object'
    );

  if public_definer_count <> 0 then
    raise exception 'ASSERTION FAILED: internal SECURITY DEFINER helper remains public';
  end if;

  select count(*) into private_dependency_count
  from pg_policies
  where coalesce(qual, '') like '%private.%'
     or coalesce(with_check, '') like '%private.%';

  if private_dependency_count = 0 then
    raise exception 'ASSERTION FAILED: stored policies did not follow helpers into private schema';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and exists (
        select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%'
      )
  ) then
    raise exception 'ASSERTION FAILED: set_updated_at has no fixed search_path';
  end if;
end;
$test$;

select 'Studio Las OS private helper boundary tests completed' as test_result;
