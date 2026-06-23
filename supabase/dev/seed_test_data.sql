-- Studio Las OS 9.0 - development fixtures
-- Fake data only. Do not use real client data in this file.
--
-- Intended order:
--   1. migrations/001_initial_schema.sql
--   2. migrations/002_rls_policies.sql
--   3. migrations/003_client_safe_views.sql
--   4. dev/seed_test_data.sql

begin;

create or replace function pg_temp.seed_auth_user(p_id uuid, p_email text)
returns void
language plpgsql
as $$
declare
  cols text[] := array['id'];
  vals text[] := array[quote_literal(p_id)];
  updates text[] := array[]::text[];
  insert_sql text;
begin
  if to_regclass('auth.users') is null then
    raise exception 'auth.users table is required. Run this seed against a Supabase database.';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'instance_id') then
    cols := cols || array['instance_id'];
    vals := vals || array[quote_literal('00000000-0000-0000-0000-000000000000')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'aud') then
    cols := cols || array['aud'];
    vals := vals || array[quote_literal('authenticated')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'role') then
    cols := cols || array['role'];
    vals := vals || array[quote_literal('authenticated')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email') then
    cols := cols || array['email'];
    vals := vals || array[quote_literal(p_email)];
    updates := updates || array['email = excluded.email'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'encrypted_password') then
    cols := cols || array['encrypted_password'];
    vals := vals || array[quote_literal('$2a$10$devfixturedevfixturedevfixturedevfixturedevfixturedev')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at') then
    cols := cols || array['email_confirmed_at'];
    vals := vals || array['now()'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'created_at') then
    cols := cols || array['created_at'];
    vals := vals || array['now()'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'updated_at') then
    cols := cols || array['updated_at'];
    vals := vals || array['now()'];
    updates := updates || array['updated_at = now()'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_app_meta_data') then
    cols := cols || array['raw_app_meta_data'];
    vals := vals || array[quote_literal('{"provider":"email","providers":["email"]}') || '::jsonb'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_user_meta_data') then
    cols := cols || array['raw_user_meta_data'];
    vals := vals || array['jsonb_build_object(''email'', ' || quote_literal(p_email) || ')'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_super_admin') then
    cols := cols || array['is_super_admin'];
    vals := vals || array['false'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'confirmation_token') then
    cols := cols || array['confirmation_token'];
    vals := vals || array[quote_literal('')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'recovery_token') then
    cols := cols || array['recovery_token'];
    vals := vals || array[quote_literal('')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change_token_new') then
    cols := cols || array['email_change_token_new'];
    vals := vals || array[quote_literal('')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change') then
    cols := cols || array['email_change'];
    vals := vals || array[quote_literal('')];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change_confirm_status') then
    cols := cols || array['email_change_confirm_status'];
    vals := vals || array['0'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_sso_user') then
    cols := cols || array['is_sso_user'];
    vals := vals || array['false'];
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous') then
    cols := cols || array['is_anonymous'];
    vals := vals || array['false'];
  end if;

  if array_length(updates, 1) is null then
    updates := array['id = excluded.id'];
  end if;

  insert_sql := format(
    'insert into auth.users (%s) values (%s) on conflict (id) do update set %s',
    (select string_agg(quote_ident(col_name), ', ') from unnest(cols) as u(col_name)),
    array_to_string(vals, ', '),
    array_to_string(updates, ', ')
  );

  execute insert_sql;
end;
$$;

select pg_temp.seed_auth_user('aaaaaaaa-0000-4000-8000-000000000001', 'trainer.a@example.test');
select pg_temp.seed_auth_user('bbbbbbbb-0000-4000-8000-000000000002', 'trainer.b@example.test');
select pg_temp.seed_auth_user('cccccccc-0000-4000-8000-000000000003', 'client.a@example.test');
select pg_temp.seed_auth_user('dddddddd-0000-4000-8000-000000000004', 'client.b@example.test');
select pg_temp.seed_auth_user('eeeeeeee-0000-4000-8000-000000000005', 'client.empty@example.test');

insert into public.profiles (id, auth_user_id, role, display_name, email)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'trainer', 'Trainer A', 'trainer.a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-0000-4000-8000-000000000002', 'trainer', 'Trainer B', 'trainer.b@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'cccccccc-0000-4000-8000-000000000003', 'client', 'Client A', 'client.a@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'dddddddd-0000-4000-8000-000000000004', 'client', 'Client B', 'client.b@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'eeeeeeee-0000-4000-8000-000000000005', 'client', 'Client Empty', 'client.empty@example.test')
on conflict (id) do update set
  role = excluded.role,
  display_name = excluded.display_name,
  email = excluded.email,
  updated_at = now();

insert into public.clients (
  id, legacy_id, owner_trainer_id, name, email, stage, start_date, next_session_date,
  goal, contraindications, red_flags_text, working_hypothesis, status, deleted_at
)
values
  (
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_client_a',
    '11111111-1111-4111-8111-111111111111',
    'Fixture Client A',
    'client.a@example.test',
    2,
    date '2026-01-10',
    date '2026-07-01',
    'Move with confidence',
    'trainer-only contraindication A',
    'trainer-only red flag A',
    'trainer-only working hypothesis A',
    'active',
    null
  ),
  (
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'fixture_client_b',
    '22222222-2222-4222-8222-222222222222',
    'Fixture Client B',
    'client.b@example.test',
    3,
    date '2026-02-11',
    date '2026-07-02',
    'Build steady capacity',
    'trainer-only contraindication B',
    'trainer-only red flag B',
    'trainer-only working hypothesis B',
    'active',
    null
  ),
  (
    'cccccccc-3333-4333-8333-ccccccccccc3',
    'fixture_client_empty',
    '11111111-1111-4111-8111-111111111111',
    'Fixture Client Without Published Data',
    'client.empty@example.test',
    1,
    date '2026-03-12',
    null,
    'Start calmly',
    'trainer-only contraindication empty',
    'trainer-only red flag empty',
    'trainer-only working hypothesis empty',
    'active',
    null
  )
on conflict (id) do update set
  owner_trainer_id = excluded.owner_trainer_id,
  name = excluded.name,
  email = excluded.email,
  stage = excluded.stage,
  goal = excluded.goal,
  contraindications = excluded.contraindications,
  red_flags_text = excluded.red_flags_text,
  working_hypothesis = excluded.working_hypothesis,
  status = excluded.status,
  deleted_at = excluded.deleted_at,
  updated_at = now();

insert into public.client_trainers (id, client_id, trainer_id, role)
values
  ('11000000-0000-4000-8000-000000000001', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'primary'),
  ('22000000-0000-4000-8000-000000000002', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', 'primary'),
  ('33000000-0000-4000-8000-000000000003', 'cccccccc-3333-4333-8333-ccccccccccc3', '11111111-1111-4111-8111-111111111111', 'primary')
on conflict (id) do update set role = excluded.role, updated_at = now();

insert into public.client_users (id, client_id, user_id, status)
values
  ('31000000-0000-4000-8000-000000000001', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1', '33333333-3333-4333-8333-333333333333', 'active'),
  ('42000000-0000-4000-8000-000000000002', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2', '44444444-4444-4444-8444-444444444444', 'active'),
  ('53000000-0000-4000-8000-000000000003', 'cccccccc-3333-4333-8333-ccccccccccc3', '55555555-5555-4555-8555-555555555555', 'active')
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.client_access_credentials (id, client_id, code_hash, code_updated_at, revoked_at)
values
  ('91000000-0000-4000-8000-000000000001', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1', 'dev-only-hash-a', now(), null),
  ('92000000-0000-4000-8000-000000000002', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2', 'dev-only-hash-b', now(), null)
on conflict (id) do update set code_hash = excluded.code_hash, code_updated_at = excluded.code_updated_at, revoked_at = excluded.revoked_at, updated_at = now();

insert into public.client_intakes (
  id, client_id, legacy_id, imported_at, raw_payload, summary, main_goal,
  medical_flags, movement_limitations, risk_level, trainer_notes, deleted_at
)
values
  (
    'a0100000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_intake_a',
    now(),
    '{"fixture":"intake_a","private":true}'::jsonb,
    'Private intake summary A',
    'Private goal A',
    array['private medical flag A'],
    array['private limitation A'],
    'medium',
    'trainer-only intake note A',
    null
  ),
  (
    'b0100000-0000-4000-8000-000000000002',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'fixture_intake_b',
    now(),
    '{"fixture":"intake_b","private":true}'::jsonb,
    'Private intake summary B',
    'Private goal B',
    array['private medical flag B'],
    array['private limitation B'],
    'low',
    'trainer-only intake note B',
    null
  )
on conflict (id) do update set raw_payload = excluded.raw_payload, trainer_notes = excluded.trainer_notes, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.sessions (
  id, client_id, legacy_id, date, readiness, vas_before, vas_after, sleep_quality,
  trainer_observation, trainer_decision, milestone, client_summary, client_next_step,
  client_visible, published_at, deleted_at
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_session_a_visible',
    date '2026-06-01',
    7,
    2,
    1,
    'ok',
    'trainer-only session observation A',
    'trainer-only session decision A',
    'Stable first progression',
    'Client-safe session summary A',
    'Repeat calm daily step',
    true,
    now(),
    null
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_session_a_deleted',
    date '2026-06-02',
    6,
    3,
    2,
    'poor',
    'deleted trainer observation A',
    'deleted trainer decision A',
    null,
    null,
    null,
    true,
    now(),
    now()
  ),
  (
    'b1000000-0000-4000-8000-000000000003',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'fixture_session_b_visible',
    date '2026-06-03',
    8,
    1,
    1,
    'good',
    'trainer-only session observation B',
    'trainer-only session decision B',
    'Capacity block',
    'Client-safe session summary B',
    'Keep weekly rhythm',
    true,
    now(),
    null
  )
on conflict (id) do update set trainer_observation = excluded.trainer_observation, trainer_decision = excluded.trainer_decision, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.client_documents (
  id, client_id, related_table, related_id, kind, original_name, storage_bucket, storage_path,
  mime_type, size_bytes, audience, status, published_at, deleted_at
)
values
  (
    'a2000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'body_measurements',
    null,
    'tanita_pdf',
    'fixture-tanita-a.pdf',
    'client-documents',
    'fixtures/client-a/tanita-a.pdf',
    'application/pdf',
    1024,
    'client',
    'published',
    now(),
    null
  ),
  (
    'a2000000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    null,
    null,
    'trainer_note_attachment',
    'trainer-only-a.pdf',
    'client-documents',
    'fixtures/client-a/trainer-only-a.pdf',
    'application/pdf',
    2048,
    'trainer',
    'published',
    now(),
    null
  ),
  (
    'a2000000-0000-4000-8000-000000000003',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    null,
    null,
    'draft',
    'draft-a.pdf',
    'client-documents',
    'fixtures/client-a/draft-a.pdf',
    'application/pdf',
    512,
    'client',
    'draft',
    null,
    null
  ),
  (
    'b2000000-0000-4000-8000-000000000004',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    null,
    null,
    'client_pdf',
    'fixture-client-b.pdf',
    'client-documents',
    'fixtures/client-b/client-b.pdf',
    'application/pdf',
    1024,
    'client',
    'published',
    now(),
    null
  )
on conflict (id) do update set audience = excluded.audience, status = excluded.status, published_at = excluded.published_at, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.body_measurements (
  id, client_id, legacy_id, measured_at, source, input_method, parse_status,
  weight_kg, fat_percent, muscle_mass_kg, body_water_percent, visceral_fat_rating, bmi,
  trainer_interpretation, client_summary, document_id, client_visible, published_at, deleted_at
)
values
  (
    'a3000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_body_a_visible',
    date '2026-06-04',
    'Tanita',
    'pdf',
    'success',
    72.50,
    22.10,
    52.30,
    55.20,
    7.0,
    23.20,
    'trainer-only body interpretation A',
    'Client-safe body summary A',
    'a2000000-0000-4000-8000-000000000001',
    true,
    now(),
    null
  ),
  (
    'a3000000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_body_a_draft',
    date '2026-06-05',
    'Tanita',
    'manual',
    'not_attempted',
    72.00,
    22.00,
    52.00,
    55.00,
    7.0,
    23.00,
    'draft trainer-only body interpretation A',
    'Draft body summary A',
    null,
    true,
    null,
    null
  ),
  (
    'a3000000-0000-4000-8000-000000000003',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_body_a_trainer_only',
    date '2026-06-06',
    'Tanita',
    'manual',
    'success',
    71.80,
    21.80,
    52.10,
    55.40,
    7.0,
    22.90,
    'trainer-only unpublished interpretation A',
    'Trainer-only body summary A',
    null,
    false,
    now(),
    null
  ),
  (
    'a3000000-0000-4000-8000-000000000004',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_body_a_deleted',
    date '2026-06-07',
    'Tanita',
    'manual',
    'success',
    71.70,
    21.70,
    52.20,
    55.50,
    7.0,
    22.80,
    'deleted trainer-only interpretation A',
    'Deleted body summary A',
    null,
    true,
    now(),
    now()
  ),
  (
    'b3000000-0000-4000-8000-000000000005',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'fixture_body_b_visible',
    date '2026-06-08',
    'Tanita',
    'manual',
    'success',
    80.10,
    24.00,
    56.00,
    53.00,
    8.0,
    24.50,
    'trainer-only body interpretation B',
    'Client-safe body summary B',
    null,
    true,
    now(),
    null
  )
on conflict (id) do update set client_visible = excluded.client_visible, published_at = excluded.published_at, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.training_load_observations (
  id, client_id, session_id, legacy_id, observed_at, source, session_type,
  duration_min, hr_avg, hr_max, zone_light_min, zone_moderate_min, zone_high_min,
  rpe, trainer_note, client_summary, load_decision, client_visible, published_at, deleted_at
)
values
  (
    'a4000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'a1000000-0000-4000-8000-000000000001',
    'fixture_training_a_visible',
    date '2026-06-09',
    'Polar',
    'strength',
    45,
    118,
    162,
    20,
    18,
    7,
    6,
    'trainer-only training note A',
    'Client-safe training summary A',
    'utrzymaj',
    true,
    now(),
    null
  ),
  (
    'a4000000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    null,
    'fixture_training_a_draft',
    date '2026-06-10',
    'Polar',
    'conditioning',
    30,
    112,
    150,
    15,
    10,
    5,
    5,
    'draft trainer-only training note A',
    'Draft training summary A',
    'utrzymaj',
    true,
    null,
    null
  ),
  (
    'a4000000-0000-4000-8000-000000000003',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    null,
    'fixture_training_a_trainer_only',
    date '2026-06-11',
    'Polar',
    'recovery',
    25,
    100,
    130,
    22,
    3,
    0,
    3,
    'trainer-only hidden training note A',
    'Trainer-only training summary A',
    'obserwuj',
    false,
    now(),
    null
  ),
  (
    'a4000000-0000-4000-8000-000000000004',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    null,
    'fixture_training_a_deleted',
    date '2026-06-12',
    'Polar',
    'strength',
    40,
    120,
    160,
    20,
    15,
    5,
    6,
    'deleted trainer-only training note A',
    'Deleted training summary A',
    'utrzymaj',
    true,
    now(),
    now()
  ),
  (
    'b4000000-0000-4000-8000-000000000005',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'b1000000-0000-4000-8000-000000000003',
    'fixture_training_b_visible',
    date '2026-06-13',
    'Polar',
    'strength',
    50,
    122,
    166,
    22,
    20,
    8,
    6,
    'trainer-only training note B',
    'Client-safe training summary B',
    'utrzymaj',
    true,
    now(),
    null
  )
on conflict (id) do update set client_visible = excluded.client_visible, published_at = excluded.published_at, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.assessment_results (
  id, client_id, legacy_id, test_id, test_name, performed_at, side, result_text,
  pain_before, pain_after, quality, interpretation, trainer_decision, next_step,
  trainer_note, client_summary, client_visible, published_at, deleted_at
)
values
  (
    'a5000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_assessment_a_visible',
    'squat',
    'Squat Pattern',
    date '2026-06-14',
    'obie',
    'Stable',
    1,
    1,
    'dobrze tolerowane',
    'trainer-only assessment interpretation A',
    'utrzymaj',
    'Continue',
    'trainer-only assessment note A',
    'Client-safe assessment summary A',
    true,
    now(),
    null
  ),
  (
    'b5000000-0000-4000-8000-000000000002',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'fixture_assessment_b_visible',
    'hinge',
    'Hinge Pattern',
    date '2026-06-15',
    'obie',
    'Stable',
    1,
    1,
    'do obserwacji',
    'trainer-only assessment interpretation B',
    'obserwuj',
    'Observe',
    'trainer-only assessment note B',
    'Client-safe assessment summary B',
    true,
    now(),
    null
  )
on conflict (id) do update set client_visible = excluded.client_visible, published_at = excluded.published_at, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.exercises (
  id, legacy_id, owner_trainer_id, name, category, region, dosage_default,
  client_instruction, coach_notes, stop_criteria, video_url, quality_status, deleted_at
)
values
  (
    'e1000000-0000-4000-8000-000000000001',
    'fixture_exercise_global',
    null,
    'Fixture Dead Bug',
    'control',
    'core',
    '2 x 6',
    'Move slowly',
    'trainer-only coaching note',
    'Stop on pain',
    'https://example.test/dead-bug',
    'reviewed',
    null
  ),
  (
    'e2000000-0000-4000-8000-000000000002',
    'fixture_exercise_trainer_a',
    '11111111-1111-4111-8111-111111111111',
    'Fixture Row',
    'strength',
    'back',
    '3 x 8',
    'Pull calmly',
    'trainer-only row note',
    'Stop on sharp pain',
    'https://example.test/row',
    'reviewed',
    null
  )
on conflict (id) do update set name = excluded.name, owner_trainer_id = excluded.owner_trainer_id, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.home_plans (
  id, client_id, legacy_id, title, focus, frequency, duration, instructions,
  status, published_at, deleted_at
)
values
  (
    'a6000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_plan_a_active',
    'Client A Active Plan',
    'calm consistency',
    'daily',
    '10 min',
    'Client-safe plan instructions A',
    'active',
    now(),
    null
  ),
  (
    'a6000000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_plan_a_draft',
    'Client A Draft Plan',
    'draft focus',
    'weekly',
    '10 min',
    'Draft instructions A',
    'draft',
    null,
    null
  ),
  (
    'a6000000-0000-4000-8000-000000000003',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_plan_a_deleted',
    'Client A Deleted Plan',
    'deleted focus',
    'daily',
    '5 min',
    'Deleted instructions A',
    'active',
    now(),
    now()
  ),
  (
    'b6000000-0000-4000-8000-000000000004',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'fixture_plan_b_active',
    'Client B Active Plan',
    'capacity',
    'daily',
    '12 min',
    'Client-safe plan instructions B',
    'active',
    now(),
    null
  )
on conflict (id) do update set status = excluded.status, published_at = excluded.published_at, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.home_plan_items (
  id, home_plan_id, client_id, exercise_id, legacy_id, name, category, region,
  dosage, frequency, client_cue, stop_criteria, video_url, status, sort_order,
  added_at, trainer_note, published_at, deleted_at
)
values
  (
    'a7000000-0000-4000-8000-000000000001',
    'a6000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'e1000000-0000-4000-8000-000000000001',
    'fixture_plan_item_a_visible',
    'Client A Visible Daily Step',
    'control',
    'core',
    '2 x 6',
    'daily',
    'Move slowly',
    'Stop on pain',
    'https://example.test/dead-bug',
    'active',
    1,
    date '2026-06-16',
    'trainer-only plan item note A',
    now(),
    null
  ),
  (
    'a7000000-0000-4000-8000-000000000002',
    'a6000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'e2000000-0000-4000-8000-000000000002',
    'fixture_plan_item_a_unpublished',
    'Client A Unpublished Step',
    'strength',
    'back',
    '3 x 8',
    'weekly',
    'Pull calmly',
    'Stop on sharp pain',
    'https://example.test/row',
    'active',
    2,
    date '2026-06-16',
    'trainer-only unpublished plan item note A',
    null,
    null
  ),
  (
    'a7000000-0000-4000-8000-000000000003',
    'a6000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    null,
    'fixture_plan_item_a_deleted',
    'Client A Deleted Step',
    'control',
    'core',
    '1 x 4',
    'daily',
    'Deleted cue',
    'Deleted stop',
    null,
    'active',
    3,
    date '2026-06-16',
    'deleted trainer-only plan item note A',
    now(),
    now()
  ),
  (
    'b7000000-0000-4000-8000-000000000004',
    'b6000000-0000-4000-8000-000000000004',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'e1000000-0000-4000-8000-000000000001',
    'fixture_plan_item_b_visible',
    'Client B Visible Daily Step',
    'control',
    'core',
    '2 x 6',
    'daily',
    'Move slowly',
    'Stop on pain',
    'https://example.test/dead-bug',
    'active',
    1,
    date '2026-06-17',
    'trainer-only plan item note B',
    now(),
    null
  )
on conflict (id) do update set published_at = excluded.published_at, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.guidance_events (
  id, client_id, home_plan_item_id, event_date, kind, completed, payload, created_by, deleted_at
)
values
  (
    'a8000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'a7000000-0000-4000-8000-000000000001',
    current_date,
    'daily_step',
    true,
    '{"fixture":"guidance_a_visible"}'::jsonb,
    '33333333-3333-4333-8333-333333333333',
    null
  ),
  (
    'a8000000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'a7000000-0000-4000-8000-000000000001',
    current_date - 1,
    'daily_step',
    true,
    '{"fixture":"guidance_a_deleted"}'::jsonb,
    '33333333-3333-4333-8333-333333333333',
    now()
  ),
  (
    'b8000000-0000-4000-8000-000000000003',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'b7000000-0000-4000-8000-000000000004',
    current_date,
    'daily_step',
    false,
    '{"fixture":"guidance_b_visible"}'::jsonb,
    '44444444-4444-4444-8444-444444444444',
    null
  )
on conflict (id) do update set completed = excluded.completed, payload = excluded.payload, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.guidance_pilots (
  id, client_id, status, start_date, duration_weeks, current_week, objective,
  trainer_note, deleted_at
)
values
  (
    'a9000000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'active',
    date '2026-06-01',
    4,
    2,
    'Test clarity',
    'trainer-only pilot note A',
    null
  )
on conflict (id) do update set status = excluded.status, trainer_note = excluded.trainer_note, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.guidance_pilot_feedback (
  id, pilot_id, week, understood_next_step, reduced_chaos, friction, simplify_next, deleted_at
)
values
  (
    'aa000000-0000-4000-8000-000000000001',
    'a9000000-0000-4000-8000-000000000001',
    1,
    'yes',
    'yes',
    'none',
    'keep simple',
    null
  )
on conflict (id) do update set understood_next_step = excluded.understood_next_step, deleted_at = excluded.deleted_at, updated_at = now();

insert into public.reports (
  id, client_id, legacy_id, type, audience, status, title, content, published_at,
  created_by, deleted_at
)
values
  (
    'aa100000-0000-4000-8000-000000000001',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_report_a_published_client',
    'startMap',
    'client',
    'published',
    'Client A Published Report',
    'Client-safe report content A',
    now(),
    '11111111-1111-4111-8111-111111111111',
    null
  ),
  (
    'aa100000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_report_a_draft',
    'fourWeeks',
    'client',
    'draft',
    'Client A Draft Report',
    'Draft report content A',
    null,
    '11111111-1111-4111-8111-111111111111',
    null
  ),
  (
    'aa100000-0000-4000-8000-000000000003',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_report_a_trainer_only',
    'fourWeeks',
    'trainer',
    'published',
    'Client A Trainer-only Report',
    'Trainer-only report content A',
    now(),
    '11111111-1111-4111-8111-111111111111',
    null
  ),
  (
    'aa100000-0000-4000-8000-000000000004',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1',
    'fixture_report_a_deleted',
    'twelveWeeks',
    'client',
    'published',
    'Client A Deleted Report',
    'Deleted report content A',
    now(),
    '11111111-1111-4111-8111-111111111111',
    now()
  ),
  (
    'bb100000-0000-4000-8000-000000000005',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbb2',
    'fixture_report_b_published_client',
    'startMap',
    'client',
    'published',
    'Client B Published Report',
    'Client-safe report content B',
    now(),
    '22222222-2222-4222-8222-222222222222',
    null
  )
on conflict (id) do update set audience = excluded.audience, status = excluded.status, published_at = excluded.published_at, deleted_at = excluded.deleted_at, updated_at = now();

commit;
