-- Studio Las Stage 2B public inquiry ingress focused SQL/security scenarios.
-- Runs inside one transaction and rolls back all synthetic state.

begin;

select set_config(
  'stage2b.test.prefix',
  'E2E-SQL-PUBLIC-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  true
);

insert into private.inquiry_ingress_config (singleton, owner_trainer_id, enabled, configured_at)
select true, id, true, now()
from public.profiles
where role = 'trainer'
order by created_at, id
limit 1
on conflict (singleton) do update
set owner_trainer_id = excluded.owner_trainer_id,
    enabled = true,
    configured_at = now();

-- 01: private limiter/config tables are not exposed to browser roles.
do $test$
begin
  if has_table_privilege('anon', 'private.inquiry_ingress_config', 'SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'private.inquiry_ingress_config', 'SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('anon', 'private.inquiry_ingress_rate_limits', 'SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'private.inquiry_ingress_rate_limits', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'ASSERTION FAILED: private ingress tables are exposed';
  end if;
end;
$test$;

-- 02: ingress RPC is service-only.
do $test$
begin
  if not has_function_privilege(
      'service_role',
      'public.ingest_public_inquiry(text,text,text,text,text,text,text,text,text,text,text)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.ingest_public_inquiry(text,text,text,text,text,text,text,text,text,text,text)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.ingest_public_inquiry(text,text,text,text,text,text,text,text,text,text,text)',
      'EXECUTE'
    ) then
    raise exception 'ASSERTION FAILED: ingress RPC privilege boundary is incorrect';
  end if;
end;
$test$;

-- 03: one valid request creates exactly one minimal open inquiry.
do $test$
declare
  v_status text;
  v_count integer;
  v_request text := current_setting('stage2b.test.prefix') || '-valid';
begin
  v_status := public.ingest_public_inquiry(
    v_request,
    repeat('a', 64),
    'QA Public SQL',
    '+48 600 000 001',
    'qa-public-sql@example.test',
    '18:00–20:00',
    'Powrót do aktywności lub sportu',
    'Chcę znowu spokojnie biegać 5 km.',
    'first-contact-v1',
    'public-ingress-v1',
    'first-contact-consent-v1'
  ) ->> 'status';

  select count(*) into v_count
  from public.inquiries
  where source_channel = 'public_first_contact'
    and source_request_key = v_request
    and inquiry_status = 'open'
    and contact_status = 'pending'
    and converted_client_id is null;

  if v_status <> 'created' or v_count <> 1 then
    raise exception 'ASSERTION FAILED: valid ingress did not create one minimal inquiry';
  end if;
end;
$test$;

-- 04: replay returns duplicate and does not consume additional rate quota.
do $test$
declare
  v_status text;
  v_count integer;
  v_client_attempts integer;
  v_global_attempts integer;
  v_request text := current_setting('stage2b.test.prefix') || '-valid';
begin
  v_status := public.ingest_public_inquiry(
    v_request,
    repeat('a', 64),
    'QA Public SQL',
    '+48 600 000 001',
    'qa-public-sql@example.test',
    '18:00–20:00',
    'Powrót do aktywności lub sportu',
    'Chcę znowu spokojnie biegać 5 km.',
    'first-contact-v1',
    'public-ingress-v1',
    'first-contact-consent-v1'
  ) ->> 'status';

  select count(*) into v_count from public.inquiries
  where source_channel = 'public_first_contact' and source_request_key = v_request;
  select max(attempt_count) into v_client_attempts from private.inquiry_ingress_rate_limits where scope = 'client';
  select max(attempt_count) into v_global_attempts from private.inquiry_ingress_rate_limits where scope = 'global';

  if v_status <> 'duplicate' or v_count <> 1 or v_client_attempts <> 1 or v_global_attempts <> 1 then
    raise exception 'ASSERTION FAILED: replay/idempotency consumed quota or duplicated inquiry';
  end if;
end;
$test$;

-- 05: invalid request key fails before durable mutation.
do $test$
declare
  v_blocked boolean := false;
  v_before integer;
  v_after integer;
begin
  select count(*) into v_before from public.inquiries;
  begin
    perform public.ingest_public_inquiry(
      'bad key!', repeat('b', 64), 'QA', '+48 600 000 002', null,
      '18:00–20:00', 'Chcę najpierw porozmawiać', null,
      'first-contact-v1', 'public-ingress-v1', 'first-contact-consent-v1'
    );
  exception when others then
    v_blocked := true;
  end;
  select count(*) into v_after from public.inquiries;
  if not v_blocked or v_before <> v_after then
    raise exception 'ASSERTION FAILED: invalid request mutated inquiry state';
  end if;
end;
$test$;

-- 06: first five new requests per client bucket are accepted; sixth is rate-limited.
do $test$
declare
  v_index integer;
  v_status text;
  v_request text;
  v_created integer := 0;
begin
  -- One request in this bucket already exists from test 03.
  for v_index in 1..4 loop
    v_request := current_setting('stage2b.test.prefix') || '-rate-' || v_index;
    v_status := public.ingest_public_inquiry(
      v_request, repeat('a', 64), 'QA Public SQL ' || v_index,
      '+48 600 000 00' || (v_index + 1), null,
      '18:00–20:00', 'Chcę najpierw porozmawiać', null,
      'first-contact-v1', 'public-ingress-v1', 'first-contact-consent-v1'
    ) ->> 'status';
    if v_status = 'created' then v_created := v_created + 1; end if;
  end loop;

  v_status := public.ingest_public_inquiry(
    current_setting('stage2b.test.prefix') || '-rate-5',
    repeat('a', 64), 'QA Public SQL limited', '+48 600 000 009', null,
    '18:00–20:00', 'Chcę najpierw porozmawiać', null,
    'first-contact-v1', 'public-ingress-v1', 'first-contact-consent-v1'
  ) ->> 'status';

  if v_created <> 4 or v_status <> 'rate_limited' then
    raise exception 'ASSERTION FAILED: per-client rate limit semantics are incorrect';
  end if;
end;
$test$;

-- 07: rate-limited request persists no inquiry content.
do $test$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.inquiries
  where source_request_key = current_setting('stage2b.test.prefix') || '-rate-5';
  if v_count <> 0 then
    raise exception 'ASSERTION FAILED: rate-limited inquiry content persisted';
  end if;
end;
$test$;

-- 08: global ceiling independently fails closed.
do $test$
declare
  v_bucket timestamptz := to_timestamp(floor(extract(epoch from clock_timestamp()) / 900) * 900);
  v_status text;
begin
  update private.inquiry_ingress_rate_limits
  set attempt_count = 100
  where scope = 'global' and window_start = v_bucket;

  v_status := public.ingest_public_inquiry(
    current_setting('stage2b.test.prefix') || '-global',
    repeat('c', 64), 'QA Public SQL global', '+48 600 000 010', null,
    '18:00–20:00', 'Chcę najpierw porozmawiać', null,
    'first-contact-v1', 'public-ingress-v1', 'first-contact-consent-v1'
  ) ->> 'status';

  if v_status <> 'rate_limited' then
    raise exception 'ASSERTION FAILED: global ingress ceiling did not fail closed';
  end if;
end;
$test$;

-- 09: disabled owner configuration fails before rate/content mutation.
do $test$
declare
  v_status text;
  v_before integer;
  v_after integer;
begin
  update private.inquiry_ingress_config set enabled = false where singleton = true;
  select count(*) into v_before from private.inquiry_ingress_rate_limits;

  v_status := public.ingest_public_inquiry(
    current_setting('stage2b.test.prefix') || '-disabled',
    repeat('d', 64), 'QA Public SQL disabled', '+48 600 000 011', null,
    '18:00–20:00', 'Chcę najpierw porozmawiać', null,
    'first-contact-v1', 'public-ingress-v1', 'first-contact-consent-v1'
  ) ->> 'status';

  select count(*) into v_after from private.inquiry_ingress_rate_limits;
  if v_status <> 'unavailable' or v_before <> v_after then
    raise exception 'ASSERTION FAILED: disabled ingress did not fail before limiter/content mutation';
  end if;

  update private.inquiry_ingress_config set enabled = true where singleton = true;
end;
$test$;

-- 10: ingress creates no decisions or clients/PWD/Guidance/account side effects.
do $test$
declare
  v_decisions integer;
  v_clients integer;
begin
  select count(*) into v_decisions
  from public.inquiry_decisions d
  join public.inquiries i on i.id = d.inquiry_id
  where i.source_request_key like current_setting('stage2b.test.prefix') || '%';

  select count(*) into v_clients
  from public.clients
  where name like 'QA Public SQL%';

  if v_decisions <> 0 or v_clients <> 0 then
    raise exception 'ASSERTION FAILED: ingress crossed into decision/client process';
  end if;
end;
$test$;

-- 11: limiter schema contains no raw IP/contact/free-text columns.
do $test$
declare
  v_forbidden integer;
begin
  select count(*) into v_forbidden
  from information_schema.columns
  where table_schema = 'private'
    and table_name = 'inquiry_ingress_rate_limits'
    and column_name in ('ip', 'ip_address', 'phone', 'email', 'person_words', 'payload', 'body');
  if v_forbidden <> 0 then
    raise exception 'ASSERTION FAILED: limiter stores forbidden raw content columns';
  end if;
end;
$test$;

-- 12: inquiry audit remains metadata-only for synthetic ingress rows.
do $test$
declare
  v_leaks integer;
begin
  select count(*) into v_leaks
  from public.security_audit_events e
  where e.row_id in (
    select id from public.inquiries
    where source_request_key like current_setting('stage2b.test.prefix') || '%'
  )
  and to_jsonb(e)::text like '%qa-public-sql@example.test%';

  if v_leaks <> 0 then
    raise exception 'ASSERTION FAILED: audit duplicated public ingress contact content';
  end if;
end;
$test$;

rollback;

select 'PUBLIC_INQUIRY_INGRESS_SQL_SECURITY_SUCCESS 12/12 PASS' as result;
