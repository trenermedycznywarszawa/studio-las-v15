-- Stage 2B public inquiry ingress boundary.
-- Browser writes remain mediated by an Edge Function; no anonymous table/RPC DML is granted.

begin;

create table private.inquiry_ingress_config (
  singleton boolean primary key default true,
  owner_trainer_id uuid not null references public.profiles(id) on delete restrict,
  enabled boolean not null default false,
  configured_at timestamptz not null default now(),
  constraint inquiry_ingress_config_singleton_check check (singleton)
);

create table private.inquiry_ingress_rate_limits (
  scope text not null,
  rate_key text not null,
  window_start timestamptz not null,
  attempt_count integer not null default 0,
  expires_at timestamptz not null,
  last_request_key text,
  updated_at timestamptz not null default now(),
  primary key (scope, rate_key, window_start),
  constraint inquiry_ingress_rate_scope_check check (scope in ('client', 'global')),
  constraint inquiry_ingress_rate_key_check check (length(rate_key) between 6 and 128),
  constraint inquiry_ingress_rate_count_check check (attempt_count >= 0),
  constraint inquiry_ingress_rate_expiry_check check (expires_at > window_start)
);

revoke all on table private.inquiry_ingress_config from public, anon, authenticated;
revoke all on table private.inquiry_ingress_rate_limits from public, anon, authenticated;

create or replace function public.ingest_public_inquiry(
  p_request_key text,
  p_rate_key text,
  p_name text,
  p_phone text,
  p_email text,
  p_preferred_contact_window text,
  p_broad_goal text,
  p_person_words text,
  p_form_version text,
  p_source_version text,
  p_privacy_notice_version text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_request_key text := btrim(coalesce(p_request_key, ''));
  v_rate_key text := lower(btrim(coalesce(p_rate_key, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_contact_window text := btrim(coalesce(p_preferred_contact_window, ''));
  v_goal text := btrim(coalesce(p_broad_goal, ''));
  v_person_words text := nullif(btrim(coalesce(p_person_words, '')), '');
  v_form_version text := btrim(coalesce(p_form_version, ''));
  v_source_version text := btrim(coalesce(p_source_version, ''));
  v_privacy_version text := btrim(coalesce(p_privacy_notice_version, ''));
  v_owner_trainer_id uuid;
  v_existing_id uuid;
  v_inquiry_id uuid;
  v_bucket_start timestamptz;
  v_expires_at timestamptz;
  v_client_count integer;
  v_global_count integer;
  v_digits text;
begin
  if v_request_key !~ '^[A-Za-z0-9_-]{12,128}$' then
    raise exception 'invalid public inquiry request key' using errcode = '22023';
  end if;
  if v_rate_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid public inquiry rate key' using errcode = '22023';
  end if;
  if length(v_name) < 1 or length(v_name) > 120 then
    raise exception 'invalid public inquiry name' using errcode = '22023';
  end if;
  if length(v_phone) < 5 or length(v_phone) > 32 then
    raise exception 'invalid public inquiry phone' using errcode = '22023';
  end if;
  v_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  if length(v_digits) < 9 or length(v_digits) > 15 then
    raise exception 'invalid public inquiry phone digits' using errcode = '22023';
  end if;
  if v_email is not null and (
    length(v_email) < 3 or length(v_email) > 320
    or position('@' in v_email) <= 1
    or v_email ~ '[[:space:]]'
  ) then
    raise exception 'invalid public inquiry email' using errcode = '22023';
  end if;
  if v_contact_window not in (
    '16:00–18:00',
    '18:00–20:00',
    '20:00–22:00',
    'Najpierw napisz SMS i ustalmy termin',
    'Inny termin — ustalimy wiadomością'
  ) then
    raise exception 'invalid public inquiry contact window' using errcode = '22023';
  end if;
  if v_goal not in (
    'Swobodniejsze poruszanie się na co dzień',
    'Powrót do aktywności lub sportu',
    'Siła i kondycja po przerwie',
    'Większa pewność w ruchu',
    'Chcę najpierw porozmawiać'
  ) then
    raise exception 'invalid public inquiry goal' using errcode = '22023';
  end if;
  if v_person_words is not null and length(v_person_words) > 280 then
    raise exception 'public inquiry person words too long' using errcode = '22023';
  end if;
  if length(v_form_version) < 1 or length(v_form_version) > 64
     or v_form_version !~ '^[A-Za-z0-9._-]+$' then
    raise exception 'invalid public inquiry form version' using errcode = '22023';
  end if;
  if length(v_source_version) < 1 or length(v_source_version) > 64
     or v_source_version !~ '^[A-Za-z0-9._-]+$' then
    raise exception 'invalid public inquiry source version' using errcode = '22023';
  end if;
  if length(v_privacy_version) < 1 or length(v_privacy_version) > 64
     or v_privacy_version !~ '^[A-Za-z0-9._-]+$' then
    raise exception 'invalid public inquiry privacy version' using errcode = '22023';
  end if;

  -- Serialize the same idempotency key before checking/consuming rate quota.
  perform pg_advisory_xact_lock(hashtextextended(v_request_key, 0));

  select i.id into v_existing_id
  from public.inquiries i
  where i.source_channel = 'public_first_contact'
    and i.source_request_key = v_request_key
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select c.owner_trainer_id into v_owner_trainer_id
  from private.inquiry_ingress_config c
  join public.profiles p on p.id = c.owner_trainer_id and p.role = 'trainer'
  where c.singleton = true and c.enabled = true;

  if v_owner_trainer_id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  delete from private.inquiry_ingress_rate_limits
  where expires_at < now();

  v_bucket_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / 900) * 900);
  v_expires_at := v_bucket_start + interval '30 minutes';

  insert into private.inquiry_ingress_rate_limits (
    scope, rate_key, window_start, attempt_count, expires_at, last_request_key, updated_at
  ) values (
    'client', v_rate_key, v_bucket_start, 1, v_expires_at, v_request_key, now()
  )
  on conflict (scope, rate_key, window_start) do update
  set attempt_count = private.inquiry_ingress_rate_limits.attempt_count + 1,
      expires_at = excluded.expires_at,
      last_request_key = excluded.last_request_key,
      updated_at = now()
  returning attempt_count into v_client_count;

  insert into private.inquiry_ingress_rate_limits (
    scope, rate_key, window_start, attempt_count, expires_at, last_request_key, updated_at
  ) values (
    'global', 'global', v_bucket_start, 1, v_expires_at, v_request_key, now()
  )
  on conflict (scope, rate_key, window_start) do update
  set attempt_count = private.inquiry_ingress_rate_limits.attempt_count + 1,
      expires_at = excluded.expires_at,
      last_request_key = excluded.last_request_key,
      updated_at = now()
  returning attempt_count into v_global_count;

  if v_client_count > 5 or v_global_count > 100 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  begin
    insert into public.inquiries (
      owner_trainer_id,
      source_channel,
      source_version,
      form_version,
      source_request_key,
      submitted_name,
      submitted_phone,
      submitted_email,
      preferred_contact_window,
      broad_goal,
      person_words,
      privacy_notice_version
    ) values (
      v_owner_trainer_id,
      'public_first_contact',
      v_source_version,
      v_form_version,
      v_request_key,
      v_name,
      v_phone,
      v_email,
      v_contact_window,
      v_goal,
      v_person_words,
      v_privacy_version
    ) returning id into v_inquiry_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;

  return jsonb_build_object('status', 'created');
end;
$$;

revoke all on function public.ingest_public_inquiry(
  text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.ingest_public_inquiry(
  text, text, text, text, text, text, text, text, text, text, text
) to service_role;

comment on table private.inquiry_ingress_config is
  'Singleton owner routing for public first-contact ingress. Missing/disabled configuration fails closed.';
comment on table private.inquiry_ingress_rate_limits is
  'Short-lived opaque abuse-control counters only. No raw IP or inquiry content.';
comment on function public.ingest_public_inquiry(
  text, text, text, text, text, text, text, text, text, text, text
) is
  'Service-only atomic public first-contact ingress. Enforces idempotency, rate limits, owner routing and minimal inquiry creation.';

commit;
