-- Studio Las OS - regression test for save_client_checkin conflict handling
-- Run with the standard fictional client A fixture after migration 018.

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $test$
declare
  item_id uuid := 'a1100000-0000-4000-8000-000000000001';
  actual bigint;
  got_expected_error boolean := false;
begin
  select count(*) into actual
  from public.save_client_checkin(
    item_id,
    true,
    6::smallint,
    2::smallint,
    'first transactional regression check-in'
  );

  if actual <> 1 then
    raise exception 'ASSERTION FAILED: first check-in was not recorded, got %', actual;
  end if;

  begin
    perform public.save_client_checkin(
      item_id,
      true,
      6::smallint,
      2::smallint,
      'duplicate transactional regression check-in'
    );
  exception when unique_violation then
    got_expected_error := true;
  end;

  if not got_expected_error then
    raise exception 'ASSERTION FAILED: duplicate check-in did not fail with unique_violation';
  end if;
end;
$test$;
rollback;

select 'Studio Las OS check-in RPC conflict regression test completed' as test_result;
