-- Studio Las OS - mandatory trainer TOTP MFA / AAL2 authorization boundary
--
-- Profiles remain readable by their owner at AAL1 so the application can decide
-- whether the authenticated account is a trainer or client. Every health/process
-- relation is additionally protected by one restrictive trainer-only AAL2 gate.

begin;

create or replace function private.trainer_mfa_satisfied()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, auth, private
as $$
  select not private.is_trainer()
    or coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

revoke all on function private.trainer_mfa_satisfied() from public, anon;
grant execute on function private.trainer_mfa_satisfied() to authenticated;

do $migration$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'clients', 'client_trainers', 'client_users', 'client_intakes', 'sessions',
    'pre_session_checks', 'post_session_observations', 'client_tasks',
    'client_documents', 'body_measurements', 'training_load_observations',
    'assessment_results', 'exercises', 'home_plans', 'home_plan_items',
    'guidance_events', 'guidance_pilots', 'guidance_pilot_feedback', 'reports',
    'legacy_import_batches', 'legacy_import_records'
  ]
  loop
    execute format(
      'drop policy if exists trainer_totp_aal2_gate on public.%I',
      relation_name
    );
    execute format(
      'create policy trainer_totp_aal2_gate on public.%I as restrictive for all to authenticated using (private.trainer_mfa_satisfied()) with check (private.trainer_mfa_satisfied())',
      relation_name
    );
  end loop;
end;
$migration$;

drop policy if exists studio_las_documents_trainer_totp_aal2_gate on storage.objects;
create policy studio_las_documents_trainer_totp_aal2_gate
on storage.objects
as restrictive
for all
to authenticated
using (
  bucket_id <> 'studio-las-client-documents'
  or private.trainer_mfa_satisfied()
)
with check (
  bucket_id <> 'studio-las-client-documents'
  or private.trainer_mfa_satisfied()
);

-- This browser RPC is the one trainer-facing SECURITY DEFINER endpoint. It must
-- reject AAL1 explicitly rather than relying only on table RLS.
create or replace function public.trainer_client_access_status(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_result jsonb;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;

  if auth.uid() is null or not private.is_trainer() or not private.trainer_owns_client(p_client_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'status', coalesce(cu.status, 'not_invited'),
    'email', c.email,
    'linkedAt', cu.created_at,
    'updatedAt', cu.updated_at
  )
  into v_result
  from public.clients c
  left join public.client_users cu
    on cu.client_id = c.id
   and cu.status = 'active'
  where c.id = p_client_id
    and c.deleted_at is null;

  return coalesce(v_result, jsonb_build_object('status', 'not_found'));
end;
$$;

revoke all on function public.trainer_client_access_status(uuid) from public, anon;
grant execute on function public.trainer_client_access_status(uuid) to authenticated;

comment on function private.trainer_mfa_satisfied() is
  'Restrictive RLS predicate: clients keep their AAL1 portal contract; trainers require a current AAL2 JWT.';

commit;
