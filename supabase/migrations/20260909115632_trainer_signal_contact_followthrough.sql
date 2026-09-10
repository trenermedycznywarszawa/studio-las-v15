begin;
alter table public.trainer_signal_reviews
 add column contact_resolved_at timestamptz,
 add column contact_resolved_by uuid references public.profiles(id) on delete restrict,
 add column contact_resolution_note text,
 add constraint signal_contact_resolution_complete check (
  (contact_resolved_at is null and contact_resolved_by is null and contact_resolution_note is null)
  or (outcome='contact_required' and contact_resolved_at is not null and contact_resolved_by is not null
      and contact_resolution_note is not null and length(btrim(contact_resolution_note)) between 1 and 1000));
create index trainer_signal_contact_actor_idx on public.trainer_signal_reviews(contact_resolved_by) where contact_resolved_by is not null;
create function private.guard_signal_contact_resolution() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if tg_op='INSERT' then
  if new.contact_resolved_at is not null or new.contact_resolved_by is not null or new.contact_resolution_note is not null then
   raise exception 'contact completion requires controlled operation' using errcode='42501';
  end if;
 elsif current_user<>pg_get_userbyid((select relowner from pg_class where oid='public.trainer_signal_reviews'::regclass)) then
  raise exception 'review updates require controlled operation' using errcode='42501';
 elsif old.contact_resolved_at is not null or old.outcome<>'contact_required'
  or (to_jsonb(new)-array['contact_resolved_at','contact_resolved_by','contact_resolution_note'])
    is distinct from (to_jsonb(old)-array['contact_resolved_at','contact_resolved_by','contact_resolution_note']) then
  raise exception 'original review and completed contact are immutable' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function private.guard_signal_contact_resolution() from public,anon,authenticated;
create trigger signal_contact_guard before insert or update on public.trainer_signal_reviews
for each row execute function private.guard_signal_contact_resolution();
create function public.resolve_trainer_signal_contact(p_review_id uuid,p_note text)
returns public.trainer_signal_reviews language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare r public.trainer_signal_reviews%rowtype;
begin
 select * into r from public.trainer_signal_reviews where id=p_review_id for update;
 if not found then raise exception 'review unavailable' using errcode='P0002'; end if;
 perform private.require_trainer_aal2_for_guidance(r.client_id);
 if r.outcome<>'contact_required' then raise exception 'review does not require contact' using errcode='22023'; end if;
 if r.contact_resolved_at is not null then return r; end if;
 if nullif(btrim(p_note),'') is null or length(btrim(p_note))>1000 then
  raise exception 'contact outcome note required' using errcode='22023';
 end if;
 update public.trainer_signal_reviews set contact_resolved_at=now(),contact_resolved_by=private.current_profile_id(),contact_resolution_note=btrim(p_note)
 where id=r.id returning * into r;
 return r;
end $$;
revoke all on function public.resolve_trainer_signal_contact(uuid,text) from public,anon;
grant execute on function public.resolve_trainer_signal_contact(uuid,text) to authenticated;
comment on column public.trainer_signal_reviews.signal_key is 'New keys include exact source record/revision. Legacy coarse keys remain historical and are not backfilled onto ambiguous observations.';
commit;
