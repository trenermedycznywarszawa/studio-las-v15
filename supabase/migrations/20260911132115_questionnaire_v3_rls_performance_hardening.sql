create index if not exists questionnaire_responses_assignment_identity_idx
  on public.questionnaire_responses(assignment_id, client_id, version_id);
create index if not exists questionnaire_templates_created_by_idx
  on public.questionnaire_templates(created_by_profile_id);
create index if not exists questionnaire_versions_created_by_idx
  on public.questionnaire_versions(created_by_profile_id);

drop policy if exists questionnaire_templates_trainer_select on public.questionnaire_templates;
drop policy if exists questionnaire_templates_client_select_assigned on public.questionnaire_templates;
create policy questionnaire_templates_select_related
  on public.questionnaire_templates for select to authenticated
  using (
    (private.is_trainer() and private.trainer_mfa_satisfied())
    or
    (
      private.is_client()
      and exists (
        select 1
        from public.questionnaire_versions qv
        join public.questionnaire_assignments qa on qa.version_id = qv.id
        where qv.template_id = questionnaire_templates.id
          and private.client_can_access_client(qa.client_id)
      )
    )
  );

drop policy if exists questionnaire_versions_trainer_select on public.questionnaire_versions;
drop policy if exists questionnaire_versions_client_select_assigned on public.questionnaire_versions;
create policy questionnaire_versions_select_related
  on public.questionnaire_versions for select to authenticated
  using (
    (private.is_trainer() and private.trainer_mfa_satisfied())
    or
    (
      private.is_client()
      and exists (
        select 1
        from public.questionnaire_assignments qa
        where qa.version_id = questionnaire_versions.id
          and private.client_can_access_client(qa.client_id)
      )
    )
  );

drop policy if exists questionnaire_assignments_trainer_select on public.questionnaire_assignments;
drop policy if exists questionnaire_assignments_client_select on public.questionnaire_assignments;
create policy questionnaire_assignments_select_related
  on public.questionnaire_assignments for select to authenticated
  using (
    (private.is_trainer() and private.trainer_can_access_client(client_id) and private.trainer_mfa_satisfied())
    or
    (private.is_client() and private.client_can_access_client(client_id))
  );

drop policy if exists questionnaire_responses_trainer_select_submitted_only on public.questionnaire_responses;
drop policy if exists questionnaire_responses_client_select_own on public.questionnaire_responses;
create policy questionnaire_responses_select_related
  on public.questionnaire_responses for select to authenticated
  using (
    (
      private.is_trainer()
      and private.trainer_can_access_client(client_id)
      and private.trainer_mfa_satisfied()
      and exists (
        select 1
        from public.questionnaire_assignments qa
        where qa.id = questionnaire_responses.assignment_id
          and qa.client_id = questionnaire_responses.client_id
          and qa.version_id = questionnaire_responses.version_id
          and qa.status = 'submitted'
      )
    )
    or
    (private.is_client() and private.client_can_access_client(client_id))
  );
