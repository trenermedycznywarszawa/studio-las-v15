-- Studio Las OS - account reassignment conflict tests
-- Run after migrations 001-015 and dev/seed_test_data.sql in a disposable project.

begin;

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- An account already active for client A cannot be moved to client B implicitly.
do $$
declare
  blocked boolean := false;
begin
  begin
    perform public.admin_link_client_account(
      'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
      '22222222-2222-4222-8222-222222222222',
      'cccccccc-0000-4000-8000-000000000003',
      'client.b@example.test'
    );
  exception when unique_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'FAIL: an active account was implicitly moved to another client';
  end if;
end;
$$;

-- Client A cannot have its existing active account silently replaced by client B's account.
do $$
declare
  blocked boolean := false;
begin
  begin
    perform public.admin_link_client_account(
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
      '11111111-1111-4111-8111-111111111111',
      'dddddddd-0000-4000-8000-000000000004',
      'client.a@example.test'
    );
  exception when unique_violation then
    blocked := true;
  end;

  if not blocked then
    raise exception 'FAIL: an active client account was implicitly replaced';
  end if;
end;
$$;

-- Re-linking the same existing account/client pair is idempotent.
do $$
declare
  result_row record;
begin
  select *
  into result_row
  from public.admin_link_client_account(
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-0000-4000-8000-000000000003',
    'client.a@example.test'
  );

  if result_row.link_status <> 'active' then
    raise exception 'FAIL: same-pair link is not idempotently active';
  end if;
end;
$$;

reset role;

-- No relationship was transferred or replaced.
do $$
declare
  client_a_count integer;
  client_b_count integer;
  client_a_user_count integer;
  client_b_user_count integer;
begin
  select count(*) into client_a_count
  from public.client_users
  where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1'
    and user_id = '33333333-3333-4333-8333-333333333333'
    and status = 'active';

  select count(*) into client_b_count
  from public.client_users
  where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2'
    and user_id = '44444444-4444-4444-8444-444444444444'
    and status = 'active';

  select count(*) into client_a_user_count
  from public.client_users
  where user_id = '33333333-3333-4333-8333-333333333333'
    and status = 'active';

  select count(*) into client_b_user_count
  from public.client_users
  where user_id = '44444444-4444-4444-8444-444444444444'
    and status = 'active';

  if client_a_count <> 1 or client_b_count <> 1
     or client_a_user_count <> 1 or client_b_user_count <> 1 then
    raise exception 'FAIL: account relationships changed after blocked reassignment';
  end if;
end;
$$;

select 'Studio Las OS account reassignment guard tests completed' as result;

rollback;
