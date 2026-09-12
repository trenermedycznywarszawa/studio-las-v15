create table if not exists public.questionnaire_privacy_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null,
  client_id uuid not null,
  version_id uuid not null,
  event_type text not null check (event_type in ('health_data_consent_granted','health_data_consent_withdrawn')),
  consent_text_version text not null,
  privacy_notice_version text not null,
  created_by_profile_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint questionnaire_privacy_events_assignment_identity_fk
    foreign key (assignment_id, client_id, version_id)
    references public.questionnaire_assignments(id, client_id, version_id),
  check (char_length(trim(consent_text_version)) > 0),
  check (char_length(trim(privacy_notice_version)) > 0)
);

create index if not exists questionnaire_privacy_events_assignment_idx
  on public.questionnaire_privacy_events(assignment_id, occurred_at desc, created_at desc);
create index if not exists questionnaire_privacy_events_client_idx
  on public.questionnaire_privacy_events(client_id, occurred_at desc);

alter table public.questionnaire_privacy_events enable row level security;
revoke all on public.questionnaire_privacy_events from anon, authenticated;
grant select on public.questionnaire_privacy_events to authenticated;

drop policy if exists questionnaire_privacy_events_client_select_own on public.questionnaire_privacy_events;
create policy questionnaire_privacy_events_client_select_own
  on public.questionnaire_privacy_events for select to authenticated
  using (private.is_client() and private.client_can_access_client(client_id));

create or replace function private.protect_questionnaire_privacy_event_history()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'questionnaire privacy events are immutable';
end;
$$;

drop trigger if exists questionnaire_privacy_events_immutable on public.questionnaire_privacy_events;
create trigger questionnaire_privacy_events_immutable
before update or delete on public.questionnaire_privacy_events
for each row execute function private.protect_questionnaire_privacy_event_history();

create or replace function private.questionnaire_health_consent_active(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select qpe.event_type = 'health_data_consent_granted'
    from public.questionnaire_privacy_events qpe
    where qpe.assignment_id = p_assignment_id
    order by qpe.occurred_at desc, qpe.created_at desc, qpe.id desc
    limit 1
  ), false);
$$;

revoke all on function private.questionnaire_health_consent_active(uuid) from public, anon, authenticated;

create or replace function public.record_questionnaire_health_consent(
  p_assignment_id uuid,
  p_consent_text_version text,
  p_privacy_notice_version text
)
returns public.questionnaire_privacy_events
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_assignment public.questionnaire_assignments%rowtype;
  v_latest public.questionnaire_privacy_events%rowtype;
  v_event public.questionnaire_privacy_events%rowtype;
begin
  if auth.uid() is null or not private.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_consent_text_version,'')), '') is null
     or nullif(trim(coalesce(p_privacy_notice_version,'')), '') is null then
    raise exception 'consent and privacy notice versions are required' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.questionnaire_assignments qa
  where qa.id = p_assignment_id
    and qa.status in ('assigned','in_progress')
    and private.client_can_access_client(qa.client_id);

  if v_assignment.id is null then
    raise exception 'questionnaire assignment not found or access denied' using errcode = '42501';
  end if;

  select * into v_latest
  from public.questionnaire_privacy_events qpe
  where qpe.assignment_id = v_assignment.id
  order by qpe.occurred_at desc, qpe.created_at desc, qpe.id desc
  limit 1;

  if v_latest.id is not null
     and v_latest.event_type = 'health_data_consent_granted'
     and v_latest.consent_text_version = trim(p_consent_text_version)
     and v_latest.privacy_notice_version = trim(p_privacy_notice_version) then
    return v_latest;
  end if;

  insert into public.questionnaire_privacy_events(
    assignment_id, client_id, version_id, event_type,
    consent_text_version, privacy_notice_version, created_by_profile_id
  ) values (
    v_assignment.id, v_assignment.client_id, v_assignment.version_id, 'health_data_consent_granted',
    trim(p_consent_text_version), trim(p_privacy_notice_version), private.current_profile_id()
  ) returning * into v_event;

  return v_event;
end;
$$;

revoke all on function public.record_questionnaire_health_consent(uuid,text,text) from public, anon, authenticated;
grant execute on function public.record_questionnaire_health_consent(uuid,text,text) to authenticated;

create or replace function public.withdraw_questionnaire_health_consent(p_assignment_id uuid)
returns public.questionnaire_privacy_events
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_assignment public.questionnaire_assignments%rowtype;
  v_latest public.questionnaire_privacy_events%rowtype;
  v_event public.questionnaire_privacy_events%rowtype;
begin
  if auth.uid() is null or not private.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;

  select * into v_assignment
  from public.questionnaire_assignments qa
  where qa.id = p_assignment_id
    and private.client_can_access_client(qa.client_id);

  if v_assignment.id is null then
    raise exception 'questionnaire assignment not found or access denied' using errcode = '42501';
  end if;

  select * into v_latest
  from public.questionnaire_privacy_events qpe
  where qpe.assignment_id = v_assignment.id
  order by qpe.occurred_at desc, qpe.created_at desc, qpe.id desc
  limit 1;

  if v_latest.id is null then
    raise exception 'health-data consent has not been granted' using errcode = '22023';
  end if;
  if v_latest.event_type = 'health_data_consent_withdrawn' then
    return v_latest;
  end if;

  insert into public.questionnaire_privacy_events(
    assignment_id, client_id, version_id, event_type,
    consent_text_version, privacy_notice_version, created_by_profile_id
  ) values (
    v_assignment.id, v_assignment.client_id, v_assignment.version_id, 'health_data_consent_withdrawn',
    v_latest.consent_text_version, v_latest.privacy_notice_version, private.current_profile_id()
  ) returning * into v_event;

  return v_event;
end;
$$;

revoke all on function public.withdraw_questionnaire_health_consent(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_questionnaire_health_consent(uuid) to authenticated;

create or replace function private.require_questionnaire_health_consent_before_response()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  v_requires_consent boolean;
begin
  select coalesce((qv.definition->>'requiresHealthConsentReceipt')::boolean, false)
  into v_requires_consent
  from public.questionnaire_versions qv
  where qv.id = new.version_id;

  if v_requires_consent and not private.questionnaire_health_consent_active(new.assignment_id) then
    raise exception 'active health-data consent receipt required before questionnaire response persistence' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists questionnaire_responses_health_consent_gate on public.questionnaire_responses;
create trigger questionnaire_responses_health_consent_gate
before insert or update of answers on public.questionnaire_responses
for each row execute function private.require_questionnaire_health_consent_before_response();

comment on table public.questionnaire_privacy_events is 'Immutable client privacy/health-data consent event history. Contains no questionnaire answers or health content.';
