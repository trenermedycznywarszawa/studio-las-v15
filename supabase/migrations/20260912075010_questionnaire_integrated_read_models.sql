create or replace function public.client_questionnaire_assignments()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', qa.id,
        'templateKey', qt.template_key,
        'title', qt.title,
        'versionCode', qv.version_code,
        'rendererKey', qv.definition ->> 'rendererKey',
        'canOpen', coalesce(qv.definition ->> 'rendererKey','') = 'pre_pwd_v31'
          and coalesce(qv.definition -> 'draftContract' ->> 'validatorVersion','') = 'pre_pwd_v31_v1',
        'status', qa.status,
        'assignedAt', qa.assigned_at,
        'startedAt', qa.started_at,
        'submittedAt', qa.submitted_at
      )
      order by qa.assigned_at desc, qa.id desc
    ),
    '[]'::jsonb
  )
  from public.questionnaire_assignments qa
  join public.questionnaire_versions qv on qv.id = qa.version_id
  join public.questionnaire_templates qt on qt.id = qv.template_id
  where private.is_client()
    and qa.status <> 'cancelled'
    and private.client_can_access_client(qa.client_id);
$$;

revoke all on function public.client_questionnaire_assignments() from public, anon, authenticated;
grant execute on function public.client_questionnaire_assignments() to authenticated;

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
    'rendererKey', qv.definition ->> 'rendererKey',
    'draftEnabled', coalesce(qv.definition -> 'draftContract' ->> 'validatorVersion','') = 'pre_pwd_v31_v1',
    'submissionEnabled', coalesce(qv.definition -> 'submissionContract' ->> 'validatorVersion','') = 'pre_pwd_v31_v1',
    'expectedConsentTextVersion', qv.definition -> 'healthConsentContract' ->> 'consentTextVersion',
    'expectedPrivacyNoticeVersion', qv.definition -> 'healthConsentContract' ->> 'privacyNoticeVersion',
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

create or replace function public.trainer_questionnaire_submissions(p_client_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select case
    when not private.is_trainer()
      or not private.trainer_mfa_satisfied()
      or not private.trainer_can_access_client(p_client_id)
    then '[]'::jsonb
    else coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'assignmentId', qa.id,
          'templateKey', qt.template_key,
          'title', qt.title,
          'versionCode', qv.version_code,
          'rendererKey', qv.definition ->> 'rendererKey',
          'goalSnapshot', qa.goal_snapshot,
          'submittedAt', qa.submitted_at,
          'answers', qr.answers,
          'revision', qr.revision,
          'ageObservation', cpd.age_observation,
          'ageObservedAt', cpd.age_observed_at
        )
        order by qa.submitted_at desc, qa.id desc
      )
      from public.questionnaire_assignments qa
      join public.questionnaire_versions qv on qv.id = qa.version_id
      join public.questionnaire_templates qt on qt.id = qv.template_id
      join public.questionnaire_responses qr on qr.assignment_id = qa.id
        and qr.client_id = qa.client_id and qr.version_id = qa.version_id
      left join public.client_profile_details cpd on cpd.client_id = qa.client_id
      where qa.client_id = p_client_id
        and qa.status = 'submitted'
        and qa.submitted_at is not null
        and qr.submitted_at is not null
    ), '[]'::jsonb)
  end;
$$;

revoke all on function public.trainer_questionnaire_submissions(uuid) from public, anon, authenticated;
grant execute on function public.trainer_questionnaire_submissions(uuid) to authenticated;

comment on function public.trainer_questionnaire_submissions(uuid) is 'Trainer AAL2 read model for consciously submitted questionnaire responses only. Draft responses cannot appear here.';
