-- TEST HARNESS ONLY: no application authorization substitutes in deployment.
-- Reconstructs SQL on standalone PostgreSQL, not an Auth/Storage service emulator.
do $$ begin if current_database() not like 'studio_las_rebuild_%' then raise exception 'Disposable rebuild database required'; end if; if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; end $$;
do $$ begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
do $$ begin if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$;
create schema auth;
create table auth.users(id uuid primary key, email text);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
create function auth.role() returns text language sql stable as $$select auth.jwt()->>'role'$$;
grant usage on schema auth to anon,authenticated,service_role;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
alter table storage.objects enable row level security;
grant usage on schema public,storage to anon,authenticated,service_role;
grant all on storage.objects to authenticated,service_role;
alter default privileges in schema public grant all on tables to service_role;

