-- Studio Las OS - minimize exposed SECURITY DEFINER RPC surface
--
-- RLS and Storage require narrow privileged predicates, but those predicates are
-- implementation details rather than browser RPCs. Move the real functions to a
-- non-exposed private schema. Existing stored policy dependencies follow the
-- function OIDs. Non-executable SECURITY INVOKER wrappers preserve references in
-- previously defined function bodies without giving browser roles an endpoint.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.current_profile_id() set schema private;
alter function public.is_trainer() set schema private;
alter function public.is_client() set schema private;
alter function public.trainer_owns_client(uuid) set schema private;
alter function public.trainer_can_access_client(uuid) set schema private;
alter function public.client_can_access_client(uuid) set schema private;
alter function public.storage_object_client_id(text) set schema private;
alter function public.client_can_read_document_object(text, text) set schema private;

-- Preserve the policy/runtime grants on the moved functions explicitly.
revoke all on function private.current_profile_id() from public, anon;
revoke all on function private.is_trainer() from public, anon;
revoke all on function private.is_client() from public, anon;
revoke all on function private.trainer_owns_client(uuid) from public, anon;
revoke all on function private.trainer_can_access_client(uuid) from public, anon;
revoke all on function private.client_can_access_client(uuid) from public, anon;
revoke all on function private.storage_object_client_id(text) from public, anon;
revoke all on function private.client_can_read_document_object(text, text) from public, anon;

grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.is_trainer() to authenticated;
grant execute on function private.is_client() to authenticated;
grant execute on function private.trainer_owns_client(uuid) to authenticated;
grant execute on function private.trainer_can_access_client(uuid) to authenticated;
grant execute on function private.client_can_access_client(uuid) to authenticated;
grant execute on function private.storage_object_client_id(text) to authenticated;
grant execute on function private.client_can_read_document_object(text, text) to authenticated;

-- Compatibility names used inside existing SECURITY DEFINER RPC bodies. These
-- wrappers are not executable by browser roles and are SECURITY INVOKER, so they
-- are not privileged endpoints.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.current_profile_id(); $$;

create or replace function public.is_trainer()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_trainer(); $$;

create or replace function public.is_client()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_client(); $$;

create or replace function public.trainer_owns_client(p_client_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.trainer_owns_client(p_client_id); $$;

create or replace function public.trainer_can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.trainer_can_access_client(p_client_id); $$;

create or replace function public.client_can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.client_can_access_client(p_client_id); $$;

create or replace function public.storage_object_client_id(p_name text)
returns uuid
language sql
immutable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.storage_object_client_id(p_name); $$;

create or replace function public.client_can_read_document_object(p_bucket_id text, p_name text)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.client_can_read_document_object(p_bucket_id, p_name); $$;

revoke all on function public.current_profile_id() from public, anon, authenticated;
revoke all on function public.is_trainer() from public, anon, authenticated;
revoke all on function public.is_client() from public, anon, authenticated;
revoke all on function public.trainer_owns_client(uuid) from public, anon, authenticated;
revoke all on function public.trainer_can_access_client(uuid) from public, anon, authenticated;
revoke all on function public.client_can_access_client(uuid) from public, anon, authenticated;
revoke all on function public.storage_object_client_id(text) from public, anon, authenticated;
revoke all on function public.client_can_read_document_object(text, text) from public, anon, authenticated;

-- Trigger functions should also pin search_path even when they are not SECURITY
-- DEFINER, so object resolution cannot be changed by a caller-controlled path.
alter function public.set_updated_at() set search_path = pg_catalog, public;

comment on schema private is
  'Internal Studio Las authorization helpers. This schema must not be added to PostgREST exposed schemas.';

commit;
