-- Studio Las OS isolated QA — one-time synthetic profile binding.
-- Only AFTER three Supabase Auth users have been created by the supported
-- Dashboard/Auth Admin API with confirmed email. NEVER INSERT into auth.users.
-- Run only via an explicitly selected disposable QA project, never prod/staging.
-- No real email, health data, credentials, or service-role secrets belong here.
--
-- Required accounts (example.test is a reserved testing domain):
--   attention.trainer@example.test       / trainer
--   qa.client@example.test               / client
--   qa.foreign@example.test              / client (access separation test)
--
-- RAISE on any existing non-synthetic account, wrong roles or missing users.
-- It creates only public.profiles; no clients, plans, reports or sessions.
DO $qa$
DECLARE
  v_user_count integer;
  v_verified integer;
  v_profile_count integer;
BEGIN
  SELECT count(*) INTO v_user_count FROM auth.users;
  IF v_user_count <> 3 OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) NOT IN (
      'attention.trainer@example.test',
      'qa.client@example.test',
      'qa.foreign@example.test'
    )
  ) THEN
    RAISE EXCEPTION 'BLOCKED: disposable QA requires exactly three allowlisted synthetic Auth users';
  END IF;

  SELECT count(*) INTO v_verified FROM auth.users
  WHERE email_confirmed_at IS NOT NULL
    AND lower(email) IN (
      'attention.trainer@example.test',
      'qa.client@example.test',
      'qa.foreign@example.test'
    );
  IF v_verified <> 3 THEN
    RAISE EXCEPTION 'BLOCKED: all three QA Auth email identities must be confirmed';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clients LIMIT 1)
      OR EXISTS (SELECT 1 FROM public.profiles
                 WHERE email IS DISTINCT FROM 'attention.trainer@example.test'
                   AND email IS DISTINCT FROM 'qa.client@example.test'
                   AND email IS DISTINCT FROM 'qa.foreign@example.test') THEN
    RAISE EXCEPTION 'BLOCKED: expected empty disposable QA profile/client baseline';
  END IF;

  INSERT INTO public.profiles (auth_user_id, role, display_name, email)
  SELECT u.id,
    CASE WHEN lower(u.email) = 'attention.trainer@example.test' THEN 'trainer' ELSE 'client' END,
    CASE lower(u.email)
      WHEN 'attention.trainer@example.test' THEN '[QA] Trener'
      WHEN 'qa.client@example.test' THEN '[QA] Klient'
      ELSE '[QA] Klient obcy'
    END,
    lower(u.email)
  FROM auth.users u
  WHERE lower(u.email) IN (
    'attention.trainer@example.test',
    'qa.client@example.test',
    'qa.foreign@example.test'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  SELECT count(*) INTO v_profile_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE (lower(u.email) = 'attention.trainer@example.test' AND p.role = 'trainer'
         AND p.email = 'attention.trainer@example.test')
     OR (lower(u.email) IN ('qa.client@example.test', 'qa.foreign@example.test')
         AND p.role = 'client' AND p.email = lower(u.email));
  IF v_profile_count <> 3 OR (SELECT count(*) FROM public.profiles) <> 3 THEN
    RAISE EXCEPTION 'BLOCKED: synthetic roles or identities are inconsistent';
  END IF;
END
$qa$;
