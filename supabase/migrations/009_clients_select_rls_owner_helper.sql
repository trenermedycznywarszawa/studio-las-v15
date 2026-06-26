-- Studio Las OS 9.0 - clients SELECT RLS patch for INSERT ... RETURNING
-- REST inserts use return=representation / select=..., so the inserted row
-- must also pass a SELECT policy. Let the owner trainer see their own client
-- directly through the same helper that now passes INSERT.

drop policy if exists clients_select_trainer on public.clients;

create policy clients_select_trainer on public.clients
  for select to authenticated
  using (
    public.is_current_trainer_profile(owner_trainer_id)
    or public.trainer_can_access_client(id)
  );
