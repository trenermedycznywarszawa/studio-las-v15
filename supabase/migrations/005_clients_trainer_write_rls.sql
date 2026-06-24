-- Studio Las OS 9.0 - clients trainer write RLS patch
-- Fixes browser writes where clients.owner_trainer_id references public.profiles(id),
-- while the authenticated browser user is identified by auth.uid().

drop policy if exists clients_insert_trainer on public.clients;
drop policy if exists clients_update_trainer on public.clients;

create policy clients_insert_trainer on public.clients
  for insert to authenticated
  with check (
    deleted_at is null
    and exists (
      select 1
      from public.profiles p
      where p.id = owner_trainer_id
        and p.auth_user_id = auth.uid()
        and p.role = 'trainer'
    )
  );

create policy clients_update_trainer on public.clients
  for update to authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.role = 'trainer'
        and (
          p.id = owner_trainer_id
          or exists (
            select 1
            from public.client_trainers ct
            where ct.client_id = clients.id
              and ct.trainer_id = p.id
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = owner_trainer_id
        and p.auth_user_id = auth.uid()
        and p.role = 'trainer'
    )
  );
