# Studio Las OS — QA real Auth/HTTP boundary test (16.11.2026)

**Status**: tooling/fixtures PREPARED; **real signed-JWT HTTP test NOT RUN until owner signs in locally**.

## Exact environment
- Only Supabase project `studio-las-disposable-qa-20261116`, ref `yipsjvbgxdmdicijxcph`. Production and old paused staging are forbidden.
- PR #115 worktree `codex/isolated-qa-e2e-preparation-20261116` on Windows. Isolated preview `http://127.0.0.1:8790/`.
- Exact QA-only URL to execute: **`http://127.0.0.1:8790/__qa_security/`**.
- Runner files `scripts/qa_http_boundary_runner.html` and `scripts/qa_http_boundary_runner.mjs` are served by local Node launcher, **not published or built into the Netlify deploy bundle**.
- No passwords, TOTP, access tokens, auth refresh tokens, service-role keys or QR screenshots are passed to GitHub, AI context, logs, chat, server process or client localStorage. Password inputs clear upon submission. Signed JWT is used only in in-memory requests directly to QA Supabase Auth and PostgREST; page reload clears the temporary session.

## Isolation/recovery checkpoint
1. A strict QA-specific seed `supabase/tests/qa_http_boundary_seed.sql` was tested together with cleanup; **recovery verified once**: `clients=0`, `client_users=0`, `Auth=3`, `verified MFA=1`.
2. After that proof, seed ran again to prepare **exactly two** synthetic clients `TestA QA` and `TestB QA`, two active mappings, and private fictional trainer-only markers. IDs fixed (see files). QA now intentionally has **two clients**. These are temporary E2E fixtures and should be deleted only via the guarded cleanup file, after the actual browser test and evidence.
3. Test AAL1 negative HTTP INSERT uses one additional deterministic ID `c7300000-0000-4000-8000-000000000003`; an unexpected write is flagged FAIL and can be removed using the strict cleanup script after investigation. No other write is authorized.
4. Cleanup file `supabase/tests/qa_http_boundary_cleanup.sql` is fail-closed: only known synthetic IDs, expected Auth allowlist and no unexpected clients or questionnaire assignments. Run against **exactly new QA**; confirm counts after. Never delete project, clients in production, or reset Auth.
5. A successful database ROLLBACK test of simulated JWT context from the preceding phase is separate evidence; signed JWT validation requires the browser flow below.

## Execution in local Antigravity (one operator action)
1. Check that the existing PR #115 worktree is clean or use separate worktree; fetch latest branch **without overriding local changes**. Stop old QA preview process (Ctrl+C) and restart using the same command:
   `& .\scripts\start_isolated_qa_preview.ps1`.
2. Ensure the output shows `QA_PREVIEW_READY=http://127.0.0.1:8790/` and that QA URL points to `yipsjvbgxdmdicijxcph`. If the script asks for `sb_publishable_`, owner obtains it directly in Supabase QA dashboard. No private key.
3. Open **`http://127.0.0.1:8790/__qa_security/`**. Owner personally enters password for the **trainer QA** and runs Test 1: post-password `aal1` session must see zero clients and receive a server denial for a synthetic INSERT.
4. Owner personally enters **current TOTP**. Test 2: Auth challenge/verify upgrades the session to a signed `aal2` token; REST returns exactly the two QA synthetic clients.
5. Owner personally enters password for **client A** and then **client B** in separate test forms. Tests 3/4: each signed token can access only its own `client_users` link and client portal snapshot; no private trainer note or foreign client data; attempts to mutate the other's link must not succeed. After both, the runner re-reads A and B membership.
6. Report only four status lines `Trener AAL1`, `Trener AAL2`, `Klient A`, `Klient B` with PASS/FAIL and generalized errors. **Never capture passwords, MFA code, token, factor IDs, or screen contents while user is typing.** Don't modify production, staging, Auth settings, RLS or any migration.
7. After receiving the actual browser result, run cleanup SQL on QA only, verify `clients=0`, `client_users=0`, `Auth=3`, MFA factor still verified. **Cleanup should be done in the same session**; fail-closed means stop and investigate if any unexpected records.
8. Log outcome and evidence in Issue #114. If any denial fails, mark FAIL, prevent any real-client pilot approval, and isolate the exact regression. Never call SIGNED-JWT E2E PASS based on CI or SQL simulation alone.

**Scope**: Auth sign-in, MFA AAL, RLS of clients, memberships, private client table, and portal snapshot only. This is not the full Contact → PWD → first guidance process. The qualified legal/privacy gate for PWD remains inactive and unmodified.
