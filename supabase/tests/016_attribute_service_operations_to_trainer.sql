-- Studio Las OS - service operation audit attribution tests
-- Run after migrations 001-016 and dev/seed_test_data.sql in a disposable project.
-- All mutations are rolled back.

begin;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- Revocation is performed with service privileges but must be attributed to the
-- verified owner trainer passed to the administrative function.
select public.admin_revoke_client_account(
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111'
);

reset role;

do $$
declare
  audit_count integer;
begin
  select count(*)
  into audit_count
  from public.security_audit_events
  where table_name = 'client_users'
    and row_id = '31000000-0000-4000-8000-000000000001'
    and client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1'
    and action = 'UPDATE'
    and actor_profile_id = '11111111-1111-4111-8111-111111111111'
    and actor_auth_user_id = 'aaaaaaaa-0000-4000-8000-000000000001'
    and 'status' = any(changed_columns);

  if audit_count <> 1 then
    raise exception 'FAIL: service-role revocation was not attributed to owner trainer A';
  end if;
end;
$$;

-- Re-link the same pair to verify the administrative link path also carries the
-- trainer audit context. The client profile already exists in the fake seed.
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select *
from public.admin_link_client_account(
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-0000-4000-8000-000000000003',
  'client.a@example.test'
);

reset role;

do $$
declare
  audit_count integer;
begin
  select count(*)
  into audit_count
  from public.security_audit_events
  where table_name = 'client_users'
    and row_id = '31000000-0000-4000-8000-000000000001'
    and client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1'
    and action = 'UPDATE'
    and actor_profile_id = '11111111-1111-4111-8111-111111111111'
    and actor_auth_user_id = 'aaaaaaaa-0000-4000-8000-000000000001'
    and 'status' = any(changed_columns);

  if audit_count <> 2 then
    raise exception 'FAIL: service-role link was not attributed to owner trainer A';
  end if;
end;
$$;

-- A fake or non-trainer context cannot be resolved into audit attribution.
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  blocked boolean := false;
begin
  begin
    perform public.admin_revoke_client_account(
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
      '33333333-3333-4333-8333-333333333333'
    );
  exception when insufficient_privilege then
    blocked := true;
  end;

  if not blocked then
    raise exception 'FAIL: client profile accepted as owner trainer audit context';
  end if;
end;
$$;

reset role;

select 'Studio Las OS service operation audit attribution tests completed' as result;

rollback;
