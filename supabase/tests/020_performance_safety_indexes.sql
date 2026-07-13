-- Studio Las OS - performance hardening regression tests
-- Run after migration 020 in a disposable database.

begin;

do $test$
declare
  missing_count integer;
  unsafe_policy_count integer;
begin
  select count(*)
  into missing_count
  from (values
    ('body_measurements', 'body_measurements_document_id_idx'),
    ('guidance_events', 'guidance_events_created_by_idx'),
    ('guidance_events', 'guidance_events_item_client_fk_idx'),
    ('home_plan_items', 'home_plan_items_exercise_id_idx'),
    ('home_plan_items', 'home_plan_items_plan_client_fk_idx'),
    ('legacy_import_records', 'legacy_import_records_client_id_idx'),
    ('post_session_observations', 'post_session_observations_session_id_idx'),
    ('reports', 'reports_created_by_idx'),
    ('training_load_observations', 'training_load_observations_session_id_idx')
  ) required(table_name, index_name)
  where not exists (
    select 1
    from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = required.table_name
      and i.indexname = required.index_name
  );

  if missing_count <> 0 then
    raise exception 'ASSERTION FAILED: % required FK indexes are missing', missing_count;
  end if;

  select count(*)
  into unsafe_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'profiles'
    and policyname in ('profiles_select_own', 'profiles_update_own')
    and (
      coalesce(qual, '') ~ 'auth\\.uid\\(\\)'
      and coalesce(qual, '') !~ 'SELECT auth\\.uid\\(\\)'
      or coalesce(with_check, '') ~ 'auth\\.uid\\(\\)'
      and coalesce(with_check, '') !~ 'SELECT auth\\.uid\\(\\)'
    );

  if unsafe_policy_count <> 0 then
    raise exception 'ASSERTION FAILED: profile RLS still evaluates auth.uid() per row';
  end if;
end;
$test$;

-- Authorization behavior must remain unchanged after the planner optimization.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $test$
declare
  own_profile_count integer;
  other_profile_count integer;
begin
  select count(*) into own_profile_count
  from public.profiles
  where auth_user_id = 'aaaaaaaa-0000-4000-8000-000000000001';

  select count(*) into other_profile_count
  from public.profiles
  where auth_user_id = 'bbbbbbbb-0000-4000-8000-000000000002';

  if own_profile_count <> 1 or other_profile_count <> 0 then
    raise exception 'ASSERTION FAILED: optimized profile RLS changed isolation';
  end if;
end;
$test$;

rollback;

select 'Studio Las OS performance safety tests completed' as test_result;
