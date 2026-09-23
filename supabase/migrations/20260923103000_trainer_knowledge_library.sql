-- Studio Las OS - trainer-only Knowledge Library read model
--
-- This migration exposes no original documents and no client-facing projection.
-- Cards are imported separately as unreviewed AI-assisted analyses. They are not
-- trainer decisions, diagnoses, recommendations, or approved client material.

begin;

create table if not exists public.knowledge_cards (
  id uuid primary key default gen_random_uuid(),
  slk_id text not null,
  card_version integer not null default 1 check (card_version > 0),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  title text not null,
  author text,
  publication_year text,
  source_name text not null,
  source_locator text,
  category text not null,
  tags text[] not null default '{}',
  evidence_strength text not null,
  extraction_note text,
  source_assessment text,
  summary text,
  key_concepts text,
  studio_usefulness text,
  limitations text,
  notes text,
  information_type text not null default 'ai_suggestion'
    check (information_type in ('source_artifact','source_fact','extracted_fact','trainer_observation','ai_hypothesis','ai_suggestion','trainer_interpretation','trainer_decision','client_material')),
  review_state text not null default 'needs_review'
    check (review_state in ('draft','needs_review','approved','rejected','superseded')),
  publication_state text not null default 'unpublished'
    check (publication_state in ('unpublished','published','withdrawn')),
  analysis_id text,
  imported_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint knowledge_cards_exact_version_unique unique (slk_id, card_version),
  constraint knowledge_cards_non_client_material_unpublished check (
    information_type = 'client_material' or publication_state = 'unpublished'
  )
);

comment on table public.knowledge_cards is
  'Trainer-only read model of Studio Las Knowledge analysis cards. Original artifacts remain outside Studio Las OS.';
comment on column public.knowledge_cards.review_state is
  'Review of this exact card version. Imported AI-assisted cards start as needs_review.';
comment on column public.knowledge_cards.source_sha256 is
  'Hash of the exact source artifact version referenced by this card.';

alter table public.knowledge_cards enable row level security;
alter table public.knowledge_cards force row level security;

revoke all on table public.knowledge_cards from public, anon, authenticated;
grant select on table public.knowledge_cards to authenticated;

drop policy if exists knowledge_cards_trainer_read_aal2 on public.knowledge_cards;
create policy knowledge_cards_trainer_read_aal2
on public.knowledge_cards
for select
to authenticated
using (
  private.is_trainer()
  and private.trainer_mfa_satisfied()
);

create index if not exists knowledge_cards_active_category_idx
  on public.knowledge_cards (category, slk_id)
  where is_active;

commit;
