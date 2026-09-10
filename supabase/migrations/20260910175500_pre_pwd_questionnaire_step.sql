-- Secure pre-PWD questionnaire: explicit trainer-created single-use link,
-- public token submission, immutable source capture in client_intakes.

begin;

create table public.pre_pwd_intake_requests (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  owner_trainer_id uuid not null references public.profiles(id) on delete restrict,
  token_hash text not null unique,
  status text not null default 'ready',
  expires_at timestamptz not null,
  sent_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pre_pwd_intake_status_check check (status in ('ready','sent','completed','revoked')),
  constraint pre_pwd_intake_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint pre_pwd_intake_expiry_check check (expires_at > created_at),
  constraint pre_pwd_intake_state_check check (
    (status = 'ready' and sent_at is null and completed_at is null and revoked_at is null)
    or (status = 'sent' and sent_at is not null and completed_at is null and revoked_at is null)
    or (status = 'completed' and completed_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null and completed_at is null)
  )
);

create unique index pre_pwd_intake_one_open_idx
  on public.pre_pwd_intake_requests(inquiry_id)
  where status in ('ready','sent');
create index pre_pwd_intake_client_history_idx
  on public.pre_pwd_intake_requests(client_id, created_at desc);

create trigger set_pre_pwd_intake_requests_updated_at
before update on public.pre_pwd_intake_requests
for each row execute function public.set_updated_at();

create trigger audit_sensitive_row_change
after insert or update or delete on public.pre_pwd_intake_requests
for each row execute function public.audit_sensitive_row_change();

alter table public.pre_pwd_intake_requests enable row level security;
alter table public.pre_pwd_intake_requests force row level security;
revoke all on table public.pre_pwd_intake_requests from public, anon, authenticated;
grant select on table public.pre_pwd_intake_requests to authenticated;

create policy pre_pwd_intake_owner_select
on public.pre_pwd_intake_requests for select to authenticated
using (
  private.is_trainer()
  and owner_trainer_id = private.current_profile_id()
  and private.trainer_can_access_client(client_id)
);

create policy pre_pwd_intake_trainer_aal2_gate
on public.pre_pwd_intake_requests as restrictive for all to authenticated
using (private.trainer_mfa_satisfied())
with check (private.trainer_mfa_satisfied());

create or replace function public.create_pre_pwd_intake_request(
  p_inquiry_id uuid,
  p_valid_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_inquiry public.inquiries%rowtype;
  v_actor uuid;
  v_token text;
  v_request_id uuid := gen_random_uuid();
  v_expires timestamptz;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if auth.uid() is null or not private.is_trainer() or not private.trainer_owns_inquiry(p_inquiry_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;
  if p_valid_days < 1 or p_valid_days > 14 then
    raise exception 'validity must be between 1 and 14 days' using errcode = '22023';
  end if;

  select * into v_inquiry from public.inquiries where id = p_inquiry_id for update;
  if v_inquiry.id is null then raise exception 'inquiry not found' using errcode = 'P0002'; end if;
  if v_inquiry.inquiry_status <> 'converted' or v_inquiry.converted_client_id is null then
    raise exception 'inquiry must be converted to a client first' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.pre_pwd_intake_requests
    where inquiry_id = p_inquiry_id and status = 'completed'
  ) then
    raise exception 'pre-PWD questionnaire already completed' using errcode = '22023';
  end if;

  v_actor := private.current_profile_id();
  update public.pre_pwd_intake_requests
  set status = 'revoked', revoked_at = now()
  where inquiry_id = p_inquiry_id and status in ('ready','sent');

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires := now() + make_interval(days => p_valid_days);

  insert into public.pre_pwd_intake_requests(
    id, inquiry_id, client_id, owner_trainer_id, token_hash, status,
    expires_at, created_by_profile_id
  ) values (
    v_request_id, p_inquiry_id, v_inquiry.converted_client_id, v_inquiry.owner_trainer_id,
    encode(digest(v_token, 'sha256'), 'hex'), 'ready', v_expires, v_actor
  );

  return jsonb_build_object(
    'requestId', v_request_id,
    'token', v_token,
    'expiresAt', v_expires,
    'status', 'ready'
  );
end;
$$;

create or replace function public.mark_pre_pwd_intake_sent(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_row public.pre_pwd_intake_requests%rowtype;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  select * into v_row from public.pre_pwd_intake_requests where id = p_request_id for update;
  if v_row.id is null then raise exception 'request not found' using errcode = 'P0002'; end if;
  if not private.is_trainer()
     or v_row.owner_trainer_id <> private.current_profile_id()
     or not private.trainer_can_access_client(v_row.client_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;
  if v_row.status = 'ready' then
    update public.pre_pwd_intake_requests
      set status = 'sent', sent_at = now()
      where id = p_request_id;
  elsif v_row.status <> 'sent' then
    raise exception 'only a ready questionnaire can be marked sent' using errcode = '22023';
  end if;
  return jsonb_build_object('requestId', p_request_id, 'status', 'sent');
end;
$$;

create or replace function public.submit_pre_pwd_intake(
  p_token text,
  p_payload jsonb,
  p_privacy_notice_version text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_request public.pre_pwd_intake_requests%rowtype;
  v_token_hash text;
  v_goal text;
  v_why text;
  v_expectations text;
  v_symptoms text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid or expired questionnaire link' using errcode = '22023';
  end if;
  if p_privacy_notice_version is distinct from 'pre-pwd-v1' then
    raise exception 'privacy notice acceptance required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 12000 then
    raise exception 'invalid questionnaire payload' using errcode = '22023';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_request
    from public.pre_pwd_intake_requests
    where token_hash = v_token_hash
    for update;

  if v_request.id is null
     or v_request.status not in ('ready','sent')
     or v_request.expires_at <= now() then
    raise exception 'invalid or expired questionnaire link' using errcode = '22023';
  end if;

  v_goal := nullif(btrim(coalesce(p_payload ->> 'mainGoal', '')), '');
  v_why := nullif(btrim(coalesce(p_payload ->> 'whyNow', '')), '');
  v_expectations := nullif(btrim(coalesce(p_payload ->> 'firstVisitUseful', '')), '');
  v_symptoms := nullif(btrim(coalesce(p_payload ->> 'symptomsContext', '')), '');

  if v_goal is null or length(v_goal) > 1000 then
    raise exception 'main goal is required' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_each_text(p_payload) kv
    where length(kv.value) > 1500
  ) then
    raise exception 'questionnaire answer is too long' using errcode = '22023';
  end if;

  insert into public.client_intakes(
    client_id, source, raw_payload, main_goal, motivation, expectations, pain_areas
  ) values (
    v_request.client_id,
    'pre_pwd_questionnaire_v1',
    p_payload || jsonb_build_object(
      'privacyNoticeVersion', p_privacy_notice_version,
      'submittedAt', now(),
      'prePwdRequestId', v_request.id
    ),
    v_goal,
    v_why,
    v_expectations,
    v_symptoms
  );

  update public.pre_pwd_intake_requests
    set status = 'completed', completed_at = now()
    where id = v_request.id;

  return jsonb_build_object('ok', true, 'status', 'completed');
end;
$$;

revoke all on function public.create_pre_pwd_intake_request(uuid, integer) from public, anon, authenticated;
revoke all on function public.mark_pre_pwd_intake_sent(uuid) from public, anon, authenticated;
revoke all on function public.submit_pre_pwd_intake(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_pre_pwd_intake_request(uuid, integer) to authenticated;
grant execute on function public.mark_pre_pwd_intake_sent(uuid) to authenticated;
grant execute on function public.submit_pre_pwd_intake(text, jsonb, text) to anon, authenticated;

commit;
