create table if not exists public.client_profile_details (
  client_id uuid primary key references public.clients(id) on delete cascade,
  age_observation smallint,
  age_observed_at date,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  updated_by_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_observation is null or age_observation between 0 and 120),
  check (emergency_contact_name is null or char_length(btrim(emergency_contact_name)) between 1 and 160),
  check (emergency_contact_phone is null or char_length(btrim(emergency_contact_phone)) between 3 and 64),
  check (emergency_contact_relation is null or char_length(btrim(emergency_contact_relation)) between 1 and 120)
);

create index if not exists client_profile_details_updated_by_idx
  on public.client_profile_details(updated_by_profile_id);

alter table public.client_profile_details enable row level security;
revoke all on public.client_profile_details from anon, authenticated;
grant select on public.client_profile_details to authenticated;

drop policy if exists client_profile_details_select_related on public.client_profile_details;
create policy client_profile_details_select_related
  on public.client_profile_details for select to authenticated
  using (
    (private.is_client() and private.client_can_access_client(client_id))
    or
    (private.is_trainer() and private.trainer_mfa_satisfied() and private.trainer_can_access_client(client_id))
  );

create or replace function public.save_client_questionnaire_profile_context(
  p_assignment_id uuid,
  p_age_observation smallint,
  p_emergency_contact_name text,
  p_emergency_contact_phone text,
  p_emergency_contact_relation text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_assignment public.questionnaire_assignments%rowtype;
  v_row public.client_profile_details%rowtype;
begin
  if auth.uid() is null or not private.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;

  select qa.* into v_assignment
  from public.questionnaire_assignments qa
  where qa.id = p_assignment_id
  for update;

  if v_assignment.id is null
     or v_assignment.status not in ('assigned','in_progress')
     or not private.client_can_access_client(v_assignment.client_id)
  then
    raise exception 'questionnaire assignment not found or profile context not editable' using errcode = '42501';
  end if;

  if p_age_observation is null or p_age_observation < 0 or p_age_observation > 120 then
    raise exception 'age observation must be between 0 and 120' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_emergency_contact_name,'')), '') is null
     or char_length(btrim(p_emergency_contact_name)) > 160 then
    raise exception 'valid emergency contact name required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_emergency_contact_phone,'')), '') is null
     or char_length(btrim(p_emergency_contact_phone)) > 64 then
    raise exception 'valid emergency contact phone required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_emergency_contact_relation,'')), '') is null
     or char_length(btrim(p_emergency_contact_relation)) > 120 then
    raise exception 'valid emergency contact relation required' using errcode = '22023';
  end if;

  insert into public.client_profile_details(
    client_id, age_observation, age_observed_at,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    updated_by_profile_id
  ) values (
    v_assignment.client_id, p_age_observation, current_date,
    btrim(p_emergency_contact_name), btrim(p_emergency_contact_phone), btrim(p_emergency_contact_relation),
    private.current_profile_id()
  )
  on conflict (client_id) do update set
    age_observation = excluded.age_observation,
    age_observed_at = excluded.age_observed_at,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    emergency_contact_relation = excluded.emergency_contact_relation,
    updated_by_profile_id = excluded.updated_by_profile_id,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'clientId', v_row.client_id,
    'ageObservation', v_row.age_observation,
    'ageObservedAt', v_row.age_observed_at,
    'emergencyContact', jsonb_build_object(
      'name', v_row.emergency_contact_name,
      'phone', v_row.emergency_contact_phone,
      'relation', v_row.emergency_contact_relation
    ),
    'savedAt', v_row.updated_at
  );
end;
$$;

revoke all on function public.save_client_questionnaire_profile_context(uuid,smallint,text,text,text) from public, anon, authenticated;
grant execute on function public.save_client_questionnaire_profile_context(uuid,smallint,text,text,text) to authenticated;

create or replace function public.client_questionnaire_response_snapshot(p_assignment_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select jsonb_build_object(
    'assignmentId', qa.id,
    'status', qa.status,
    'versionId', qa.version_id,
    'versionCode', qv.version_code,
    'answers', coalesce(qr.answers, '{}'::jsonb),
    'revision', coalesce(qr.revision, 0),
    'savedAt', qr.updated_at,
    'submittedAt', qr.submitted_at,
    'healthConsentActive', coalesce(latest_consent.event_type = 'health_data_consent_granted', false),
    'consentTextVersion', latest_consent.consent_text_version,
    'privacyNoticeVersion', latest_consent.privacy_notice_version,
    'profileContext', case when cpd.client_id is null then null else jsonb_build_object(
      'ageObservation', cpd.age_observation,
      'ageObservedAt', cpd.age_observed_at,
      'emergencyContact', jsonb_build_object(
        'name', cpd.emergency_contact_name,
        'phone', cpd.emergency_contact_phone,
        'relation', cpd.emergency_contact_relation
      ),
      'savedAt', cpd.updated_at
    ) end
  )
  from public.questionnaire_assignments qa
  join public.questionnaire_versions qv on qv.id = qa.version_id
  left join public.questionnaire_responses qr on qr.assignment_id = qa.id
  left join public.client_profile_details cpd on cpd.client_id = qa.client_id
  left join lateral (
    select qpe.event_type, qpe.consent_text_version, qpe.privacy_notice_version
    from public.questionnaire_privacy_events qpe
    where qpe.assignment_id = qa.id
    order by qpe.event_seq desc
    limit 1
  ) latest_consent on true
  where qa.id = p_assignment_id
    and qa.status <> 'cancelled'
    and private.is_client()
    and private.client_can_access_client(qa.client_id)
  limit 1;
$$;

revoke all on function public.client_questionnaire_response_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.client_questionnaire_response_snapshot(uuid) to authenticated;

comment on table public.client_profile_details is 'Client profile context used across Studio Las workflows. Age is stored as an observation, not date of birth. Emergency contact remains outside questionnaire response history.';
comment on function public.save_client_questionnaire_profile_context(uuid,smallint,text,text,text) is 'Client-only controlled profile-context write bound to an editable own questionnaire assignment. Profile fields are never persisted inside questionnaire responses.';
