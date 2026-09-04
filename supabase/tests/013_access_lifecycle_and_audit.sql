-- Studio Las OS - access lifecycle and audit tests
-- Run after migrations 001-013 and dev/seed_test_data.sql in a disposable project.
-- All writes are rolled back.

begin;

-- ---------------------------------------------------------------------------
-- Metadata and privilege invariants
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.security_audit_events') is null then
    raise exception 'FAIL: security_audit_events table missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'security_audit_events'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'FAIL: audit table does not have enabled and forced RLS';
  end if;

  if has_table_privilege('authenticated', 'public.security_audit_events', 'SELECT')
     or has_table_privilege('authenticated', 'public.security_audit_events', 'INSERT')
     or has_table_privilege('authenticated', 'public.security_audit_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.security_audit_events', 'DELETE') then
    raise exception 'FAIL: authenticated has direct audit table privileges';
  end if;

  if has_function_privilege('authenticated', 'public.admin_link_client_account(uuid,uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.admin_revoke_client_account(uuid,uuid)', 'EXECUTE') then
    raise exception 'FAIL: browser authenticated role can execute administrative account functions';
  end if;

  if not has_function_privilege('service_role', 'public.admin_link_client_account(uuid,uuid,uuid,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.admin_revoke_client_account(uuid,uuid)', 'EXECUTE') then
    raise exception 'FAIL: service role cannot execute account lifecycle functions';
  end if;

  if not has_function_privilege('authenticated', 'public.trainer_client_access_status(uuid)', 'EXECUTE') then
    raise exception 'FAIL: trainer access status RPC is not available to authenticated callers';
  end if;
end;
$$;

-- Every audited table must have exactly one enabled audit trigger.
do $$
declare
  expected_count integer := 22;
  actual_count integer;
begin
  select count(*)
  into actual_count
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and t.tgname = 'audit_sensitive_row_change'
    and not t.tgisinternal
    and c.relname in (
      'profiles', 'clients', 'client_trainers', 'client_users', 'client_intakes',
      'sessions', 'pre_session_checks', 'post_session_observations', 'client_tasks',
      'client_documents', 'body_measurements', 'training_load_observations',
      'assessment_results', 'exercises', 'home_plans', 'home_plan_items',
      'guidance_events', 'guidance_pilots', 'guidance_pilot_feedback', 'reports',
      'legacy_import_batches', 'legacy_import_records'
    );

  if actual_count <> expected_count then
    raise exception 'FAIL: expected % audit triggers, found %', expected_count, actual_count;
  end if;
end;
$$;

-- The audit schema must remain metadata-only.
do $$
declare
  unsafe_count integer;
begin
  select count(*)
  into unsafe_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'security_audit_events'
    and column_name in (
      'payload', 'old_data', 'new_data', 'email', 'phone', 'content', 'note',
      'trainer_note', 'health_status', 'contraindications', 'red_flags_text',
      'raw_payload', 'report_content'
    );

  if unsafe_count <> 0 then
    raise exception 'FAIL: sensitive payload column exists in security_audit_events';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trainer-triggered changes create metadata audit rows
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.sessions (
  id,
  client_id,
  legacy_id,
  date,
  trainer_observation,
  client_visible
) values (
  'af130000-0000-4000-8000-000000000001',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
  'audit_test_insert',
  date '2026-08-13',
  'Sensitive value must not be copied to audit metadata',
  false
);

update public.sessions
set milestone = 'audit test milestone'
where id = 'af130000-0000-4000-8000-000000000001';

reset role;

-- Audit events are inspected only by the privileged test runner.
do $$
declare
  insert_count integer;
  update_count integer;
  copied_sensitive_value_count integer;
begin
  select count(*) into insert_count
  from public.security_audit_events
  where table_name = 'sessions'
    and row_id = 'af130000-0000-4000-8000-000000000001'
    and client_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1'
    and action = 'INSERT'
    and actor_auth_user_id = 'aaaaaaaa-0000-4000-8000-000000000001';

  select count(*) into update_count
  from public.security_audit_events
  where table_name = 'sessions'
    and row_id = 'af130000-0000-4000-8000-000000000001'
    and action = 'UPDATE'
    and 'milestone' = any(changed_columns)
    and not ('updated_at' = any(changed_columns));

  select count(*) into copied_sensitive_value_count
  from public.security_audit_events
  where table_name = 'sessions'
    and array_to_string(changed_columns, ',') ilike '%Sensitive value%';

  if insert_count <> 1 then
    raise exception 'FAIL: session INSERT audit event missing';
  end if;

  if update_count <> 1 then
    raise exception 'FAIL: session UPDATE changed-column audit event missing';
  end if;

  if copied_sensitive_value_count <> 0 then
    raise exception 'FAIL: sensitive value copied into audit metadata';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner-only access status and revocation behavior
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  result jsonb;
begin
  select public.trainer_client_access_status('aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1')
  into result;

  if result ? 'profileId' or result ? 'authUserId' or result ? 'userId' then
    raise exception 'FAIL: technical account identifier exposed by access status RPC';
  end if;
end;
$$;

-- Trainer A must not inspect Trainer B client access state.
do $$
declare
  blocked boolean := false;
begin
  begin
    perform public.trainer_client_access_status('bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2');
  exception when insufficient_privilege then
    blocked := true;
  end;

  if not blocked then
    raise exception 'FAIL: trainer can inspect another trainer client access state';
  end if;
end;
$$;

reset role;

select 'Studio Las OS access lifecycle and audit tests completed' as result;

rollback;
