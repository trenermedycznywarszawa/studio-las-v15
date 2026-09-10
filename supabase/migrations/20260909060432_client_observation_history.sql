-- Preserve original observations; additions never replace source payloads.
begin;
create function private.guard_client_observation() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if tg_op='INSERT' then
  if new.kind in ('client_checkin','daily_step') and current_user<>pg_get_userbyid((select relowner from pg_class where oid='public.guidance_events'::regclass)) then
   raise exception 'client observations require the client response operation' using errcode='42501';
  end if;
  return new;
 end if;
 if old.kind in ('client_checkin','daily_step') then
  raise exception 'original client observation is immutable; append an attributed correction' using errcode='23514';
 end if;
 if tg_op='UPDATE' and new.kind in ('client_checkin','daily_step') then
  raise exception 'trainer interpretation cannot become a client observation' using errcode='23514';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.guard_client_observation() from public,anon,authenticated;
create trigger guidance_observation_guard before insert or update or delete on public.guidance_events
for each row execute function private.guard_client_observation();

create table public.guidance_observation_notes (
 id uuid primary key default gen_random_uuid(),
 observation_id uuid not null references public.guidance_events(id) on delete restrict,
 kind text not null check(kind in ('correction','trainer_interpretation')),
 body text not null check(length(btrim(body)) between 1 and 2000),
 reason text check(length(btrim(reason)) between 1 and 500),
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 check(kind<>'correction' or nullif(btrim(reason),'') is not null)
);
create index guidance_observation_notes_source_idx on public.guidance_observation_notes(observation_id,created_at,id);
create index guidance_observation_notes_actor_idx on public.guidance_observation_notes(created_by);
alter table public.guidance_observation_notes enable row level security;
revoke all on public.guidance_observation_notes from public,anon,authenticated;
grant select on public.guidance_observation_notes to authenticated;
create policy observation_notes_owner_read on public.guidance_observation_notes for select to authenticated
using (private.trainer_mfa_satisfied() and exists(select 1 from public.guidance_events e
 where e.id=observation_id and private.trainer_owns_client(e.client_id)));

create function private.guard_observation_note() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin raise exception 'observation additions are immutable; append a new clarification' using errcode='23514'; end $$;
revoke all on function private.guard_observation_note() from public,anon,authenticated;
create trigger observation_note_guard before update or delete on public.guidance_observation_notes
for each row execute function private.guard_observation_note();

create function public.add_guidance_observation_note(p_observation_id uuid,p_kind text,p_body text,p_reason text default null)
returns public.guidance_observation_notes language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare source public.guidance_events%rowtype; result public.guidance_observation_notes%rowtype;
begin
 select * into source from public.guidance_events where id=p_observation_id;
 if not found then raise exception 'observation unavailable' using errcode='P0002'; end if;
 perform private.require_trainer_aal2_for_guidance(source.client_id);
 if source.kind not in ('client_checkin','daily_step') then
  raise exception 'original client observation required' using errcode='22023';
 end if;
 insert into public.guidance_observation_notes(observation_id,kind,body,reason,created_by)
 values(source.id,p_kind,btrim(p_body),nullif(btrim(p_reason),''),private.current_profile_id()) returning * into result;
 return result;
end $$;
revoke all on function public.add_guidance_observation_note(uuid,text,text,text) from public,anon;
grant execute on function public.add_guidance_observation_note(uuid,text,text,text) to authenticated;
comment on table public.guidance_observation_notes is 'Attributed additions to immutable client statements. Correction and trainer interpretation remain separate from original evidence; never automatically substituted into client material.';
commit;
