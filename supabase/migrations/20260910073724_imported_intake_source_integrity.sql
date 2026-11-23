-- Preserve imported client source evidence; normalized trainer fields remain mutable.
begin;
create function private.guard_imported_intake_source() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if tg_op='DELETE' then
  if old.raw_payload <> '{}'::jsonb then
   raise exception 'imported source evidence cannot be deleted by the application' using errcode='23514';
  end if;
  return old;
 end if;
 if new.id is distinct from old.id or new.client_id is distinct from old.client_id then
  raise exception 'intake identity is immutable' using errcode='23514';
 end if;
 if old.raw_payload <> '{}'::jsonb and
  row(new.raw_payload,new.source,new.legacy_id,new.imported_at,new.created_at,new.deleted_at)
  is distinct from row(old.raw_payload,old.source,old.legacy_id,old.imported_at,old.created_at,old.deleted_at) then
  raise exception 'imported source is immutable; record clarification separately in trainer fields' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function private.guard_imported_intake_source() from public,anon,authenticated;
create trigger imported_intake_source_guard before update or delete on public.client_intakes
for each row execute function private.guard_imported_intake_source();
comment on function private.guard_imported_intake_source() is 'Freezes nonempty imported originals and attribution, without treating normalized trainer fields as original client statements. Privileged retention actions require an explicit maintenance process.';
commit;
