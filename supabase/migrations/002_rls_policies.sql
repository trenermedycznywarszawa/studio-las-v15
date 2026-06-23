-- Studio Las OS 9.0 - RLS policies
-- Base process tables are trainer-owned. Client portal reads safe views from 003.

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles p
    where auth.uid() is not null
      and p.auth_user_id = auth.uid()
      and p.role = 'trainer'
  );
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id
  from public.profiles p
  where auth.uid() is not null
    and p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles p
    where auth.uid() is not null
      and p.auth_user_id = auth.uid()
      and p.role = 'client'
  );
$$;

create or replace function public.trainer_can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clients c
    where public.is_trainer()
      and c.id = p_client_id
      and c.deleted_at is null
      and (
        c.owner_trainer_id = public.current_profile_id()
        or exists (
          select 1
          from public.client_trainers ct
          where ct.client_id = c.id
            and ct.trainer_id = public.current_profile_id()
        )
      )
  );
$$;

create or replace function public.client_can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.client_users cu
    join public.clients c on c.id = cu.client_id
    where public.is_client()
      and cu.client_id = p_client_id
      and cu.user_id = public.current_profile_id()
      and cu.status = 'active'
      and c.deleted_at is null
  );
$$;

revoke all on function public.is_trainer() from public, anon;
revoke all on function public.current_profile_id() from public, anon;
revoke all on function public.is_client() from public, anon;
revoke all on function public.trainer_can_access_client(uuid) from public, anon;
revoke all on function public.client_can_access_client(uuid) from public, anon;

grant execute on function public.is_trainer() to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_client() to authenticated;
grant execute on function public.trainer_can_access_client(uuid) to authenticated;
grant execute on function public.client_can_access_client(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_trainers enable row level security;
alter table public.client_users enable row level security;
alter table public.client_access_credentials enable row level security;
alter table public.client_intakes enable row level security;
alter table public.sessions enable row level security;
alter table public.pre_session_checks enable row level security;
alter table public.post_session_observations enable row level security;
alter table public.client_tasks enable row level security;
alter table public.body_measurements enable row level security;
alter table public.training_load_observations enable row level security;
alter table public.assessment_results enable row level security;
alter table public.exercises enable row level security;
alter table public.home_plans enable row level security;
alter table public.home_plan_items enable row level security;
alter table public.guidance_events enable row level security;
alter table public.guidance_pilots enable row level security;
alter table public.guidance_pilot_feedback enable row level security;
alter table public.reports enable row level security;
alter table public.client_documents enable row level security;
alter table public.legacy_import_batches enable row level security;
alter table public.legacy_import_records enable row level security;

revoke create on schema public from public, anon, authenticated;
revoke all on schema public from anon;
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
grant update(display_name, email) on public.profiles to authenticated;
grant select, insert, update on public.clients to authenticated;
grant select, insert, update on public.client_trainers to authenticated;
grant select, insert, update on public.client_users to authenticated;
grant select, insert, update on public.client_access_credentials to authenticated;
grant select, insert, update on public.client_intakes to authenticated;
grant select, insert, update on public.sessions to authenticated;
grant select, insert, update on public.pre_session_checks to authenticated;
grant select, insert, update on public.post_session_observations to authenticated;
grant select, insert, update on public.client_tasks to authenticated;
grant select, insert, update on public.body_measurements to authenticated;
grant select, insert, update on public.training_load_observations to authenticated;
grant select, insert, update on public.assessment_results to authenticated;
grant select, insert, update on public.exercises to authenticated;
grant select, insert, update on public.home_plans to authenticated;
grant select, insert, update on public.home_plan_items to authenticated;
grant select, insert, update on public.guidance_events to authenticated;
grant select, insert, update on public.guidance_pilots to authenticated;
grant select, insert, update on public.guidance_pilot_feedback to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert, update on public.client_documents to authenticated;
grant select, insert, update on public.legacy_import_batches to authenticated;
grant select, insert, update on public.legacy_import_records to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth_user_id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy clients_select_trainer on public.clients
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(id));

create policy clients_insert_trainer on public.clients
  for insert to authenticated
  with check (public.is_trainer() and owner_trainer_id = public.current_profile_id());

create policy clients_update_trainer on public.clients
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(id))
  with check (public.is_trainer() and public.trainer_can_access_client(id));

create policy client_trainers_select_trainer on public.client_trainers
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_trainers_insert_trainer on public.client_trainers
  for insert to authenticated
  with check (
    public.is_trainer()
    and public.trainer_can_access_client(client_id)
    and exists (
      select 1 from public.profiles p
      where p.id = trainer_id
        and p.role = 'trainer'
    )
  );

create policy client_trainers_update_trainer on public.client_trainers
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id))
  with check (
    public.is_trainer()
    and public.trainer_can_access_client(client_id)
    and exists (
      select 1 from public.profiles p
      where p.id = trainer_id
        and p.role = 'trainer'
    )
  );

create policy client_users_select_related on public.client_users
  for select to authenticated
  using (
    (public.is_trainer() and public.trainer_can_access_client(client_id))
    or (status = 'active' and user_id = public.current_profile_id())
  );

create policy client_users_insert_trainer on public.client_users
  for insert to authenticated
  with check (
    public.is_trainer()
    and public.trainer_can_access_client(client_id)
    and exists (
      select 1 from public.profiles p
      where p.id = user_id
        and p.role = 'client'
    )
  );

create policy client_users_update_trainer on public.client_users
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id))
  with check (
    public.is_trainer()
    and public.trainer_can_access_client(client_id)
    and exists (
      select 1 from public.profiles p
      where p.id = user_id
        and p.role = 'client'
    )
  );

create policy client_access_credentials_trainer_select on public.client_access_credentials
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_access_credentials_trainer_insert on public.client_access_credentials
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_access_credentials_trainer_update on public.client_access_credentials
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id))
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_intakes_trainer_select on public.client_intakes
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy client_intakes_trainer_insert on public.client_intakes
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_intakes_trainer_update on public.client_intakes
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy sessions_trainer_select on public.sessions
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy sessions_trainer_insert on public.sessions
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy sessions_trainer_update on public.sessions
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy pre_session_checks_trainer_select on public.pre_session_checks
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy pre_session_checks_trainer_insert on public.pre_session_checks
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy pre_session_checks_trainer_update on public.pre_session_checks
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy post_session_observations_trainer_select on public.post_session_observations
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy post_session_observations_trainer_insert on public.post_session_observations
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy post_session_observations_trainer_update on public.post_session_observations
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_tasks_trainer_select on public.client_tasks
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy client_tasks_trainer_insert on public.client_tasks
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_tasks_trainer_update on public.client_tasks
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy body_measurements_trainer_select on public.body_measurements
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy body_measurements_trainer_insert on public.body_measurements
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy body_measurements_trainer_update on public.body_measurements
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy training_load_trainer_select on public.training_load_observations
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy training_load_trainer_insert on public.training_load_observations
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy training_load_trainer_update on public.training_load_observations
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy assessment_results_trainer_select on public.assessment_results
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy assessment_results_trainer_insert on public.assessment_results
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy assessment_results_trainer_update on public.assessment_results
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy exercises_select_trainer on public.exercises
  for select to authenticated
  using (public.is_trainer() and deleted_at is null and (owner_trainer_id is null or owner_trainer_id = public.current_profile_id()));

create policy exercises_insert_trainer on public.exercises
  for insert to authenticated
  with check (public.is_trainer() and owner_trainer_id = public.current_profile_id());

create policy exercises_update_trainer on public.exercises
  for update to authenticated
  using (public.is_trainer() and owner_trainer_id = public.current_profile_id() and deleted_at is null)
  with check (public.is_trainer() and owner_trainer_id = public.current_profile_id());

create policy home_plans_trainer_select on public.home_plans
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy home_plans_trainer_insert on public.home_plans
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy home_plans_trainer_update on public.home_plans
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy home_plan_items_trainer_select on public.home_plan_items
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy home_plan_items_trainer_insert on public.home_plan_items
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy home_plan_items_trainer_update on public.home_plan_items
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy guidance_events_trainer_select on public.guidance_events
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy guidance_events_trainer_insert on public.guidance_events
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy guidance_events_trainer_update on public.guidance_events
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy guidance_events_client_select on public.guidance_events
  for select to authenticated
  using (
    public.is_client()
    and public.client_can_access_client(client_id)
    and kind = 'daily_step'
    and deleted_at is null
  );

create policy guidance_events_client_insert on public.guidance_events
  for insert to authenticated
  with check (
    public.is_client()
    and public.client_can_access_client(client_id)
    and kind = 'daily_step'
    and created_by = public.current_profile_id()
    and exists (
      select 1
      from public.home_plan_items hpi
      join public.home_plans hp on hp.id = hpi.home_plan_id
      where hpi.id = home_plan_item_id
        and hpi.client_id = guidance_events.client_id
        and hpi.status = 'active'
        and hpi.published_at is not null
        and hpi.deleted_at is null
        and hp.status = 'active'
        and hp.published_at is not null
        and hp.deleted_at is null
    )
  );

create policy guidance_events_client_update on public.guidance_events
  for update to authenticated
  using (
    public.is_client()
    and public.client_can_access_client(client_id)
    and kind = 'daily_step'
    and created_by = public.current_profile_id()
    and deleted_at is null
  )
  with check (
    public.is_client()
    and public.client_can_access_client(client_id)
    and kind = 'daily_step'
    and created_by = public.current_profile_id()
    and deleted_at is null
  );

create policy guidance_pilots_trainer_select on public.guidance_pilots
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy guidance_pilots_trainer_insert on public.guidance_pilots
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy guidance_pilots_trainer_update on public.guidance_pilots
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy guidance_pilot_feedback_trainer_select on public.guidance_pilot_feedback
  for select to authenticated
  using (
    public.is_trainer()
    and deleted_at is null
    and exists (
      select 1 from public.guidance_pilots gp
      where gp.id = pilot_id
        and public.trainer_can_access_client(gp.client_id)
        and gp.deleted_at is null
    )
  );

create policy guidance_pilot_feedback_trainer_insert on public.guidance_pilot_feedback
  for insert to authenticated
  with check (
    public.is_trainer()
    and exists (
      select 1 from public.guidance_pilots gp
      where gp.id = pilot_id
        and public.trainer_can_access_client(gp.client_id)
        and gp.deleted_at is null
    )
  );

create policy guidance_pilot_feedback_trainer_update on public.guidance_pilot_feedback
  for update to authenticated
  using (
    public.is_trainer()
    and deleted_at is null
    and exists (
      select 1 from public.guidance_pilots gp
      where gp.id = pilot_id
        and public.trainer_can_access_client(gp.client_id)
        and gp.deleted_at is null
    )
  )
  with check (
    public.is_trainer()
    and exists (
      select 1 from public.guidance_pilots gp
      where gp.id = pilot_id
        and public.trainer_can_access_client(gp.client_id)
        and gp.deleted_at is null
    )
  );

create policy reports_trainer_select on public.reports
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy reports_trainer_insert on public.reports
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy reports_trainer_update on public.reports
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_documents_trainer_select on public.client_documents
  for select to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null);

create policy client_documents_trainer_insert on public.client_documents
  for insert to authenticated
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy client_documents_trainer_update on public.client_documents
  for update to authenticated
  using (public.is_trainer() and public.trainer_can_access_client(client_id) and deleted_at is null)
  with check (public.is_trainer() and public.trainer_can_access_client(client_id));

create policy legacy_import_batches_trainer_select on public.legacy_import_batches
  for select to authenticated
  using (public.is_trainer() and trainer_id = public.current_profile_id());

create policy legacy_import_batches_trainer_insert on public.legacy_import_batches
  for insert to authenticated
  with check (public.is_trainer() and trainer_id = public.current_profile_id());

create policy legacy_import_batches_trainer_update on public.legacy_import_batches
  for update to authenticated
  using (public.is_trainer() and trainer_id = public.current_profile_id())
  with check (public.is_trainer() and trainer_id = public.current_profile_id());

create policy legacy_import_records_trainer_select on public.legacy_import_records
  for select to authenticated
  using (
    public.is_trainer()
    and exists (
      select 1 from public.legacy_import_batches b
      where b.id = import_batch_id
        and b.trainer_id = public.current_profile_id()
    )
  );

create policy legacy_import_records_trainer_insert on public.legacy_import_records
  for insert to authenticated
  with check (
    public.is_trainer()
    and exists (
      select 1 from public.legacy_import_batches b
      where b.id = import_batch_id
        and b.trainer_id = public.current_profile_id()
    )
  );

create policy legacy_import_records_trainer_update on public.legacy_import_records
  for update to authenticated
  using (
    public.is_trainer()
    and exists (
      select 1 from public.legacy_import_batches b
      where b.id = import_batch_id
        and b.trainer_id = public.current_profile_id()
    )
  )
  with check (
    public.is_trainer()
    and exists (
      select 1 from public.legacy_import_batches b
      where b.id = import_batch_id
        and b.trainer_id = public.current_profile_id()
    )
  );

-- No DELETE policies are intentionally defined.
-- Normal application deletes must be soft deletes via deleted_at.
