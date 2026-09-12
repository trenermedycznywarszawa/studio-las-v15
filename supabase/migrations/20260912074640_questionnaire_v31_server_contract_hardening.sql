create or replace function private.questionnaire_answer_present(p_answers jsonb, p_key text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_answers is null or jsonb_typeof(p_answers) <> 'object' or not (p_answers ? p_key) then false
    when p_answers -> p_key = 'null'::jsonb then false
    when jsonb_typeof(p_answers -> p_key) = 'string' then btrim(p_answers ->> p_key) <> ''
    when jsonb_typeof(p_answers -> p_key) = 'array' then jsonb_array_length(p_answers -> p_key) > 0
    when jsonb_typeof(p_answers -> p_key) = 'boolean' then true
    when jsonb_typeof(p_answers -> p_key) = 'number' then true
    else false
  end;
$$;

revoke all on function private.questionnaire_answer_present(jsonb,text) from public, anon, authenticated;

create or replace function private.pre_pwd_v31_validation(p_answers jsonb, p_require_complete boolean default false)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_allowed constant text[] := array[
    'q2_goal_current','q2_goal_detail','q3_goal_ability','q4_main_barriers','q5_work_day','q6_sitting_time',
    'q7_exertion_symptoms','q8_chronic_condition','q8a_condition_type','q9_movement_restriction','q9_restriction_detail',
    'q10_medication','q10_medication_names','q11_supplements','q11_supplement_names','q12_balance','q12a_walking_aid','q12a_walking_aid_detail',
    'q13_pain','q13a_location','q13b_duration','q13c_trend','q13d_peak_pain','q13e_aggravators','q13f_limitations','q13g_post_activity','q13h_back_leg_red_flags','q13i_neurological_sensation',
    'q14_major_injury_surgery','q15_hospital_12m','q15a_body_part','q15b_event','q15b_event_detail','q15c_last_event','q15d_rehab','q15e_limits','q15e_limits_detail','q15f_return_activity','q15g_reinjury_fear',
    'q_pregnancy_applicability','q16_pregnancy','q16a_week','q16b_guidance','q16b_guidance_detail','q17_postpartum','q17a_delivery','q17b_diastasis','q17c_current_symptoms',
    'q18_exercise_frequency','q19_break','q20_future_intensity','q21_weekly_time','q22_session_time','q23_adherence_barriers',
    'q24_water','q25_sleep','q26_energy','q27_stress','q28_meals','q29_fruit_veg',
    'q30_training_preferences','q31_dislikes','q32_other','confirm_best_knowledge','confirm_trainer_not_doctor'
  ];
  v_multi constant text[] := array[
    'q4_main_barriers','q7_exertion_symptoms','q8a_condition_type','q12_balance','q13a_location','q13e_aggravators','q13f_limitations','q13h_back_leg_red_flags',
    'q15a_body_part','q15b_event','q17c_current_symptoms','q23_adherence_barriers','q30_training_preferences','q31_dislikes'
  ];
  v_scales constant text[] := array['q3_goal_ability','q13d_peak_pain','q15g_reinjury_fear','q25_sleep','q26_energy','q27_stress'];
  v_confirmations constant text[] := array['confirm_best_knowledge','confirm_trainer_not_doctor'];
  v_unconditional constant text[] := array[
    'q2_goal_current','q3_goal_ability','q4_main_barriers','q5_work_day',
    'q7_exertion_symptoms','q8_chronic_condition','q9_movement_restriction','q10_medication','q11_supplements','q12_balance','q12a_walking_aid',
    'q13_pain','q14_major_injury_surgery','q15_hospital_12m','q_pregnancy_applicability',
    'q18_exercise_frequency','q19_break','q20_future_intensity','q21_weekly_time','q22_session_time','q23_adherence_barriers',
    'q24_water','q25_sleep','q26_energy','q27_stress','q28_meals','q29_fruit_veg',
    'confirm_best_knowledge','confirm_trainer_not_doctor'
  ];
  v_key text;
  v_item jsonb;
  v_missing text[] := array[]::text[];
  v_invalid text[] := array[]::text[];
  v_injury boolean;
  v_pain boolean;
  v_postpartum boolean;
  v_pregnancy_applies boolean;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    return jsonb_build_object('valid', false, 'missing', '[]'::jsonb, 'invalid', jsonb_build_array('__answers_object__'));
  end if;

  for v_key in select jsonb_object_keys(p_answers)
  loop
    if not (v_key = any(v_allowed)) then
      v_invalid := array_append(v_invalid, v_key);
      continue;
    end if;

    if v_key = any(v_multi) then
      if jsonb_typeof(p_answers -> v_key) <> 'array' then
        v_invalid := array_append(v_invalid, v_key);
      else
        for v_item in select value from jsonb_array_elements(p_answers -> v_key)
        loop
          if jsonb_typeof(v_item) <> 'string' then
            v_invalid := array_append(v_invalid, v_key);
            exit;
          end if;
        end loop;
      end if;
    elsif v_key = any(v_confirmations) then
      if jsonb_typeof(p_answers -> v_key) <> 'boolean' then
        v_invalid := array_append(v_invalid, v_key);
      end if;
    elsif v_key = any(v_scales) then
      if jsonb_typeof(p_answers -> v_key) <> 'string' or coalesce(p_answers ->> v_key,'') !~ '^(?:[0-9]|10)$' then
        v_invalid := array_append(v_invalid, v_key);
      end if;
    elsif jsonb_typeof(p_answers -> v_key) <> 'string' then
      v_invalid := array_append(v_invalid, v_key);
    end if;
  end loop;

  if jsonb_typeof(p_answers -> 'q4_main_barriers') = 'array' and jsonb_array_length(p_answers -> 'q4_main_barriers') > 2 then
    v_invalid := array_append(v_invalid, 'q4_main_barriers');
  end if;
  if jsonb_typeof(p_answers -> 'q23_adherence_barriers') = 'array' and jsonb_array_length(p_answers -> 'q23_adherence_barriers') > 2 then
    v_invalid := array_append(v_invalid, 'q23_adherence_barriers');
  end if;

  if jsonb_typeof(p_answers -> 'q7_exertion_symptoms') = 'array' and p_answers -> 'q7_exertion_symptoms' ? 'none' and jsonb_array_length(p_answers -> 'q7_exertion_symptoms') <> 1 then
    v_invalid := array_append(v_invalid, 'q7_exertion_symptoms');
  end if;
  if jsonb_typeof(p_answers -> 'q12_balance') = 'array' and p_answers -> 'q12_balance' ? 'none' and jsonb_array_length(p_answers -> 'q12_balance') <> 1 then
    v_invalid := array_append(v_invalid, 'q12_balance');
  end if;
  if jsonb_typeof(p_answers -> 'q13h_back_leg_red_flags') = 'array' and p_answers -> 'q13h_back_leg_red_flags' ? 'none' and jsonb_array_length(p_answers -> 'q13h_back_leg_red_flags') <> 1 then
    v_invalid := array_append(v_invalid, 'q13h_back_leg_red_flags');
  end if;
  if jsonb_typeof(p_answers -> 'q17c_current_symptoms') = 'array' and p_answers -> 'q17c_current_symptoms' ? 'none' and jsonb_array_length(p_answers -> 'q17c_current_symptoms') <> 1 then
    v_invalid := array_append(v_invalid, 'q17c_current_symptoms');
  end if;
  if jsonb_typeof(p_answers -> 'q23_adherence_barriers') = 'array' and p_answers -> 'q23_adherence_barriers' ? 'nothing_significant' and jsonb_array_length(p_answers -> 'q23_adherence_barriers') <> 1 then
    v_invalid := array_append(v_invalid, 'q23_adherence_barriers');
  end if;

  if p_require_complete then
    foreach v_key in array v_unconditional loop
      if not private.questionnaire_answer_present(p_answers, v_key) then
        v_missing := array_append(v_missing, v_key);
      end if;
    end loop;

    if p_answers ->> 'q2_goal_current' in ('yes_clarify','changed') and not private.questionnaire_answer_present(p_answers,'q2_goal_detail') then
      v_missing := array_append(v_missing,'q2_goal_detail');
    end if;
    if p_answers ->> 'q5_work_day' in ('mostly_sitting','mixed','driving') and not private.questionnaire_answer_present(p_answers,'q6_sitting_time') then
      v_missing := array_append(v_missing,'q6_sitting_time');
    end if;
    if p_answers ->> 'q8_chronic_condition' in ('yes','yes_unknown_name') and not private.questionnaire_answer_present(p_answers,'q8a_condition_type') then
      v_missing := array_append(v_missing,'q8a_condition_type');
    end if;
    if p_answers ->> 'q9_movement_restriction' in ('yes','uncertain_previous') and not private.questionnaire_answer_present(p_answers,'q9_restriction_detail') then
      v_missing := array_append(v_missing,'q9_restriction_detail');
    end if;
    if p_answers ->> 'q12a_walking_aid' = 'yes' and not private.questionnaire_answer_present(p_answers,'q12a_walking_aid_detail') then
      v_missing := array_append(v_missing,'q12a_walking_aid_detail');
    end if;

    v_pain := p_answers ->> 'q13_pain' in ('yes_not_limiting','yes_some_limitation','yes_clear_limitation');
    if v_pain then
      foreach v_key in array array['q13a_location','q13b_duration','q13c_trend','q13d_peak_pain','q13e_aggravators','q13f_limitations','q13g_post_activity','q13h_back_leg_red_flags','q13i_neurological_sensation'] loop
        if not private.questionnaire_answer_present(p_answers,v_key) then v_missing := array_append(v_missing,v_key); end if;
      end loop;
    end if;

    v_injury := p_answers ->> 'q14_major_injury_surgery' = 'yes' or p_answers ->> 'q15_hospital_12m' = 'yes';
    if v_injury then
      foreach v_key in array array['q15a_body_part','q15b_event','q15c_last_event','q15d_rehab','q15e_limits','q15f_return_activity','q15g_reinjury_fear'] loop
        if not private.questionnaire_answer_present(p_answers,v_key) then v_missing := array_append(v_missing,v_key); end if;
      end loop;
      if p_answers ->> 'q15e_limits' = 'yes' and not private.questionnaire_answer_present(p_answers,'q15e_limits_detail') then
        v_missing := array_append(v_missing,'q15e_limits_detail');
      end if;
    end if;

    v_pregnancy_applies := p_answers ->> 'q_pregnancy_applicability' = 'applies';
    if v_pregnancy_applies then
      foreach v_key in array array['q16_pregnancy','q17_postpartum'] loop
        if not private.questionnaire_answer_present(p_answers,v_key) then v_missing := array_append(v_missing,v_key); end if;
      end loop;
      if p_answers ->> 'q16_pregnancy' = 'yes' and not private.questionnaire_answer_present(p_answers,'q16a_week') then
        v_missing := array_append(v_missing,'q16a_week');
      end if;
      if p_answers ->> 'q16_pregnancy' in ('yes','suspect') and not private.questionnaire_answer_present(p_answers,'q16b_guidance') then
        v_missing := array_append(v_missing,'q16b_guidance');
      end if;
      if p_answers ->> 'q16b_guidance' in ('yes','uncertain_previous') and not private.questionnaire_answer_present(p_answers,'q16b_guidance_detail') then
        v_missing := array_append(v_missing,'q16b_guidance_detail');
      end if;
      v_postpartum := p_answers ->> 'q17_postpartum' in ('last_24m','earlier_with_symptoms');
      if v_postpartum then
        foreach v_key in array array['q17a_delivery','q17b_diastasis','q17c_current_symptoms'] loop
          if not private.questionnaire_answer_present(p_answers,v_key) then v_missing := array_append(v_missing,v_key); end if;
        end loop;
      end if;
    end if;

    foreach v_key in array v_confirmations loop
      if coalesce((p_answers ->> v_key)::boolean,false) is not true and not (v_key = any(v_missing)) then
        v_missing := array_append(v_missing,v_key);
      end if;
    end loop;
  end if;

  select coalesce(array_agg(distinct x order by x), array[]::text[]) into v_invalid from unnest(v_invalid) x;
  select coalesce(array_agg(distinct x order by x), array[]::text[]) into v_missing from unnest(v_missing) x;

  return jsonb_build_object(
    'valid', cardinality(v_invalid) = 0 and (not p_require_complete or cardinality(v_missing) = 0),
    'missing', to_jsonb(v_missing),
    'invalid', to_jsonb(v_invalid)
  );
end;
$$;

revoke all on function private.pre_pwd_v31_validation(jsonb,boolean) from public, anon, authenticated;

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
  v_definition jsonb;
  v_contract jsonb;
begin
  if auth.uid() is null or not private.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;

  select qa.* into v_assignment
  from public.questionnaire_assignments qa
  where qa.id = p_assignment_id
    and qa.status in ('assigned','in_progress')
    and private.client_can_access_client(qa.client_id);

  if v_assignment.id is null then
    raise exception 'questionnaire assignment not found or access denied' using errcode = '42501';
  end if;

  select qv.definition into v_definition from public.questionnaire_versions qv where qv.id = v_assignment.version_id;
  v_contract := v_definition -> 'healthConsentContract';
  if v_contract is null
     or coalesce(v_contract ->> 'contractVersion','') <> 'explicit_health_consent_v1'
  then
    raise exception 'questionnaire version is not enabled for health-data consent persistence' using errcode = '42501';
  end if;

  if btrim(coalesce(p_consent_text_version,'')) is distinct from coalesce(v_contract ->> 'consentTextVersion','')
     or btrim(coalesce(p_privacy_notice_version,'')) is distinct from coalesce(v_contract ->> 'privacyNoticeVersion','')
  then
    raise exception 'health-data consent text version mismatch' using errcode = '22023';
  end if;

  select * into v_latest
  from public.questionnaire_privacy_events qpe
  where qpe.assignment_id = v_assignment.id
  order by qpe.event_seq desc
  limit 1;

  if v_latest.id is not null
     and v_latest.event_type = 'health_data_consent_granted'
     and v_latest.consent_text_version = btrim(p_consent_text_version)
     and v_latest.privacy_notice_version = btrim(p_privacy_notice_version) then
    return v_latest;
  end if;

  insert into public.questionnaire_privacy_events(
    assignment_id, client_id, version_id, event_type,
    consent_text_version, privacy_notice_version, created_by_profile_id
  ) values (
    v_assignment.id, v_assignment.client_id, v_assignment.version_id, 'health_data_consent_granted',
    btrim(p_consent_text_version), btrim(p_privacy_notice_version), private.current_profile_id()
  ) returning * into v_event;

  return v_event;
end;
$$;

revoke all on function public.record_questionnaire_health_consent(uuid,text,text) from public, anon, authenticated;
grant execute on function public.record_questionnaire_health_consent(uuid,text,text) to authenticated;

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
  v_definition jsonb;
  v_contract jsonb;
  v_requires_consent boolean := false;
  v_validation jsonb;
begin
  if auth.uid() is null or not private.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;
  if p_assignment_id is null then raise exception 'assignment id is required' using errcode = '22023'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'expected revision must be a non-negative integer' using errcode = '22023'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'answers must be a JSON object' using errcode = '22023'; end if;
  if octet_length(p_answers::text) > 131072 then raise exception 'questionnaire draft is too large' using errcode = '22023'; end if;

  select qa.* into v_assignment from public.questionnaire_assignments qa where qa.id = p_assignment_id for update;
  if v_assignment.id is null or not private.client_can_access_client(v_assignment.client_id) or v_assignment.status not in ('assigned','in_progress') then
    raise exception 'questionnaire assignment not found or not editable' using errcode = '42501';
  end if;

  select qv.definition into v_definition from public.questionnaire_versions qv where qv.id = v_assignment.version_id;
  v_contract := v_definition -> 'draftContract';
  if v_contract is null or coalesce(v_contract ->> 'validatorVersion','') <> 'pre_pwd_v31_v1' then
    raise exception 'questionnaire version is not enabled for server draft persistence' using errcode = '42501';
  end if;

  v_requires_consent := coalesce((v_definition ->> 'requiresHealthConsentReceipt')::boolean, false);
  if v_requires_consent and not private.questionnaire_health_consent_active(v_assignment.id) then
    raise exception 'active health-data consent receipt required before questionnaire draft persistence' using errcode = '42501';
  end if;

  v_validation := private.pre_pwd_v31_validation(p_answers, false);
  if jsonb_array_length(v_validation -> 'invalid') > 0 then
    return jsonb_build_object('validationFailed', true, 'invalid', v_validation -> 'invalid', 'currentRevision', coalesce((select revision from public.questionnaire_responses where assignment_id=v_assignment.id),0), 'status', v_assignment.status);
  end if;

  select qr.* into v_response from public.questionnaire_responses qr where qr.assignment_id = v_assignment.id for update;

  if v_response.id is null then
    if p_expected_revision <> 0 then return jsonb_build_object('conflict', true, 'currentRevision', 0, 'status', v_assignment.status); end if;
    insert into public.questionnaire_responses(assignment_id,client_id,version_id,answers,revision,response_schema_version)
    values(v_assignment.id,v_assignment.client_id,v_assignment.version_id,p_answers,1,1) returning * into v_response;
  else
    if v_response.submitted_at is not null then raise exception 'submitted questionnaire response is immutable' using errcode = '42501'; end if;
    if v_response.revision <> p_expected_revision then return jsonb_build_object('conflict',true,'currentRevision',v_response.revision,'savedAt',v_response.updated_at,'status',v_assignment.status); end if;
    update public.questionnaire_responses set answers=p_answers, revision=revision+1 where id=v_response.id returning * into v_response;
  end if;

  if v_assignment.status='assigned' then
    update public.questionnaire_assignments set status='in_progress', started_at=coalesce(started_at,now()) where id=v_assignment.id returning * into v_assignment;
  end if;

  return jsonb_build_object('conflict',false,'validationFailed',false,'responseId',v_response.id,'assignmentId',v_assignment.id,'revision',v_response.revision,'savedAt',v_response.updated_at,'status',v_assignment.status);
end;
$$;

revoke all on function public.save_questionnaire_draft(uuid,jsonb,integer) from public, anon, authenticated;
grant execute on function public.save_questionnaire_draft(uuid,jsonb,integer) to authenticated;

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
  v_validation jsonb;
  v_profile public.client_profile_details%rowtype;
  v_now timestamptz;
begin
  if auth.uid() is null or not private.is_client() then raise exception 'client authentication required' using errcode='42501'; end if;
  if p_assignment_id is null then raise exception 'assignment id is required' using errcode='22023'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'expected revision must be a non-negative integer' using errcode='22023'; end if;
  if p_confirm_transfer is distinct from true then raise exception 'conscious questionnaire transfer confirmation required' using errcode='22023'; end if;

  select qa.* into v_assignment from public.questionnaire_assignments qa where qa.id=p_assignment_id for update;
  if v_assignment.id is null or not private.client_can_access_client(v_assignment.client_id) then raise exception 'questionnaire assignment not found or access denied' using errcode='42501'; end if;
  select qr.* into v_response from public.questionnaire_responses qr where qr.assignment_id=v_assignment.id for update;

  if v_assignment.status='submitted' then
    if v_response.id is null or v_response.submitted_at is null then raise exception 'submitted assignment is missing a sealed response' using errcode='23514'; end if;
    return jsonb_build_object('alreadySubmitted',true,'assignmentId',v_assignment.id,'responseId',v_response.id,'revision',v_response.revision,'submittedAt',v_response.submitted_at,'status',v_assignment.status);
  end if;
  if v_assignment.status not in ('assigned','in_progress') then raise exception 'questionnaire assignment is not submittable' using errcode='42501'; end if;
  if v_response.id is null then return jsonb_build_object('validationFailed',true,'missing',jsonb_build_array('__draft__'),'invalid','[]'::jsonb,'currentRevision',0,'status',v_assignment.status); end if;
  if v_response.submitted_at is not null then raise exception 'questionnaire response is already sealed' using errcode='23514'; end if;
  if v_response.revision<>p_expected_revision then return jsonb_build_object('conflict',true,'currentRevision',v_response.revision,'savedAt',v_response.updated_at,'status',v_assignment.status); end if;

  select qv.definition into v_definition from public.questionnaire_versions qv where qv.id=v_assignment.version_id;
  v_requires_consent := coalesce((v_definition->>'requiresHealthConsentReceipt')::boolean,false);
  if v_requires_consent and not private.questionnaire_health_consent_active(v_assignment.id) then raise exception 'active health-data consent receipt required before questionnaire submission' using errcode='42501'; end if;

  v_contract := v_definition -> 'submissionContract';
  if v_contract is null or coalesce(v_contract->>'validatorVersion','') <> 'pre_pwd_v31_v1' then
    raise exception 'questionnaire version is not enabled for server submission' using errcode='42501';
  end if;

  v_validation := private.pre_pwd_v31_validation(v_response.answers,true);
  if jsonb_array_length(v_validation->'invalid')>0 or jsonb_array_length(v_validation->'missing')>0 then
    return jsonb_build_object('validationFailed',true,'missing',v_validation->'missing','invalid',v_validation->'invalid','currentRevision',v_response.revision,'status',v_assignment.status);
  end if;

  if coalesce((v_contract->>'requiresProfileContext')::boolean,false) then
    select * into v_profile from public.client_profile_details where client_id=v_assignment.client_id;
    if v_profile.client_id is null or v_profile.age_observation is null
       or nullif(btrim(coalesce(v_profile.emergency_contact_name,'')),'') is null
       or nullif(btrim(coalesce(v_profile.emergency_contact_phone,'')),'') is null
       or nullif(btrim(coalesce(v_profile.emergency_contact_relation,'')),'') is null then
      return jsonb_build_object('validationFailed',true,'missing',jsonb_build_array('__profile_context__'),'invalid','[]'::jsonb,'currentRevision',v_response.revision,'status',v_assignment.status);
    end if;
  end if;

  v_now := clock_timestamp();
  update public.questionnaire_responses set submitted_at=v_now, revision=revision+1 where id=v_response.id returning * into v_response;
  update public.questionnaire_assignments set status='submitted',submitted_at=v_now where id=v_assignment.id returning * into v_assignment;

  return jsonb_build_object('alreadySubmitted',false,'conflict',false,'validationFailed',false,'assignmentId',v_assignment.id,'responseId',v_response.id,'revision',v_response.revision,'submittedAt',v_response.submitted_at,'status',v_assignment.status);
end;
$$;

revoke all on function public.submit_questionnaire_response(uuid,integer,boolean) from public, anon, authenticated;
grant execute on function public.submit_questionnaire_response(uuid,integer,boolean) to authenticated;

comment on function private.pre_pwd_v31_validation(jsonb,boolean) is 'Version-specific pre-PWD 3.1 server validator. This is intentionally not a generic form-builder validator.';
