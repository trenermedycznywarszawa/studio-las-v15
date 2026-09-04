-- STAGING / QA ONLY.
-- Configures the canonical staging public-ingress owner for an AAL2 trainer and
-- cleans only exact synthetic request-key prefixes. MUST NOT be promoted.

create or replace function public.prepare_public_inquiry_ingress_e2e(p_marker text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_marker text := btrim(coalesce(p_marker, ''));
  v_profile_id uuid;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if auth.uid() is null or not private.is_trainer() then
    raise exception 'trainer access required' using errcode = '42501';
  end if;
  if v_marker !~ '^E2E-PUBLIC-GHA-[A-Za-z0-9_-]{1,80}$' then
    raise exception 'synthetic public ingress marker required' using errcode = '22023';
  end if;

  v_profile_id := private.current_profile_id();
  if v_profile_id is null then
    raise exception 'trainer profile required' using errcode = '42501';
  end if;

  insert into private.inquiry_ingress_config (
    singleton, owner_trainer_id, enabled, configured_at
  ) values (
    true, v_profile_id, true, now()
  )
  on conflict (singleton) do update
  set owner_trainer_id = excluded.owner_trainer_id,
      enabled = true,
      configured_at = now();

  return jsonb_build_object('prepared', true);
end;
$$;

create or replace function public.cleanup_public_inquiry_ingress_e2e(p_marker text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_marker text := btrim(coalesce(p_marker, ''));
  v_profile_id uuid;
  v_inquiry_count integer := 0;
  v_rate_count integer := 0;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if auth.uid() is null or not private.is_trainer() then
    raise exception 'trainer access required' using errcode = '42501';
  end if;
  if v_marker !~ '^E2E-PUBLIC-GHA-[A-Za-z0-9_-]{1,80}$' then
    raise exception 'synthetic public ingress marker required' using errcode = '22023';
  end if;

  v_profile_id := private.current_profile_id();

  if exists (
    select 1
    from public.inquiries i
    where i.owner_trainer_id = v_profile_id
      and i.source_channel = 'public_first_contact'
      and i.source_request_key like v_marker || '%'
      and (
        i.converted_client_id is not null
        or exists (select 1 from public.inquiry_decisions d where d.inquiry_id = i.id)
      )
  ) then
    raise exception 'synthetic public ingress inquiry acquired process data; refusing cleanup' using errcode = '42501';
  end if;

  delete from public.inquiries i
  where i.owner_trainer_id = v_profile_id
    and i.source_channel = 'public_first_contact'
    and i.source_request_key like v_marker || '%';
  get diagnostics v_inquiry_count = row_count;

  delete from private.inquiry_ingress_rate_limits r
  where r.last_request_key like v_marker || '%';
  get diagnostics v_rate_count = row_count;

  update private.inquiry_ingress_config
  set enabled = false, configured_at = now()
  where singleton = true and owner_trainer_id = v_profile_id;

  return jsonb_build_object(
    'inquiriesDeleted', v_inquiry_count,
    'rateRowsDeleted', v_rate_count,
    'disabled', true
  );
end;
$$;

revoke all on function public.prepare_public_inquiry_ingress_e2e(text) from public, anon;
revoke all on function public.cleanup_public_inquiry_ingress_e2e(text) from public, anon;
grant execute on function public.prepare_public_inquiry_ingress_e2e(text) to authenticated;
grant execute on function public.cleanup_public_inquiry_ingress_e2e(text) to authenticated;
