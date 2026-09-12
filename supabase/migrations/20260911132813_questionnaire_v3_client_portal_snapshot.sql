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
    and qa.status <> 'cancelled'
    and qa.client_id = (
      select cu.client_id
      from public.client_users cu
      join public.clients c on c.id = cu.client_id
      where cu.user_id = private.current_profile_id()
        and cu.status = 'active'
        and c.status = 'active'
        and c.deleted_at is null
      limit 1
    );
$$;

alter function public.client_portal_snapshot() set schema private;
revoke all on function private.client_portal_snapshot() from public, anon, authenticated;

create function public.client_portal_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_snapshot jsonb;
begin
  if auth.uid() is null or not private.is_client() then
    raise exception 'client authentication required' using errcode = '42501';
  end if;

  v_snapshot := private.client_portal_snapshot();
  return v_snapshot || jsonb_build_object(
    'questionnaires', public.client_questionnaire_assignments()
  );
end;
$$;

revoke all on function public.client_portal_snapshot() from public, anon, authenticated;
grant execute on function public.client_portal_snapshot() to authenticated;

comment on function public.client_portal_snapshot() is
  'Canonical client portal snapshot. Extends the established portal payload with read-only questionnaire assignment metadata.';
