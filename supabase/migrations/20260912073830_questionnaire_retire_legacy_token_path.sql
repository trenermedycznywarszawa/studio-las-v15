-- Retire the staging-only single-use token questionnaire path from superseded PR #68.
-- This migration is intentionally defensive: clean environments that never had PR #68
-- applied remain unchanged, while staging loses every client/anon capability.
-- Historical rows, if any, are retained for audit; no data is deleted.

do $$
begin
  if to_regprocedure('public.submit_pre_pwd_intake(text,jsonb,text)') is not null then
    execute 'revoke execute on function public.submit_pre_pwd_intake(text,jsonb,text) from public, anon, authenticated';
  end if;

  if to_regprocedure('public.create_pre_pwd_intake_request(uuid,integer)') is not null then
    execute 'revoke execute on function public.create_pre_pwd_intake_request(uuid,integer) from public, anon, authenticated';
  end if;

  if to_regprocedure('public.mark_pre_pwd_intake_sent(uuid)') is not null then
    execute 'revoke execute on function public.mark_pre_pwd_intake_sent(uuid) from public, anon, authenticated';
  end if;

  if to_regclass('public.pre_pwd_intake_requests') is not null then
    execute 'revoke all on table public.pre_pwd_intake_requests from anon, authenticated';
    execute 'comment on table public.pre_pwd_intake_requests is ''RETIRED staging-only single-use token intake path from superseded PR #68. History retained; no client capability remains.''';
  end if;
end
$$;
