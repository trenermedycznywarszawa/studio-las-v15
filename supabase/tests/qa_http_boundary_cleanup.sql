-- Only isolated Supabase QA yipsjvbgxdmdicijxcph.
-- Delete only the two allowlisted synthetic test clients and an optional
-- blocked-write probe. NEVER DELETE Auth identities or global fixtures.
-- Transaction is fail-closed if any non-test client or unexpected association exists.
BEGIN;
DO $qa$
DECLARE
  n integer;
BEGIN
  IF current_user <> 'postgres'
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
        WHERE name='qa_20261114180429_first_guidance_pwd_gate') <> 1
    OR (SELECT count(*) FROM auth.users) <> 3
    OR EXISTS (SELECT 1 FROM auth.users WHERE lower(coalesce(email,'')) NOT IN
      ('attention.trainer@example.test','qa.client@example.test','qa.foreign@example.test'))
    OR EXISTS (SELECT 1 FROM public.clients WHERE id NOT IN
      ('a7300000-0000-4000-8000-000000000001',
       'b7300000-0000-4000-8000-000000000002',
       'c7300000-0000-4000-8000-000000000003'))
    OR EXISTS (SELECT 1 FROM public.clients
       WHERE id='a7300000-0000-4000-8000-000000000001'
         AND name<>'TestA QA')
    OR EXISTS (SELECT 1 FROM public.clients
       WHERE id='b7300000-0000-4000-8000-000000000002'
         AND name<>'TestB QA')
    OR EXISTS (SELECT 1 FROM public.clients
       WHERE id='c7300000-0000-4000-8000-000000000003'
         AND name<>'AAL1 blocked QA')
    OR EXISTS (SELECT 1 FROM public.questionnaire_assignments)
  THEN
    RAISE EXCEPTION 'BLOCKED: cleanup target/baseline differs; stop for manual QA inspection';
  END IF;
  -- Cascade removes only memberships and other references to these
  -- disposable client records. Never delete anything broader than explicit IDs.
  DELETE FROM public.clients WHERE id IN
    ('a7300000-0000-4000-8000-000000000001',
     'b7300000-0000-4000-8000-000000000002',
     'c7300000-0000-4000-8000-000000000003');
  SELECT count(*) INTO n FROM public.clients;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: QA cleanup left client rows'; END IF;
END $qa$;
COMMIT;