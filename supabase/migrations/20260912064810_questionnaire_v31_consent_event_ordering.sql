alter table public.questionnaire_privacy_events
  add column if not exists event_seq bigint generated always as identity;

create unique index if not exists questionnaire_privacy_events_event_seq_uidx
  on public.questionnaire_privacy_events(event_seq);

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
    order by qpe.event_seq desc
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
  order by qpe.event_seq desc
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
  order by qpe.event_seq desc
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
