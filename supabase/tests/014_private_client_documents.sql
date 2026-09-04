-- Studio Las OS - private document storage policy tests
-- Run after migrations 001-014 in a disposable Supabase project.

begin;

do $$
declare
  bucket_public boolean;
  bucket_limit bigint;
  bucket_mimes text[];
  policy_count integer;
  function_definition text;
begin
  select public, file_size_limit, allowed_mime_types
  into bucket_public, bucket_limit, bucket_mimes
  from storage.buckets
  where id = 'studio-las-client-documents';

  if not found then
    raise exception 'FAIL: private Studio Las document bucket missing';
  end if;

  if bucket_public then
    raise exception 'FAIL: Studio Las document bucket is public';
  end if;

  if bucket_limit <> 10485760 then
    raise exception 'FAIL: unexpected document bucket size limit: %', bucket_limit;
  end if;

  if bucket_mimes <> array['application/pdf']::text[] then
    raise exception 'FAIL: document bucket accepts unexpected MIME types: %', bucket_mimes;
  end if;

  select count(*)
  into policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'studio_las_documents_trainer_select',
      'studio_las_documents_trainer_insert',
      'studio_las_documents_trainer_update',
      'studio_las_documents_trainer_delete',
      'studio_las_documents_client_select'
    );

  if policy_count <> 5 then
    raise exception 'FAIL: expected 5 canonical document storage policies, found %', policy_count;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'studio_las_documents_client_%'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) then
    raise exception 'FAIL: client has document storage write policy';
  end if;

  if has_function_privilege('anon', 'public.client_can_read_document_object(text,text)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute client document authorization helper';
  end if;

  select pg_get_functiondef(to_regprocedure('public.client_can_read_document_object(text,text)'))
  into function_definition;

  if function_definition not ilike '%audience = ''client''%'
     or function_definition not ilike '%status = ''published''%'
     or function_definition not ilike '%published_at is not null%'
     or function_definition not ilike '%client_can_access_client%' then
    raise exception 'FAIL: client document authorization helper lacks publication or ownership boundary';
  end if;
end;
$$;

select 'Studio Las OS private document storage tests completed' as result;

rollback;
