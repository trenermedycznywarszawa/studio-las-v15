do $$
declare
  v_template_id uuid;
  v_version_id uuid;
  v_expected_hash constant text := 'b24aece381479b7f71b0ddc4142c79e41d1b7d87df4bca7ce61f737027cbb63f';
  v_existing_hash text;
  v_existing_definition jsonb;
begin
  insert into public.questionnaire_templates(
    template_key,
    title,
    purpose,
    active
  ) values (
    'pre_pwd_first_visit',
    'Ankieta przed pierwszą wizytą',
    'Przygotowanie Pierwszej Wizyty Diagnostycznej bez zastępowania konsultacji lekarskiej.',
    true
  )
  on conflict (template_key) do nothing;

  select id into v_template_id
  from public.questionnaire_templates
  where template_key = 'pre_pwd_first_visit';

  if v_template_id is null then
    raise exception 'pre-PWD questionnaire template registration failed';
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
    '3.0',
    jsonb_build_object(
      'kind', 'repo_module_manifest',
      'definitionId', 'pre_pwd_first_visit',
      'definitionVersion', '3.0',
      'modulePath', 'assets/os/questionnaires/pre-pwd-v3-definition.js',
      'canonicalization', 'recursive_sorted_keys_json_v1',
      'canonicalSha256', v_expected_hash,
      'sourceLabel', 'Studio Las — Ankieta przed pierwszą wizytą | wersja końcowa do wdrożenia',
      'releaseState', 'blocked_pending_contract_resolution'
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
    and version_code = '3.0';

  if v_version_id is null then
    raise exception 'pre-PWD questionnaire version registration failed';
  end if;
  if v_existing_hash is distinct from v_expected_hash then
    raise exception 'pre-PWD v3 hash mismatch; never overwrite an existing version';
  end if;
  if v_existing_definition->>'modulePath' is distinct from 'assets/os/questionnaires/pre-pwd-v3-definition.js' then
    raise exception 'pre-PWD v3 definition source mismatch';
  end if;
  if (select released_at from public.questionnaire_versions where id = v_version_id) is not null then
    raise exception 'pre-PWD v3 must remain unreleased until blockers are resolved';
  end if;
end
$$;
