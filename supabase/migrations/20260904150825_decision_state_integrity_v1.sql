-- Studio Las OS -- explicit cycle decisions and durable trainer signal reviews.
-- Additive only: existing PWD, Guidance Release, Stage 2 and client portal
-- contracts remain unchanged.

begin;

create table public.client_cycle_decisions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  decision text not null,
  rationale text not null,
  decided_at timestamptz not null default now(),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint client_cycle_decisions_decision_check check (
    decision in ('independent', 'continue_1_to_1', 'next_cycle', 'hybrid')
  ),
  constraint client_cycle_decisions_rationale_check check (
    length(btrim(rationale)) between 1 and 4000
  )
);

create table public.trainer_signal_reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  signal_key text not null,
  outcome text not null,
  reviewed_at timestamptz not null default now(),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint trainer_signal_reviews_signal_key_check check (
    length(btrim(signal_key)) between 5 and 500
  ),
  constraint trainer_signal_reviews_outcome_check check (
    outcome in ('noted_no_change', 'changed_guidance', 'outdated', 'contact_required')
  ),
  constraint trainer_signal_reviews_instance_unique unique (client_id, signal_key)
);

create index client_cycle_decisions_client_history_idx
  on public.client_cycle_decisions(client_id, decided_at desc, created_at desc);
create index client_cycle_decisions_actor_idx
  on public.client_cycle_decisions(actor_profile_id);
create index trainer_signal_reviews_client_history_idx
  on public.trainer_signal_reviews(client_id, reviewed_at desc, created_at desc);
create index trainer_signal_reviews_actor_idx
  on public.trainer_signal_reviews(actor_profile_id);

alter table public.client_cycle_decisions enable row level security;
alter table public.client_cycle_decisions force row level security;
alter table public.trainer_signal_reviews enable row level security;
alter table public.trainer_signal_reviews force row level security;

revoke all on table public.client_cycle_decisions from public, anon, authenticated;
revoke all on table public.trainer_signal_reviews from public, anon, authenticated;
grant select, insert on table public.client_cycle_decisions to authenticated;
grant select, insert on table public.trainer_signal_reviews to authenticated;

create policy client_cycle_decisions_owner_select
on public.client_cycle_decisions
for select
to authenticated
using (
  private.is_trainer()
  and private.trainer_owns_client(client_id)
);

create policy client_cycle_decisions_owner_insert
on public.client_cycle_decisions
for insert
to authenticated
with check (
  private.is_trainer()
  and private.trainer_owns_client(client_id)
  and actor_profile_id = private.current_profile_id()
);

create policy client_cycle_decisions_trainer_aal2_gate
on public.client_cycle_decisions
as restrictive
for all
to authenticated
using (private.trainer_mfa_satisfied())
with check (private.trainer_mfa_satisfied());

create policy trainer_signal_reviews_owner_select
on public.trainer_signal_reviews
for select
to authenticated
using (
  private.is_trainer()
  and private.trainer_owns_client(client_id)
);

create policy trainer_signal_reviews_owner_insert
on public.trainer_signal_reviews
for insert
to authenticated
with check (
  private.is_trainer()
  and private.trainer_owns_client(client_id)
  and actor_profile_id = private.current_profile_id()
);

create policy trainer_signal_reviews_trainer_aal2_gate
on public.trainer_signal_reviews
as restrictive
for all
to authenticated
using (private.trainer_mfa_satisfied())
with check (private.trainer_mfa_satisfied());

create trigger audit_sensitive_row_change
after insert or update or delete on public.client_cycle_decisions
for each row execute function public.audit_sensitive_row_change();

create trigger audit_sensitive_row_change
after insert or update or delete on public.trainer_signal_reviews
for each row execute function public.audit_sensitive_row_change();

comment on table public.client_cycle_decisions is
  'Append-only trainer-owned cycle outcome history. Rationale is trainer-private and has no client policy or grant.';
comment on table public.trainer_signal_reviews is
  'One durable trainer review per exact signal instance. Signal identity is derived from signal type, source and source date.';
comment on column public.client_cycle_decisions.rationale is
  'Private trainer rationale. It is never projected by the client portal.';

commit;
