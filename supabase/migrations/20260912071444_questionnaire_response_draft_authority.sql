create or replace function public.assign_active_questionnaire(
  p_client_id uuid,
  p_template_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_profile_id uuid;
  v_version_id uuid;
  v_goal_snapshot text;
  v_assignment public.questionnaire_assignments%rowtype;
begin
  if auth.uid() is null or not private.is_trainer() then
    raise exception 'trainer authentication required' using errcode = '42501';
  end if;
  if not private.trainer_mfa_satisfied() then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if not private.trainer_owns_client(p_client_id) then
    raise exception 'client ownership required' using errcode = '42501';
  end if;
  if nullif(btrim(p_template_key), '') is null then
    raise exception 'template key is required' using errcode = '22023';
  end if;

  v_profile_id := private.current_profile_id();

  select qv.id
  into v_version_id
  from public.questionnaire_templates qt
  join public.questionnaire_versions qv on qv.template_id = qt.id
  where qt.template_key = btrim(p_template_key)
    and qt.active = true
    and qv.released_at is not null
    and qv.retired_at is null
    and qv.definition ->> 'releaseState' = 'released'
  limit 1;

  if v_version_id is null then
    raise exception 'active questionnaire version not found' using errcode = '22023';
  end if;

  select c.goal into v_goal_snapshot
  from public.clients c
  where c.id = p_client_id
    and c.deleted_at is null
    and c.status = 'active';

  select qa.*
  into v_assignment
  from public.questionnaire_assignments qa
  where qa.client_id = p_client_id
    and qa.version_id = v_version_id
    and qa.status in ('assigned','in_progress')
  order by qa.assigned_at desc
  limit 1;

  if v_assignment.id is null then
    insert into public.questionnaire_assignments(
      client_id,
      version_id,
      assigned_by_profile_id,
      status,
      goal_snapshot
    ) values (
      p_client_id,
      v_version_id,
      v_profile_id,
      'assigned',
      v_goal_snapshot
    )
    returning * into v_assignment;
  end if;

  return jsonb_build_object(
    'id', v_assignment.id,
    'clientId', v_assignment.client_id,
    'versionId', v_assignment.version_id,
    'status', v_assignment.status,
    'goalSnapshot', v_assignment.goal_snapshot,
    'assignedAt', v_assignment.assigned_at
  );
end;
$$;

revoke all on function public.assign_active_questionnaire(uuid,text) from public, anon, authenticated;
grant execute on function public.assign_active_questionnaire(uuid,text) to authenticated;

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
    'privacyNoticeVersion', latest_consent.privacy_notice_version
  )
  from public.questionnaire_assignments qa
  join public.questionnaire_versions qv on qv.id = qa.version_id
  left join public.questionnaire_responses qr on qr.assignment_id = qa.id
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

create or replace function public.save_questionnaire_draft(
  p_assignment_id uuid,
  p_answers jsonb,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_assignment public.questionnaire_assignments%rowtype;
  v_response public.questionnaire_responses%rowtype;
  v_requires_consent boolean := false;
begin
  if auth.uid() is null or not private.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;
  if p_assignment_id is null then
    raise exception 'assignment id is required' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'expected revision must be a non-negative integer' using errcode = '22023';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be a JSON object' using errcode = '22023';
  end if;
  if octet_length(p_answers::text) > 131072 then
    raise exception 'questionnaire draft is too large' using errcode = '22023';
  end if;

  select qa.* into v_assignment
  from public.questionnaire_assignments qa
  where qa.id = p_assignment_id
  for update;

  if v_assignment.id is null
     or not private.client_can_access_client(v_assignment.client_id)
     or v_assignment.status not in ('assigned','in_progress') then
    raise exception 'questionnaire assignment not found or not editable' using errcode = '42501';
  end if;

  select coalesce((qv.definition ->> 'requiresHealthConsentReceipt')::boolean, false)
  into v_requires_consent
  from public.questionnaire_versions qv
  where qv.id = v_assignment.version_id;

  if v_requires_consent and not private.questionnaire_health_consent_active(v_assignment.id) then
    raise exception 'active health-data consent receipt required before questionnaire draft persistence' using errcode = '42501';
  end if;

  select qr.* into v_response
  from public.questionnaire_responses qr
  where qr.assignment_id = v_assignment.id
  for update;

  if v_response.id is null then
    if p_expected_revision <> 0 then
      return jsonb_build_object(
        'conflict', true,
        'currentRevision', 0,
        'status', v_assignment.status
      );
    end if;

    insert into public.questionnaire_responses(
      assignment_id, client_id, version_id, answers, revision, response_schema_version
    ) values (
      v_assignment.id, v_assignment.client_id, v_assignment.version_id, p_answers, 1, 1
    ) returning * into v_response;
  else
    if v_response.submitted_at is not null then
      raise exception 'submitted questionnaire response is immutable' using errcode = '42501';
    end if;
    if v_response.revision <> p_expected_revision then
      return jsonb_build_object(
        'conflict', true,
        'currentRevision', v_response.revision,
        'savedAt', v_response.updated_at,
        'status', v_assignment.status
      );
    end if;

    update public.questionnaire_responses
    set answers = p_answers,
        revision = revision + 1
    where id = v_response.id
    returning * into v_response;
  end if;

  if v_assignment.status = 'assigned' then
    update public.questionnaire_assignments
    set status = 'in_progress',
        started_at = coalesce(started_at, now())
    where id = v_assignment.id
    returning * into v_assignment;
  end if;

  return jsonb_build_object(
    'conflict', false,
    'responseId', v_response.id,
    'assignmentId', v_assignment.id,
    'revision', v_response.revision,
    'savedAt', v_response.updated_at,
    'status', v_assignment.status
  );
end;
$$;

revoke all on function public.save_questionnaire_draft(uuid,jsonb,integer) from public, anon, authenticated;
grant execute on function public.save_questionnaire_draft(uuid,jsonb,integer) to authenticated;

comment on function public.client_questionnaire_response_snapshot(uuid) is 'Client-only own-assignment questionnaire draft snapshot; trainer access remains blocked before conscious submission.';
comment on function public.save_questionnaire_draft(uuid,jsonb,integer) is 'Controlled client draft persistence with ownership, consent gate and optimistic revision; no direct table writes are granted.';
