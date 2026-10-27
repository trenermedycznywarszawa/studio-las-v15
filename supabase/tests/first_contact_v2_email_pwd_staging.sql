-- Staging-only integration/business-logic test.
-- Uses synthetic client data and simulated JWT claims, NOT a real authenticated browser flow.
-- All writes are rolled back. Do not run on production.
begin;
update private.inquiry_ingress_config set enabled=true where singleton=true;

do $test$
declare
  result jsonb;
  inquiry_id uuid;
  owner_auth uuid;
  other_auth uuid;
  client_id uuid;
  final_email text;
  final_phone text;
  denied boolean;
begin
  select p.auth_user_id into owner_auth
  from private.inquiry_ingress_config c
  join public.profiles p on p.id=c.owner_trainer_id
  where c.singleton=true and p.role='trainer';
  if owner_auth is null then
    raise exception 'staging ingress trainer not configured';
  end if;

  result:=public.ingest_public_inquiry_v2(
    'studio-las-e2e-email-to-pwd-001',repeat('9',64),'Osoba Syntetyczna',
    null,'fixture-e2e@example.com','email',null,
    array['weight_figure','start_or_return']::text[],null,
    'first-contact-v2','public-ingress-v1','first-contact-consent-v1');
  if result->>'status'<>'created' then
    raise exception 'synthetic email-only inquiry was not created';
  end if;
  select id into inquiry_id from public.inquiries
  where source_request_key='studio-las-e2e-email-to-pwd-001';

  -- Simulate an AAL1 owner; this checks RPC's explicit guard, not an Auth session.
  perform set_config('request.jwt.claims',jsonb_build_object(
    'sub',owner_auth::text,'aal','aal1','role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',owner_auth::text,true);
  denied:=false;
  begin
    perform public.save_inquiry_decision(
      inquiry_id,'PWD','Lepsza kondycja',null,'Prowadzenie ruchu',
      'Zgodne ze świadomym celem klienta',null,'arrange_pwd',null);
  exception when sqlstate '42501' then denied:=true;
  end;
  if not denied then raise exception 'AAL1 was incorrectly accepted'; end if;

  -- Simulate a second trainer's AAL2 identity; owner check must deny mutation.
  select p.auth_user_id into other_auth from public.profiles p
  where p.role='trainer' and p.auth_user_id<>owner_auth
    and p.auth_user_id is not null limit 1;
  if other_auth is null then
    raise exception 'a second staging trainer profile is required for this test';
  end if;
  perform set_config('request.jwt.claims',jsonb_build_object(
    'sub',other_auth::text,'aal','aal2','role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',other_auth::text,true);
  denied:=false;
  begin
    perform public.save_inquiry_decision(
      inquiry_id,'PWD','Lepsza kondycja',null,'Prowadzenie ruchu',
      'Zgodne ze świadomym celem klienta',null,'arrange_pwd',null);
  exception when sqlstate '42501' then denied:=true;
  end;
  if not denied then raise exception 'cross-owner decision accepted'; end if;

  -- Simulated owner AAL2: trainer qualifies the lead and creates a PWD client.
  perform set_config('request.jwt.claims',jsonb_build_object(
    'sub',owner_auth::text,'aal','aal2','role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',owner_auth::text,true);
  result:=public.save_inquiry_decision(
    inquiry_id,'PWD','Chcę odzyskać kondycję',null,'Nieregularny ruch',
    'Umawiamy rozmowę i PWD',null,'arrange_pwd',null);
  if result->>'decisionVersion'<>'1' then
    raise exception 'trainer decision version incorrect';
  end if;
  result:=public.convert_inquiry_to_pwd_client(inquiry_id);
  if result->>'alreadyConverted'<>'false' then
    raise exception 'PWD conversion returned unexpected state';
  end if;
  client_id:=(result->>'clientId')::uuid;
  select email,phone into final_email,final_phone
  from public.clients where id=client_id;
  if final_email<>'fixture-e2e@example.com' or final_phone is not null then
    raise exception 'converted client lost email-only contact data';
  end if;
end $test$;

select 'PASS: email-only to PWD; simulated owner MFA and cross-trainer rejection' as outcome;
rollback;

-- Post-check:
-- select count(*) from public.inquiries where source_request_key='studio-las-e2e-email-to-pwd-001'; -- 0
-- The real authenticated trainer UI and HTTP permissions require separate E2E testing.
