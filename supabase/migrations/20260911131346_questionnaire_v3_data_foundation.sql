create table if not exists public.questionnaire_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  title text not null,
  purpose text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id)
);

create table if not exists public.questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.questionnaire_templates(id),
  version_code text not null,
  definition jsonb not null,
  definition_sha256 text not null,
  released_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id),
  unique (template_id, version_code),
  unique (template_id, definition_sha256),
  check (jsonb_typeof(definition) = 'object'),
  check (char_length(definition_sha256) = 64),
  check (retired_at is null or released_at is not null)
);

create table if not exists public.questionnaire_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  version_id uuid not null references public.questionnaire_versions(id),
  assigned_by_profile_id uuid not null references public.profiles(id),
  status text not null default 'assigned' check (status in ('assigned','in_progress','submitted','cancelled')),
  goal_snapshot text,
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  submitted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'submitted') = (submitted_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create unique index if not exists questionnaire_assignments_one_open_version_idx
  on public.questionnaire_assignments(client_id, version_id)
  where status in ('assigned','in_progress');
create index if not exists questionnaire_assignments_client_idx on public.questionnaire_assignments(client_id, assigned_at desc);
create index if not exists questionnaire_assignments_version_idx on public.questionnaire_assignments(version_id);
create index if not exists questionnaire_assignments_actor_idx on public.questionnaire_assignments(assigned_by_profile_id);

create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.questionnaire_assignments(id),
  client_id uuid not null references public.clients(id),
  version_id uuid not null references public.questionnaire_versions(id),
  answers jsonb not null default '{}'::jsonb,
  revision integer not null default 0 check (revision >= 0),
  response_schema_version smallint not null default 1 check (response_schema_version = 1),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(answers) = 'object')
);

create index if not exists questionnaire_responses_client_idx on public.questionnaire_responses(client_id, created_at desc);
create index if not exists questionnaire_responses_version_idx on public.questionnaire_responses(version_id);

alter table public.questionnaire_templates enable row level security;
alter table public.questionnaire_versions enable row level security;
alter table public.questionnaire_assignments enable row level security;
alter table public.questionnaire_responses enable row level security;

revoke all on public.questionnaire_templates from anon, authenticated;
revoke all on public.questionnaire_versions from anon, authenticated;
revoke all on public.questionnaire_assignments from anon, authenticated;
revoke all on public.questionnaire_responses from anon, authenticated;

grant select on public.questionnaire_templates to authenticated;
grant select on public.questionnaire_versions to authenticated;
grant select on public.questionnaire_assignments to authenticated;
grant select on public.questionnaire_responses to authenticated;

create policy questionnaire_templates_trainer_select
  on public.questionnaire_templates for select to authenticated
  using (private.is_trainer() and private.trainer_mfa_satisfied());

create policy questionnaire_versions_trainer_select
  on public.questionnaire_versions for select to authenticated
  using (private.is_trainer() and private.trainer_mfa_satisfied());

create policy questionnaire_assignments_trainer_select
  on public.questionnaire_assignments for select to authenticated
  using (private.is_trainer() and private.trainer_can_access_client(client_id) and private.trainer_mfa_satisfied());

create policy questionnaire_assignments_client_select
  on public.questionnaire_assignments for select to authenticated
  using (private.is_client() and private.client_can_access_client(client_id));

create policy questionnaire_responses_trainer_select_submitted_only
  on public.questionnaire_responses for select to authenticated
  using (private.is_trainer() and private.trainer_can_access_client(client_id) and private.trainer_mfa_satisfied() and submitted_at is not null);

create policy questionnaire_responses_client_select_own
  on public.questionnaire_responses for select to authenticated
  using (private.is_client() and private.client_can_access_client(client_id));

comment on table public.questionnaire_templates is 'Questionnaire family identity; reusable across versions and future checkpoints.';
comment on table public.questionnaire_versions is 'Immutable questionnaire definition snapshots. No authenticated write grants in foundation phase.';
comment on table public.questionnaire_assignments is 'Assignment of an exact questionnaire version to a client. No authenticated write grants in foundation phase.';
comment on table public.questionnaire_responses is 'Client response container. Draft write path intentionally disabled until privacy/legal autosave basis is approved.';
