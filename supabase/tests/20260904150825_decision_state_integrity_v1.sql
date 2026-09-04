-- Studio Las OS decision/state integrity RLS regression tests.
-- Run after canonical migrations and supabase/dev/seed_test_data.sql.
-- All writes are synthetic and rolled back.

begin;

do $test$
declare
  v_force_count integer;
begin
  select count(*) into v_force_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('client_cycle_decisions', 'trainer_signal_reviews')
    and c.relrowsecurity
    and c.relforcerowsecurity;

  if v_force_count <> 2 then
    raise exception 'ASSERTION FAILED: decision integrity tables must both use FORCE RLS';
  end if;
  if not has_table_privilege('authenticated', 'public.client_cycle_decisions', 'SELECT,INSERT')
     or has_table_privilege('authenticated', 'public.client_cycle_decisions', 'UPDATE,DELETE')
     or not has_table_privilege('authenticated', 'public.trainer_signal_reviews', 'SELECT,INSERT')
     or has_table_privilege('authenticated', 'public.trainer_signal_reviews', 'UPDATE,DELETE')
     or has_table_privilege('anon', 'public.client_cycle_decisions', 'SELECT,INSERT')
     or has_table_privilege('anon', 'public.trainer_signal_reviews', 'SELECT,INSERT') then
    raise exception 'ASSERTION FAILED: decision integrity grants violate least privilege';
  end if;
end;
$test$;

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
  v_count integer;
  v_blocked boolean := false;
begin
  select count(*) into v_count from public.client_cycle_decisions;
  if v_count <> 0 then
    raise exception 'ASSERTION FAILED: trainer AAL1 read cycle decisions';
  end if;
  begin
    insert into public.client_cycle_decisions (
      client_id, decision, rationale, actor_profile_id
    ) values (
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1', 'independent',
      'AAL1 must fail', '11111111-1111-4111-8111-111111111111'
    );
  exception when others then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'ASSERTION FAILED: trainer AAL1 inserted a cycle decision';
  end if;
end;
$test$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into public.client_cycle_decisions (
  client_id, decision, rationale, actor_profile_id
) values
  (
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1', 'continue_1_to_1',
    'Pierwsza jawna decyzja syntetyczna.', '11111111-1111-4111-8111-111111111111'
  ),
  (
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1', 'independent',
    'Druga jawna decyzja syntetyczna.', '11111111-1111-4111-8111-111111111111'
  );

insert into public.trainer_signal_reviews (
  client_id, signal_key, outcome, actor_profile_id
) values
  (
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'low-readiness::session::2026-09-01', 'noted_no_change',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'low-readiness::session::2026-09-02', 'contact_required',
    '11111111-1111-4111-8111-111111111111'
  );

do $test$
declare
  v_decisions integer;
  v_reviews integer;
  v_cross_client_blocked boolean := false;
  v_duplicate_blocked boolean := false;
begin
  select count(*) into v_decisions
  from public.client_cycle_decisions
  where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  select count(*) into v_reviews
  from public.trainer_signal_reviews
  where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if v_decisions <> 2 then
    raise exception 'ASSERTION FAILED: cycle decision history was overwritten';
  end if;
  if v_reviews <> 2 then
    raise exception 'ASSERTION FAILED: a new dated signal instance did not remain distinct';
  end if;

  begin
    insert into public.client_cycle_decisions (
      client_id, decision, rationale, actor_profile_id
    ) values (
      'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2', 'hybrid',
      'Cross-client probe', '11111111-1111-4111-8111-111111111111'
    );
  exception when others then
    v_cross_client_blocked := true;
  end;
  if not v_cross_client_blocked then
    raise exception 'ASSERTION FAILED: trainer A wrote another trainer client decision';
  end if;

  begin
    insert into public.trainer_signal_reviews (
      client_id, signal_key, outcome, actor_profile_id
    ) values (
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
      'low-readiness::session::2026-09-01', 'outdated',
      '11111111-1111-4111-8111-111111111111'
    );
  exception when unique_violation then
    v_duplicate_blocked := true;
  end;
  if not v_duplicate_blocked then
    raise exception 'ASSERTION FAILED: duplicate signal-instance review was accepted';
  end if;
end;
$test$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);

do $test$
declare
  v_decisions integer;
  v_reviews integer;
begin
  select count(*) into v_decisions from public.client_cycle_decisions;
  select count(*) into v_reviews from public.trainer_signal_reviews;
  if v_decisions <> 0 or v_reviews <> 0 then
    raise exception 'ASSERTION FAILED: trainer B read trainer A private decision state';
  end if;
end;
$test$;

reset role;
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
  v_decisions integer;
  v_reviews integer;
begin
  select count(*) into v_decisions from public.client_cycle_decisions;
  select count(*) into v_reviews from public.trainer_signal_reviews;
  if v_decisions <> 0 or v_reviews <> 0 then
    raise exception 'ASSERTION FAILED: client read private decision rationale or signal reviews';
  end if;
end;
$test$;

reset role;

do $test$
declare
  v_audit_rows integer;
  v_leaks integer;
begin
  select count(*) into v_audit_rows
  from public.security_audit_events
  where table_name in ('client_cycle_decisions', 'trainer_signal_reviews');
  if v_audit_rows < 4 then
    raise exception 'ASSERTION FAILED: new private records are missing metadata audit';
  end if;

  select count(*) into v_leaks
  from public.security_audit_events
  where table_name in ('client_cycle_decisions', 'trainer_signal_reviews')
    and (
      to_jsonb(security_audit_events)::text like '%Pierwsza jawna decyzja syntetyczna%'
      or to_jsonb(security_audit_events)::text like '%Druga jawna decyzja syntetyczna%'
    );
  if v_leaks <> 0 then
    raise exception 'ASSERTION FAILED: audit duplicated private rationale';
  end if;
end;
$test$;

rollback;

select 'DECISION_STATE_INTEGRITY_SQL_SUCCESS PASS' as result;
