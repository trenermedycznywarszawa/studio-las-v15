-- Studio Las OS 9.0 - initial Supabase schema
-- Phase 1 only: database shape, no frontend integration.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('trainer', 'client'))
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  owner_trainer_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  contact text,
  email text,
  phone text,
  package text,
  stage smallint not null default 1,
  stage_raw text,
  start_date date,
  next_session_date date,
  next_review_date date,
  goal text,
  motivation text,
  fears text,
  health_status text,
  contraindications text,
  red_flags_text text,
  communication_profile text,
  next_milestone text,
  working_hypothesis text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint clients_stage_check check (stage between 1 and 4),
  constraint clients_status_check check (status in ('active', 'archived'))
);

create table public.client_trainers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_trainers_role_check check (role in ('primary', 'assistant')),
  constraint client_trainers_unique unique (client_id, trainer_id)
);

create table public.client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_users_status_check check (status in ('active', 'revoked')),
  constraint client_users_unique unique (client_id, user_id)
);

create table public.client_access_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  code_hash text not null,
  code_updated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_intakes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  legacy_id text,
  imported_at timestamptz,
  source text not null default 'CSV',
  raw_payload jsonb not null default '{}'::jsonb,
  summary text,
  goals text[] not null default '{}',
  main_goal text,
  motivation text,
  expectations text,
  readiness_text text,
  pain_areas text,
  medical_flags text[] not null default '{}',
  movement_limitations text[] not null default '{}',
  lifestyle_flags text[] not null default '{}',
  training_preferences text[] not null default '{}',
  flags text[] not null default '{}',
  communication_style text,
  compliance_forecast text,
  first_session_focus text,
  risk_level text not null default 'low',
  trainer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint client_intakes_risk_level_check check (risk_level in ('low', 'medium', 'high'))
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  legacy_id text,
  date date not null,
  readiness smallint,
  vas_before smallint,
  vas_after smallint,
  mobility_index numeric(5,2),
  sleep_quality text,
  exercises_text text[] not null default '{}',
  trainer_observation text,
  trainer_decision text,
  milestone text,
  client_summary text,
  client_next_step text,
  client_visible boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint sessions_readiness_check check (readiness is null or readiness between 1 and 10),
  constraint sessions_vas_before_check check (vas_before is null or vas_before between 0 and 10),
  constraint sessions_vas_after_check check (vas_after is null or vas_after between 0 and 10),
  constraint sessions_mobility_index_check check (mobility_index is null or mobility_index between 0 and 100)
);

create table public.pre_session_checks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  legacy_id text,
  check_date date not null,
  pain_increased boolean not null default false,
  poor_sleep boolean not null default false,
  home_plan_done boolean not null default false,
  new_symptoms boolean not null default false,
  red_flag_concern boolean not null default false,
  planned_decision text not null default 'utrzymaj',
  trainer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint pre_session_checks_decision_check check (planned_decision in ('zwiększ', 'utrzymaj', 'zmniejsz', 'regeneracyjnie', 'obserwuj'))
);

create table public.post_session_observations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  legacy_id text,
  date date not null,
  what_we_did text,
  client_response text,
  decision text not null default 'utrzymaj',
  home_task_text text,
  client_message text,
  client_visible boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint post_session_observations_decision_check check (decision in ('zwiększ', 'utrzymaj', 'zmniejsz', 'regeneracyjnie', 'obserwuj'))
);

create table public.client_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  source text,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  related_table text,
  related_id uuid,
  kind text,
  original_name text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  audience text not null default 'trainer',
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint client_documents_audience_check check (audience in ('trainer', 'client')),
  constraint client_documents_status_check check (status in ('draft', 'published', 'archived')),
  constraint client_documents_published_at_check check (status <> 'published' or published_at is not null),
  constraint client_documents_size_check check (size_bytes is null or size_bytes >= 0)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  legacy_id text,
  measured_at date not null,
  source text not null default 'Tanita',
  input_method text,
  parse_status text,
  parsed_fields text[] not null default '{}',
  weight_kg numeric(6,2),
  fat_percent numeric(5,2),
  fat_mass_kg numeric(6,2),
  fat_free_mass_kg numeric(6,2),
  muscle_mass_kg numeric(6,2),
  body_water_percent numeric(5,2),
  body_water_kg numeric(6,2),
  visceral_fat_rating numeric(4,1),
  bmr_kcal integer,
  metabolic_age integer,
  bmi numeric(5,2),
  bone_mass_kg numeric(5,2),
  protein_kg numeric(5,2),
  trainer_interpretation text,
  client_summary text,
  document_id uuid references public.client_documents(id) on delete set null,
  client_visible boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint body_measurements_input_method_check check (input_method is null or input_method in ('manual', 'pdf', 'pdf-autofill', 'demo')),
  constraint body_measurements_parse_status_check check (parse_status is null or parse_status in ('not_attempted', 'success', 'partial', 'failed', 'manual_required', 'demo')),
  constraint body_measurements_weight_check check (weight_kg is null or weight_kg between 30 and 250),
  constraint body_measurements_fat_percent_check check (fat_percent is null or fat_percent between 3 and 60),
  constraint body_measurements_muscle_mass_check check (muscle_mass_kg is null or muscle_mass_kg between 0 and 120),
  constraint body_measurements_water_percent_check check (body_water_percent is null or body_water_percent between 30 and 80),
  constraint body_measurements_bmi_check check (bmi is null or bmi between 12 and 60)
);

create table public.training_load_observations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  legacy_id text,
  observed_at date not null,
  source text not null default 'Polar',
  session_type text,
  duration_min integer,
  hr_avg integer,
  hr_max integer,
  zone_light_min integer,
  zone_moderate_min integer,
  zone_high_min integer,
  rpe smallint,
  trainer_note text,
  client_summary text,
  load_decision text not null default 'utrzymaj',
  client_visible boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint training_load_duration_check check (duration_min is null or duration_min between 1 and 300),
  constraint training_load_hr_avg_check check (hr_avg is null or hr_avg between 40 and 220),
  constraint training_load_hr_max_check check (hr_max is null or hr_max between 60 and 240),
  constraint training_load_zone_light_check check (zone_light_min is null or zone_light_min between 0 and 300),
  constraint training_load_zone_moderate_check check (zone_moderate_min is null or zone_moderate_min between 0 and 300),
  constraint training_load_zone_high_check check (zone_high_min is null or zone_high_min between 0 and 300),
  constraint training_load_rpe_check check (rpe is null or rpe between 1 and 10),
  constraint training_load_decision_check check (load_decision in ('zwiększ', 'utrzymaj', 'zmniejsz', 'regeneracyjnie', 'obserwuj'))
);

create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  legacy_id text,
  test_id text,
  test_name text,
  performed_at date not null,
  side text,
  result_text text,
  pain_before smallint,
  pain_after smallint,
  quality text not null default 'do obserwacji',
  interpretation text,
  trainer_decision text not null default 'obserwuj',
  next_step text,
  trainer_note text,
  client_summary text,
  client_visible boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint assessment_results_side_check check (side is null or side in ('', 'lewa', 'prawa', 'obie')),
  constraint assessment_results_pain_before_check check (pain_before is null or pain_before between 0 and 10),
  constraint assessment_results_pain_after_check check (pain_after is null or pain_after between 0 and 10),
  constraint assessment_results_quality_check check (quality in ('dobrze tolerowane', 'ograniczone', 'do obserwacji', 'przerwać i skonsultować')),
  constraint assessment_results_decision_check check (trainer_decision in ('obserwuj', 'utrzymaj', 'regresuj', 'progresuj ostrożnie', 'skonsultuj'))
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  owner_trainer_id uuid references public.profiles(id) on delete set null,
  name text not null,
  client_name text,
  category text,
  training_block text,
  subcategory text,
  region text,
  pattern text,
  stage text,
  level text,
  equipment text,
  goal text,
  dosage_default text,
  tempo text,
  breathing text,
  client_instruction text,
  coach_notes text,
  common_mistakes text,
  stop_criteria text,
  regressions text,
  progressions text,
  contraindications text,
  video_url text,
  tags text[] not null default '{}',
  linked_tests text[] not null default '{}',
  beginner_friendly boolean not null default true,
  source text,
  source_order integer,
  quality_status text not null default 'reviewed',
  muscle_map jsonb not null default '{}'::jsonb,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  support_muscles text[] not null default '{}',
  strength_set boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint exercises_quality_status_check check (quality_status in ('reviewed', 'needs_review', 'draft')),
  constraint exercises_source_order_check check (source_order is null or source_order >= 0)
);

create table public.home_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  legacy_id text,
  title text,
  focus text,
  frequency text,
  duration text,
  instructions text,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint home_plans_status_check check (status in ('draft', 'active', 'archived')),
  constraint home_plans_id_client_unique unique (id, client_id)
);

create table public.home_plan_items (
  id uuid primary key default gen_random_uuid(),
  home_plan_id uuid not null references public.home_plans(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  legacy_id text,
  name text not null,
  category text,
  region text,
  dosage text,
  frequency text,
  client_cue text,
  stop_criteria text,
  video_url text,
  status text not null default 'active',
  sort_order integer not null default 0,
  added_at date,
  trainer_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint home_plan_items_status_check check (status in ('active', 'archived')),
  constraint home_plan_items_sort_order_check check (sort_order >= 0),
  constraint home_plan_items_id_client_unique unique (id, client_id),
  constraint home_plan_items_plan_client_fk foreign key (home_plan_id, client_id) references public.home_plans(id, client_id) on delete cascade
);

create table public.guidance_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  home_plan_item_id uuid,
  event_date date not null,
  kind text not null,
  completed boolean,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint guidance_events_kind_check check (kind in ('daily_step', 'client_checkin', 'trainer_marker')),
  constraint guidance_events_item_client_fk foreign key (home_plan_item_id, client_id) references public.home_plan_items(id, client_id) on delete cascade
);

create table public.guidance_pilots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'not_started',
  start_date date,
  duration_weeks integer,
  current_week integer,
  objective text,
  trainer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint guidance_pilots_status_check check (status in ('not_started', 'active', 'paused', 'completed')),
  constraint guidance_pilots_duration_check check (duration_weeks is null or duration_weeks in (4, 6)),
  constraint guidance_pilots_current_week_check check (current_week is null or current_week between 1 and 6)
);

create table public.guidance_pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  pilot_id uuid not null references public.guidance_pilots(id) on delete cascade,
  week integer not null,
  understood_next_step text,
  reduced_chaos text,
  friction text,
  simplify_next text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint guidance_pilot_feedback_week_check check (week between 1 and 6),
  constraint guidance_pilot_feedback_unique unique (pilot_id, week)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  legacy_id text,
  type text not null,
  audience text not null,
  status text not null default 'draft',
  title text,
  content text not null,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint reports_type_check check (type in ('startMap', 'fourWeeks', 'twelveWeeks', 'continuation')),
  constraint reports_audience_check check (audience in ('trainer', 'client')),
  constraint reports_status_check check (status in ('draft', 'published', 'archived')),
  constraint reports_published_at_check check (status <> 'published' or published_at is not null)
);

create table public.legacy_import_batches (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  source_app_version text,
  storage_key text,
  backup_json_path text,
  record_counts jsonb not null default '{}'::jsonb,
  validation_summary jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legacy_import_batches_status_check check (status in ('draft', 'running', 'completed', 'failed'))
);

create table public.legacy_import_records (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.legacy_import_batches(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  source_path text not null,
  legacy_id text,
  target_table text,
  target_id uuid,
  raw_payload jsonb not null default '{}'::jsonb,
  status text not null default 'imported',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legacy_import_records_status_check check (status in ('imported', 'skipped', 'needs_review', 'error'))
);

create unique index clients_owner_legacy_id_idx on public.clients(owner_trainer_id, legacy_id) where legacy_id is not null;
create index clients_owner_idx on public.clients(owner_trainer_id) where deleted_at is null;
create index clients_email_idx on public.clients(email) where email is not null and deleted_at is null;
create index clients_next_session_date_idx on public.clients(next_session_date) where deleted_at is null;
create index client_trainers_trainer_idx on public.client_trainers(trainer_id);
create index client_users_user_idx on public.client_users(user_id) where status = 'active';
create index client_intakes_client_imported_idx on public.client_intakes(client_id, imported_at desc) where deleted_at is null;
create index sessions_client_date_idx on public.sessions(client_id, date desc) where deleted_at is null;
create index pre_session_checks_client_date_idx on public.pre_session_checks(client_id, check_date desc) where deleted_at is null;
create index post_session_observations_client_date_idx on public.post_session_observations(client_id, date desc) where deleted_at is null;
create index client_tasks_client_completed_idx on public.client_tasks(client_id, completed, created_at desc) where deleted_at is null;
create index client_documents_client_kind_idx on public.client_documents(client_id, kind) where deleted_at is null;
create unique index client_documents_storage_path_idx on public.client_documents(storage_bucket, storage_path) where storage_path is not null;
create index body_measurements_client_date_idx on public.body_measurements(client_id, measured_at desc) where deleted_at is null;
create index training_load_client_date_idx on public.training_load_observations(client_id, observed_at desc) where deleted_at is null;
create index assessment_results_client_date_idx on public.assessment_results(client_id, performed_at desc) where deleted_at is null;
create index assessment_results_test_id_idx on public.assessment_results(test_id) where test_id is not null and deleted_at is null;
create index exercises_owner_idx on public.exercises(owner_trainer_id) where deleted_at is null;
create index exercises_quality_idx on public.exercises(quality_status) where deleted_at is null;
create index exercises_category_idx on public.exercises(category) where deleted_at is null;
create index exercises_region_idx on public.exercises(region) where deleted_at is null;
create index exercises_tags_gin_idx on public.exercises using gin(tags);
create unique index home_plans_one_active_per_client_idx on public.home_plans(client_id) where status = 'active' and deleted_at is null;
create index home_plans_client_status_idx on public.home_plans(client_id, status) where deleted_at is null;
create index home_plan_items_plan_status_idx on public.home_plan_items(home_plan_id, status) where deleted_at is null;
create index home_plan_items_client_status_idx on public.home_plan_items(client_id, status) where deleted_at is null;
create unique index guidance_events_daily_unique_idx on public.guidance_events(client_id, home_plan_item_id, kind, event_date) where kind = 'daily_step' and deleted_at is null;
create index guidance_events_client_date_idx on public.guidance_events(client_id, event_date desc) where deleted_at is null;
create index guidance_pilots_client_status_idx on public.guidance_pilots(client_id, status) where deleted_at is null;
create index reports_client_audience_status_idx on public.reports(client_id, audience, status, published_at desc) where deleted_at is null;
create index legacy_import_batches_trainer_idx on public.legacy_import_batches(trainer_id, created_at desc);
create index legacy_import_records_batch_idx on public.legacy_import_records(import_batch_id, status);

do $$
declare
  table_name text;
  table_names text[] := array[
    'profiles',
    'clients',
    'client_trainers',
    'client_users',
    'client_access_credentials',
    'client_intakes',
    'sessions',
    'pre_session_checks',
    'post_session_observations',
    'client_tasks',
    'client_documents',
    'body_measurements',
    'training_load_observations',
    'assessment_results',
    'exercises',
    'home_plans',
    'home_plan_items',
    'guidance_events',
    'guidance_pilots',
    'guidance_pilot_feedback',
    'reports',
    'legacy_import_batches',
    'legacy_import_records'
  ];
begin
  foreach table_name in array table_names loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end;
$$;
