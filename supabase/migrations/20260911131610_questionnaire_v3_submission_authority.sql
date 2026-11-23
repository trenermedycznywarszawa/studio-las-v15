drop policy if exists questionnaire_responses_trainer_select_submitted_only on public.questionnaire_responses;
create policy questionnaire_responses_trainer_select_submitted_only
  on public.questionnaire_responses for select to authenticated
  using (
    private.is_trainer()
    and private.trainer_can_access_client(client_id)
    and private.trainer_mfa_satisfied()
    and exists (
      select 1
      from public.questionnaire_assignments qa
      where qa.id = questionnaire_responses.assignment_id
        and qa.client_id = questionnaire_responses.client_id
        and qa.version_id = questionnaire_responses.version_id
        and qa.status = 'submitted'
    )
  );

create or replace function private.protect_questionnaire_assignment_terminal_state()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.status in ('submitted','cancelled') and new.status is distinct from old.status then
    raise exception 'terminal questionnaire assignment state cannot be changed';
  end if;

  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    if not exists (
      select 1
      from public.questionnaire_responses qr
      where qr.assignment_id = new.id
        and qr.client_id = new.client_id
        and qr.version_id = new.version_id
        and qr.submitted_at is not null
    ) then
      raise exception 'questionnaire assignment cannot be submitted before its response is sealed';
    end if;
  end if;

  return new;
end;
$$;
