do $$
declare
  v_template_id uuid;
  v_template_active boolean;
  v_v31_hash text;
  v_v32_id uuid;
  v_v32_hash text;
  v_v32_retired_at timestamptz;
  v_v33_id uuid;
  v_v33_hash text;
  v_v33_definition jsonb;
  v_expected_base_hash constant text := '1816ef8dc6b4bced1f5c753a350f28d2e43cb361bab56691c378245c198233a6';
  v_expected_v32_hash constant text := '5bb09df917ea0e066e03496d609a6334e7949bedf9afc502a6fc5237729bf269';
  v_expected_v33_hash constant text := 'e66bb5bf4882cd5400b691ed8a22272e4b8c1389792e33c69a19afc038888660';
  v_consent_text_version constant text := 'pre-pwd-final-health-consent-2026-09-13-v1';
  v_privacy_notice_version constant text := 'pre-pwd-privacy-notice-v1';
  v_consent_text constant text := 'Wyrażam zgodę na przetwarzanie przez Studio Las danych dotyczących mojego zdrowia, które podaję w tej ankiecie, w celu przygotowania i prowadzenia indywidualnej współpracy treningowej z uwzględnieniem informacji istotnych dla doboru zakresu i obciążeń treningowych. Wiem, że dane są zapisywane podczas wypełniania ankiety, a trener zobaczy je dopiero, gdy wybiorę „Przekaż ankietę trenerowi”. Zgodę mogę w dowolnym momencie wycofać ze skutkiem na przyszłość.';
begin
  select qt.id, qt.active
  into v_template_id, v_template_active
  from public.questionnaire_templates qt
  where qt.template_key = 'pre_pwd_first_visit'
  for update;

  if v_template_id is null then
    raise exception 'canonical pre-PWD questionnaire template is required before v3.3 registration';
  end if;

  if v_template_active is not false then
    raise exception 'pre-PWD template must remain inactive while the qualified legal/privacy gate is open';
  end if;

  select qv.definition_sha256
  into v_v31_hash
  from public.questionnaire_versions qv
  where qv.template_id = v_template_id
    and qv.version_code = '3.1';

  if v_v31_hash is distinct from v_expected_base_hash then
    raise exception 'canonical pre-PWD v3.1 base hash mismatch; refusing v3.3 registration';
  end if;

  select qv.id, qv.definition_sha256, qv.retired_at
  into v_v32_id, v_v32_hash, v_v32_retired_at
  from public.questionnaire_versions qv
  where qv.template_id = v_template_id
    and qv.version_code = '3.2'
  for update;

  if v_v32_id is null or v_v32_hash is distinct from v_expected_v32_hash then
    raise exception 'exact pre-PWD v3.2 release is required before v3.3 registration';
  end if;

  if v_v32_retired_at is null and exists (
    select 1
    from public.questionnaire_assignments qa
    where qa.version_id = v_v32_id
  ) then
    raise exception 'pre-PWD v3.2 has assignments; explicit migration decision required before retirement';
  end if;

  v_v33_definition := jsonb_build_object(
    'kind', 'release_overlay_manifest',
    'definitionId', 'pre_pwd_first_visit',
    'definitionVersion', '3.3',
    'baseDefinitionVersion', '3.1',
    'modulePath', 'assets/os/questionnaires/pre-pwd-v31-definition.js',
    'baseCanonicalSha256', v_expected_base_hash,
    'rendererKey', 'pre_pwd_v31',
    'releaseState', 'released',
    'requiresHealthConsentReceipt', true,
    'healthConsentContract', jsonb_build_object(
      'contractVersion', 'explicit_health_consent_v1',
      'consentTextVersion', v_consent_text_version,
      'consentText', v_consent_text,
      'privacyNoticeVersion', v_privacy_notice_version
    ),
    'draftContract', jsonb_build_object(
      'validatorVersion', 'pre_pwd_v31_v1'
    ),
    'submissionContract', jsonb_build_object(
      'validatorVersion', 'pre_pwd_v31_v1',
      'requiresProfileContext', true,
      'requiresConsciousTransfer', true,
      'finalConsentTextVersion', v_consent_text_version,
      'finalConsentText', v_consent_text
    )
  );

  insert into public.questionnaire_versions(
    template_id,
    version_code,
    definition,
    definition_sha256,
    released_at,
    retired_at
  ) values (
    v_template_id,
    '3.3',
    v_v33_definition,
    v_expected_v33_hash,
    clock_timestamp(),
    null
  )
  on conflict (template_id, version_code) do nothing;

  select qv.id, qv.definition_sha256, qv.definition
  into v_v33_id, v_v33_hash, v_v33_definition
  from public.questionnaire_versions qv
  where qv.template_id = v_template_id
    and qv.version_code = '3.3'
  for update;

  if v_v33_id is null then
    raise exception 'pre-PWD v3.3 registration failed';
  end if;

  if v_v33_hash is distinct from v_expected_v33_hash then
    raise exception 'pre-PWD v3.3 hash mismatch; never overwrite an existing version';
  end if;

  if v_v33_definition ->> 'baseCanonicalSha256' is distinct from v_expected_base_hash
     or v_v33_definition ->> 'rendererKey' is distinct from 'pre_pwd_v31'
     or v_v33_definition ->> 'releaseState' is distinct from 'released'
     or coalesce((v_v33_definition ->> 'requiresHealthConsentReceipt')::boolean, false) is not true
     or v_v33_definition -> 'healthConsentContract' ->> 'contractVersion' is distinct from 'explicit_health_consent_v1'
     or v_v33_definition -> 'healthConsentContract' ->> 'consentTextVersion' is distinct from v_consent_text_version
     or v_v33_definition -> 'healthConsentContract' ->> 'consentText' is distinct from v_consent_text
     or v_v33_definition -> 'healthConsentContract' ->> 'privacyNoticeVersion' is distinct from v_privacy_notice_version
     or v_v33_definition -> 'draftContract' ->> 'validatorVersion' is distinct from 'pre_pwd_v31_v1'
     or v_v33_definition -> 'submissionContract' ->> 'validatorVersion' is distinct from 'pre_pwd_v31_v1'
     or coalesce((v_v33_definition -> 'submissionContract' ->> 'requiresConsciousTransfer')::boolean, false) is not true
     or v_v33_definition -> 'submissionContract' ->> 'finalConsentTextVersion' is distinct from v_consent_text_version
     or v_v33_definition -> 'submissionContract' ->> 'finalConsentText' is distinct from v_consent_text
  then
    raise exception 'pre-PWD v3.3 unified health-consent contract mismatch';
  end if;

  update public.questionnaire_versions
  set retired_at = coalesce(retired_at, clock_timestamp())
  where id = v_v32_id;

  if (
    select count(*)
    from public.questionnaire_versions qv
    where qv.template_id = v_template_id
      and qv.released_at is not null
      and qv.retired_at is null
      and qv.definition ->> 'releaseState' = 'released'
  ) <> 1 then
    raise exception 'pre-PWD must have exactly one released non-retired version after v3.3 registration';
  end if;

  if not exists (
    select 1
    from public.questionnaire_versions qv
    where qv.id = v_v33_id
      and qv.released_at is not null
      and qv.retired_at is null
  ) then
    raise exception 'pre-PWD v3.3 must be the sole released non-retired version';
  end if;
end
$$;

create or replace function public.client_questionnaire_response_snapshot(p_assignment_id uuid)
returns jsonb
language sql
stable
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
    'expectedConsentText', qv.definition -> 'healthConsentContract' ->> 'consentText',
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

revoke all on function public.client_questionnaire_response_snapshot(uuid) from public, anon;
grant execute on function public.client_questionnaire_response_snapshot(uuid) to authenticated;

comment on function public.client_questionnaire_response_snapshot(uuid)
is 'Client-owned questionnaire response snapshot. v3.3 includes the exact version-bound health-consent text used by the autosave consent receipt.';
