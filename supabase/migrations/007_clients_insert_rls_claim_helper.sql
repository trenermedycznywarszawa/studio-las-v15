-- Studio Las OS 9.0 - clients insert RLS claim helper patch
-- Replaces the clients INSERT helper so it reads the authenticated user id
-- directly from request JWT settings before falling back to auth.uid().
-- This keeps the policy independent from profiles RLS visibility.

grant select on public.profiles to authenticated;

create or replace function public.is_current_trainer_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with request_auth as (
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
      nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), '')::uuid,
      auth.uid()
    ) as auth_user_id
  )
  select exists (
    select 1
    from public.profiles p
    cross join request_auth ra
    where p.id = profile_id
      and ra.auth_user_id is not null
      and p.auth_user_id = ra.auth_user_id
      and p.role = 'trainer'
  );
$$;

revoke all on function public.is_current_trainer_profile(uuid) from public, anon;
grant execute on function public.is_current_trainer_profile(uuid) to authenticated;

drop policy if exists clients_insert_trainer on public.clients;

create policy clients_insert_trainer on public.clients
  for insert to authenticated
  with check (
    deleted_at is null
    and public.is_current_trainer_profile(owner_trainer_id)
  );
