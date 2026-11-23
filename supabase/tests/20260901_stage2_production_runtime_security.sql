-- Studio Las Stage 2 production runtime - focused SQL/security scenarios.
--
-- Run as a privileged role that may SET ROLE after all canonical migrations are applied.
-- The database must contain at least two trainer profiles with auth_user_id values.
-- The file creates synthetic rows only inside one transaction and rolls everything back.
-- It intentionally tests the production tables/RPCs, not the staging-only E2E fixture.

begin;

-- ---------------------------------------------------------------------------
-- Preflight + isolated synthetic fixtures
-- ---------------------------------------------------------------------------

do $preflight$
declare
  v_trainer_a record;
  v_trainer_b record;
  v_inquiry_a uuid;
  v_inquiry_b uuid;
  v_inquiry_c uuid;
  v_inquiry_d uuid;
  v_suffix text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  v_probe text := 'stage2_sql_sensitive_probe_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  select id, auth_user_id
  into v_trainer_a
  from public.profiles
  where role = 'trainer' and auth_user_id is not null
  order by created_at, id
  limit 1;

  select id, auth_user_id
  into v_trainer_b
  from public.profiles
  where role = 'trainer'
    and auth_user_id is not null
    and id <> v_trainer_a.id
  order by created_at, id
  limit 1;

  if v_trainer_a.id is null or v_trainer_b.id is null then
    raise exception 'ASSERTION FAILED: Stage 2 SQL tests require two trainer profiles';
  end if;

  perform set_config('stage2.test.trainer_a_profile', v_trainer_a.id::text, true);
  perform set_config('stage2.test.trainer_a_auth', v_trainer_a.auth_user_id::text, true);
  perform set_config('stage2.test.trainer_b_profile', v_trainer_b.id::text, true);
  perform set_config('stage2.test.trainer_b_auth', v_trainer_b.auth_user_id::text, true);
  perform set_config('stage2.test.probe', v_probe, true);
  perform set_config('stage2.test.a_name', 'Stage2 SQL A ' || v_suffix, true);
  perform set_config('stage2.test.a_phone', '+48-SQL-A-' || v_suffix, true);
  perform set_config('stage2.test.a_email', 'stage2-sql-a-' || v_suffix || '@example.test', true);
  perform set_config('stage2.test.c_name', 'Stage2 SQL FAIL ' || v_suffix, true);

  insert into public.inquiries (
    owner_trainer_id, source_channel, source_version, form_version, source_request_key,
    submitted_name, submitted_phone, submitted_email, preferred_contact_window,
    broad_goal, person_words, privacy_notice_version
  ) values (
    v_trainer_a.id, 'staging_fixture', 'sql-security-1', 'sql-security-1', 'stage2-sql-a-' || v_suffix,
    current_setting('stage2.test.a_name'), current_setting('stage2.test.a_phone'),
    current_setting('stage2.test.a_email'), '18:00–20:00',
    'Powrót do aktywności lub sportu', v_probe || ' person words A', 'sql-security-1'
  ) returning id into v_inquiry_a;

  insert into public.inquiries (
    owner_trainer_id, source_channel, source_version, form_version, source_request_key,
    submitted_name, submitted_phone, submitted_email, preferred_contact_window,
    broad_goal, person_words, privacy_notice_version
  ) values (
    v_trainer_b.id, 'staging_fixture', 'sql-security-1', 'sql-security-1', 'stage2-sql-b-' || v_suffix,
    'Stage2 SQL B ' || v_suffix, '+48-SQL-B-' || v_suffix,
    'stage2-sql-b-' || v_suffix || '@example.test', '18:00–20:00',
    'Siła i kondycja po przerwie', v_probe || ' person words B', 'sql-security-1'
  ) returning id into v_inquiry_b;

  insert into public.inquiries (
    owner_trainer_id, source_channel, source_version, form_version, source_request_key,
    submitted_name, submitted_phone, submitted_email, preferred_contact_window,
    broad_goal, person_words, privacy_notice_version
  ) values (
    v_trainer_a.id, 'staging_fixture', 'sql-security-1', 'sql-security-1', 'stage2-sql-c-' || v_suffix,
    current_setting('stage2.test.c_name'), '+48-SQL-C-' || v_suffix,
    'stage2-sql-c-' || v_suffix || '@example.test', '18:00–20:00',
    'Większa pewność w ruchu', v_probe || ' person words C', 'sql-security-1'
  ) returning id into v_inquiry_c;

  insert into public.inquiries (
    owner_trainer_id, source_channel, source_version, form_version, source_request_key,
    submitted_name, submitted_phone, submitted_email, preferred_contact_window,
    broad_goal, person_words, privacy_notice_version
  ) values (
    v_trainer_a.id, 'staging_fixture', 'sql-security-1', 'sql-security-1', 'stage2-sql-d-' || v_suffix,
    'Stage2 SQL CLOSED ' || v_suffix, '+48-SQL-D-' || v_suffix,
    null, '18:00–20:00',
    'Chcę najpierw porozmawiać', v_probe || ' person words D', 'sql-security-1'
  ) returning id into v_inquiry_d;

  perform set_config('stage2.test.inquiry_a', v_inquiry_a::text, true);
  perform set_config('stage2.test.inquiry_b', v_inquiry_b::text, true);
  perform set_config('stage2.test.inquiry_c', v_inquiry_c::text, true);
  perform set_config('stage2.test.inquiry_d', v_inquiry_d::text, true);
end;
$preflight$;

-- 01: physical security contract is FORCE RLS + least privilege.
do $test$
declare
  v_force_count integer;
begin
  select count(*) into v_force_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('inquiries', 'inquiry_decisions')
    and c.relrowsecurity
    and c.relforcerowsecurity;

  if v_force_count <> 2 then
    raise exception 'ASSERTION FAILED: Stage 2 tables must both use FORCE RLS';
  end if;
  if not has_table_privilege('authenticated', 'public.inquiries', 'SELECT')
     or has_table_privilege('authenticated', 'public.inquiries', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('anon', 'public.inquiries', 'SELECT')
     or has_table_privilege('anon', 'public.inquiry_decisions', 'SELECT') then
    raise exception 'ASSERTION FAILED: Stage 2 table grants violate least privilege';
  end if;
  if not has_function_privilege('authenticated', 'public.save_inquiry_decision(uuid,text,text,text,text,text,text,text,timestamptz)', 'EXECUTE')
     or has_function_privilege('anon', 'public.save_inquiry_decision(uuid,text,text,text,text,text,text,text,timestamptz)', 'EXECUTE')
     or has_function_privilege('anon', 'public.convert_inquiry_to_pwd_client(uuid)', 'EXECUTE') then
    raise exception 'ASSERTION FAILED: Stage 2 RPC grants/revokes are incorrect';
  end if;
end;
$test$;

-- ---------------------------------------------------------------------------
-- Anonymous/public boundary
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000000', true);
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon","aal":"aal1"}', true);

-- 02: anonymous actor cannot read inquiry rows.
do $test$
declare
  v_blocked boolean := false;
begin
  begin
    execute 'select count(*) from public.inquiries';
  exception when others then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'ASSERTION FAILED: anon read public.inquiries';
  end if;
end;
$test$;

-- 03: anonymous actor cannot execute protected mutation RPCs.
do $test$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.set_inquiry_contact_state(
      current_setting('stage2.test.inquiry_a')::uuid,
      'contacting', null, null, false
    );
  exception when others then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'ASSERTION FAILED: anon executed Stage 2 mutation RPC';
  end if;
end;
$test$;

reset role;

-- ---------------------------------------------------------------------------
-- Trainer A: AAL1 must fail closed
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('stage2.test.trainer_a_auth'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', current_setting('stage2.test.trainer_a_auth'),
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);

-- 04: trainer A at AAL1 cannot read Stage 2 rows through restrictive RLS.
do $test$
declare
  v_count integer;
begin
  select count(*) into v_count from public.inquiries;
  if v_count <> 0 then
    raise exception 'ASSERTION FAILED: trainer AAL1 read Stage 2 rows: %', v_count;
  end if;
end;
$test$;

-- 05: trainer A at AAL1 cannot save a decision RPC.
do $test$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.save_inquiry_decision(
      current_setting('stage2.test.inquiry_a')::uuid,
      'PWD', 'Chcę wrócić do aktywności', null, 'Brak pewności',
      'AAL1 must fail', null, 'arrange_pwd', null
    );
  exception when others then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'ASSERTION FAILED: trainer AAL1 saved Stage 2 decision';
  end if;
end;
$test$;

reset role;

-- ---------------------------------------------------------------------------
-- Trainer A: AAL2 owner-isolated workflow
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('stage2.test.trainer_a_auth'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', current_setting('stage2.test.trainer_a_auth'),
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);

-- 06: owner trainer sees own inquiry and not trainer B inquiry.
do $test$
declare
  v_own integer;
  v_other integer;
begin
  select count(*) into v_own
  from public.inquiries
  where id = current_setting('stage2.test.inquiry_a')::uuid;
  select count(*) into v_other
  from public.inquiries
  where id = current_setting('stage2.test.inquiry_b')::uuid;
  if v_own <> 1 or v_other <> 0 then
    raise exception 'ASSERTION FAILED: cross-trainer isolation own=% other=%', v_own, v_other;
  end if;
end;
$test$;

-- 07: browser/authenticated role cannot direct-insert inquiries or decisions.
do $test$
declare
  v_inquiry_blocked boolean := false;
  v_decision_blocked boolean := false;
begin
  begin
    insert into public.inquiries (
      owner_trainer_id, source_channel, source_version, form_version, source_request_key,
      submitted_name, submitted_phone, preferred_contact_window, broad_goal, privacy_notice_version
    ) values (
      current_setting('stage2.test.trainer_a_profile')::uuid,
      'staging_fixture', 'sql-security-1', 'sql-security-1', 'stage2-direct-write-blocked',
      'Blocked', '+48000000000', '18:00–20:00',
      'Chcę najpierw porozmawiać', 'sql-security-1'
    );
  exception when others then
    v_inquiry_blocked := true;
  end;

  begin
    insert into public.inquiry_decisions (
      inquiry_id, decision_version, decision, goal_in_person_words, current_barrier,
      rationale, actor_profile_id, evidence_source_version, evidence_form_version
    ) values (
      current_setting('stage2.test.inquiry_a')::uuid,
      1, 'PWD', 'Blocked', 'Blocked', 'Blocked',
      current_setting('stage2.test.trainer_a_profile')::uuid,
      'sql-security-1', 'sql-security-1'
    );
  exception when others then
    v_decision_blocked := true;
  end;

  if not v_inquiry_blocked or not v_decision_blocked then
    raise exception 'ASSERTION FAILED: direct protected-table write was allowed';
  end if;
end;
$test$;

-- 08: trainer A cannot mutate trainer B inquiry through an RPC.
do $test$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.set_inquiry_contact_state(
      current_setting('stage2.test.inquiry_b')::uuid,
      'contacting', null, null, false
    );
  exception when others then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'ASSERTION FAILED: trainer A mutated trainer B inquiry';
  end if;
end;
$test$;

-- 09: unreachable is contact status only and cannot be stored as a decision.
do $test$
declare
  v_blocked boolean := false;
  v_count integer;
begin
  begin
    perform public.save_inquiry_decision(
      current_setting('stage2.test.inquiry_a')::uuid,
      'unreachable', 'Chcę wrócić do aktywności', null, 'Brak pewności',
      'Invalid decision probe', null, null, null
    );
  exception when others then
    v_blocked := true;
  end;
  select count(*) into v_count
  from public.inquiry_decisions
  where inquiry_id = current_setting('stage2.test.inquiry_a')::uuid;
  if not v_blocked or v_count <> 0 then
    raise exception 'ASSERTION FAILED: unreachable decision mutated history';
  end if;
end;
$test$;

-- 10: decision requires a non-empty rationale and failure is zero-mutation.
do $test$
declare
  v_blocked boolean := false;
  v_count integer;
begin
  begin
    perform public.save_inquiry_decision(
      current_setting('stage2.test.inquiry_a')::uuid,
      'PWD', 'Chcę wrócić do aktywności', null, 'Brak pewności',
      '   ', null, 'arrange_pwd', null
    );
  exception when others then
    v_blocked := true;
  end;
  select count(*) into v_count
  from public.inquiry_decisions
  where inquiry_id = current_setting('stage2.test.inquiry_a')::uuid;
  if not v_blocked or v_count <> 0 then
    raise exception 'ASSERTION FAILED: empty rationale mutated decision history';
  end if;
end;
$test$;

-- 11: FOLLOW_UP creates version 1 and does not create/convert a client.
do $test$
declare
  v_decision public.inquiry_decisions%rowtype;
  v_inquiry public.inquiries%rowtype;
begin
  perform public.save_inquiry_decision(
    current_setting('stage2.test.inquiry_a')::uuid,
    'FOLLOW_UP',
    'Chcę wrócić do biegania',
    'To jest ważne teraz',
    'Brakuje mi pewności po przerwie',
    current_setting('stage2.test.probe') || ' follow-up rationale',
    null,
    'follow_up',
    now() + interval '2 days'
  );

  select * into v_decision
  from public.inquiry_decisions
  where inquiry_id = current_setting('stage2.test.inquiry_a')::uuid
    and decision_status = 'active';
  select * into v_inquiry
  from public.inquiries
  where id = current_setting('stage2.test.inquiry_a')::uuid;

  if v_decision.decision_version <> 1
     or v_decision.decision <> 'FOLLOW_UP'
     or v_inquiry.inquiry_status <> 'open'
     or v_inquiry.contact_status <> 'completed'
     or v_inquiry.converted_client_id is not null then
    raise exception 'ASSERTION FAILED: FOLLOW_UP semantics are incorrect';
  end if;
end;
$test$;

-- 12: later PWD decision preserves/supersedes version 1 instead of overwriting it.
do $test$
declare
  v_old public.inquiry_decisions%rowtype;
  v_new public.inquiry_decisions%rowtype;
begin
  perform public.save_inquiry_decision(
    current_setting('stage2.test.inquiry_a')::uuid,
    'PWD',
    'Chcę wrócić do biegania',
    'To jest ważne teraz',
    'Brakuje mi pewności po przerwie',
    current_setting('stage2.test.probe') || ' pwd rationale',
    null,
    'arrange_pwd',
    null
  );

  select * into v_old
  from public.inquiry_decisions
  where inquiry_id = current_setting('stage2.test.inquiry_a')::uuid
    and decision_version = 1;
  select * into v_new
  from public.inquiry_decisions
  where inquiry_id = current_setting('stage2.test.inquiry_a')::uuid
    and decision_version = 2;

  if v_old.decision_status <> 'superseded'
     or v_old.superseded_at is null
     or v_new.decision_status <> 'active'
     or v_new.decision <> 'PWD'
     or v_new.supersedes_decision_id is distinct from v_old.id then
    raise exception 'ASSERTION FAILED: decision history/supersession is not truthful';
  end if;
end;
$test$;

-- 13: PWD decision alone still creates zero clients.
do $test$
declare
  v_inquiry public.inquiries%rowtype;
  v_count integer;
begin
  select * into v_inquiry
  from public.inquiries
  where id = current_setting('stage2.test.inquiry_a')::uuid;
  select count(*) into v_count
  from public.clients
  where name = current_setting('stage2.test.a_name');
  if v_inquiry.converted_client_id is not null or v_count <> 0 then
    raise exception 'ASSERTION FAILED: PWD decision created a client before explicit conversion';
  end if;
end;
$test$;

-- 14: failed conversion from non-PWD decision leaves no partial client/inquiry state.
do $test$
declare
  v_blocked boolean := false;
  v_inquiry public.inquiries%rowtype;
  v_count integer;
begin
  perform public.save_inquiry_decision(
    current_setting('stage2.test.inquiry_c')::uuid,
    'FOLLOW_UP',
    'Chcę czuć się pewniej',
    null,
    'Potrzebuję jeszcze rozmowy',
    current_setting('stage2.test.probe') || ' conversion failure rationale',
    null,
    'follow_up',
    now() + interval '3 days'
  );

  begin
    perform public.convert_inquiry_to_pwd_client(current_setting('stage2.test.inquiry_c')::uuid);
  exception when others then
    v_blocked := true;
  end;

  select * into v_inquiry
  from public.inquiries
  where id = current_setting('stage2.test.inquiry_c')::uuid;
  select count(*) into v_count
  from public.clients
  where name = current_setting('stage2.test.c_name');

  if not v_blocked
     or v_inquiry.inquiry_status <> 'open'
     or v_inquiry.converted_client_id is not null
     or v_count <> 0 then
    raise exception 'ASSERTION FAILED: failed conversion left partial state';
  end if;
end;
$test$;

-- 15 + 16: explicit conversion creates exactly one client and repeated conversion is idempotent.
do $test$
declare
  v_first jsonb;
  v_second jsonb;
  v_client_id uuid;
  v_count integer;
  v_inquiry public.inquiries%rowtype;
begin
  v_first := public.convert_inquiry_to_pwd_client(current_setting('stage2.test.inquiry_a')::uuid);
  v_client_id := (v_first ->> 'clientId')::uuid;
  if v_client_id is null or coalesce((v_first ->> 'alreadyConverted')::boolean, true) then
    raise exception 'ASSERTION FAILED: first conversion did not create one client';
  end if;

  v_second := public.convert_inquiry_to_pwd_client(current_setting('stage2.test.inquiry_a')::uuid);
  if (v_second ->> 'clientId')::uuid is distinct from v_client_id
     or not coalesce((v_second ->> 'alreadyConverted')::boolean, false) then
    raise exception 'ASSERTION FAILED: repeated conversion is not safely idempotent';
  end if;

  select count(*) into v_count
  from public.clients
  where id = v_client_id;
  select * into v_inquiry
  from public.inquiries
  where id = current_setting('stage2.test.inquiry_a')::uuid;

  if v_count <> 1
     or v_inquiry.inquiry_status <> 'converted'
     or v_inquiry.converted_client_id is distinct from v_client_id
     or v_inquiry.converted_at is null
     or v_inquiry.converted_by_profile_id is null then
    raise exception 'ASSERTION FAILED: conversion did not create exactly one linked client';
  end if;

  perform set_config('stage2.test.converted_client', v_client_id::text, true);
end;
$test$;

-- 17: conversion copies only the approved identity/contact allowlist into clients.
do $test$
declare
  v_client public.clients%rowtype;
begin
  select * into v_client
  from public.clients
  where id = current_setting('stage2.test.converted_client')::uuid;

  if v_client.owner_trainer_id is distinct from current_setting('stage2.test.trainer_a_profile')::uuid
     or v_client.name is distinct from current_setting('stage2.test.a_name')
     or v_client.phone is distinct from current_setting('stage2.test.a_phone')
     or v_client.email is distinct from current_setting('stage2.test.a_email')
     or v_client.engagement_type is distinct from 'diagnostic_visit'
     or v_client.stage <> 1
     or v_client.status <> 'active' then
    raise exception 'ASSERTION FAILED: converted client identity/contact allowlist is incorrect';
  end if;

  if v_client.legacy_id is not null
     or v_client.contact is not null
     or v_client.package is not null
     or v_client.stage_raw is not null
     or v_client.start_date is not null
     or v_client.next_session_date is not null
     or v_client.next_review_date is not null
     or v_client.goal is not null
     or v_client.motivation is not null
     or v_client.fears is not null
     or v_client.health_status is not null
     or v_client.contraindications is not null
     or v_client.red_flags_text is not null
     or v_client.communication_profile is not null
     or v_client.next_milestone is not null
     or v_client.working_hypothesis is not null
     or v_client.deleted_at is not null then
    raise exception 'ASSERTION FAILED: conversion copied non-allowlisted process/health data';
  end if;
end;
$test$;

-- 18: conversion creates no PWD findings, guidance, account or other publication side effects.
do $test$
declare
  v_client_id uuid := current_setting('stage2.test.converted_client')::uuid;
  v_side_effects integer;
begin
  select
    (select count(*) from public.sessions where client_id = v_client_id)
    + (select count(*) from public.assessment_results where client_id = v_client_id)
    + (select count(*) from public.home_plans where client_id = v_client_id)
    + (select count(*) from public.client_users where client_id = v_client_id)
    + (select count(*) from public.client_trainers where client_id = v_client_id)
    + (select count(*) from public.client_intakes where client_id = v_client_id)
    + (select count(*) from public.reports where client_id = v_client_id)
  into v_side_effects;

  if v_side_effects <> 0 then
    raise exception 'ASSERTION FAILED: conversion created % forbidden downstream rows', v_side_effects;
  end if;
end;
$test$;

-- 19: closed inquiry cannot be silently reopened by contact-state mutation.
do $test$
declare
  v_blocked boolean := false;
  v_inquiry public.inquiries%rowtype;
  v_decision public.inquiry_decisions%rowtype;
begin
  perform public.save_inquiry_decision(
    current_setting('stage2.test.inquiry_d')::uuid,
    'NOT_A_FIT',
    'Chcę najpierw zrozumieć możliwości',
    null,
    'Potrzeba poza zakresem Studio Las',
    current_setting('stage2.test.probe') || ' terminal rationale',
    'Granica zakresu została omówiona',
    null,
    null
  );

  begin
    perform public.set_inquiry_contact_state(
      current_setting('stage2.test.inquiry_d')::uuid,
      'pending', null, null, false
    );
  exception when others then
    v_blocked := true;
  end;

  select * into v_inquiry
  from public.inquiries
  where id = current_setting('stage2.test.inquiry_d')::uuid;
  select * into v_decision
  from public.inquiry_decisions
  where inquiry_id = current_setting('stage2.test.inquiry_d')::uuid
    and decision_status = 'active';

  if not v_blocked
     or v_inquiry.inquiry_status <> 'closed'
     or v_decision.decision <> 'NOT_A_FIT' then
    raise exception 'ASSERTION FAILED: closed inquiry was silently reopened';
  end if;
end;
$test$;

reset role;

-- 20: security audit is metadata-only; synthetic contact/free-text values never appear in audit rows.
do $test$
declare
  v_leak_count integer;
  v_unknown_column_count integer;
  v_probe text := current_setting('stage2.test.probe');
  v_a_name text := current_setting('stage2.test.a_name');
  v_a_phone text := current_setting('stage2.test.a_phone');
  v_a_email text := current_setting('stage2.test.a_email');
begin
  select count(*) into v_unknown_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'security_audit_events'
    and column_name not in (
      'id', 'occurred_at', 'actor_auth_user_id', 'actor_profile_id', 'action',
      'table_name', 'row_id', 'client_id', 'changed_columns', 'source'
    );

  if v_unknown_column_count <> 0 then
    raise exception 'ASSERTION FAILED: audit table gained non-metadata columns';
  end if;

  select count(*) into v_leak_count
  from public.security_audit_events e
  where (
      e.row_id in (
        current_setting('stage2.test.inquiry_a')::uuid,
        current_setting('stage2.test.inquiry_b')::uuid,
        current_setting('stage2.test.inquiry_c')::uuid,
        current_setting('stage2.test.inquiry_d')::uuid,
        current_setting('stage2.test.converted_client')::uuid
      )
      or (
        e.table_name = 'inquiry_decisions'
        and e.row_id in (
          select id from public.inquiry_decisions
          where inquiry_id in (
            current_setting('stage2.test.inquiry_a')::uuid,
            current_setting('stage2.test.inquiry_c')::uuid,
            current_setting('stage2.test.inquiry_d')::uuid
          )
        )
      )
    )
    and (
      to_jsonb(e)::text like '%' || v_probe || '%'
      or to_jsonb(e)::text like '%' || v_a_name || '%'
      or to_jsonb(e)::text like '%' || v_a_phone || '%'
      or to_jsonb(e)::text like '%' || v_a_email || '%'
    );

  if v_leak_count <> 0 then
    raise exception 'ASSERTION FAILED: audit duplicated inquiry/contact/free-text values';
  end if;
end;
$test$;

rollback;

select 'STAGE2_SQL_SECURITY_SUCCESS 20/20 PASS' as result;
