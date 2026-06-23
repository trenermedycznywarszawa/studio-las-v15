-- Studio Las OS 9.0 - RLS and client-safe view tests
-- Requires:
--   migrations/001_initial_schema.sql
--   migrations/002_rls_policies.sql
--   migrations/003_client_safe_views.sql
--   dev/seed_test_data.sql
--
-- Run as a privileged database role that can SET ROLE to authenticated/anon.
-- This file intentionally uses no temporary test functions, so it can run
-- as one script in Supabase SQL Editor.
-- Test writes are wrapped in transactions and rolled back.

select 'schema, helper, grant, and view checks' as test_phase;

do $test$
declare
  actual bigint;
begin
  select count(*) into actual
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (
      'profiles',
      'clients',
      'client_trainers',
      'client_users',
      'client_access_credentials',
      'client_intakes',
      'sessions',
      'pre_session_checks',
      'post_session_observations',
      'client_tasks',
      'client_documents',
      'body_measurements',
      'training_load_observations',
      'assessment_results',
      'exercises',
      'home_plans',
      'home_plan_items',
      'guidance_events',
      'guidance_pilots',
      'guidance_pilot_feedback',
      'reports',
      'legacy_import_batches',
      'legacy_import_records'
    );
  if actual <> 23 then
    raise exception 'ASSERTION FAILED: all Studio Las tables exist, expected 23, got %', actual;
  end if;

  select count(*) into actual
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = true
    and c.relname in (
      'profiles',
      'clients',
      'client_trainers',
      'client_users',
      'client_access_credentials',
      'client_intakes',
      'sessions',
      'pre_session_checks',
      'post_session_observations',
      'client_tasks',
      'client_documents',
      'body_measurements',
      'training_load_observations',
      'assessment_results',
      'exercises',
      'home_plans',
      'home_plan_items',
      'guidance_events',
      'guidance_pilots',
      'guidance_pilot_feedback',
      'reports',
      'legacy_import_batches',
      'legacy_import_records'
    );
  if actual <> 23 then
    raise exception 'ASSERTION FAILED: RLS is enabled on every Studio Las table, expected 23, got %', actual;
  end if;

  select count(*) into actual
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'is_trainer',
      'is_client',
      'current_profile_id',
      'trainer_can_access_client',
      'client_can_access_client'
    );
  if actual <> 5 then
    raise exception 'ASSERTION FAILED: RLS helper functions exist, expected 5, got %', actual;
  end if;

  select count(*) into actual
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
    and c.relname in (
      'client_portal_summary',
      'client_active_home_plan',
      'client_visible_reports',
      'client_visible_measurements',
      'client_guidance_status'
    );
  if actual <> 5 then
    raise exception 'ASSERTION FAILED: client-safe views exist, expected 5, got %', actual;
  end if;

  if has_table_privilege('anon', 'public.clients', 'SELECT') then
    raise exception 'ASSERTION FAILED: anon has no clients SELECT grant';
  end if;

  if has_table_privilege('anon', 'public.client_portal_summary', 'SELECT') then
    raise exception 'ASSERTION FAILED: anon has no client_portal_summary SELECT grant';
  end if;

  if has_table_privilege('authenticated', 'public.sessions', 'DELETE') then
    raise exception 'ASSERTION FAILED: authenticated has no hard DELETE on sessions';
  end if;

  if has_table_privilege('authenticated', 'public.reports', 'DELETE') then
    raise exception 'ASSERTION FAILED: authenticated has no hard DELETE on reports';
  end if;

  if not has_table_privilege('authenticated', 'public.client_portal_summary', 'SELECT') then
    raise exception 'ASSERTION FAILED: authenticated can SELECT client-safe summary view';
  end if;
end;
$test$;

select 'security-definer client-safe view definition checks' as test_phase;

do $test$
declare
  actual bigint;
begin
  select count(*) into actual
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'client_portal_summary',
      'client_active_home_plan',
      'client_visible_reports',
      'client_visible_measurements',
      'client_guidance_status'
    )
    and 'security_barrier=true' = any(coalesce(c.reloptions, array[]::text[]));
  if actual <> 5 then
    raise exception 'ASSERTION FAILED: every client-safe view has security_barrier, expected 5, got %', actual;
  end if;

  select count(*) into actual
  from pg_views
  where schemaname = 'public'
    and viewname in (
      'client_portal_summary',
      'client_active_home_plan',
      'client_visible_reports',
      'client_visible_measurements',
      'client_guidance_status'
    )
    and definition ilike '%client_can_access_client%'
    and definition ilike '%trainer_can_access_client%';
  if actual <> 5 then
    raise exception 'ASSERTION FAILED: every client-safe view filters by auth-scoped helper functions, expected 5, got %', actual;
  end if;

  select count(*) into actual
  from pg_views
  where schemaname = 'public'
    and viewname in (
      'client_portal_summary',
      'client_active_home_plan',
      'client_visible_reports',
      'client_visible_measurements',
      'client_guidance_status'
    )
    and definition ilike '%deleted_at IS NULL%';
  if actual <> 5 then
    raise exception 'ASSERTION FAILED: every client-safe view excludes soft-deleted rows, expected 5, got %', actual;
  end if;

  select count(*) into actual
  from pg_views
  where schemaname = 'public'
    and viewname in (
      'client_portal_summary',
      'client_active_home_plan',
      'client_visible_reports',
      'client_visible_measurements',
      'client_guidance_status'
    )
    and definition ilike '%published_at IS NOT NULL%';
  if actual <> 5 then
    raise exception 'ASSERTION FAILED: every client-safe view requires published data where process records are shown, expected 5, got %', actual;
  end if;

  select count(*) into actual
  from pg_views
  where schemaname = 'public'
    and viewname in (
      'client_portal_summary',
      'client_active_home_plan',
      'client_visible_reports',
      'client_visible_measurements',
      'client_guidance_status'
    )
    and definition ~* '(red_flags_text|contraindications|working_hypothesis|trainer_observation|trainer_decision|trainer_interpretation|trainer_note|trainer_notes|raw_payload|client_access_credentials|coach_notes)';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client-safe views do not project trainer-only or raw fields, expected 0, got %', actual;
  end if;
end;
$test$;

select 'trainer A RLS checks' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
  got_expected_error boolean;
begin
  select count(*) into actual from public.clients where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer A sees client A, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.clients where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer A does not see client B, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.sessions where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer A sees own sessions, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.body_measurements where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 3 then
    raise exception 'ASSERTION FAILED: trainer A sees own body measurements except soft-deleted, expected 3, got %', actual;
  end if;

  select count(*) into actual from public.training_load_observations where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 3 then
    raise exception 'ASSERTION FAILED: trainer A sees own training load except soft-deleted, expected 3, got %', actual;
  end if;

  select count(*) into actual from public.reports where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 3 then
    raise exception 'ASSERTION FAILED: trainer A sees own reports except soft-deleted, expected 3, got %', actual;
  end if;

  select count(*) into actual from public.sessions where legacy_id = 'fixture_session_a_deleted';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer A does not see soft-deleted sessions, expected 0, got %', actual;
  end if;

  insert into public.sessions (id, client_id, legacy_id, date, client_visible, published_at)
  values ('af100000-0000-4000-8000-000000000001', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1', 'rls_test_trainer_a_insert', date '2026-08-01', false, null);

  update public.sessions
  set milestone = 'rls update by trainer a'
  where id = 'a1000000-0000-4000-8000-000000000001';

  select count(*) into actual
  from public.sessions
  where id = 'a1000000-0000-4000-8000-000000000001'
    and milestone = 'rls update by trainer a';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer A can update own session, expected 1, got %', actual;
  end if;

  got_expected_error := false;
  begin
    insert into public.sessions (id, client_id, legacy_id, date)
    values ('bf100000-0000-4000-8000-000000000001', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2', 'rls_test_wrong_trainer_insert', date '2026-08-01');
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: trainer A cannot insert client B session';
  end if;

  got_expected_error := false;
  begin
    delete from public.sessions where id = 'a1000000-0000-4000-8000-000000000001';
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: trainer A cannot hard delete own session';
  end if;
end;
$test$;
rollback;

select 'trainer B RLS checks' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
  got_expected_error boolean;
begin
  select count(*) into actual from public.clients where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer B sees client B, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.clients where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: trainer B does not see client A, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.sessions where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer B sees own sessions, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.body_measurements where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer B sees own body measurements, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.reports where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer B sees own reports, expected 1, got %', actual;
  end if;

  insert into public.sessions (id, client_id, legacy_id, date, client_visible, published_at)
  values ('bf200000-0000-4000-8000-000000000001', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2', 'rls_test_trainer_b_insert', date '2026-08-02', false, null);

  update public.sessions
  set milestone = 'rls update by trainer b'
  where id = 'b1000000-0000-4000-8000-000000000003';

  select count(*) into actual
  from public.sessions
  where id = 'b1000000-0000-4000-8000-000000000003'
    and milestone = 'rls update by trainer b';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: trainer B can update own session, expected 1, got %', actual;
  end if;

  got_expected_error := false;
  begin
    insert into public.sessions (id, client_id, legacy_id, date)
    values ('af200000-0000-4000-8000-000000000001', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1', 'rls_test_wrong_trainer_insert', date '2026-08-02');
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: trainer B cannot insert client A session';
  end if;

  got_expected_error := false;
  begin
    delete from public.sessions where id = 'b1000000-0000-4000-8000-000000000003';
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: trainer B cannot hard delete own session';
  end if;
end;
$test$;
rollback;

select 'client A RLS and view checks' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
  got_expected_error boolean;
begin
  got_expected_error := false;
  begin
    update public.profiles
    set role = 'trainer'
    where id = '33333333-3333-4333-8333-333333333333';
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: client A cannot change own role to trainer';
  end if;

  got_expected_error := false;
  begin
    insert into public.client_users (id, client_id, user_id, status)
    values ('ca100000-0000-4000-8000-000000000001', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2', '33333333-3333-4333-8333-333333333333', 'active');
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: client A cannot attach self to client B';
  end if;

  select count(*) into actual from public.client_portal_summary;
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client A sees only own portal summary, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_portal_summary where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client A portal summary is client A, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_portal_summary where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A does not see client B portal summary, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_active_home_plan where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client A sees one published active home plan item, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_visible_reports where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client A sees one published client report, expected 1, got %', actual;
  end if;

  select count(*) into actual
  from public.client_visible_reports
  where title in ('Client A Draft Report', 'Client A Trainer-only Report', 'Client A Deleted Report');
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A sees no draft or trainer-only reports, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_visible_measurements where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 2 then
    raise exception 'ASSERTION FAILED: client A sees published visible measurements only, expected 2, got %', actual;
  end if;

  select count(*) into actual from public.client_guidance_status where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client A sees one guidance status item, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_visible_measurements where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A sees no client B data in views, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_intakes;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see raw intake, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.sessions;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see base sessions, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.sessions where trainer_observation is not null;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see trainer observation, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.sessions where trainer_decision is not null;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see trainer decision raw field, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.body_measurements where trainer_interpretation is not null;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see trainer interpretation, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.training_load_observations where trainer_note is not null;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see trainer note, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.clients where red_flags_text is not null;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see client red flags, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.clients where contraindications is not null;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see contraindications, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.clients where working_hypothesis is not null;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot see working hypothesis, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_documents;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client A cannot directly see client documents, expected 0, got %', actual;
  end if;
end;
$test$;
rollback;

select 'client B RLS and view checks' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
begin
  select count(*) into actual from public.client_portal_summary;
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client B sees only own portal summary, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_portal_summary where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client B portal summary is client B, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_portal_summary where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client B does not see client A portal summary, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_active_home_plan where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client B sees one published active home plan item, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_visible_reports where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: client B sees one published client report, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_visible_measurements where client_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2';
  if actual <> 2 then
    raise exception 'ASSERTION FAILED: client B sees published visible measurements only, expected 2, got %', actual;
  end if;

  select count(*) into actual from public.client_visible_measurements where client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1';
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client B sees no client A measurements, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_intakes;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client B cannot see raw intake, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.sessions;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: client B cannot see base sessions, expected 0, got %', actual;
  end if;
end;
$test$;
rollback;

select 'client without published data checks' as test_phase;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-4000-8000-000000000005","role":"authenticated"}', true);

do $test$
declare
  actual bigint;
begin
  select count(*) into actual
  from public.client_portal_summary
  where client_id = 'cccccccc-3333-4333-8333-ccccccccccc3';
  if actual <> 1 then
    raise exception 'ASSERTION FAILED: empty client sees own portal summary only, expected 1, got %', actual;
  end if;

  select count(*) into actual from public.client_active_home_plan;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: empty client sees no active home plan items, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_visible_reports;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: empty client sees no reports, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_visible_measurements;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: empty client sees no measurements, expected 0, got %', actual;
  end if;

  select count(*) into actual from public.client_guidance_status;
  if actual <> 0 then
    raise exception 'ASSERTION FAILED: empty client sees no guidance status, expected 0, got %', actual;
  end if;
end;
$test$;
rollback;

select 'anon access checks' as test_phase;

begin;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $test$
declare
  got_expected_error boolean;
begin
  got_expected_error := false;
  begin
    execute 'select count(*) from public.clients';
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: anon cannot read clients';
  end if;

  got_expected_error := false;
  begin
    execute 'select count(*) from public.client_portal_summary';
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: anon cannot read client portal summary';
  end if;

  got_expected_error := false;
  begin
    execute 'select count(*) from public.client_visible_measurements';
  exception when others then
    got_expected_error := true;
  end;
  if not got_expected_error then
    raise exception 'ASSERTION FAILED: anon cannot read client visible measurements';
  end if;
end;
$test$;
rollback;

select 'Studio Las OS 9.0 RLS access tests completed' as test_result;
