-- Studio Las OS - safe performance hardening
--
-- These changes address Supabase database-advisor findings without weakening
-- authorization. Profile policies evaluate auth.uid() once per statement, and
-- foreign-key columns receive covering indexes for joins and referential actions.
-- Existing indexes are intentionally retained; a fresh staging database has no
-- trustworthy usage history for removal decisions.

begin;

-- Avoid re-evaluating auth.uid() for every profile row.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- Cover foreign keys reported by the Supabase performance advisor.
create index if not exists body_measurements_document_id_idx
  on public.body_measurements(document_id)
  where document_id is not null;

create index if not exists guidance_events_created_by_idx
  on public.guidance_events(created_by)
  where created_by is not null;

create index if not exists guidance_events_item_client_fk_idx
  on public.guidance_events(home_plan_item_id, client_id)
  where home_plan_item_id is not null;

create index if not exists home_plan_items_exercise_id_idx
  on public.home_plan_items(exercise_id)
  where exercise_id is not null;

create index if not exists home_plan_items_plan_client_fk_idx
  on public.home_plan_items(home_plan_id, client_id);

create index if not exists legacy_import_records_client_id_idx
  on public.legacy_import_records(client_id)
  where client_id is not null;

create index if not exists post_session_observations_session_id_idx
  on public.post_session_observations(session_id)
  where session_id is not null;

create index if not exists reports_created_by_idx
  on public.reports(created_by)
  where created_by is not null;

create index if not exists training_load_observations_session_id_idx
  on public.training_load_observations(session_id)
  where session_id is not null;

commit;
