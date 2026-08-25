-- Synthetic-data regression for migration 022. Run only against an isolated
-- non-production Supabase database after migrations are applied.
-- This file is not executed by scripts/test_guidance_release_workflow.mjs and is not evidence that SQL ran.

begin;

do $$
declare
  v_client_id uuid := '11111111-1111-4111-8111-111111111111';
  v_first_id uuid := '22222222-2222-4222-8222-222222222222';
  v_second_id uuid := '33333333-3333-4333-8333-333333333333';
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'home_plans_one_active_per_client_idx'
  ) then
    raise exception 'FAIL: one-active-home-plan index missing';
  end if;

  if to_regprocedure('public.publish_home_plan_guidance(uuid)') is null
     or to_regprocedure('public.withdraw_home_plan_guidance(uuid)') is null
     or to_regprocedure('public.record_home_plan_guidance_delivery(uuid,text)') is null
     or to_regprocedure('public.confirm_home_plan_paper_retirement(uuid)') is null then
    raise exception 'FAIL: guidance transition RPC missing';
  end if;
  if position('guidance purpose is required' in pg_get_functiondef('public.publish_home_plan_guidance(uuid)'::regprocedure)) = 0 then
    raise exception 'FAIL: publish RPC does not reject blank guidance focus';
  end if;
  if position('paper_retirement_confirmed' in pg_get_functiondef('public.publish_home_plan_guidance(uuid)'::regprocedure)) = 0 then
    raise exception 'FAIL: publish RPC does not fail closed for paper or hybrid replacement';
  end if;
  if has_table_privilege('authenticated', 'public.security_audit_events', 'SELECT') then
    raise exception 'FAIL: authenticated can read raw security audit events';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'security_audit_events'
      and column_name in ('guidance_content', 'instructions', 'trainer_note', 'payload')
  ) then
    raise exception 'FAIL: guidance content entered security audit metadata';
  end if;

  -- IDs are deliberately unused fixtures: this test does not create accounts,
  -- health records or a client-access projection.
  if v_client_id = v_first_id or v_first_id = v_second_id then
    raise exception 'FAIL: synthetic fixture ids are not distinct';
  end if;
end;
$$;

rollback;
