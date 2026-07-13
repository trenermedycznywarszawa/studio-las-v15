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

-- 5. Client portal functions must exist and be SECURITY DEFINER with fixed search_path.
do $$
declare
  function_name text;
  function_oid oid;
  function_def text;
  function_config text[];
  required_functions text[] := array[
    'client_portal_snapshot',
    'save_client_checkin'
  ];
begin
  foreach function_name in array required_functions loop
    select p.oid, pg_get_functiondef(p.oid), p.proconfig
    into function_oid, function_def, function_config
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = function_name
    order by p.oid desc
    limit 1;

    if function_oid is null then
      raise exception 'FAIL: public.% function missing', function_name;
    end if;

    if position('SECURITY DEFINER' in upper(function_def)) = 0 then
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

-- 7. One active client mapping per authenticated client account.
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'client_users'
      and indexname = 'client_users_one_active_client_per_user_idx'
  ) then
    raise exception 'FAIL: active client-user uniqueness index missing';
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

select 'Studio Las OS security metadata audit completed' as result;

rollback;
