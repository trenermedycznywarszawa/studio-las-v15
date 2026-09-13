do $$
declare
  v_template_id uuid;
  v_v31_hash text;
  v_v32_id uuid;
  v_v32_hash text;
  v_v32_definition jsonb;
  v_expected_base_hash constant text := '1816ef8dc6b4bced1f5c753a350f28d2e43cb361bab56691c378245c198233a6';
  v_expected_release_hash constant text := '5bb09df917ea0e066e03496d609a6334e7949bedf9afc502a6fc5237729bf269';
  v_final_consent_text constant text := 'Wyrażam zgodę na przetwarzanie przez Studio Las danych dotyczących mojego zdrowia, które podaję w tej ankiecie, w celu przygotowania i prowadzenia indywidualnej współpracy treningowej z uwzględnieniem informacji istotnych dla doboru zakresu i obciążeń treningowych. Wiem, że dane są zapisywane podczas wypełniania ankiety, a trener zobaczy je dopiero, gdy wybiorę „Przekaż ankietę trenerowi”. Zgodę mogę w dowolnym momencie wycofać ze skutkiem na przyszłość.';
begin
  select qt.id into v_template_id
  from public.questionnaire_templates qt
  where qt.template_key = 'pre_pwd_first_visit'
    and qt.active = true;

  if v_template_id is null then
    raise exception 'active pre-PWD questionnaire template is required before v3.2 release';
  end if;

  select qv.definition_sha256 into v_v31_hash
  from public.questionnaire_versions qv
  where qv.template_id = v_template_id
    and qv.version_code = '3.1';

  if v_v31_hash is distinct from v_expected_base_hash then
    raise exception 'canonical pre-PWD v3.1 base hash mismatch; refusing v3.2 release';
  end if;

  insert into public.questionnaire_versions(
    template_id,
    version_code,
    definition,
    definition_sha256,
    released_at,
    retired_at
  ) values (
    v_template_id,
    '3.2',
    jsonb_build_object(
      'kind', 'release_overlay_manifest',
      'definitionId', 'pre_pwd_first_visit',
      'definitionVersion', '3.2',
      'baseDefinitionVersion', '3.1',
      'modulePath', 'assets/os/questionnaires/pre-pwd-v31-definition.js',
      'baseCanonicalSha256', v_expected_base_hash,
      'rendererKey', 'pre_pwd_v31',
      'releaseState', 'released',
      'requiresHealthConsentReceipt', true,
      'healthConsentContract', jsonb_build_object(
        'contractVersion', 'explicit_health_consent_v1',
        'consentTextVersion', 'pre-pwd-health-draft-gate-v1',
        'privacyNoticeVersion', 'pre-pwd-privacy-notice-v1'
      ),
      'draftContract', jsonb_build_object(
        'validatorVersion', 'pre_pwd_v31_v1'
      ),
      'submissionContract', jsonb_build_object(
        'validatorVersion', 'pre_pwd_v31_v1',
        'requiresProfileContext', true,
        'requiresConsciousTransfer', true,
        'finalConsentTextVersion', 'pre-pwd-final-health-consent-2026-09-13-v1',
        'finalConsentText', v_final_consent_text
      )
    ),
    v_expected_release_hash,
    clock_timestamp(),
    null
  )
  on conflict (template_id, version_code) do nothing;

  select qv.id, qv.definition_sha256, qv.definition
  into v_v32_id, v_v32_hash, v_v32_definition
  from public.questionnaire_versions qv
  where qv.template_id = v_template_id
    and qv.version_code = '3.2';

  if v_v32_id is null then
    raise exception 'pre-PWD v3.2 release registration failed';
  end if;
  if v_v32_hash is distinct from v_expected_release_hash then
    raise exception 'pre-PWD v3.2 release hash mismatch; never overwrite an existing version';
  end if;
  if v_v32_definition ->> 'baseCanonicalSha256' is distinct from v_expected_base_hash
     or v_v32_definition ->> 'rendererKey' is distinct from 'pre_pwd_v31'
     or v_v32_definition ->> 'releaseState' is distinct from 'released'
     or coalesce((v_v32_definition ->> 'requiresHealthConsentReceipt')::boolean, false) is not true
     or v_v32_definition -> 'healthConsentContract' ->> 'contractVersion' is distinct from 'explicit_health_consent_v1'
     or v_v32_definition -> 'draftContract' ->> 'validatorVersion' is distinct from 'pre_pwd_v31_v1'
     or v_v32_definition -> 'submissionContract' ->> 'validatorVersion' is distinct from 'pre_pwd_v31_v1'
     or coalesce((v_v32_definition -> 'submissionContract' ->> 'requiresConsciousTransfer')::boolean, false) is not true
     or v_v32_definition -> 'submissionContract' ->> 'finalConsentTextVersion' is distinct from 'pre-pwd-final-health-consent-2026-09-13-v1'
     or v_v32_definition -> 'submissionContract' ->> 'finalConsentText' is distinct from v_final_consent_text
  then
    raise exception 'pre-PWD v3.2 release contract mismatch';
  end if;

  if not exists (
    select 1 from public.questionnaire_versions qv
    where qv.id = v_v32_id
      and qv.released_at is not null
      and qv.retired_at is null
  ) then
    raise exception 'pre-PWD v3.2 must be the released non-retired version';
  end if;
end
$$;
