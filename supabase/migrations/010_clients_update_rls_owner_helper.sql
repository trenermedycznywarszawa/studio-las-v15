-- Studio Las OS 9.0 - clients UPDATE RLS patch
-- Keep CREATE/INSERT policies untouched. Let the owner trainer update their
-- client through the same helper already verified for INSERT and SELECT.

drop policy if exists clients_update_trainer on public.clients;

create policy clients_update_trainer on public.clients
  for update to authenticated
  using (
    public.is_current_trainer_profile(owner_trainer_id)
  )
  with check (
    public.is_current_trainer_profile(owner_trainer_id)
  );
