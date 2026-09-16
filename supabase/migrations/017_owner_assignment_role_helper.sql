-- Studio Las OS - fix owner-only assignment writes under FORCE RLS
--
-- Migration 012 correctly made client-account and trainer assignments owner-only,
-- but the policy WITH CHECK clauses queried public.profiles directly. With FORCE
-- RLS enabled, an owner trainer cannot read another user's profile row, so valid
-- revocation and assignment writes fail closed. Keep profiles private and resolve
-- only the required role predicate through a narrow SECURITY DEFINER helper.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.profile_has_role(
  p_profile_id uuid,
  p_expected_role text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select p_expected_role in ('trainer', 'client')
    and exists (
      select 1
      from public.profiles p
      where p.id = p_profile_id
        and p.role = p_expected_role
    );
$$;

revoke all on function private.profile_has_role(uuid, text) from public, anon, authenticated;
grant execute on function private.profile_has_role(uuid, text) to authenticated;

-- Assistant trainers may read assignments for clients they can access, but only
-- the owner trainer may create or change those assignments.
drop policy if exists client_trainers_insert_owner on public.client_trainers;
drop policy if exists client_trainers_update_owner on public.client_trainers;

create policy client_trainers_insert_owner on public.client_trainers
  for insert to authenticated
  with check (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
    and private.profile_has_role(trainer_id, 'trainer')
  );

create policy client_trainers_update_owner on public.client_trainers
  for update to authenticated
  using (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
  )
  with check (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
    and private.profile_has_role(trainer_id, 'trainer')
  );

-- A client may read only their active relationship. Only the owner trainer may
-- create, revoke, or change it. Role validation must not require trainer-visible
-- SELECT access to the client's profile row.
drop policy if exists client_users_insert_owner on public.client_users;
drop policy if exists client_users_update_owner on public.client_users;

create policy client_users_insert_owner on public.client_users
  for insert to authenticated
  with check (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
    and private.profile_has_role(user_id, 'client')
  );

create policy client_users_update_owner on public.client_users
  for update to authenticated
  using (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
  )
  with check (
    public.is_trainer()
    and public.trainer_owns_client(client_id)
    and private.profile_has_role(user_id, 'client')
  );

comment on function private.profile_has_role(uuid, text) is
  'Narrow forced-RLS-safe role predicate for assignment policies. It returns no profile attributes.';

commit;
