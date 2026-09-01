-- Stage 2 hardening: a closed inquiry may be reopened only by saving a new explicit trainer decision.
-- Operational contact-state updates must not silently invalidate a terminal decision.

begin;

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
  if v_inquiry.inquiry_status = 'closed' and not p_close_inquiry then
    raise exception 'closed inquiry requires a new trainer decision to reopen' using errcode = '22023';
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

revoke all on function public.set_inquiry_contact_state(uuid, text, text, timestamptz, boolean) from public, anon;
grant execute on function public.set_inquiry_contact_state(uuid, text, text, timestamptz, boolean) to authenticated;

commit;
