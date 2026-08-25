# Stage 6A bounded reuse audit — 2026-08-25

**Audited base:** `product-recovery@e6b5882f0d42c5eb2d9d42f88cf34955b2a57d36`  
**Audited PR head:** `099f1ec064bd1c5e3ba28e2fc1a95e5f9f7b5ad9`  
**Audited tree:** `d4e9c9a7e3b4d61b17608e34b17c82de3aadadf2`

This is a bounded reuse decision, not implementation approval.

## Four answers

1. **TAK — reachable and testable Damian MFA/AAL2 foundation.** PR #13 head
   `c907f92d7ec99bd23afefaf674d88f1111b0a038` is an ancestor of the audited
   `product-recovery`; `supabase/migrations/021_trainer_totp_mfa_aal2.sql`
   applies restrictive AAL2 gates to trainer process relations. `node
   scripts/test_trainer_mfa.mjs` and `py -3 scripts/verify_trainer_mfa.py`
   passed locally.
2. **TAK — metadata-minimised security-audit foundation.**
   `supabase/migrations/013_access_lifecycle_and_audit.sql` defines
   append-only `security_audit_events`, stores actor/action/target/time and
   changed-column metadata, and explicitly excludes content and raw payload.
   It triggers for `clients`, `home_plans`, `home_plan_items`, and
   `guidance_events`. `py -3 scripts/verify_access_lifecycle.py` passed
   locally.
3. **NIE — not usable for a synthetic workspace under the stated no-project,
   no-secret, no-account condition.** The existing `SupabaseAuth` runtime in
   `assets/os/data.js` sends requests to `config.supabaseUrl` with a
   `publishableKey`; `studio-las-config.js` supplies a concrete project URL.
   The passing MFA browser test replaces network with `globalThis.fetch` and
   uses `example.supabase.co` plus a test key, so it proves the boundary logic,
   not an isolated runnable persistence/authentication environment. No weaker
   parallel login, simulated MFA, or frontend-only audit is permitted.
4. **NIE — the named structures are not a complete safe Stage 6A model without
   scoped design.** Their names overlap, but they do not encode the required
   one-current, atomic successor, withdrawal, channel, delivery, and
   trainer-only-history invariants as a coherent aggregate.

## Candidate disposition

| Structure | Disposition | Evidence and limit |
| --- | --- | --- |
| `clients` | requires adaptation | `001_initial_schema.sql` includes contact, health and client-account-era fields; a synthetic-only identity boundary must be explicit. |
| `home_plans` | requires adaptation | Has `draft/active/archived`, but no one-current constraint, successor link, atomic replacement, withdrawal semantics, channel or delivery outcome. |
| `home_plan_items` | requires adaptation | Carries action/dose/stop fields, but permits multiple active exercise-oriented items and has no release lifecycle. |
| `guidance_events` | not suitable | It models `daily_step`, `client_checkin`, and `trainer_marker` events; it is not a guidance-release or decision-history model. |
| `security_audit_events` | reuse candidate — requires scoped design | Metadata-only append-only trigger evidence is suitable as a foundation, but its INSERT/UPDATE/DELETE column-change model does not itself express publish, replacement, withdrawal, channel, or delivery decisions. |

## Verdict

**STOP — SECURITY DECISION REQUIRED**

Before any Stage 6A implementation, Damian must separately authorize an
isolated non-production authenticated/persistence environment and the scoped
design that preserves the listed lifecycle invariants without weakening the
reachable AAL2 boundary. This result does **not** authorize real data, client
access, production, deployment, secrets, a new parallel login, simulated MFA,
or frontend/local-storage audit or instruction delivery.
