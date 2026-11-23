-- Studio Las OS - private client document storage
--
-- Documents containing health or process information must never be placed in a
-- public bucket. Object paths use the invariant:
--
--   <client_uuid>/<random_object_name>.pdf
--
-- Trainers may manage objects only for clients they can access. Clients may read
-- an object only when the related client_documents row has been explicitly
-- published to the client. Client upload, update, and delete are not allowed.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'studio-las-client-documents',
  'studio-las-client-documents',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_object_client_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_prefix text;
begin
  v_prefix := split_part(coalesce(p_name, ''), '/', 1);
  if v_prefix = '' then
    return null;
  end if;

  begin
    return v_prefix::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end;
$$;

create or replace function public.client_can_read_document_object(
  p_bucket_id text,
  p_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.client_documents d
    where p_bucket_id = 'studio-las-client-documents'
      and d.client_id = public.storage_object_client_id(p_name)
      and public.client_can_access_client(d.client_id)
      and d.storage_bucket = p_bucket_id
      and d.storage_path = p_name
      and d.audience = 'client'
      and d.status = 'published'
      and d.published_at is not null
      and d.deleted_at is null
  );
$$;

revoke all on function public.storage_object_client_id(text) from public, anon;
revoke all on function public.client_can_read_document_object(text, text) from public, anon;
grant execute on function public.storage_object_client_id(text) to authenticated;
grant execute on function public.client_can_read_document_object(text, text) to authenticated;

-- Remove any older policy variants before creating the canonical contract.
drop policy if exists studio_las_documents_trainer_select on storage.objects;
drop policy if exists studio_las_documents_trainer_insert on storage.objects;
drop policy if exists studio_las_documents_trainer_update on storage.objects;
drop policy if exists studio_las_documents_trainer_delete on storage.objects;
drop policy if exists studio_las_documents_client_select on storage.objects;

create policy studio_las_documents_trainer_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'studio-las-client-documents'
  and public.is_trainer()
  and public.trainer_can_access_client(public.storage_object_client_id(name))
);

create policy studio_las_documents_trainer_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'studio-las-client-documents'
  and public.is_trainer()
  and public.trainer_can_access_client(public.storage_object_client_id(name))
  and lower(name) like '%.pdf'
);

create policy studio_las_documents_trainer_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'studio-las-client-documents'
  and public.is_trainer()
  and public.trainer_can_access_client(public.storage_object_client_id(name))
)
with check (
  bucket_id = 'studio-las-client-documents'
  and public.is_trainer()
  and public.trainer_can_access_client(public.storage_object_client_id(name))
  and lower(name) like '%.pdf'
);

create policy studio_las_documents_trainer_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'studio-las-client-documents'
  and public.is_trainer()
  and public.trainer_can_access_client(public.storage_object_client_id(name))
);

create policy studio_las_documents_client_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'studio-las-client-documents'
  and public.is_client()
  and public.client_can_read_document_object(bucket_id, name)
);

comment on function public.client_can_read_document_object(text, text) is
  'Authorizes client reads only for explicitly published client_documents metadata in the private Studio Las bucket.';

commit;
