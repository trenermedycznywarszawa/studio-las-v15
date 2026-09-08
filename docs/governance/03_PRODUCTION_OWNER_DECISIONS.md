# Studio Las OS — Production Owner Decisions

## Status reconciliation — 2026-09-08

**Current accepted direction:** preserve the core and selectively rebuild the integrity boundary and main interaction flows.

The canonical rationale, product decisions and implementation priorities accepted after the September 8 read-only audit are recorded in:

[`04_POST_AUDIT_PRODUCT_AND_INTEGRITY_DECISIONS_2026-09-08.md`](04_POST_AUDIT_PRODUCT_AND_INTEGRITY_DECISIONS_2026-09-08.md).

That decision record is authoritative for the following scoped questions:

- publication completeness and immutability,
- preservation of original client observations and historical meaning,
- production/release reconstructability,
- client current-action / „Dzisiaj” hierarchy,
- trainer „Teraz” decision hierarchy,
- data minimisation and the legacy broad questionnaire,
- non-mandatory guidance variants,
- evidence-to-report strategy,
- rebuild sequencing and features explicitly deferred.

Existing Constitution, security, provenance, approval, lifecycle and privacy contracts remain authoritative in their own scope. The new decision record does not weaken them; it makes the intended product behavior more explicit where the audit found implementation gaps.

### Current implementation principle

Do not rebuild Studio Las OS from scratch.

Preserve the useful Supabase + small frontend foundation, RLS/AAL2, PWD, explicit trainer judgment, controlled client projections, Guidance Release lineage and cycle decisions. Rebuild selected boundaries in dependency order, with **publication/historical integrity and recovery proof before visual polish or new features**.

### Current product principle

The application exists to strengthen the 1:1 service:

- client understands the current agreed action,
- Damian sees what changed and what may alter today's decision,
- the historical record preserves what was actually reported/prescribed,
- the report can credibly show meaningful regained capability.

Do not optimize for screen time, streaks, feature count or generic engagement.

---

## Historical accepted owner input — 2026-07-13

**Status reconciliation 2026-09-07: KEEP owner controls.** Implementation/readiness observations below are dated evidence, not a current live audit; later MFA and hosting implementation is recorded in the [reconciliation baseline](../reviews/2026-09-07_MASTER_SPEC_1_1_RECONCILIATION.md). Unfulfilled approval and safety conditions are not waived by this annotation.

Status: accepted owner input, production blockers remain  
Date: 2026-07-13  
Owner: Damian / Studio Las

## Accepted completion definition

Studio Las OS is considered complete only when:

- the trainer signs in with mandatory MFA,
- a client is invited and sets their own password,
- the trainer can manage clients, sessions, measurements, assessments, home plans, reports and published documents,
- the client sees only explicitly published client-safe information,
- private PDF documents are access-controlled,
- password recovery, access revocation, audit evidence and backup/restore are verified,
- the production Supabase rollout passes staging and target tests,
- no production health/process data depends on browser local persistence,
- the privacy/RODO production gate is approved.

## Owner and access model

- Studio Las OS is a single-trainer system.
- The only trainer account is `trenermedycznywarszawa@gmail.com`.
- No assistant or second trainer is planned.
- Mandatory trainer MFA is accepted.
- Public signup must remain disabled.
- Clients are created and invited only by the trainer.

## Supabase

- Canonical production-sensitive project ref: `ufcumhbnuyernuwepcij`.
- The owner has administrator access.
- The production-sensitive project contains real data and must not be used for destructive rehearsal even though its current name is `studio-las-os9-test`.
- Paid Supabase branching was explicitly rejected by the owner.
- Free staging project created on 2026-07-13: `ulauyoqjoetjqktegeuq` (`studio-las-os-staging`, region `eu-west-1`).
- Migration rehearsals and first-time security validation must run on local Supabase and/or the free staging project before the production-sensitive target.
- Historical browser data may be migrated, but only through an explicit reviewed migration process.

## Cost constraint

- The project must remain within the Supabase Free plan unless the owner explicitly approves a future paid change.
- Do not create paid database branches, paid add-ons or paid infrastructure without explicit owner approval.
- Use local Supabase CLI + Docker for repeatable zero-cost development and migration tests.
- Use the free staging project only for cloud-specific Auth, Storage, Edge Function and redirect validation.

## Hosting, domain and email

The bullets in this subsection describe the unresolved state as of 2026-07-13 and are retained as historical evidence. Later reconciliation established Netlify as the production OS hosting surface; current release/source identity must be taken from the latest governance/release evidence, not from these dated bullets.

- Final production application address: not yet chosen.
- Custom email domain: not yet chosen.
- SMTP provider: not yet chosen.
- Until these are decided, production invitation and recovery configuration remains blocked.

## Client document model

Approved launch scope:

- diagnostic-visit summary PDF,
- 4/8/12-week or final process report PDF,
- client-safe home guidance or educational PDF,
- other trainer-authored client-safe PDF explicitly published by the trainer.

Trainer-only documents and internal notes remain private.

## Client uploads

Owner preference: client uploads may be useful.

Security decision for launch:

- client uploads are **deferred**, not rejected permanently,
- the launch version remains trainer-publish-only,
- client upload requires a separate reviewed design covering purpose, file types, malware scanning, size limits, quarantine, metadata, retention, deletion, client visibility and RODO basis,
- no client upload UI may be enabled by default before that design and staging tests pass.

This is intentionally conservative because uploaded medical or health documents materially increase the sensitivity and operational burden of the system.

## Privacy and legal decisions still required

The following remain unresolved owner/legal inputs:

- formal controller identity and contact details,
- final privacy contact,
- legal basis and Article 9 condition for health-related data,
- final retention and deletion schedule,
- processor agreements and provider inventory,
- qualified reviewer for the RODO production gate,
- whether a DPIA is required.

No AI-generated text alone may close these decisions.

## Current production blockers — historical 2026-07-13 list

This list is retained as dated evidence. Later implementation may have resolved individual items; Codex/developers must verify current state rather than treating every bullet as still open.

1. Initialize and validate the free staging project.
2. Rehearse migrations and security tests locally and on staging.
3. Complete the target Supabase rollout and backup evidence.
4. Implement mandatory trainer MFA with AAL2 enforcement.
5. Choose final hosting URL/domain.
6. Choose email domain and SMTP provider.
7. Configure and test Auth redirects, email delivery and rate limits.
8. Complete historical data migration.
9. Complete the privacy/RODO production gate.
10. Decide and separately design client uploads after launch.
