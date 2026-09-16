-- Studio Las OS - attribute trusted service operations to the initiating trainer
--
-- Edge Functions use the service role for Auth administration. Without an explicit
-- actor context, database audit triggers would record those client-access changes
-- with a null actor. The account lifecycle functions already receive and verify
-- the owner trainer profile. This migration passes that verified profile into a
-- transaction-local audit context and teaches the audit trigger to resolve it.

begin;

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
  v_actor_auth_user_id uuid := auth.uid();
  v_actor_profile_id uuid;
  v_context_profile_id uuid;
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

  if v_actor_auth_user_id is not null then
    select p.id
    into v_actor_profile_id
    from public.profiles p
    where p.auth_user_id = v_actor_auth_user_id
    limit 1;
  else
    begin
      v_context_profile_id := nullif(
        current_setting('studio_las.audit_actor_profile_id', true),
        ''
      )::uuid;
    exception when invalid_text_representation then
      v_context_profile_id := null;
    end;

    if v_context_profile_id is not null then
      select p.id, p.auth_user_id
      into v_actor_profile_id, v_actor_auth_user_id
      from public.profiles p
      where p.id = v_context_profile_id
        and p.role = 'trainer'
      limit 1;
    end if;
  end if;

  insert into public.security_audit_events (
    actor_auth_user_id,
    actor_profile_id,
    action,
    table_name,
    row_id,
    client_id,
    changed_columns
  ) values (
    v_actor_auth_user_id,
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
    join public.profiles owner_profile on owner_profile.id = c.owner_trainer_id
    where c.id = p_client_id
      and c.owner_trainer_id = p_owner_trainer_id
      and owner_profile.role = 'trainer'
      and c.status = 'active'
      and c.deleted_at is null
      and lower(coalesce(c.email, '')) = v_normalized_email
  ) then
    raise exception 'active owner-controlled client with matching email required' using errcode = '42501';
  end if;

  perform set_config(
    'studio_las.audit_actor_profile_id',
    p_owner_trainer_id::text,
    true
  );

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

  if exists (
    select 1
    from public.client_users cu
    where cu.user_id = v_profile.id
      and cu.client_id <> p_client_id
      and cu.status = 'active'
  ) then
    raise exception 'account already linked to another active client; revoke first' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.client_users cu
    where cu.client_id = p_client_id
      and cu.user_id <> v_profile.id
      and cu.status = 'active'
  ) then
    raise exception 'client already linked to another active account; revoke first' using errcode = '23505';
  end if;

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
    join public.profiles owner_profile on owner_profile.id = c.owner_trainer_id
    where c.id = p_client_id
      and c.owner_trainer_id = p_owner_trainer_id
      and owner_profile.role = 'trainer'
      and c.deleted_at is null
  ) then
    raise exception 'owner-controlled client required' using errcode = '42501';
  end if;

  perform set_config(
    'studio_las.audit_actor_profile_id',
    p_owner_trainer_id::text,
    true
  );

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

comment on function public.audit_sensitive_row_change() is
  'Records metadata only. Trusted service operations may supply a verified transaction-local trainer profile context.';

commit;
