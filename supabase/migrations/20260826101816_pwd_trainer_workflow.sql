-- PWD is a trainer-only session category, not a new clinical or client-facing model.
-- Existing historical rows remain ordinary sessions.

begin;

alter table public.sessions
  add column if not exists session_type text not null default 'session';

alter table public.sessions
  drop constraint if exists sessions_session_type_check,
  add constraint sessions_session_type_check check (session_type in ('session', 'pwd'));

comment on column public.sessions.session_type is
  'Trainer-only process category: ordinary session or PWD. It does not encode a diagnosis or automatic decision.';

commit;