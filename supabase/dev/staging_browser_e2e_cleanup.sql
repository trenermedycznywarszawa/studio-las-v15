-- STAGING / QA ONLY.
-- This is infrastructure for canonical staging browser E2E and MUST NOT be
-- promoted as a production migration. It deliberately supports only the exact
-- synthetic QA client and E2E-GHA-* run markers.

create or replace function private.cleanup_synthetic_pwd_e2e(
  p_client_id uuid,
  p_marker text,
  p_restore_goal text,
  p_restore_motivation text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_session_ids uuid[] := '{}';
  v_session_count integer := 0;
  v_assessment_count integer := 0;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;

  if auth.uid() is null
     or not private.is_trainer()
     or not private.trainer_owns_client(p_client_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;

  if coalesce(p_marker, '') !~ '^E2E-GHA-[A-Za-z0-9_-]{1,100}$' then
    raise exception 'synthetic E2E marker required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.deleted_at is null
      and c.name = 'QA PWD Client (synthetic)'
  ) then
    raise exception 'synthetic QA client required' using errcode = '42501';
  end if;

  select coalesce(array_agg(s.id order by s.created_at), '{}')
  into v_session_ids
  from public.sessions s
  where s.client_id = p_client_id
    and s.session_type = 'pwd'
    and s.deleted_at is null
    and s.client_summary like '%' || p_marker || '%';

  if coalesce(array_length(v_session_ids, 1), 0) > 0 then
    update public.assessment_results a
    set deleted_at = now(), updated_at = now()
    where a.client_id = p_client_id
      and a.session_id = any(v_session_ids)
      and a.deleted_at is null;
    get diagnostics v_assessment_count = row_count;

    update public.sessions s
    set deleted_at = now(), updated_at = now()
    where s.client_id = p_client_id
      and s.id = any(v_session_ids)
      and s.deleted_at is null;
    get diagnostics v_session_count = row_count;
  end if;

  update public.clients c
  set goal = p_restore_goal,
      motivation = p_restore_motivation,
      updated_at = now()
  where c.id = p_client_id
    and c.deleted_at is null
    and c.name = 'QA PWD Client (synthetic)';

  return jsonb_build_object(
    'sessionCount', v_session_count,
    'assessmentCount', v_assessment_count
  );
end;
$$;

revoke all on function private.cleanup_synthetic_pwd_e2e(uuid, text, text, text) from public, anon;
grant execute on function private.cleanup_synthetic_pwd_e2e(uuid, text, text, text) to authenticated;

create or replace function public.cleanup_synthetic_pwd_e2e(
  p_client_id uuid,
  p_marker text,
  p_restore_goal text,
  p_restore_motivation text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.cleanup_synthetic_pwd_e2e(
    p_client_id,
    p_marker,
    p_restore_goal,
    p_restore_motivation
  );
$$;

revoke all on function public.cleanup_synthetic_pwd_e2e(uuid, text, text, text) from public, anon;
grant execute on function public.cleanup_synthetic_pwd_e2e(uuid, text, text, text) to authenticated;
