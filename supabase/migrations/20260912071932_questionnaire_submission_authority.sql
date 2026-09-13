create or replace function public.submit_questionnaire_response(
  p_assignment_id uuid,
  p_expected_revision integer,
  p_confirm_transfer boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_assignment public.questionnaire_assignments%rowtype;
  v_response public.questionnaire_responses%rowtype;
  v_definition jsonb;
  v_contract jsonb;
  v_requires_consent boolean := false;
  v_key text;
  v_value jsonb;
  v_missing text[] := array[]::text[];
  v_now timestamptz;
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
  if p_confirm_transfer is distinct from true then
    raise exception 'conscious questionnaire transfer confirmation required' using errcode = '22023';
  end if;

  select qa.* into v_assignment
  from public.questionnaire_assignments qa
  where qa.id = p_assignment_id
  for update;

  if v_assignment.id is null or not private.client_can_access_client(v_assignment.client_id) then
    raise exception 'questionnaire assignment not found or access denied' using errcode = '42501';
  end if;

  select qr.* into v_response
  from public.questionnaire_responses qr
  where qr.assignment_id = v_assignment.id
  for update;

  if v_assignment.status = 'submitted' then
    if v_response.id is null or v_response.submitted_at is null then
      raise exception 'submitted assignment is missing a sealed response' using errcode = '23514';
    end if;
    return jsonb_build_object(
      'alreadySubmitted', true,
      'assignmentId', v_assignment.id,
      'responseId', v_response.id,
      'revision', v_response.revision,
      'submittedAt', v_response.submitted_at,
      'status', v_assignment.status
    );
  end if;

  if v_assignment.status not in ('assigned','in_progress') then
    raise exception 'questionnaire assignment is not submittable' using errcode = '42501';
  end if;
  if v_response.id is null then
    return jsonb_build_object(
      'validationFailed', true,
      'missing', jsonb_build_array('__draft__'),
      'currentRevision', 0,
      'status', v_assignment.status
    );
  end if;
  if v_response.submitted_at is not null then
    raise exception 'questionnaire response is already sealed' using errcode = '23514';
  end if;
  if v_response.revision <> p_expected_revision then
    return jsonb_build_object(
      'conflict', true,
      'currentRevision', v_response.revision,
      'savedAt', v_response.updated_at,
      'status', v_assignment.status
    );
  end if;

  select qv.definition into v_definition
  from public.questionnaire_versions qv
  where qv.id = v_assignment.version_id;

  v_requires_consent := coalesce((v_definition ->> 'requiresHealthConsentReceipt')::boolean, false);
  if v_requires_consent and not private.questionnaire_health_consent_active(v_assignment.id) then
    raise exception 'active health-data consent receipt required before questionnaire submission' using errcode = '42501';
  end if;

  v_contract := v_definition -> 'submissionContract';
  if v_contract is null
     or coalesce(v_contract ->> 'validatorVersion','') <> 'required_keys_v1'
  then
    raise exception 'questionnaire version is not enabled for server submission' using errcode = '42501';
  end if;

  for v_key in
    select jsonb_array_elements_text(coalesce(v_contract -> 'requiredAnswerIds','[]'::jsonb))
  loop
    if not (v_response.answers ? v_key) then
      v_missing := array_append(v_missing, v_key);
      continue;
    end if;
    v_value := v_response.answers -> v_key;
    if v_value = 'null'::jsonb
       or (jsonb_typeof(v_value) = 'string' and btrim(v_response.answers ->> v_key) = '')
       or (jsonb_typeof(v_value) = 'array' and jsonb_array_length(v_value) = 0)
    then
      v_missing := array_append(v_missing, v_key);
    end if;
  end loop;

  for v_key in
    select jsonb_array_elements_text(coalesce(v_contract -> 'requiredTrueAnswerIds','[]'::jsonb))
  loop
    if lower(coalesce(v_response.answers ->> v_key,'')) <> 'true' then
      if not (v_key = any(v_missing)) then
        v_missing := array_append(v_missing, v_key);
      end if;
    end if;
  end loop;

  if cardinality(v_missing) > 0 then
    return jsonb_build_object(
      'validationFailed', true,
      'missing', to_jsonb(v_missing),
      'currentRevision', v_response.revision,
      'status', v_assignment.status
    );
  end if;

  v_now := clock_timestamp();

  update public.questionnaire_responses
  set submitted_at = v_now,
      revision = revision + 1
  where id = v_response.id
  returning * into v_response;

  update public.questionnaire_assignments
  set status = 'submitted',
      submitted_at = v_now
  where id = v_assignment.id
  returning * into v_assignment;

  return jsonb_build_object(
    'alreadySubmitted', false,
    'conflict', false,
    'validationFailed', false,
    'assignmentId', v_assignment.id,
    'responseId', v_response.id,
    'revision', v_response.revision,
    'submittedAt', v_response.submitted_at,
    'status', v_assignment.status
  );
end;
$$;

revoke all on function public.submit_questionnaire_response(uuid,integer,boolean) from public, anon, authenticated;
grant execute on function public.submit_questionnaire_response(uuid,integer,boolean) to authenticated;

comment on function public.submit_questionnaire_response(uuid,integer,boolean) is 'Conscious client submission authority. Requires own assignment, active consent where configured, optimistic revision and an immutable server submission contract in the questionnaire version manifest.';
