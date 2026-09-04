-- Studio Las OS - production-target read-only preflight
--
-- This file is intentionally SELECT-only. Run it against the production-sensitive
-- target before preparing or applying any migration delta. It returns catalog
-- metadata and aggregate counts only; it must never return client row values,
-- names, emails, notes, health values, documents, tokens, or passwords.
--
-- A successful query run is not authorization to migrate. Review the output,
-- create and verify a restorable backup, and complete the Auth, MFA, and privacy
-- gates first.

-- 1. Migration-history presence. Missing history is a stop condition for blind
-- db push/reset/repair operations.
select
  to_regclass('supabase_migrations.schema_migrations') is not null
    as migration_history_relation_present;

-- 2. Public object inventory and RLS state.
select
  c.relname as object_name,
  c.relkind,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  md5(coalesce(string_agg(
    a.attname || ':' || pg_catalog.format_type(a.atttypid, a.atttypmod)
      || ':' || a.attnotnull::text
      || ':' || coalesce(pg_get_expr(ad.adbin, ad.adrelid), ''),
    '|' order by a.attnum
  ), '')) as definition_fingerprint
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_attribute a
  on a.attrelid = c.oid
  and a.attnum > 0
  and not a.attisdropped
left join pg_attrdef ad
  on ad.adrelid = c.oid
  and ad.adnum = a.attnum
where n.nspname = 'public'
  and c.relkind in ('r', 'v')
group by c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
order by c.relkind, c.relname;

-- 3. Constraint inventory.
select
  c.relname as table_name,
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, con.conname;

-- 4. Index inventory.
select
  tablename,
  indexname,
  md5(indexdef) as definition_fingerprint
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 5. Function signatures, privilege boundary, and fixed search_path evidence.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as config,
  md5(pg_get_functiondef(p.oid)) as definition_fingerprint,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prokind = 'f'
order by n.nspname, p.proname, arguments;

-- 6. Policy fingerprints, including Storage.
select
  schemaname,
  tablename,
  count(*) as policy_count,
  md5(string_agg(
    policyname || ':' || cmd || ':' || permissive
      || ':' || array_to_string(roles, ',')
      || ':' || coalesce(qual, '')
      || ':' || coalesce(with_check, ''),
    '|' order by policyname
  )) as policy_fingerprint
from pg_policies
where schemaname in ('public', 'storage')
group by schemaname, tablename
order by schemaname, tablename;

-- 7. User trigger inventory. Internal FK triggers are excluded.
select
  n.nspname as schema_name,
  c.relname as table_name,
  count(*) filter (where not t.tgisinternal) as user_trigger_count,
  md5(coalesce(string_agg(
    t.tgname || ':' || pg_get_triggerdef(t.oid, true),
    '|' order by t.tgname
  ) filter (where not t.tgisinternal), '')) as trigger_fingerprint
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_trigger t on t.tgrelid = c.oid
where n.nspname in ('public', 'storage')
  and c.relkind = 'r'
group by n.nspname, c.relname
order by n.nspname, c.relname;

-- 8. Security-relevant grants for browser roles only.
with table_grants as (
  select table_schema, table_name, grantee, privilege_type
  from information_schema.table_privileges
  where table_schema in ('public', 'storage')
    and grantee in ('anon', 'authenticated')
),
column_grants as (
  select table_schema, table_name, grantee, privilege_type, column_name
  from information_schema.column_privileges
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
)
select
  'table' as grant_type,
  table_schema as schema_name,
  table_name as object_name,
  count(*) as grant_count,
  md5(string_agg(
    grantee || ':' || privilege_type,
    '|' order by grantee, privilege_type
  )) as grant_fingerprint
from table_grants
group by table_schema, table_name
union all
select
  'column',
  table_schema,
  table_name,
  count(*),
  md5(string_agg(
    grantee || ':' || privilege_type || ':' || column_name,
    '|' order by grantee, privilege_type, column_name
  ))
from column_grants
group by table_schema, table_name
order by grant_type, schema_name, object_name;

-- 9. Storage bucket metadata only. Do not enumerate objects or paths.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by id;

-- 10. Migration-blocking aggregate checks. No row values are returned.
select
  (select count(*)
   from public.body_measurements
   where muscle_mass_kg is not null
     and (muscle_mass_kg < 0 or muscle_mass_kg > 120))
    as body_measurements_outside_canonical_range,
  (select count(*)
   from (
     select user_id
     from public.client_users
     where status = 'active'
     group by user_id
     having count(*) > 1
   ) duplicate_users)
    as users_with_multiple_active_clients,
  (select count(*)
   from (
     select client_id
     from public.client_users
     where status = 'active'
     group by client_id
     having count(*) > 1
   ) duplicate_clients)
    as clients_with_multiple_active_users,
  (select count(*)
   from (
     select client_id, home_plan_item_id, kind, event_date
     from public.guidance_events
     where kind = 'client_checkin'
       and deleted_at is null
     group by client_id, home_plan_item_id, kind, event_date
     having count(*) > 1
   ) duplicate_checkins)
    as duplicate_active_client_checkin_groups,
  (select count(*) from public.client_access_credentials)
    as legacy_access_credential_rows;

-- 11. Engagement-type backfill classification. Aggregate counts only. Review the
-- default branch before production execution; do not print package values.
select
  count(*) filter (where package = 'Diagnostyka')
    as diagnostic_visit_branch,
  count(*) filter (where package in ('FUNDAMENT', 'ROZWÓJ', 'VIP Clinical'))
    as twelve_week_process_named_branch,
  count(*) filter (
    where status = 'archived'
      and coalesce(package, '') not in ('Diagnostyka', 'FUNDAMENT', 'ROZWÓJ', 'VIP Clinical')
  ) as continuation_status_branch,
  count(*) filter (
    where status <> 'archived'
      and coalesce(package, '') not in ('Diagnostyka', 'FUNDAMENT', 'ROZWÓJ', 'VIP Clinical')
  ) as default_twelve_week_process_branch
from public.clients;

-- 12. Catalog-level dependencies on legacy objects. An empty result means there
-- are no additional database views/functions containing references to them.
with legacy_names(name) as (
  values
    ('client_access_credentials'),
    ('client_active_home_plan'),
    ('client_guidance_status'),
    ('client_portal_summary'),
    ('client_visible_measurements'),
    ('client_visible_reports')
),
dependent_views as (
  select distinct
    l.name as referenced_object,
    v.schemaname as dependent_schema,
    v.viewname as dependent_object,
    'view'::text as dependent_type
  from legacy_names l
  join pg_views v on v.definition ilike '%' || l.name || '%'
  where v.schemaname not in ('pg_catalog', 'information_schema')
),
dependent_functions as (
  select distinct
    l.name as referenced_object,
    n.nspname as dependent_schema,
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      as dependent_object,
    'function'::text as dependent_type
  from legacy_names l
  join pg_proc p
    on p.prokind = 'f'
    and pg_get_functiondef(p.oid) ilike '%' || l.name || '%'
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema')
)
select * from dependent_views
union all
select * from dependent_functions
order by referenced_object, dependent_type, dependent_schema, dependent_object;

select 'Studio Las OS target read-only preflight completed' as result;
