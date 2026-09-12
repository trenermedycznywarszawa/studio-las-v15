create index if not exists questionnaire_privacy_events_assignment_identity_idx
  on public.questionnaire_privacy_events(assignment_id, client_id, version_id);

create index if not exists questionnaire_privacy_events_created_by_idx
  on public.questionnaire_privacy_events(created_by_profile_id);
