-- Stage 2 production successor: pre-client inquiry -> human call -> trainer decision -> explicit conversion.
-- Reconstructed from the canonical staging migration already applied under this exact version.
-- This migration does not implement the public-form cutover; Formspree remains production transport.

begin;

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  owner_trainer_id uuid not null references public.profiles(id) on delete restrict,
  source_channel text not null,
  source_version text not null,
  form_version text not null,
  source_request_key text not null,
  submitted_name text not null,
  submitted_phone text not null,
  submitted_email text,
  preferred_contact_window text not null,
  broad_goal text not null,
  person_words text,
  privacy_notice_version text not null,
  inquiry_status text not null default 'open',
  contact_status text not null default 'pending',
  next_action_type text,
  next_action_at timestamptz,
  closed_at timestamptz,
  closed_by_profile_id uuid references public.profiles(id) on delete restrict,
  converted_client_id uuid unique references public.clients(id) on delete restrict,
  converted_at timestamptz,
  converted_by_profile_id uuid references public.profiles(id) on delete restrict,
  retention_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inquiries_source_channel_check
    check (source_channel in ('public_first_contact', 'staging_fixture')),
  constraint inquiries_source_version_check
    check (length(btrim(source_version)) between 1 and 64),
  constraint inquiries_form_version_check
    check (length(btrim(form_version)) between 1 and 64),
  constraint inquiries_source_request_key_check
    check (length(btrim(source_request_key)) between 12 and 128),
  constraint inquiries_submitted_name_check
    check (length(btrim(submitted_name)) between 1 and 120),
  constraint inquiries_submitted_phone_check
    check (length(btrim(submitted_phone)) between 5 and 32),
  constraint inquiries_submitted_email_check
    check (
      submitted_email is null
      or (
        length(btrim(submitted_email)) between 3 and 320
        and submitted_email = lower(btrim(submitted_email))
        and position('@' in submitted_email) > 1
      )
    ),
  constraint inquiries_contact_window_check
    check (preferred_contact_window in (
      '16:00–18:00',
      '18:00–20:00',
      '20:00–22:00',
      'Najpierw napisz SMS i ustalmy termin',
      'Inny termin — ustalimy wiadomością'
    )),
  constraint inquiries_broad_goal_check
    check (broad_goal in (
      'Swobodniejsze poruszanie się na co dzień',
      'Powrót do aktywności lub sportu',
      'Siła i kondycja po przerwie',
      'Większa pewność w ruchu',
      'Chcę najpierw porozmawiać'
    )),
  constraint inquiries_person_words_check
    check (person_words is null or length(btrim(person_words)) between 1 and 280),
  constraint inquiries_privacy_version_check
    check (length(btrim(privacy_notice_version)) between 1 and 64),
  constraint inquiries_status_check
    check (inquiry_status in ('open', 'converted', 'closed')),
  constraint inquiries_contact_status_check
    check (contact_status in ('pending', 'contacting', 'completed', 'unreachable')),
  constraint inquiries_next_action_type_check
    check (
      next_action_type is null
      or next_action_type in ('contact_call', 'contact_message', 'arrange_pwd', 'follow_up', 'referral')
    ),
  constraint inquiries_next_action_pair_check
    check (next_action_type is not null or next_action_at is null),
  constraint inquiries_closed_state_check
    check (
      (inquiry_status = 'closed' and closed_at is not null and closed_by_profile_id is not null)
      or (inquiry_status <> 'closed' and closed_at is null and closed_by_profile_id is null)
    ),
  constraint inquiries_converted_state_check
    check (
      (
        inquiry_status = 'converted'
        and converted_client_id is not null
        and converted_at is not null
        and converted_by_profile_id is not null
      )
      or (
        inquiry_status <> 'converted'
        and converted_client_id is null
        and converted_at is null
        and converted_by_profile_id is null
      )
    ),
  constraint inquiries_source_request_unique unique (source_channel, source_request_key)
);

create table public.inquiry_decisions (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete restrict,
  decision_version integer not null,
  decision text not null,
  goal_in_person_words text not null,
  why_now text,
  current_barrier text not null,
  rationale text not null,
  boundary_note text,
  next_action_type text,
  next_action_at timestamptz,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  evidence_source_version text not null,
  evidence_form_version text not null,
  supersedes_decision_id uuid unique references public.inquiry_decisions(id) on delete restrict,
  decision_status text not null default 'active',
  superseded_at timestamptz,
  created_at timestamptz not null default now(),

  constraint inquiry_decisions_version_check check (decision_version > 0),
  constraint inquiry_decisions_value_check
    check (decision in ('PWD', 'FOLLOW_UP', 'NOT_NOW', 'REFERRED', 'NOT_A_FIT', 'CLOSED_BY_PERSON')),
  constraint inquiry_decisions_goal_check
    check (length(btrim(goal_in_person_words)) between 1 and 500),
  constraint inquiry_decisions_why_now_check
    check (why_now is null or length(btrim(why_now)) between 1 and 500),
  constraint inquiry_decisions_barrier_check
    check (length(btrim(current_barrier)) between 1 and 500),
  constraint inquiry_decisions_rationale_check
    check (length(btrim(rationale)) between 1 and 1000),
  constraint inquiry_decisions_boundary_check
    check (boundary_note is null or length(btrim(boundary_note)) between 1 and 500),
  constraint inquiry_decisions_next_action_check
    check (
      next_action_type is null
      or next_action_type in ('contact_call', 'contact_message', 'arrange_pwd', 'follow_up', 'referral')
    ),
  constraint inquiry_decisions_next_action_pair_check
    check (next_action_type is not null or next_action_at is null),
  constraint inquiry_decisions_source_version_check
    check (length(btrim(evidence_source_version)) between 1 and 64),
  constraint inquiry_decisions_form_version_check
    check (length(btrim(evidence_form_version)) between 1 and 64),
  constraint inquiry_decisions_status_check
    check (decision_status in ('active', 'superseded')),
  constraint inquiry_decisions_superseded_state_check
    check (
      (decision_status = 'active' and superseded_at is null)
      or (decision_status = 'superseded' and superseded_at is not null)
    ),
  constraint inquiry_decisions_unique_version unique (inquiry_id, decision_version)
);

create index inquiries_owner_open_idx
  on public.inquiries(owner_trainer_id, created_at desc)
  where inquiry_status = 'open';

create index inquiry_decisions_inquiry_history_idx
  on public.inquiry_decisions(inquiry_id, decision_version desc);

create unique index inquiry_decisions_one_active_idx
  on public.inquiry_decisions(inquiry_id)
  where decision_status = 'active';

create trigger set_inquiries_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();

create trigger audit_sensitive_row_change
after insert or update or delete on public.inquiries
for each row execute function public.audit_sensitive_row_change();

create trigger audit_sensitive_row_change
after insert or update or delete on public.inquiry_decisions
for each row execute function public.audit_sensitive_row_change();

create or replace function private.trainer_owns_inquiry(p_inquiry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.inquiries i
    where auth.uid() is not null
      and private.is_trainer()
      and i.id = p_inquiry_id
      and i.owner_trainer_id = private.current_profile_id()
  );
$$;

revoke all on function private.trainer_owns_inquiry(uuid) from public, anon;
grant execute on function private.trainer_owns_inquiry(uuid) to authenticated;

alter table public.inquiries enable row level security;
alter table public.inquiries force row level security;
alter table public.inquiry_decisions enable row level security;
alter table public.inquiry_decisions force row level security;

create policy inquiries_owner_select
on public.inquiries
for select
to authenticated
using (private.is_trainer() and owner_trainer_id = private.current_profile_id());

create policy inquiries_trainer_aal2_gate
on public.inquiries
as restrictive
for all
to authenticated
using (private.trainer_mfa_satisfied())
with check (private.trainer_mfa_satisfied());

create policy inquiry_decisions_owner_select
on public.inquiry_decisions
for select
to authenticated
using (private.trainer_owns_inquiry(inquiry_id));

create policy inquiry_decisions_trainer_aal2_gate
on public.inquiry_decisions
as restrictive
for all
to authenticated
using (private.trainer_mfa_satisfied())
with check (private.trainer_mfa_satisfied());

revoke all on table public.inquiries from public, anon, authenticated;
revoke all on table public.inquiry_decisions from public, anon, authenticated;
grant select on table public.inquiries to authenticated;
grant select on table public.inquiry_decisions to authenticated;

create or replace function public.set_inquiry_contact_state(
  p_inquiry_id uuid,
  p_contact_status text,
  p_next_action_type text default null,
  p_next_action_at timestamptz default null,
  p_close_inquiry boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_inquiry public.inquiries%rowtype;
  v_actor_profile_id uuid;
  v_next_action_type text := nullif(btrim(coalesce(p_next_action_type, '')), '');
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if auth.uid() is null or not private.is_trainer() or not private.trainer_owns_inquiry(p_inquiry_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;
  if p_contact_status not in ('pending', 'contacting', 'completed', 'unreachable') then
    raise exception 'invalid inquiry contact status' using errcode = '22023';
  end if;
  if v_next_action_type is not null and v_next_action_type not in (
    'contact_call', 'contact_message', 'arrange_pwd', 'follow_up', 'referral'
  ) then
    raise exception 'invalid inquiry next action' using errcode = '22023';
  end if;
  if v_next_action_type is null and p_next_action_at is not null then
    raise exception 'next action type required for due time' using errcode = '22023';
  end if;

  select * into v_inquiry
  from public.inquiries
  where id = p_inquiry_id
  for update;

  if v_inquiry.id is null then
    raise exception 'inquiry not found' using errcode = 'P0002';
  end if;
  if v_inquiry.inquiry_status = 'converted' then
    raise exception 'converted inquiry is immutable' using errcode = '22023';
  end if;

  v_actor_profile_id := private.current_profile_id();
  update public.inquiries
  set contact_status = p_contact_status,
      next_action_type = v_next_action_type,
      next_action_at = p_next_action_at,
      inquiry_status = case when p_close_inquiry then 'closed' else 'open' end,
      closed_at = case when p_close_inquiry then now() else null end,
      closed_by_profile_id = case when p_close_inquiry then v_actor_profile_id else null end
  where id = p_inquiry_id;

  return jsonb_build_object(
    'inquiryId', p_inquiry_id,
    'contactStatus', p_contact_status,
    'inquiryStatus', case when p_close_inquiry then 'closed' else 'open' end
  );
end;
$$;

create or replace function public.save_inquiry_decision(
  p_inquiry_id uuid,
  p_decision text,
  p_goal_in_person_words text,
  p_why_now text,
  p_current_barrier text,
  p_rationale text,
  p_boundary_note text default null,
  p_next_action_type text default null,
  p_next_action_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_inquiry public.inquiries%rowtype;
  v_previous public.inquiry_decisions%rowtype;
  v_decision_id uuid := gen_random_uuid();
  v_actor_profile_id uuid;
  v_version integer;
  v_goal text := nullif(btrim(coalesce(p_goal_in_person_words, '')), '');
  v_why_now text := nullif(btrim(coalesce(p_why_now, '')), '');
  v_barrier text := nullif(btrim(coalesce(p_current_barrier, '')), '');
  v_rationale text := nullif(btrim(coalesce(p_rationale, '')), '');
  v_boundary text := nullif(btrim(coalesce(p_boundary_note, '')), '');
  v_next_action_type text := nullif(btrim(coalesce(p_next_action_type, '')), '');
  v_close boolean;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if auth.uid() is null or not private.is_trainer() or not private.trainer_owns_inquiry(p_inquiry_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;
  if p_decision not in ('PWD', 'FOLLOW_UP', 'NOT_NOW', 'REFERRED', 'NOT_A_FIT', 'CLOSED_BY_PERSON') then
    raise exception 'explicit allowed inquiry decision required' using errcode = '22023';
  end if;
  if v_goal is null or length(v_goal) > 500 or v_barrier is null or length(v_barrier) > 500
     or v_rationale is null or length(v_rationale) > 1000 then
    raise exception 'goal, current barrier, and short rationale are required' using errcode = '22023';
  end if;
  if (v_why_now is not null and length(v_why_now) > 500)
     or (v_boundary is not null and length(v_boundary) > 500) then
    raise exception 'decision memo field is too long' using errcode = '22023';
  end if;
  if v_next_action_type is not null and v_next_action_type not in (
    'contact_call', 'contact_message', 'arrange_pwd', 'follow_up', 'referral'
  ) then
    raise exception 'invalid inquiry next action' using errcode = '22023';
  end if;
  if v_next_action_type is null and p_next_action_at is not null then
    raise exception 'next action type required for due time' using errcode = '22023';
  end if;
  if p_decision = 'PWD' and v_next_action_type is distinct from 'arrange_pwd' then
    raise exception 'PWD decision requires arrange_pwd next action' using errcode = '22023';
  end if;
  if p_decision = 'FOLLOW_UP'
     and (v_next_action_type not in ('contact_call', 'contact_message', 'follow_up') or p_next_action_at is null) then
    raise exception 'FOLLOW_UP requires an agreed action and time' using errcode = '22023';
  end if;
  if p_decision = 'REFERRED' and (v_boundary is null or v_next_action_type is distinct from 'referral') then
    raise exception 'REFERRED requires a boundary note and referral action' using errcode = '22023';
  end if;

  select * into v_inquiry
  from public.inquiries
  where id = p_inquiry_id
  for update;

  if v_inquiry.id is null then
    raise exception 'inquiry not found' using errcode = 'P0002';
  end if;
  if v_inquiry.inquiry_status = 'converted' then
    raise exception 'converted inquiry cannot receive a new decision' using errcode = '22023';
  end if;

  select * into v_previous
  from public.inquiry_decisions
  where inquiry_id = p_inquiry_id and decision_status = 'active'
  for update;

  v_version := coalesce(v_previous.decision_version, 0) + 1;
  if v_previous.id is not null then
    update public.inquiry_decisions
    set decision_status = 'superseded', superseded_at = now()
    where id = v_previous.id;
  end if;

  v_actor_profile_id := private.current_profile_id();
  insert into public.inquiry_decisions (
    id, inquiry_id, decision_version, decision, goal_in_person_words, why_now,
    current_barrier, rationale, boundary_note, next_action_type, next_action_at,
    actor_profile_id, evidence_source_version, evidence_form_version, supersedes_decision_id
  ) values (
    v_decision_id, p_inquiry_id, v_version, p_decision, v_goal, v_why_now,
    v_barrier, v_rationale, v_boundary, v_next_action_type, p_next_action_at,
    v_actor_profile_id, v_inquiry.source_version, v_inquiry.form_version, v_previous.id
  );

  v_close := p_decision in ('NOT_NOW', 'REFERRED', 'NOT_A_FIT', 'CLOSED_BY_PERSON');
  update public.inquiries
  set contact_status = 'completed',
      next_action_type = v_next_action_type,
      next_action_at = p_next_action_at,
      inquiry_status = case when v_close then 'closed' else 'open' end,
      closed_at = case when v_close then now() else null end,
      closed_by_profile_id = case when v_close then v_actor_profile_id else null end
  where id = p_inquiry_id;

  return jsonb_build_object(
    'decisionId', v_decision_id,
    'decisionVersion', v_version,
    'inquiryStatus', case when v_close then 'closed' else 'open' end
  );
end;
$$;

create or replace function public.convert_inquiry_to_pwd_client(p_inquiry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_inquiry public.inquiries%rowtype;
  v_decision public.inquiry_decisions%rowtype;
  v_actor_profile_id uuid;
  v_client_id uuid;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;
  if auth.uid() is null or not private.is_trainer() or not private.trainer_owns_inquiry(p_inquiry_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;

  select * into v_inquiry
  from public.inquiries
  where id = p_inquiry_id
  for update;

  if v_inquiry.id is null then
    raise exception 'inquiry not found' using errcode = 'P0002';
  end if;
  if v_inquiry.inquiry_status = 'converted' then
    return jsonb_build_object(
      'clientId', v_inquiry.converted_client_id,
      'inquiryId', v_inquiry.id,
      'alreadyConverted', true
    );
  end if;
  if v_inquiry.inquiry_status <> 'open' or v_inquiry.contact_status <> 'completed' then
    raise exception 'open completed inquiry required for conversion' using errcode = '22023';
  end if;

  select * into v_decision
  from public.inquiry_decisions
  where inquiry_id = p_inquiry_id and decision_status = 'active'
  for update;

  if v_decision.id is null
     or v_decision.decision <> 'PWD'
     or v_decision.next_action_type <> 'arrange_pwd' then
    raise exception 'active agreed PWD decision required for conversion' using errcode = '22023';
  end if;
  if v_decision.evidence_source_version <> v_inquiry.source_version
     or v_decision.evidence_form_version <> v_inquiry.form_version then
    raise exception 'decision evidence version is stale' using errcode = '22023';
  end if;

  v_actor_profile_id := private.current_profile_id();
  insert into public.clients (
    owner_trainer_id, name, email, phone, contact, package, engagement_type, stage, status
  ) values (
    v_actor_profile_id,
    btrim(v_inquiry.submitted_name),
    nullif(lower(btrim(coalesce(v_inquiry.submitted_email, ''))), ''),
    btrim(v_inquiry.submitted_phone),
    null,
    null,
    'diagnostic_visit',
    1,
    'active'
  ) returning id into v_client_id;

  update public.inquiries
  set inquiry_status = 'converted',
      next_action_type = null,
      next_action_at = null,
      converted_client_id = v_client_id,
      converted_at = now(),
      converted_by_profile_id = v_actor_profile_id,
      closed_at = null,
      closed_by_profile_id = null
  where id = p_inquiry_id;

  return jsonb_build_object(
    'clientId', v_client_id,
    'inquiryId', p_inquiry_id,
    'alreadyConverted', false
  );
end;
$$;

revoke all on function public.set_inquiry_contact_state(uuid, text, text, timestamptz, boolean) from public, anon;
revoke all on function public.save_inquiry_decision(uuid, text, text, text, text, text, text, text, timestamptz) from public, anon;
revoke all on function public.convert_inquiry_to_pwd_client(uuid) from public, anon;

grant execute on function public.set_inquiry_contact_state(uuid, text, text, timestamptz, boolean) to authenticated;
grant execute on function public.save_inquiry_decision(uuid, text, text, text, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.convert_inquiry_to_pwd_client(uuid) to authenticated;

comment on table public.inquiries is
  'Pre-client first-contact episodes. Not a CRM pipeline and not client clinical/process data.';
comment on table public.inquiry_decisions is
  'Append-only/versioned trainer decision history for first-contact inquiries.';
comment on function public.convert_inquiry_to_pwd_client(uuid) is
  'Explicit AAL2 owner-trainer conversion of one eligible PWD inquiry into exactly one existing clients row; no PWD findings, guidance, account invitation, or publication side effects.';

commit;
