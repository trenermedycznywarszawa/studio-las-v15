
-- Stage: first-contact v2, additive and backward-compatible with v1.
-- Existing lead ownership, RLS, rate limits and trainer decision workflow remain unchanged.
alter table public.inquiries
  add column if not exists contact_method text,
  add column if not exists broad_goals text[] not null default '{}'::text[];
alter table public.inquiries alter column submitted_phone drop not null;

alter table public.inquiries drop constraint if exists inquiries_submitted_phone_check;
alter table public.inquiries add constraint inquiries_submitted_phone_check
  check (submitted_phone is null or (length(btrim(submitted_phone)) between 5 and 32));

alter table public.inquiries drop constraint if exists inquiries_broad_goal_check;
alter table public.inquiries add constraint inquiries_broad_goal_check
  check (broad_goal = any(array[
    'Swobodniejsze poruszanie się na co dzień','Powrót do aktywności lub sportu',
    'Siła i kondycja po przerwie','Większa pewność w ruchu','Chcę najpierw porozmawiać',
    'Zacząć lub wrócić do aktywności','Siła, kondycja lub sprawność',
    'Schudnąć lub poprawić sylwetkę','Swoboda i pewność ruchu',
    'Sprawność na kolejne lata','Inny cel lub potrzebna rozmowa','Nie określono celu'
  ]));

alter table public.inquiries drop constraint if exists inquiries_contact_window_check;
alter table public.inquiries add constraint inquiries_contact_window_check
  check (
    preferred_contact_window = any(array[
      '16:00–18:00','18:00–20:00','20:00–22:00',
      'Najpierw napisz SMS i ustalmy termin','Inny termin — ustalimy wiadomością',
      'Przed 12:00','12:00–16:00','16:00–20:00','Po 20:00','O dowolnej porze',
      'Najpierw SMS','E-mail'
    ])
    or (form_version = 'first-contact-v2' and preferred_contact_window like 'Inna pora: %'
        and char_length(preferred_contact_window) <= 80)
  );

alter table public.inquiries add constraint inquiries_contact_method_v2_check
  check (contact_method is null or contact_method in ('phone','sms','email'));
alter table public.inquiries add constraint inquiries_broad_goals_v2_check
  check (cardinality(broad_goals) <= 6 and broad_goals <@ array[
    'start_or_return','strength_fitness','weight_figure','movement_confidence',
    'long_term_capacity','other_or_unsure'
  ]::text[]);
alter table public.inquiries add constraint inquiries_v1_compatibility_check
  check (
    form_version <> 'first-contact-v1' or
    (submitted_phone is not null and contact_method is null and cardinality(broad_goals)=0
      and broad_goal = any(array[
        'Swobodniejsze poruszanie się na co dzień','Powrót do aktywności lub sportu',
        'Siła i kondycja po przerwie','Większa pewność w ruchu','Chcę najpierw porozmawiać'
      ])
      and preferred_contact_window = any(array[
        '16:00–18:00','18:00–20:00','20:00–22:00',
        'Najpierw napisz SMS i ustalmy termin','Inny termin — ustalimy wiadomością'
      ]))
  );
alter table public.inquiries add constraint inquiries_v2_contact_integrity_check
  check (
    form_version <> 'first-contact-v2' or
    (contact_method is not null and
     ((contact_method='email' and submitted_phone is null and submitted_email is not null
          and preferred_contact_window='E-mail')
      or (contact_method='sms' and submitted_phone is not null and submitted_email is null
          and preferred_contact_window='Najpierw SMS')
      or (contact_method='phone' and submitted_phone is not null and submitted_email is null
          and preferred_contact_window not in ('E-mail','Najpierw SMS'))))
  );

comment on column public.inquiries.contact_method is 'First-contact v2 preferred reply channel; only phone/sms/email. Null is legacy v1.';
comment on column public.inquiries.broad_goals is 'First-contact v2 selected non-diagnostic goals in client wording order. Legacy broad_goal remains a first-item projection.';

create or replace function public.ingest_public_inquiry_v2(
  p_request_key text,p_rate_key text,p_name text,p_phone text,p_email text,
  p_contact_method text,p_preferred_contact_window text,p_broad_goals text[],
  p_person_words text,p_form_version text,p_source_version text,p_privacy_notice_version text
) returns jsonb
language plpgsql security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_key text := btrim(coalesce(p_request_key,''));
  v_rate text := lower(btrim(coalesce(p_rate_key,'')));
  v_name text := btrim(coalesce(p_name,''));
  v_method text := btrim(coalesce(p_contact_method,''));
  v_phone text := nullif(btrim(coalesce(p_phone,'')),'');
  v_email text := nullif(lower(btrim(coalesce(p_email,''))),'');
  v_window text := btrim(coalesce(p_preferred_contact_window,''));
  v_window_storage text;
  v_goals text[] := coalesce(p_broad_goals,array[]::text[]);
  v_goal_primary text;
  v_words text := nullif(btrim(coalesce(p_person_words,'')),'');
  v_owner uuid;
  v_existing uuid;
  v_created uuid;
  v_bucket timestamptz;
  v_expiry timestamptz;
  v_client_count integer;
  v_global_count integer;
begin
  if v_key !~ '^[A-Za-z0-9_-]{12,128}$' or v_rate !~ '^[0-9a-f]{64}$'
    then raise exception 'invalid request identity' using errcode='22023'; end if;
  if length(v_name) not between 1 and 120 or p_form_version <> 'first-contact-v2'
     or p_source_version <> 'public-ingress-v1' or p_privacy_notice_version <> 'first-contact-consent-v1'
    then raise exception 'invalid first contact version or name' using errcode='22023'; end if;
  if v_method not in ('phone','sms','email')
    then raise exception 'invalid first contact method' using errcode='22023'; end if;
  if v_words is not null and length(v_words)>280
    then raise exception 'message too long' using errcode='22023'; end if;
  if cardinality(v_goals)>6 or
    exists(select 1 from unnest(v_goals) g where g is null or g not in (
      'start_or_return','strength_fitness','weight_figure','movement_confidence',
      'long_term_capacity','other_or_unsure')) or
    (select count(distinct g) from unnest(v_goals) g) <> cardinality(v_goals)
    then raise exception 'invalid selected goals' using errcode='22023'; end if;

  if v_method='email' then
    if v_phone is not null or v_email is null or
       length(v_email) not between 3 and 320 or position('@' in v_email) <= 1 or
       v_email ~ '[[:space:]]' or v_window <> ''
      then raise exception 'invalid email-only contact' using errcode='22023'; end if;
    v_window_storage:='E-mail';
  else
    if v_phone is null or v_email is not null or length(v_phone) not between 5 and 32 or
       length(regexp_replace(v_phone,'[^0-9]','','g')) not between 9 and 15
      then raise exception 'invalid phone contact' using errcode='22023'; end if;
    if v_method='sms' then
      if v_window <> '' then raise exception 'unexpected SMS time' using errcode='22023'; end if;
      v_window_storage:='Najpierw SMS';
    else
      v_window_storage := case v_window
        when 'before_12' then 'Przed 12:00'
        when '12_16' then '12:00–16:00'
        when '16_20' then '16:00–20:00'
        when 'after_20' then 'Po 20:00'
        when 'any_time' then 'O dowolnej porze'
        else null end;
      if v_window_storage is null and left(v_window,7)='other: ' then
        if length(v_window) not between 8 and 72 or
           btrim(substring(v_window from 8)) = '' or
           v_window ~ '[[:cntrl:]]'
          then raise exception 'invalid other time' using errcode='22023'; end if;
        v_window_storage:='Inna pora: '||btrim(substring(v_window from 8));
      end if;
      if v_window_storage is null then
        raise exception 'invalid contact window' using errcode='22023'; end if;
    end if;
  end if;

  v_goal_primary := case v_goals[1]
    when 'start_or_return' then 'Zacząć lub wrócić do aktywności'
    when 'strength_fitness' then 'Siła, kondycja lub sprawność'
    when 'weight_figure' then 'Schudnąć lub poprawić sylwetkę'
    when 'movement_confidence' then 'Swoboda i pewność ruchu'
    when 'long_term_capacity' then 'Sprawność na kolejne lata'
    when 'other_or_unsure' then 'Inny cel lub potrzebna rozmowa'
    else 'Nie określono celu' end;

  perform pg_advisory_xact_lock(hashtextextended(v_key,0));
  select id into v_existing from public.inquiries
    where source_channel='public_first_contact' and source_request_key=v_key limit 1;
  if v_existing is not null then return jsonb_build_object('status','duplicate'); end if;

  select c.owner_trainer_id into v_owner from private.inquiry_ingress_config c
    join public.profiles p on p.id=c.owner_trainer_id and p.role='trainer'
    where c.singleton=true and c.enabled=true;
  if v_owner is null then return jsonb_build_object('status','unavailable'); end if;

  delete from private.inquiry_ingress_rate_limits where expires_at < now();
  v_bucket := to_timestamp(floor(extract(epoch from clock_timestamp())/900)*900);
  v_expiry := v_bucket + interval '30 minutes';
  insert into private.inquiry_ingress_rate_limits
    (scope,rate_key,window_start,attempt_count,expires_at,last_request_key,updated_at)
  values ('client',v_rate,v_bucket,1,v_expiry,v_key,now())
  on conflict (scope,rate_key,window_start) do update
    set attempt_count=private.inquiry_ingress_rate_limits.attempt_count+1,
        expires_at=excluded.expires_at,last_request_key=excluded.last_request_key,
        updated_at=now()
  returning attempt_count into v_client_count;
  insert into private.inquiry_ingress_rate_limits
    (scope,rate_key,window_start,attempt_count,expires_at,last_request_key,updated_at)
  values ('global','global',v_bucket,1,v_expiry,v_key,now())
  on conflict (scope,rate_key,window_start) do update
    set attempt_count=private.inquiry_ingress_rate_limits.attempt_count+1,
        expires_at=excluded.expires_at,last_request_key=excluded.last_request_key,
        updated_at=now()
  returning attempt_count into v_global_count;
  if v_client_count>5 or v_global_count>100 then
    return jsonb_build_object('status','rate_limited'); end if;

  begin
    insert into public.inquiries
      (owner_trainer_id,source_channel,source_version,form_version,source_request_key,
       submitted_name,submitted_phone,submitted_email,preferred_contact_window,
       broad_goal,broad_goals,contact_method,person_words,privacy_notice_version)
    values
      (v_owner,'public_first_contact',p_source_version,p_form_version,v_key,
       v_name,v_phone,v_email,v_window_storage,
       v_goal_primary,v_goals,v_method,v_words,p_privacy_notice_version)
    returning id into v_created;
  exception when unique_violation then return jsonb_build_object('status','duplicate');
  end;
  return jsonb_build_object('status','created');
end
$function$;

revoke all on function public.ingest_public_inquiry_v2(
 text,text,text,text,text,text,text,text[],text,text,text,text
) from public, anon, authenticated;
grant execute on function public.ingest_public_inquiry_v2(
 text,text,text,text,text,text,text,text[],text,text,text,text
) to service_role;
