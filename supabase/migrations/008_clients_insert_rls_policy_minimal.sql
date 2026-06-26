-- Studio Las OS 9.0 - minimal clients INSERT RLS patch
-- At this point the trainer-profile helper is confirmed to return true.
-- Keep INSERT policy focused on profile ownership only; do not gate on deleted_at.

grant select, insert, update on public.clients to authenticated;

do $$
declare
  sequence_name text;
begin
  for sequence_name in
    select pg_get_serial_sequence('public.clients', column_name)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and pg_get_serial_sequence('public.clients', column_name) is not null
  loop
    execute format('grant usage, select on sequence %s to authenticated', sequence_name);
  end loop;
end;
$$;

drop policy if exists clients_insert_trainer on public.clients;

create policy clients_insert_trainer on public.clients
  for insert to authenticated
  with check (
    public.is_current_trainer_profile(owner_trainer_id)
  );
