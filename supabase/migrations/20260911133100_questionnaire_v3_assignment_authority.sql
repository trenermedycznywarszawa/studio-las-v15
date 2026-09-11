create unique index if not exists questionnaire_versions_one_active_release_idx
  on public.questionnaire_versions(template_id)
  where released_at is not null and retired_at is null;

create or replace function public.assign_active_questionnaire(
  p_client_id uuid,
  p_template_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_profile_id uuid;
  v_version_id uuid;
  v_goal_snapshot text;
  v_assignment public.questionnaire_assignments%rowtype;
begin
  if auth.uid() is null or not private.is_trainer() then
    raise exception 'trainer authentication required' using errcode = '42501';
  end if;
  if not private.trainer_mfa_satisfied() then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if not private.trainer_owns_client(p_client_id) then
    raise exception 'client ownership required' using errcode = '42501';
  end if;
  if nullif(btrim(p_template_key), '') is null then
    raise exception 'template key is required' using errcode = '22023';
  end if;

  v_profile_id := private.current_profile_id();

  select qv.id
  into v_version_id
  from public.questionnaire_templates qt
  join public.questionnaire_versions qv on qv.template_id = qt.id
  where qt.template_key = btrim(p_template_key)
    and qt.active = true
    and qv.released_at is not null
    and qv.retired_at is null
  limit 1;

  if v_version_id is null then
    raise exception 'active questionnaire version not found' using errcode = '22023';
  end if;

  select c.goal into v_goal_snapshot
  from public.clients c
  where c.id = p_client_id
    and c.deleted_at is null
    and c.status = 'active';

  select qa.*
  into v_assignment
  from public.questionnaire_assignments qa
  where qa.client_id = p_client_id
    and qa.version_id = v_version_id
    and qa.status in ('assigned','in_progress')
  order by qa.assigned_at desc
  limit 1;

  if v_assignment.id is null then
    insert into public.questionnaire_assignments(
      client_id,
      version_id,
      assigned_by_profile_id,
      status,
      goal_snapshot
    ) values (
      p_client_id,
      v_version_id,
      v_profile_id,
      'assigned',
      v_goal_snapshot
    )
    returning * into v_assignment;
  end if;

  return jsonb_build_object(
    'id', v_assignment.id,
    'clientId', v_assignment.client_id,
    'versionId', v_assignment.version_id,
    'status', v_assignment.status,
    'goalSnapshot', v_assignment.goal_snapshot,
    'assignedAt', v_assignment.assigned_at
  );
end;
$$;

revoke all on function public.assign_active_questionnaire(uuid,text) from public, anon, authenticated;
grant execute on function public.assign_active_questionnaire(uuid,text) to authenticated;

comment on function public.assign_active_questionnaire(uuid,text) is
  'Trainer-only AAL2 assignment of the single active released questionnaire version. Version publishing remains migration-controlled.';
