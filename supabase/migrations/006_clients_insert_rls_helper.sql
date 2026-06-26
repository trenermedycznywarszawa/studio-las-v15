-- Studio Las OS 9.0 - clients insert RLS helper patch
-- Fixes browser client inserts when the INSERT policy must verify a trainer
-- profile through public.profiles without depending on profiles RLS visibility.

grant select on public.profiles to authenticated;

create or replace function public.is_current_trainer_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.auth_user_id = auth.uid()
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
