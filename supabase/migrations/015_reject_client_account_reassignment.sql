-- Studio Las OS - reject implicit client account reassignment
--
-- Account linking must never silently revoke another active relationship. Moving
-- an account or replacing the account attached to a client requires an explicit
-- revoke operation first. This makes cross-client and cross-trainer mistakes fail
-- closed instead of mutating access behind the operator's back.

begin;

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

revoke all on function public.admin_link_client_account(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_link_client_account(uuid, uuid, uuid, text) to service_role;

comment on function public.admin_link_client_account(uuid, uuid, uuid, text) is
  'Links only a conflict-free account/client pair. Existing different active relationships must be explicitly revoked first.';

commit;
