create or replace function public.trainer_questionnaire_submission_snapshot(p_assignment_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select jsonb_build_object(
    'assignmentId', qa.id,
    'clientId', qa.client_id,
    'templateKey', qt.template_key,
    'versionCode', qv.version_code,
    'goalSnapshot', qa.goal_snapshot,
    'answers', qr.answers,
    'submittedAt', qr.submitted_at
  )
  from public.questionnaire_assignments qa
  join public.questionnaire_versions qv on qv.id = qa.version_id
  join public.questionnaire_templates qt on qt.id = qv.template_id
  join public.questionnaire_responses qr
    on qr.assignment_id = qa.id
   and qr.client_id = qa.client_id
   and qr.version_id = qa.version_id
  where qa.id = p_assignment_id
    and qa.status = 'submitted'
    and qr.submitted_at is not null
    and private.is_trainer()
    and private.trainer_mfa_satisfied()
    and private.trainer_can_access_client(qa.client_id)
  limit 1;
$$;

revoke all on function public.trainer_questionnaire_submission_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.trainer_questionnaire_submission_snapshot(uuid) to authenticated;

comment on function public.trainer_questionnaire_submission_snapshot(uuid) is 'Read-only trainer snapshot of a consciously submitted questionnaire. Draft answers remain unavailable; interpretation stays with the trainer.';
