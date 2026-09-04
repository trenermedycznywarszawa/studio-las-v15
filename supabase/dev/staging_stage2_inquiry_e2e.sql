-- STAGING / QA ONLY.
-- Installed only on canonical staging as migration history entries:
-- 20260901121951_staging_only_stage2_inquiry_e2e_fixture
-- 20260901122955_staging_only_stage2_inquiry_e2e_fixture_fix
-- MUST NOT be promoted as a production migration.

create or replace function public.create_stage2_synthetic_inquiry_e2e(p_marker text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_profile_id uuid;
  v_inquiry_id uuid;
  v_marker text := btrim(coalesce(p_marker, ''));
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if auth.uid() is null or not private.is_trainer() then
    raise exception 'trainer access required' using errcode = '42501';
  end if;
  if v_marker !~ '^E2E-GHA-[A-Za-z0-9_-]{1,100}$' then
    raise exception 'synthetic Stage 2 marker required' using errcode = '22023';
  end if;

  v_profile_id := private.current_profile_id();
  if v_profile_id is null then
    raise exception 'trainer profile required' using errcode = '42501';
  end if;

  select id into v_inquiry_id
  from public.inquiries
  where source_channel = 'staging_fixture' and source_request_key = v_marker;

  if v_inquiry_id is not null then
    if not private.trainer_owns_inquiry(v_inquiry_id) then
      raise exception 'synthetic inquiry owner mismatch' using errcode = '42501';
    end if;
    return jsonb_build_object('inquiryId', v_inquiry_id, 'alreadyExists', true);
  end if;

  insert into public.inquiries (
    owner_trainer_id, source_channel, source_version, form_version, source_request_key,
    submitted_name, submitted_phone, submitted_email, preferred_contact_window,
    broad_goal, person_words, privacy_notice_version
  ) values (
    v_profile_id, 'staging_fixture', 'e2e-1', 'e2e-1', v_marker,
    'QA Inquiry (synthetic)', '+48000000000', null, '18:00–20:00',
    'Powrót do aktywności lub sportu', 'Chcę wrócić do biegania · ' || v_marker, 'e2e-1'
  ) returning id into v_inquiry_id;

  return jsonb_build_object('inquiryId', v_inquiry_id, 'alreadyExists', false);
end;
$$;

create or replace function public.cleanup_stage2_synthetic_inquiry_e2e(p_inquiry_id uuid, p_marker text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_inquiry public.inquiries%rowtype;
  v_marker text := btrim(coalesce(p_marker, ''));
  v_client_id uuid;
  v_decision_id uuid;
  v_decisions integer := 0;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if auth.uid() is null or not private.is_trainer() or not private.trainer_owns_inquiry(p_inquiry_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;
  if v_marker !~ '^E2E-GHA-[A-Za-z0-9_-]{1,100}$' then
    raise exception 'synthetic Stage 2 marker required' using errcode = '22023';
  end if;

  select * into v_inquiry from public.inquiries where id = p_inquiry_id for update;
  if v_inquiry.id is null
     or v_inquiry.source_channel <> 'staging_fixture'
     or v_inquiry.source_request_key <> v_marker
     or v_inquiry.submitted_name <> 'QA Inquiry (synthetic)' then
    raise exception 'exact synthetic Stage 2 inquiry required' using errcode = '42501';
  end if;

  v_client_id := v_inquiry.converted_client_id;
  if v_client_id is not null then
    if exists (select 1 from public.sessions where client_id = v_client_id and deleted_at is null)
       or exists (select 1 from public.home_plans where client_id = v_client_id and deleted_at is null)
       or exists (select 1 from public.client_users where client_id = v_client_id and status = 'active') then
      raise exception 'synthetic converted client acquired process data; refusing cleanup' using errcode = '42501';
    end if;
  end if;

  for v_decision_id in
    select id from public.inquiry_decisions
    where inquiry_id = p_inquiry_id
    order by decision_version desc
  loop
    delete from public.inquiry_decisions where id = v_decision_id;
    v_decisions := v_decisions + 1;
  end loop;

  delete from public.inquiries where id = p_inquiry_id;

  if v_client_id is not null then
    delete from public.clients
    where id = v_client_id
      and name = 'QA Inquiry (synthetic)'
      and engagement_type = 'diagnostic_visit';
    if not found then
      raise exception 'synthetic converted client cleanup failed' using errcode = '42501';
    end if;
  end if;

  return jsonb_build_object(
    'inquiryDeleted', true,
    'decisionCount', v_decisions,
    'clientDeleted', v_client_id is not null
  );
end;
$$;

revoke all on function public.create_stage2_synthetic_inquiry_e2e(text) from public, anon;
revoke all on function public.cleanup_stage2_synthetic_inquiry_e2e(uuid, text) from public, anon;
grant execute on function public.create_stage2_synthetic_inquiry_e2e(text) to authenticated;
grant execute on function public.cleanup_stage2_synthetic_inquiry_e2e(uuid, text) to authenticated;
