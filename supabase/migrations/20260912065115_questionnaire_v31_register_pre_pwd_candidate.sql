do $$
declare
  v_template_id uuid;
  v_version_id uuid;
  v_expected_hash constant text := '1816ef8dc6b4bced1f5c753a350f28d2e43cb361bab56691c378245c198233a6';
  v_existing_hash text;
  v_existing_definition jsonb;
begin
  select id into v_template_id
  from public.questionnaire_templates
  where template_key = 'pre_pwd_first_visit';

  if v_template_id is null then
    raise exception 'pre-PWD questionnaire template must exist before v3.1 registration';
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
    '3.1',
    jsonb_build_object(
      'kind', 'repo_module_manifest',
      'definitionId', 'pre_pwd_first_visit',
      'definitionVersion', '3.1',
      'modulePath', 'assets/os/questionnaires/pre-pwd-v31-definition.js',
      'canonicalization', 'recursive_sorted_keys_json_v1',
      'canonicalSha256', v_expected_hash,
      'requiresHealthConsentReceipt', true,
      'sourceLabel', 'Studio Las — Ankieta przed pierwszą wizytą | contract 3.1',
      'releaseState', 'blocked_pending_health_data_consent_legal_review'
    ),
    v_expected_hash,
    null,
    null
  )
  on conflict (template_id, version_code) do nothing;

  select id, definition_sha256, definition
  into v_version_id, v_existing_hash, v_existing_definition
  from public.questionnaire_versions
  where template_id = v_template_id
    and version_code = '3.1';

  if v_version_id is null then
    raise exception 'pre-PWD questionnaire v3.1 registration failed';
  end if;
  if v_existing_hash is distinct from v_expected_hash then
    raise exception 'pre-PWD v3.1 hash mismatch; never overwrite an existing version';
  end if;
  if v_existing_definition->>'modulePath' is distinct from 'assets/os/questionnaires/pre-pwd-v31-definition.js' then
    raise exception 'pre-PWD v3.1 definition source mismatch';
  end if;
  if coalesce((v_existing_definition->>'requiresHealthConsentReceipt')::boolean, false) is not true then
    raise exception 'pre-PWD v3.1 must require a health-data consent receipt';
  end if;
  if (select released_at from public.questionnaire_versions where id = v_version_id) is not null then
    raise exception 'pre-PWD v3.1 must remain unreleased pending legal consent review';
  end if;
end
$$;
