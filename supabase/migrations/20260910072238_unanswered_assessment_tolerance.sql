-- Unanswered is not an observation. Preserve every existing value.
alter table public.assessment_results alter column quality drop not null;
alter table public.assessment_results alter column quality drop default;
