create or replace function public.client_questionnaire_assignments()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', qa.id,
        'templateKey', qt.template_key,
        'title', qt.title,
        'versionCode', qv.version_code,
        'status', qa.status,
        'assignedAt', qa.assigned_at,
        'startedAt', qa.started_at,
        'submittedAt', qa.submitted_at
      )
      order by qa.assigned_at desc, qa.id desc
    ),
    '[]'::jsonb
  )
  from public.questionnaire_assignments qa
  join public.questionnaire_versions qv on qv.id = qa.version_id
  join public.questionnaire_templates qt on qt.id = qv.template_id
  where private.is_client()
    and qa.status <> 'cancelled';
$$;

revoke all on function public.client_questionnaire_assignments() from public, anon, authenticated;
grant execute on function public.client_questionnaire_assignments() to authenticated;

comment on function public.client_questionnaire_assignments() is
  'Read-only questionnaire assignment metadata for the authenticated client portal. Returns no response answers or trainer workflow state.';
