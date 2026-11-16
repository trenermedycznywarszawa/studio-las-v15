-- Only isolated Supabase QA yipsjvbgxdmdicijxcph.
-- Purpose: persistent but disposable synthetic rows for REAL signed-JWT browser/API test.
-- No PWD, clients' health information, passwords, Auth mutations or RLS changes.
-- Run as admin SQL once; after the test execute qa_http_boundary_cleanup.sql.
BEGIN;
DO $qa$
DECLARE
  t uuid;
  a uuid;
  b uuid;
BEGIN
  IF current_user <> 'postgres'
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
        WHERE name = 'qa_20261114180429_first_guidance_pwd_gate') <> 1
    OR (SELECT count(*) FROM auth.users) <> 3
    OR (SELECT count(*) FROM public.profiles) <> 3
    OR (SELECT count(*) FROM public.clients) <> 0
    OR (SELECT count(*) FROM public.client_users) <> 0
    OR (SELECT count(*) FROM auth.mfa_factors WHERE status='verified') <> 1
    OR (SELECT count(*) FROM public.questionnaire_assignments) <> 0
    OR EXISTS (SELECT 1 FROM auth.users WHERE lower(coalesce(email,'')) NOT IN
      ('attention.trainer@example.test','qa.client@example.test','qa.foreign@example.test'))
  THEN
    RAISE EXCEPTION 'BLOCKED: wrong target, QA migration or baseline';
  END IF;
  SELECT p.id INTO STRICT t FROM public.profiles p JOIN auth.users u ON p.auth_user_id=u.id
    WHERE lower(u.email)='attention.trainer@example.test' AND p.role='trainer';
  SELECT p.id INTO STRICT a FROM public.profiles p JOIN auth.users u ON p.auth_user_id=u.id
    WHERE lower(u.email)='qa.client@example.test' AND p.role='client';
  SELECT p.id INTO STRICT b FROM public.profiles p JOIN auth.users u ON p.auth_user_id=u.id
    WHERE lower(u.email)='qa.foreign@example.test' AND p.role='client';

  INSERT INTO public.clients
    (id,owner_trainer_id,name,goal,working_hypothesis,status,stage)
    VALUES
    ('a7300000-0000-4000-8000-000000000001',t,'TestA QA','[QA] Test dostępu A','[QA] PRIVATE-TRAINER-A','active',1),
    ('b7300000-0000-4000-8000-000000000002',t,'TestB QA','[QA] Test dostępu B','[QA] PRIVATE-TRAINER-B','active',1);
  INSERT INTO public.client_users (client_id,user_id,status)
    VALUES
    ('a7300000-0000-4000-8000-000000000001',a,'active'),
    ('b7300000-0000-4000-8000-000000000002',b,'active');
  IF (SELECT count(*) FROM public.clients WHERE id IN
    ('a7300000-0000-4000-8000-000000000001','b7300000-0000-4000-8000-000000000002'))<>2
  THEN
    RAISE EXCEPTION 'FAIL: QA seed not complete';
  END IF;
END $qa$;
COMMIT;