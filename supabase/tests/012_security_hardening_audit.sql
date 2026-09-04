-- Studio Las OS - security hardening metadata audit
-- Run after supabase/migrations/012_security_hardening.sql.
-- The script is read-only and fails fast when a critical security invariant is missing.

begin;

-- 1. Legacy access-code authentication must be gone.
do $$
begin
  if to_regclass('public.client_access_credentials') is not null then
    raise exception 'FAIL: public.client_access_credentials still exists';
  end if;
end;
$$;

-- 2. Old client-safe views must not remain exposed.
do $$
declare
  view_name text;
  old_views text[] := array[
    'client_guidance_status',
    'client_visible_measurements',
    'client_visible_reports',
    'client_active_home_plan',
    'client_portal_summary'
  ];
begin
  foreach view_name in array old_views loop
    if to_regclass(format('public.%I', view_name)) is not null then
      raise exception 'FAIL: obsolete view public.% still exists', view_name;
    end if;
  end loop;
end;
$$;

-- 3. Sensitive tables must have RLS enabled and forced.
do $$
declare
  row record;
  expected_count integer;
  actual_count integer;
  sensitive_tables text[] := array[
    'profiles',
    'clients',
    'client_trainers',
    'client_users',
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
  ];
begin
  expected_count := cardinality(sensitive_tables);

  select count(*)
  into actual_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(sensitive_tables)
    and c.relkind = 'r';

  if actual_count <> expected_count then
    raise exception 'FAIL: expected % sensitive tables, found %', expected_count, actual_count;
  end if;

  for row in
    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(sensitive_tables)
      and c.relkind = 'r'
  loop
    if not row.relrowsecurity then
      raise exception 'FAIL: RLS disabled on public.%', row.relname;
    end if;
    if not row.relforcerowsecurity then
      raise exception 'FAIL: FORCE RLS disabled on public.%', row.relname;
    end if;
  end loop;
end;
$$;

-- 4. Anonymous access must be absent on public tables.
do $$
declare
  unsafe_count integer;
begin
  select count(*)
  into unsafe_count
  from information_schema.table_privileges
  where table_schema = 'public'
    and grantee in ('anon', 'PUBLIC')
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');

  if unsafe_count <> 0 then
    raise exception 'FAIL: anonymous/public table privileges detected: %', unsafe_count;
  end if;
end;
$$;

-- 5. Client portal functions must exist, be SECURITY DEFINER, and pin search_path.
do $$
declare
  function_oid oid;
  function_name text;
  function_config text[];
  is_security_definer boolean;
  required_oids oid[] := array[
    to_regprocedure('public.client_portal_snapshot()'),
    to_regprocedure('public.save_client_checkin(uuid,boolean,smallint,smallint,text)')
  ];
begin
  if required_oids[1] is null or required_oids[2] is null then
    raise exception 'FAIL: required client RPC signature missing';
  end if;

  foreach function_oid in array required_oids loop
    select p.proname, p.proconfig, p.prosecdef
    into function_name, function_config, is_security_definer
    from pg_proc p
    where p.oid = function_oid;

    if not is_security_definer then
      raise exception 'FAIL: public.% is not SECURITY DEFINER', function_name;
    end if;

    if function_config is null or not exists (
      select 1
      from unnest(function_config) cfg
      where cfg like 'search_path=%'
    ) then
      raise exception 'FAIL: public.% has no fixed search_path', function_name;
    end if;
  end loop;

  if to_regprocedure('public.save_client_checkin(uuid,uuid,boolean,smallint,smallint,text)') is not null then
    raise exception 'FAIL: obsolete client_id-accepting check-in RPC still exists';
  end if;
end;
$$;

-- 6. Clients must not have direct guidance_events policies. Their only write path
-- is save_client_checkin(). Trainer policies remain valid.
do $$
declare
  unsafe_count integer;
begin
  select count(*)
  into unsafe_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'guidance_events'
    and policyname in (
      'guidance_events_client_select',
      'guidance_events_client_insert',
      'guidance_events_client_update',
      'guidance_events_client_checkin_select',
      'guidance_events_client_checkin_insert',
      'guidance_events_client_checkin_update'
    );

  if unsafe_count <> 0 then
    raise exception 'FAIL: direct client guidance_events policies still exist';
  end if;
end;
$$;

-- 7. Active identity mapping is one-to-one.
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'client_users'
      and indexname = 'client_users_one_active_client_per_user_idx'
  ) then
    raise exception 'FAIL: active user-to-client uniqueness index missing';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'client_users'
      and indexname = 'client_users_one_active_user_per_client_idx'
  ) then
    raise exception 'FAIL: active client-to-user uniqueness index missing';
  end if;
end;
$$;

-- 8. Canonical engagement vocabulary must be enforced.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'engagement_type'
      and is_nullable = 'NO'
  ) then
    raise exception 'FAIL: clients.engagement_type missing or nullable';
  end if;
end;
$$;

-- 9. Browser clients must not be able to change ownership columns.
do $$
begin
  if exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'clients'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
      and column_name in ('id', 'owner_trainer_id', 'legacy_id', 'created_at', 'updated_at')
  ) then
    raise exception 'FAIL: authenticated role can update protected client identity columns';
  end if;
end;
$$;

-- 10. Account and trainer assignments must be owner-only for writes.
do $$
declare
  missing_count integer;
  unsafe_count integer;
begin
  select count(*)
  into missing_count
  from (values
    ('client_trainers', 'client_trainers_insert_owner'),
    ('client_trainers', 'client_trainers_update_owner'),
    ('client_users', 'client_users_insert_owner'),
    ('client_users', 'client_users_update_owner')
  ) required(tablename, policyname)
  where not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = required.tablename
      and p.policyname = required.policyname
  );

  if missing_count <> 0 then
    raise exception 'FAIL: owner-only assignment policy missing';
  end if;

  select count(*)
  into unsafe_count
  from pg_policies
  where schemaname = 'public'
    and policyname in (
      'client_trainers_insert_trainer',
      'client_trainers_update_trainer',
      'client_users_insert_trainer',
      'client_users_update_trainer'
    );

  if unsafe_count <> 0 then
    raise exception 'FAIL: broad trainer assignment policy still exists';
  end if;
end;
$$;

-- 11. Canonical helpers must exist; experimental claim parsing must be gone.
do $$
begin
  if to_regprocedure('public.trainer_owns_client(uuid)') is null
     or to_regprocedure('public.trainer_can_access_client(uuid)') is null
     or to_regprocedure('public.client_can_access_client(uuid)') is null then
    raise exception 'FAIL: canonical access helper missing';
  end if;

  if to_regprocedure('public.is_current_trainer_profile(uuid)') is not null then
    raise exception 'FAIL: experimental JWT-claim helper still exists';
  end if;
end;
$$;

select 'Studio Las OS security metadata audit completed' as result;

rollback;
