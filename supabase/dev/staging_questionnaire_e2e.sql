-- STAGING / QA ONLY. Do not promote this file as a production migration.
-- Database side of the integrated pre-PWD browser E2E fixture.
-- Auth password provisioning lives in the separately deployed staging-only
-- questionnaire-e2e-fixture Edge Function and never uses direct auth.users SQL.
-- Submitted responses/privacy events are deliberately preserved as immutable QA history.

create or replace function public.prepare_questionnaire_e2e_db(p_marker text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_auth_user uuid := auth.uid();
  v_aal text := coalesce(auth.jwt() ->> 'aal','');
  v_trainer uuid;
  v_client constant uuid := 'eb2bec27-949a-4ebb-9a39-17617668765c'::uuid;
  v_profile constant uuid := 'b4000000-0000-4000-8000-000000000002'::uuid;
  v_client_auth_user constant uuid := 'a4000000-0000-4000-8000-000000000002'::uuid;
  v_email constant text := 'release-e2e-client-a-20260910@example.invalid';
  v_template uuid;
  v_version uuid;
  v_assignment uuid;
  v_conflicting integer;
begin
  if v_auth_user is null then
    raise exception 'authenticated QA trainer required' using errcode='28000';
  end if;

  select p.id into v_trainer
  from public.profiles p
  where p.auth_user_id=v_auth_user and p.role='trainer'
  limit 1;
  if v_trainer is null then
    raise exception 'QA trainer profile required' using errcode='42501';
  end if;
  if v_aal <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode='42501';
  end if;
  if p_marker is null or p_marker !~ '^E2E-GHA-[A-Za-z0-9_-]{1,80}$' then
    raise exception 'invalid E2E marker' using errcode='22023';
  end if;

  if not exists (
    select 1 from public.clients c
    where c.id=v_client
      and c.name='QA PWD Client (synthetic)'
      and c.owner_trainer_id=v_trainer
      and c.status='active'
      and c.deleted_at is null
  ) then
    raise exception 'canonical synthetic QA client is not owned by current trainer' using errcode='42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id=v_profile
      and p.auth_user_id=v_client_auth_user
      and p.role='client'
      and lower(p.email)=lower(v_email)
  ) then
    raise exception 'canonical dormant QA client profile is missing' using errcode='23514';
  end if;

  select count(*) into v_conflicting
  from public.client_users cu
  where cu.status='active' and (cu.client_id=v_client or cu.user_id=v_profile);
  if v_conflicting > 0 then
    raise exception 'QA client fixture is already linked; cleanup required' using errcode='55000';
  end if;

  insert into public.questionnaire_templates(template_key,title,purpose,active,created_by_profile_id)
  values(
    'qa_pre_pwd_first_visit_e2e',
    'QA · Ankieta przed pierwszą wizytą',
    'STAGING-only integrated questionnaire E2E',
    false,
    v_trainer
  )
  on conflict (template_key) do update set
    title=excluded.title,
    purpose=excluded.purpose,
    active=false
  returning id into v_template;

  insert into public.questionnaire_versions(
    template_id,version_code,definition,definition_sha256,released_at,retired_at,created_by_profile_id
  ) values (
    v_template,
    '3.1',
    jsonb_build_object(
      'kind','qa_repo_module_manifest',
      'definitionId','pre_pwd_first_visit',
      'definitionVersion','3.1',
      'modulePath','assets/os/questionnaires/pre-pwd-v31-definition.js',
      'canonicalSha256','1816ef8dc6b4bced1f5c753a350f28d2e43cb361bab56691c378245c198233a6',
      'rendererKey','pre_pwd_v31',
      'qaOnly',true,
      'releaseState','qa_only',
      'requiresHealthConsentReceipt',true,
      'healthConsentContract',jsonb_build_object(
        'contractVersion','explicit_health_consent_v1',
        'consentTextVersion','qa-consent-v1',
        'privacyNoticeVersion','qa-privacy-v1'
      ),
      'draftContract',jsonb_build_object('validatorVersion','pre_pwd_v31_v1'),
      'submissionContract',jsonb_build_object(
        'validatorVersion','pre_pwd_v31_v1',
        'requiresProfileContext',true
      )
    ),
    '1816ef8dc6b4bced1f5c753a350f28d2e43cb361bab56691c378245c198233a6',
    null,
    null,
    v_trainer
  )
  on conflict (template_id,version_code) do update set
    definition=excluded.definition,
    definition_sha256=excluded.definition_sha256,
    released_at=null,
    retired_at=null
  returning id into v_version;

  -- A crashed previous QA run may leave an unfinished assignment. Terminate it
  -- using the normal lifecycle; never delete or bypass immutable history.
  update public.questionnaire_assignments qa
  set status='cancelled', cancelled_at=now()
  where qa.client_id=v_client
    and qa.version_id=v_version
    and qa.status in ('assigned','in_progress');

  insert into public.client_users(client_id,user_id,status)
  values(v_client,v_profile,'active')
  on conflict (client_id,user_id) do update set
    status='active',
    updated_at=now();

  insert into public.questionnaire_assignments(
    client_id,version_id,assigned_by_profile_id,status,goal_snapshot
  ) values (
    v_client,v_version,v_trainer,'assigned',p_marker
  )
  returning id into v_assignment;

  return jsonb_build_object(
    'marker',p_marker,
    'clientId',v_client,
    'clientEmail',v_email,
    'clientAuthUserId',v_client_auth_user,
    'assignmentId',v_assignment,
    'templateKey','qa_pre_pwd_first_visit_e2e',
    'versionCode','3.1'
  );
end;
$$;

revoke all on function public.prepare_questionnaire_e2e_db(text) from public, anon, authenticated;
grant execute on function public.prepare_questionnaire_e2e_db(text) to authenticated;

create or replace function public.cleanup_questionnaire_e2e_db(p_assignment_id uuid,p_marker text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_auth_user uuid := auth.uid();
  v_aal text := coalesce(auth.jwt() ->> 'aal','');
  v_trainer uuid;
  v_client constant uuid := 'eb2bec27-949a-4ebb-9a39-17617668765c'::uuid;
  v_profile constant uuid := 'b4000000-0000-4000-8000-000000000002'::uuid;
  v_status text;
begin
  if v_auth_user is null then
    raise exception 'authenticated QA trainer required' using errcode='28000';
  end if;
  select p.id into v_trainer
  from public.profiles p
  where p.auth_user_id=v_auth_user and p.role='trainer'
  limit 1;
  if v_trainer is null then
    raise exception 'QA trainer profile required' using errcode='42501';
  end if;
  if v_aal <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode='42501';
  end if;
  if p_marker is null or p_marker !~ '^E2E-GHA-[A-Za-z0-9_-]{1,80}$' then
    raise exception 'invalid E2E marker' using errcode='22023';
  end if;

  select qa.status into v_status
  from public.questionnaire_assignments qa
  join public.questionnaire_versions qv on qv.id=qa.version_id
  join public.questionnaire_templates qt on qt.id=qv.template_id
  where qa.id=p_assignment_id
    and qa.client_id=v_client
    and qa.assigned_by_profile_id=v_trainer
    and qa.goal_snapshot=p_marker
    and qt.template_key='qa_pre_pwd_first_visit_e2e'
    and coalesce((qv.definition->>'qaOnly')::boolean,false)=true;

  if v_status is null then
    raise exception 'QA questionnaire assignment not found for cleanup' using errcode='42501';
  end if;

  if v_status in ('assigned','in_progress') then
    update public.questionnaire_assignments
    set status='cancelled', cancelled_at=now()
    where id=p_assignment_id;
  end if;

  -- Submitted response and privacy history intentionally remain immutable.
  delete from public.client_users
  where client_id=v_client and user_id=v_profile;

  return jsonb_build_object(
    'cleaned',true,
    'assignmentId',p_assignment_id,
    'clientId',v_client,
    'preservedStatus',v_status
  );
end;
$$;

revoke all on function public.cleanup_questionnaire_e2e_db(uuid,text) from public, anon, authenticated;
grant execute on function public.cleanup_questionnaire_e2e_db(uuid,text) to authenticated;

comment on function public.prepare_questionnaire_e2e_db(text) is
  'STAGING/QA ONLY. Prepares exact synthetic questionnaire data after trainer AAL2; never mutates auth credentials.';
comment on function public.cleanup_questionnaire_e2e_db(uuid,text) is
  'STAGING/QA ONLY. Ends unfinished QA assignment and unlinks client while preserving submitted immutable history.';
