-- Atomic trainer-only PWD persistence.
-- Extends existing sessions and assessment_results; does not create a parallel model.

begin;

alter table public.assessment_results
  add column if not exists session_id uuid references public.sessions(id) on delete set null,
  add column if not exists observation_type text,
  add column if not exists reaction_text text;

alter table public.assessment_results
  drop constraint if exists assessment_results_observation_type_check,
  add constraint assessment_results_observation_type_check
    check (
      observation_type is null
      or observation_type in ('reference', 'goal_task', 'trainer_observation')
    );

create index if not exists assessment_results_session_idx
  on public.assessment_results(session_id)
  where session_id is not null and deleted_at is null;

comment on column public.assessment_results.session_id is
  'Exact session provenance for trainer observations, including PWD.';
comment on column public.assessment_results.observation_type is
  'Optional PWD observation role; null keeps historical assessment semantics unchanged.';
comment on column public.assessment_results.reaction_text is
  'Optional client reaction after the observed attempt or trainer cue.';

create or replace function public.save_pwd_workflow(
  p_client_id uuid,
  p_date date,
  p_real_life_goal text,
  p_why_important text,
  p_context_boundaries text,
  p_trainer_interpretation text,
  p_trainer_decision text,
  p_next_step text,
  p_observations jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_session_id uuid;
  v_decision_label text;
  v_observation jsonb;
  v_observations jsonb := coalesce(p_observations, '[]'::jsonb);
  v_observation_type text;
  v_name text;
  v_result_text text;
  v_reaction_text text;
  v_reference_id text;
  v_count integer;
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'trainer AAL2 required' using errcode = '42501';
  end if;

  if auth.uid() is null
     or not private.is_trainer()
     or not private.trainer_owns_client(p_client_id) then
    raise exception 'owner trainer access required' using errcode = '42501';
  end if;

  if p_date is null then
    raise exception 'PWD date is required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_real_life_goal, '')), '') is null then
    raise exception 'PWD client goal is required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_why_important, '')), '') is null then
    raise exception 'PWD goal meaning is required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_context_boundaries, '')), '') is null then
    raise exception 'PWD context and boundaries are required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_trainer_interpretation, '')), '') is null then
    raise exception 'PWD trainer interpretation is required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_next_step, '')), '') is null then
    raise exception 'PWD next step is required' using errcode = '22023';
  end if;

  v_decision_label := case p_trainer_decision
    when 'continue_guidance' then 'Dalsze prowadzenie'
    when 'clarify_or_observe' then 'Dodatkowe wyjaśnienie lub obserwacja'
    when 'prepare_guidance_later' then 'Przygotowanie wskazówki później'
    when 'defer_or_refer' then 'Odroczenie decyzji lub skierowanie dalej'
    else null
  end;
  if v_decision_label is null then
    raise exception 'PWD trainer decision is required' using errcode = '22023';
  end if;

  if jsonb_typeof(v_observations) <> 'array' then
    raise exception 'PWD observations must be an array' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(v_observations);
  if v_count > 3 then
    raise exception 'PWD allows at most three observations' using errcode = '22023';
  end if;

  for v_observation in select value from jsonb_array_elements(v_observations)
  loop
    if jsonb_typeof(v_observation) <> 'object' then
      raise exception 'PWD observation must be an object' using errcode = '22023';
    end if;

    v_observation_type := nullif(btrim(v_observation ->> 'observationType'), '');
    v_name := nullif(btrim(v_observation ->> 'name'), '');
    v_result_text := nullif(btrim(v_observation ->> 'resultText'), '');
    v_reaction_text := nullif(btrim(v_observation ->> 'reactionText'), '');
    v_reference_id := nullif(btrim(v_observation ->> 'referenceId'), '');

    if v_observation_type is null
       or v_observation_type not in ('reference', 'goal_task', 'trainer_observation') then
      raise exception 'PWD observation type is invalid' using errcode = '22023';
    end if;
    if v_name is null or v_result_text is null then
      raise exception 'PWD observation name and result are required' using errcode = '22023';
    end if;
    if v_reference_id is not null and v_observation_type <> 'reference' then
      raise exception 'PWD reference is allowed only for a reference observation' using errcode = '22023';
    end if;
    if v_reference_id is not null and v_reference_id not in (
      'sock', 'sit_to_stand', 'hands_behind_back', 'squat',
      'floor_bend', 'arms_overhead', 'look_over_shoulders'
    ) then
      raise exception 'PWD reference is not in the private movement library' using errcode = '22023';
    end if;
  end loop;

  update public.clients
  set goal = btrim(p_real_life_goal),
      motivation = btrim(p_why_important),
      updated_at = now()
  where id = p_client_id
    and deleted_at is null;
  if not found then
    raise exception 'active client not found' using errcode = 'P0002';
  end if;

  insert into public.sessions (
    client_id,
    date,
    session_type,
    trainer_observation,
    trainer_decision,
    client_summary,
    client_next_step,
    client_visible
  )
  values (
    p_client_id,
    p_date,
    'pwd',
    'Kontekst i granice: ' || btrim(p_context_boundaries)
      || E'\n\nInterpretacja trenera: ' || btrim(p_trainer_interpretation),
    v_decision_label,
    'Co klient chce robić swobodniej: ' || btrim(p_real_life_goal)
      || E'\nDlaczego to ważne: ' || btrim(p_why_important),
    btrim(p_next_step),
    false
  )
  returning id into v_session_id;

  for v_observation in select value from jsonb_array_elements(v_observations)
  loop
    v_observation_type := btrim(v_observation ->> 'observationType');
    v_name := btrim(v_observation ->> 'name');
    v_result_text := btrim(v_observation ->> 'resultText');
    v_reaction_text := nullif(btrim(v_observation ->> 'reactionText'), '');
    v_reference_id := nullif(btrim(v_observation ->> 'referenceId'), '');

    insert into public.assessment_results (
      client_id,
      session_id,
      test_id,
      test_name,
      performed_at,
      result_text,
      observation_type,
      reaction_text,
      trainer_decision,
      next_step,
      trainer_note,
      client_visible
    )
    values (
      p_client_id,
      v_session_id,
      'pwd:' || v_observation_type
        || case when v_reference_id is null then '' else ':' || v_reference_id end,
      v_name,
      p_date,
      v_result_text,
      v_observation_type,
      v_reaction_text,
      'obserwuj',
      null,
      null,
      false
    );
  end loop;

  return jsonb_build_object(
    'sessionId', v_session_id,
    'observationCount', v_count,
    'decisionLabel', v_decision_label
  );
end;
$$;

revoke all on function public.save_pwd_workflow(
  uuid, date, text, text, text, text, text, text, jsonb
) from public, anon;
grant execute on function public.save_pwd_workflow(
  uuid, date, text, text, text, text, text, text, jsonb
) to authenticated;

comment on function public.save_pwd_workflow(
  uuid, date, text, text, text, text, text, text, jsonb
) is
  'Atomically saves one trainer-only PWD session and zero to three exact session-linked observations after owner and AAL2 checks. It never creates or mutates home plans.';

commit;