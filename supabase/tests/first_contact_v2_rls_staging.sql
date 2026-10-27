-- Studio Las: staging-only RLS isolation test (synthetic data, no persistent writes).
BEGIN;
UPDATE private.inquiry_ingress_config SET enabled=true WHERE singleton=true;
DO $setup$
DECLARE result jsonb;
BEGIN
 result:=public.ingest_public_inquiry_v2(
 'rls-fixture-cross-tenant-20261026',repeat('8',64),'Test Dostepu',
 NULL,'rls-fixture@example.com','email',NULL,array['weight_figure']::text[],
 NULL,'first-contact-v2','public-ingress-v1','first-contact-consent-v1');
 IF result->>'status'<>'created' THEN RAISE EXCEPTION 'Fixture not created: %',result;END IF;
 IF (SELECT count(*) FROM public.inquiries WHERE source_request_key='rls-fixture-cross-tenant-20261026')<>1
 THEN RAISE EXCEPTION 'Fixture absent';END IF;
END $setup$;
-- Owner with MFA is permitted to read.
SELECT set_config('request.jwt.claim.sub',p.auth_user_id::text,true),
 set_config('request.jwt.claims',jsonb_build_object('sub',p.auth_user_id::text,'aal','aal2','role','authenticated')::text,true)
FROM public.profiles p JOIN private.inquiry_ingress_config c ON p.id=c.owner_trainer_id WHERE c.singleton=true;
SET LOCAL ROLE authenticated;
DO $assert$
BEGIN
 IF (SELECT count(*) FROM public.inquiries WHERE source_request_key='rls-fixture-cross-tenant-20261026')<>1
 THEN RAISE EXCEPTION 'Owner AAL2 unable to read own inquiry';END IF;
END $assert$;
RESET ROLE;
-- Other trainer with MFA cannot read owner inquiry.
SELECT set_config('request.jwt.claim.sub',p.auth_user_id::text,true),
 set_config('request.jwt.claims',jsonb_build_object('sub',p.auth_user_id::text,'aal','aal2','role','authenticated')::text,true)
FROM public.profiles p CROSS JOIN private.inquiry_ingress_config c
WHERE c.singleton=true AND p.role='trainer' AND p.id<>c.owner_trainer_id
AND p.auth_user_id IS NOT NULL ORDER BY p.id LIMIT 1;
SET LOCAL ROLE authenticated;
DO $assert$
BEGIN
 IF (SELECT count(*) FROM public.inquiries WHERE source_request_key='rls-fixture-cross-tenant-20261026')<>0
 THEN RAISE EXCEPTION 'Other trainer can see owner inquiry';END IF;
END $assert$;
RESET ROLE;
-- Owner without MFA cannot read.
SELECT set_config('request.jwt.claim.sub',p.auth_user_id::text,true),
 set_config('request.jwt.claims',jsonb_build_object('sub',p.auth_user_id::text,'aal','aal1','role','authenticated')::text,true)
FROM public.profiles p JOIN private.inquiry_ingress_config c ON p.id=c.owner_trainer_id WHERE c.singleton=true;
SET LOCAL ROLE authenticated;
DO $assert$
BEGIN
 IF (SELECT count(*) FROM public.inquiries WHERE source_request_key='rls-fixture-cross-tenant-20261026')<>0
 THEN RAISE EXCEPTION 'Owner AAL1 can read inquiry';END IF;
END $assert$;
RESET ROLE;
-- A client cannot read the still-existing synthetic trainer inquiry, even with AAL2.
DO $identity$
DECLARE client_auth uuid;
BEGIN
 SELECT auth_user_id INTO client_auth FROM public.profiles
 WHERE role='client' AND auth_user_id IS NOT NULL ORDER BY id LIMIT 1;
 IF client_auth IS NULL THEN RAISE EXCEPTION 'Client fixture identity required'; END IF;
 PERFORM set_config('request.jwt.claim.sub',client_auth::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',client_auth::text,'aal','aal2','role','authenticated')::text,true);
END $identity$;
SET LOCAL ROLE authenticated;
DO $assert$
BEGIN
 IF EXISTS(SELECT 1 FROM public.inquiries WHERE source_request_key='rls-fixture-cross-tenant-20261026')
 THEN RAISE EXCEPTION 'Client can read trainer inquiry'; END IF;
 IF has_function_privilege('authenticated','public.ingest_public_inquiry_v2(text,text,text,text,text,text,text,text[],text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'V2 ingestion exposed to authenticated'; END IF;
END $assert$;
RESET ROLE;
SELECT 'PASS: owner AAL2 read; other-trainer AAL2, client AAL2 and owner AAL1 denied; v2 RPC restricted' AS result;
ROLLBACK;
