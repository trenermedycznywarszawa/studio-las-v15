-- STAGING ONLY. All synthetic writes and the temporary ingress enablement are rolled back.
-- Run on the active STAGING database with sufficient DB privileges; never on production.
begin;
update private.inquiry_ingress_config set enabled = true where singleton = true;
do $test$
declare
  got jsonb;
  row_record public.inquiries%rowtype;
  rejected boolean;
begin
  got := public.ingest_public_inquiry_v2(
    'fixture-studio-las-phone-v2-01',repeat('1',64),'Test Telefon',
    '600123456',null,'phone','before_12',array['start_or_return','weight_figure']::text[],
    null,'first-contact-v2','public-ingress-v1','first-contact-consent-v1');
  if got->>'status'<>'created' then raise exception 'phone rejected'; end if;
  select * into row_record from public.inquiries where source_request_key='fixture-studio-las-phone-v2-01';
  if row_record.contact_method<>'phone' or row_record.preferred_contact_window<>'Przed 12:00'
     or cardinality(row_record.broad_goals)<>2 then raise exception 'phone stored incorrectly'; end if;

  got := public.ingest_public_inquiry_v2(
    'fixture-studio-las-sms-v2-02',repeat('2',64),'Test SMS',
    '600123456',null,'sms',null,array['other_or_unsure']::text[],
    null,'first-contact-v2','public-ingress-v1','first-contact-consent-v1');
  if got->>'status'<>'created' then raise exception 'sms rejected'; end if;

  got := public.ingest_public_inquiry_v2(
    'fixture-studio-las-email-v2-03',repeat('3',64),'Test Email',
    null,'fixture@example.com','email',null,array[]::text[],
    null,'first-contact-v2','public-ingress-v1','first-contact-consent-v1');
  if got->>'status'<>'created' then raise exception 'email rejected'; end if;
  select * into row_record from public.inquiries where source_request_key='fixture-studio-las-email-v2-03';
  if row_record.submitted_phone is not null or row_record.contact_method<>'email'
     or row_record.broad_goal<>'Nie określono celu' then raise exception 'email stored incorrectly'; end if;

  got := public.ingest_public_inquiry_v2(
    'fixture-studio-las-email-v2-03',repeat('3',64),'Test Email',
    null,'fixture@example.com','email',null,array[]::text[],
    null,'first-contact-v2','public-ingress-v1','first-contact-consent-v1');
  if got->>'status'<>'duplicate' then raise exception 'duplicate request inserted'; end if;

  got := public.ingest_public_inquiry(
    'fixture-studio-las-v1-legacy-04',repeat('4',64),'Test Legacy',
    '600123456',null,'16:00–18:00','Siła i kondycja po przerwie',
    null,'first-contact-v1','public-ingress-v1','first-contact-consent-v1');
  if got->>'status'<>'created' then raise exception 'v1 regression'; end if;

  rejected:=false;
  begin
    perform public.ingest_public_inquiry_v2(
      'fixture-studio-las-invalid-05',repeat('5',64),'Test Invalid',
      '600123456','both@example.com','email',null,array[]::text[],
      null,'first-contact-v2','public-ingress-v1','first-contact-consent-v1');
  exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'email with phone accepted'; end if;
  rejected:=false;
  begin
    perform public.ingest_public_inquiry_v2(
      'fixture-studio-las-invalid-06',repeat('6',64),'Test Invalid',
      '600123456',null,'phone','before_12',array['invalid_goal']::text[],
      null,'first-contact-v2','public-ingress-v1','first-contact-consent-v1');
  exception when sqlstate '22023' then rejected:=true; end;
  if not rejected then raise exception 'unknown goal accepted'; end if;
end
$test$;
select 'PASS: v2 phone, SMS, email, multiple/empty goals, idempotency, v1, invalid requests' as outcome;
rollback;
-- Independently verify:
-- select enabled from private.inquiry_ingress_config where singleton = true; -- should be false
-- select count(*) from public.inquiries where source_request_key like 'fixture-studio-las-%'; -- should be 0
