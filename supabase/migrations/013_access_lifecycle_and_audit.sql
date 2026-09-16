-- Studio Las OS - client access lifecycle and immutable audit metadata
--
-- This migration adds two missing security controls:
-- 1. server-side account linking/revocation helpers used only by a trusted Edge Function,
-- 2. an append-only metadata audit trail for changes to sensitive process tables.
--
-- The audit table deliberately stores no health values, notes, report content, email,
-- phone number, or raw payload. It records who changed which row, when, and which
-- column names changed. This supports incident investigation without duplicating
-- sensitive content into another datastore.

begin;

-- ---------------------------------------------------------------------------
-- Administrative account lifecycle helpers
-- ---------------------------------------------------------------------------

create or replace function public.admin_link_client_account(
  p_client_id uuid,
  p_owner_trainer_id uuid,
  p_auth_user_id uuid,
  p_email text
)
returns table(profile_id uuid, link_status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile public.profiles%rowtype;
  v_normalized_email text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_client_id is null or p_owner_trainer_id is null or p_auth_user_id is null then
    raise exception 'client, owner trainer, and auth user are required' using errcode = '22023';
  end if;

  v_normalized_email := lower(nullif(trim(coalesce(p_email, '')), ''));
  if v_normalized_email is null or length(v_normalized_email) > 320 then
    raise exception 'valid client email required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.owner_trainer_id = p_owner_trainer_id
      and c.status = 'active'
      and c.deleted_at is null
      and lower(coalesce(c.email, '')) = v_normalized_email
  ) then
    raise exception 'active owner-controlled client with matching email required' using errcode = '42501';
  end if;

  select p.*
  into v_profile
  from public.profiles p
  where p.auth_user_id = p_auth_user_id
  for update;

  if found and v_profile.role <> 'client' then
    raise exception 'auth user is not a client profile' using errcode = '42501';
  end if;

  if not found then
    insert into public.profiles (auth_user_id, role, email)
    values (p_auth_user_id, 'client', v_normalized_email)
    returning * into v_profile;
  else
    update public.profiles
    set email = v_normalized_email
    where id = v_profile.id
    returning * into v_profile;
  end if;

  -- One active account per client and one active client per account are enforced
  -- by the partial unique indexes created in migration 012. Revoke historical
  -- links first, then activate the requested relationship.
  update public.client_users
  set status = 'revoked'
  where (client_id = p_client_id or user_id = v_profile.id)
    and status = 'active';

  insert into public.client_users (client_id, user_id, status)
  values (p_client_id, v_profile.id, 'active')
  on conflict (client_id, user_id)
  do update set status = 'active';

  return query select v_profile.id, 'active'::text;
end;
$$;

create or replace function public.admin_revoke_client_account(
  p_client_id uuid,
  p_owner_trainer_id uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.owner_trainer_id = p_owner_trainer_id
      and c.deleted_at is null
  ) then
    raise exception 'owner-controlled client required' using errcode = '42501';
  end if;

  update public.client_users
  set status = 'revoked'
  where client_id = p_client_id
    and status = 'active';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_link_client_account(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_revoke_client_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_link_client_account(uuid, uuid, uuid, text) to service_role;
grant execute on function public.admin_revoke_client_account(uuid, uuid) to service_role;

-- Owner trainers may inspect account state, but no Auth UUID or profile UUID is
-- returned to the browser. Assistants cannot manage account lifecycle.
create or replace function public.trainer_client_access_status(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_trainer() or not public.trainer_owns_client(p_client_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'status', coalesce(cu.status, 'not_invited'),
    'email', c.email,
    'linkedAt', cu.created_at,
    'updatedAt', cu.updated_at
  )
  into v_result
  from public.clients c
  left join public.client_users cu
    on cu.client_id = c.id
   and cu.status = 'active'
  where c.id = p_client_id
    and c.deleted_at is null;

  return coalesce(v_result, jsonb_build_object('status', 'not_found'));
end;
$$;

revoke all on function public.trainer_client_access_status(uuid) from public, anon;
grant execute on function public.trainer_client_access_status(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Append-only security audit metadata
-- ---------------------------------------------------------------------------

create table if not exists public.security_audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_auth_user_id uuid,
  actor_profile_id uuid,
  action text not null,
  table_name text not null,
  row_id uuid,
  client_id uuid,
  changed_columns text[] not null default '{}',
  source text not null default 'database_trigger',
  constraint security_audit_events_action_check check (action in ('INSERT', 'UPDATE', 'DELETE')),
  constraint security_audit_events_source_check check (source = 'database_trigger')
);

alter table public.security_audit_events enable row level security;
alter table public.security_audit_events force row level security;
revoke all on table public.security_audit_events from public, anon, authenticated;
revoke all on sequence public.security_audit_events_id_seq from public, anon, authenticated;

create index if not exists security_audit_events_occurred_idx
  on public.security_audit_events(occurred_at desc);
create index if not exists security_audit_events_client_idx
  on public.security_audit_events(client_id, occurred_at desc)
  where client_id is not null;
create index if not exists security_audit_events_actor_idx
  on public.security_audit_events(actor_profile_id, occurred_at desc)
  where actor_profile_id is not null;

create or replace function public.audit_sensitive_row_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else '{}'::jsonb end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_row_id uuid;
  v_client_id uuid;
  v_actor_profile_id uuid;
  v_changed_columns text[] := '{}';
begin
  begin
    v_row_id := nullif(v_row ->> 'id', '')::uuid;
  exception when invalid_text_representation then
    v_row_id := null;
  end;

  begin
    if tg_table_name = 'clients' then
      v_client_id := v_row_id;
    else
      v_client_id := nullif(v_row ->> 'client_id', '')::uuid;
    end if;
  exception when invalid_text_representation then
    v_client_id := null;
  end;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}')
    into v_changed_columns
    from (
      select key
      from jsonb_object_keys(v_old || v_new) as keys(key)
      where (v_old -> key) is distinct from (v_new -> key)
        and key not in ('updated_at')
    ) changed;
  end if;

  select p.id
  into v_actor_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;

  insert into public.security_audit_events (
    actor_auth_user_id,
    actor_profile_id,
    action,
    table_name,
    row_id,
    client_id,
    changed_columns
  ) values (
    auth.uid(),
    v_actor_profile_id,
    tg_op,
    tg_table_name,
    v_row_id,
    v_client_id,
    v_changed_columns
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.audit_sensitive_row_change() from public, anon, authenticated;

-- Add one metadata-only audit trigger to every mutable table containing identity,
-- contact, process, measurement, report, assignment, or import information.
do $$
declare
  table_name text;
  audited_tables text[] := array[
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
  foreach table_name in array audited_tables loop
    execute format('drop trigger if exists audit_sensitive_row_change on public.%I', table_name);
    execute format(
      'create trigger audit_sensitive_row_change after insert or update or delete on public.%I for each row execute function public.audit_sensitive_row_change()',
      table_name
    );
  end loop;
end;
$$;

comment on table public.security_audit_events is
  'Append-only metadata audit. Never store health values, notes, report content, contact data, or raw payload here.';

commit;
