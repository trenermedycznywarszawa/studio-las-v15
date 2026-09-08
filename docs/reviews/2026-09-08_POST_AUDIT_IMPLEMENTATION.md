# Post-audit rebuild — implementation and release evidence

Status: IN PROGRESS. Production go-live is not authorized.

Base: `product-recovery` at `e112a043cb3a6ad2976881f0c96728a27f2f020a`.
Branch: `codex/post-audit-rebuild-2026-09-08`.
Authority: September 8 Owner Decision and the explicit post-audit implementation brief.

## Dependency order

1. Complete-set validation, exact-version approval separate from publication,
   immutable approved/published prescriptions, controlled lifecycle operations.
2. Original client observations and attributed corrections.
3. Client projection, purposeful response and already-saved semantics.
4. Exact-source trainer signals and unresolved follow-through, reusing the existing phase-aware UI.
5. Recoverable loading/save states, intake retirement, accessibility and language.
6. Manual evidence-to-report workflow; no automated interpretation.

Release identity and logical migration mapping run alongside this sequence and
gate the preview/go-live recommendation. Preserve existing dirty checkout and
all historical client records. No automatic backfill may invent past approval,
original prescription content, or original client statements.

## Verification boundaries

- Local/staging use fictional fixtures only.
- Production-sensitive project `ufcumhbnuyernuwepcij`: no mutations.
- Staging project `ulauyoqjoetjqktegeuq`: authorized rehearsal target.
- Production database/Auth/Storage recovery proof is separate from a schema rebuild.
- A successful static test is not evidence that a SQL or authenticated browser test ran.
- No paid infrastructure, security weakening, or production release.

## Execution evidence

- Clean worktree created from the latest remote base; original working tree preserved.
- Supabase CLI 2.101.0 and PostgreSQL 17 tooling available.
- Docker daemon unavailable; use isolated PostgreSQL plus hosted staging for the relevant proofs.
- Current Supabase changelog and RLS/function documentation reviewed before changes.

## Go/no-go

NO-GO while implementation and staging evidence remain incomplete.
Production additionally requires owner approval and a verified protected recovery package.
