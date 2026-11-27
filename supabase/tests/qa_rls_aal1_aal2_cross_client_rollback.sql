-- Studio Las OS: isolated QA, simulated-JWT database-level security assertions.
-- Execute ONLY via Supabase SQL targeted to disposable QA yipsjvbgxdmdicijxcph.
-- This is NOT an HTTP/JWT signature verification or browser E2E test.
-- BEGIN/ROLLBACK guarantees transient fixture records and audit trigger writes are reverted.
-- No changes to Auth, RLS definitions, migrations, security settings, or real data.
BEGIN;

DO $qa_security_test$
DECLARE
  v_trainer_auth uuid;
  v_client_a_auth uuid;
  v_client_b_auth uuid;
  v_trainer_profile uuid;
  v_client_a_profile uuid;
  v_client_b_profile uuid;
  v_a uuid := 'a7300000-0000-4000-8000-000000000001';
  v_b uuid := 'b7300000-0000-4000-8000-000000000002';
  v_attempt uuid := 'c7300000-0000-4000-8000-000000000003';
  v_visible integer;
  v_updated integer;
  v_denied boolean;
  v_snapshot jsonb;
BEGIN
  -- Fail closed unless the exact isolated synthetic QA baseline exists.
  IF current_user <> 'postgres'
    OR (SELECT count(*) FROM auth.users) <> 3
    OR (SELECT count(*) FROM public.profiles) <> 3
    OR (SELECT count(*) FROM public.clients) <> 0
    OR (SELECT count(*) FROM public.client_users) <> 0
    OR EXISTS (
      SELECT 1 FROM auth.users WHERE lower(coalesce(email,'')) NOT IN
      ('attention.trainer@example.test','qa.client@example.test','qa.foreign@example.test')
    ) THEN
    RAISE EXCEPTION 'BLOCKED: isolated QA baseline is not exactly as expected';
  END IF;

  SELECT u.id,p.id INTO STRICT v_trainer_auth,v_trainer_profile
    FROM auth.users u JOIN public.profiles p ON p.auth_user_id=u.id
    WHERE lower(u.email)='attention.trainer@example.test' AND p.role='trainer';
  SELECT u.id,p.id INTO STRICT v_client_a_auth,v_client_a_profile
    FROM auth.users u JOIN public.profiles p ON p.auth_user_id=u.id
    WHERE lower(u.email)='qa.client@example.test' AND p.role='client';
  SELECT u.id,p.id INTO STRICT v_client_b_auth,v_client_b_profile
    FROM auth.users u JOIN public.profiles p ON p.auth_user_id=u.id
    WHERE lower(u.email)='qa.foreign@example.test' AND p.role='client';

  INSERT INTO public.clients (id,owner_trainer_id,name,goal,working_hypothesis)
    VALUES
    (v_a,v_trainer_profile,'TestA QA','[QA] Cel wyłącznie syntetyczny','[QA] POUFNA NOTATKA TEST A'),
    (v_b,v_trainer_profile,'TestB QA','[QA] Cel wyłącznie syntetyczny','[QA] POUFNA NOTATKA TEST B');
  INSERT INTO public.client_users (client_id,user_id,status)
    VALUES (v_a,v_client_a_profile,'active'),(v_b,v_client_b_profile,'active');

  -- Test 1: trainer with AAL1 cannot read or INSERT into protected clients table.
  PERFORM set_config('request.jwt.claims',jsonb_build_object(
    'sub',v_trainer_auth::text,'role','authenticated','aal','aal1')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF current_user <> 'authenticated' OR auth.uid() IS DISTINCT FROM v_trainer_auth
     OR (auth.jwt()->>'aal') IS DISTINCT FROM 'aal1' THEN
    RAISE EXCEPTION 'FAIL: simulated AAL1 role/JWT invalid';
  END IF;
  SELECT count(*) INTO v_visible FROM public.clients WHERE id IN (v_a,v_b);
  IF v_visible <> 0 THEN
    RAISE EXCEPTION 'FAIL: trainer AAL1 can see % clients', v_visible;
  END IF;
  v_denied := false;
  BEGIN
    INSERT INTO public.clients (id,owner_trainer_id,name)
      VALUES (v_attempt,v_trainer_profile,'AAL1 blocked');
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'FAIL: trainer AAL1 INSERT unexpectedly succeeded';
  END IF;

  -- Positive control: same trainer with AAL2 sees the two owned QA clients.
  PERFORM set_config('request.jwt.claims',jsonb_build_object(
    'sub',v_trainer_auth::text,'role','authenticated','aal','aal2')::text,true);
  SELECT count(*) INTO v_visible FROM public.clients WHERE id IN (v_a,v_b);
  IF v_visible <> 2 THEN
    RAISE EXCEPTION 'FAIL: trainer AAL2 expected 2 clients, saw %', v_visible;
  END IF;

  -- Test 2A: client A sees only their own client_users mapping and own portal.
  PERFORM set_config('request.jwt.claims',jsonb_build_object(
    'sub',v_client_a_auth::text,'role','authenticated','aal','aal1')::text,true);
  IF auth.uid() IS DISTINCT FROM v_client_a_auth THEN
    RAISE EXCEPTION 'FAIL: client A simulated JWT invalid';
  END IF;
  SELECT count(*) INTO v_visible FROM public.client_users WHERE client_id IN (v_a,v_b);
  IF v_visible <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.client_users WHERE client_id=v_a AND user_id=v_client_a_profile
  ) THEN
    RAISE EXCEPTION 'FAIL: client A has wrong client_users visibility (%)',v_visible;
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients WHERE id IN (v_a,v_b)) THEN
    RAISE EXCEPTION 'FAIL: client A can read private clients table';
  END IF;
  v_snapshot:=public.client_portal_snapshot();
  IF v_snapshot->'client'->>'firstName' IS DISTINCT FROM 'TestA'
    OR v_snapshot::text LIKE '%TestB%'
    OR v_snapshot::text LIKE '%POUFNA NOTATKA%' THEN
    RAISE EXCEPTION 'FAIL: client A portal leaks cross-client or private notes';
  END IF;
  UPDATE public.client_users SET status='revoked' WHERE client_id=v_b;
  GET DIAGNOSTICS v_updated=ROW_COUNT;
  IF v_updated <> 0 THEN
    RAISE EXCEPTION 'FAIL: client A changed client B membership';
  END IF;

  -- Test 2B: client B receives their own distinct portal; cannot read client A.
  PERFORM set_config('request.jwt.claims',jsonb_build_object(
    'sub',v_client_b_auth::text,'role','authenticated','aal','aal1')::text,true);
  SELECT count(*) INTO v_visible FROM public.client_users WHERE client_id IN (v_a,v_b);
  IF v_visible <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.client_users WHERE client_id=v_b AND user_id=v_client_b_profile
  ) THEN
    RAISE EXCEPTION 'FAIL: client B has wrong client_users visibility (%)',v_visible;
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients WHERE id IN (v_a,v_b)) THEN
    RAISE EXCEPTION 'FAIL: client B can read private clients table';
  END IF;
  v_snapshot:=public.client_portal_snapshot();
  IF v_snapshot->'client'->>'firstName' IS DISTINCT FROM 'TestB'
    OR v_snapshot::text LIKE '%TestA%'
    OR v_snapshot::text LIKE '%POUFNA NOTATKA%' THEN
    RAISE EXCEPTION 'FAIL: client B portal leaks cross-client or private notes';
  END IF;
END
$qa_security_test$;

SELECT 'PASS: simulated trainer AAL1 denied, AAL2 positive; client A/B cross-client portal and membership isolated; ROLLBACK follows' AS test_result;
ROLLBACK;
