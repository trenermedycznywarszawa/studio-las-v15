do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'questionnaire_assignments_identity_unique'
      and conrelid = 'public.questionnaire_assignments'::regclass
  ) then
    alter table public.questionnaire_assignments
      add constraint questionnaire_assignments_identity_unique unique (id, client_id, version_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questionnaire_responses_assignment_identity_fk'
      and conrelid = 'public.questionnaire_responses'::regclass
  ) then
    alter table public.questionnaire_responses
      add constraint questionnaire_responses_assignment_identity_fk
      foreign key (assignment_id, client_id, version_id)
      references public.questionnaire_assignments(id, client_id, version_id);
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='questionnaire_versions' and policyname='questionnaire_versions_client_select_assigned') then
    create policy questionnaire_versions_client_select_assigned
      on public.questionnaire_versions for select to authenticated
      using (
        private.is_client()
        and exists (
          select 1
          from public.questionnaire_assignments qa
          where qa.version_id = questionnaire_versions.id
            and private.client_can_access_client(qa.client_id)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='questionnaire_templates' and policyname='questionnaire_templates_client_select_assigned') then
    create policy questionnaire_templates_client_select_assigned
      on public.questionnaire_templates for select to authenticated
      using (
        private.is_client()
        and exists (
          select 1
          from public.questionnaire_versions qv
          join public.questionnaire_assignments qa on qa.version_id = qv.id
          where qv.template_id = questionnaire_templates.id
            and private.client_can_access_client(qa.client_id)
        )
      );
  end if;
end
$$;

create or replace function private.protect_questionnaire_version_contract()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.template_id is distinct from new.template_id
     or old.version_code is distinct from new.version_code
     or old.definition is distinct from new.definition
     or old.definition_sha256 is distinct from new.definition_sha256
  then
    raise exception 'questionnaire version contract is immutable; create a new version';
  end if;
  return new;
end;
$$;

drop trigger if exists questionnaire_versions_contract_immutable on public.questionnaire_versions;
create trigger questionnaire_versions_contract_immutable
before update on public.questionnaire_versions
for each row execute function private.protect_questionnaire_version_contract();

create or replace function private.protect_questionnaire_response_history()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' and old.submitted_at is not null then
    raise exception 'submitted questionnaire response cannot be deleted';
  end if;

  if tg_op = 'UPDATE' and old.submitted_at is not null then
    raise exception 'submitted questionnaire response is immutable';
  end if;

  if tg_op = 'UPDATE' then
    if old.assignment_id is distinct from new.assignment_id
       or old.client_id is distinct from new.client_id
       or old.version_id is distinct from new.version_id
    then
      raise exception 'questionnaire response identity is immutable';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists questionnaire_responses_history_guard on public.questionnaire_responses;
create trigger questionnaire_responses_history_guard
before update or delete on public.questionnaire_responses
for each row execute function private.protect_questionnaire_response_history();

create or replace function private.protect_questionnaire_assignment_terminal_state()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.status in ('submitted','cancelled') and new.status is distinct from old.status then
    raise exception 'terminal questionnaire assignment state cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists questionnaire_assignments_terminal_guard on public.questionnaire_assignments;
create trigger questionnaire_assignments_terminal_guard
before update on public.questionnaire_assignments
for each row execute function private.protect_questionnaire_assignment_terminal_state();

drop trigger if exists questionnaire_assignments_set_updated_at on public.questionnaire_assignments;
create trigger questionnaire_assignments_set_updated_at
before update on public.questionnaire_assignments
for each row execute function public.set_updated_at();

drop trigger if exists questionnaire_responses_set_updated_at on public.questionnaire_responses;
create trigger questionnaire_responses_set_updated_at
before update on public.questionnaire_responses
for each row execute function public.set_updated_at();
