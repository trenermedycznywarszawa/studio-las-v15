# Studio Las OS — isolated QA Auth handoff (16 Nov 2026)
**Status: PREPARE, not full E2E PASS or pilot READY.** Supabase project: `studio-las-disposable-qa-20261116` (`yipsjvbgxdmdicijxcph`). This is a disposable, separate project; never use production `ufcumhbnuyernuwepcij` or paused shared staging `ulauyoqjoetjqktegeuq`.

## Verified facts
- Supabase QA ACTIVE_HEALTHY. Applied 64 repository schema migrations including first-guidance PWD gate 01B. 34 tables with RLS, 103 policies, 0 client records, 0 Auth accounts at preflight. QA has an enabled publishable API key.
- QA-only Edge Functions: `client-access` (JWT required) and `public-inquiry-ingress` (public endpoint, own payload/origin/rate-limit gate). The ingress sends Formspree notifications **only for canonical production**, never this QA.
- Pre-PWD template `pre_pwd_first_visit.active=false` remains intentionally inactive for unresolved qualified legal/privacy review. DO NOT silently activate to make tests green.
- PR #115 is draft; `--qa` build/localhost runtime exists on its branch, not published or merged.
- No live browser E2E with Auth, MFA, reports or two users has been run. The 27 security-definer lint warnings also exist on production; only real AAL/role boundary tests establish safety.

## Single user action (cannot be done via currently connected Supabase management tools)
Open https://supabase.com/dashboard/project/yipsjvbgxdmdicijxcph/auth/users and create these **three synthetic Auth accounts** using Dashboard Authentication > Users > Add user (create user), set unique strong random passwords and email-confirmed/auto-confirm **for these QA users only**:
1. `attention.trainer@example.test` — trainer
2. `qa.client@example.test` — client
3. `qa.foreign@example.test` — second client for negative cross-client access

Do not send passwords, MFA codes, service_role/secret keys, Auth tokens, session cookies or screenshots of credentials to a chatbot, PR, issue, email or logs. Do not globally disable production email confirmation or MFA. Prefer a local password manager for these temporary QA credentials. Account creation through the supported Dashboard/Auth Admin API preserves GoTrue invariants; do **not** create users by directly writing `auth.users`.

## After Auth accounts exist (assistant can execute the next stage through connected Supabase)
1. READ-only confirm QA `auth.users` has exactly those 3 accounts, verified emails; no other accounts, and `public.clients` empty.
2. Execute `supabase/dev/qa_bootstrap_synthetic_profiles.sql` **only on QA project `yipsjvbgxdmdicijxcph`**. It creates 3 app profiles with roles, no Auth writes, and rejects missing/unexpected accounts. The file already had a real QA **negative test**: with 0 Auth users it denied `BLOCKED: disposable QA requires exactly three allowlisted synthetic Auth users`; database left unchanged.
3. Run read-only Auth/profile checks; prepare explicit setup of QA credentials *only in the owner's local runner or protected GitHub secrets*, with no export to chat and no use of production credentials. MFA ephemeral bootstrap via `scripts/e2e_mfa_bootstrap.mjs` requires the existing fail-closed `e2e_safety_gate.mjs`.
4. Build the isolated QA preview via `node scripts/build_studio_las_os_deploy.mjs --qa` with the new QA URL and publishable key. Serve **only on localhost**; use Antigravity to test actual browser UI when credentialed, under the same safety gate. Do not use the old Netlify PR105 public URL as a QA runtime.
5. Before any mutating E2E, generate **truthful**, run-specific evidence of isolation and interrupted-run recovery/teardown. The gate intentionally does not accept bare `VERIFIED` flags. If no real cleanup/recovery proof exists, mark `BLOCKED`, not PASS.
6. Keep PWD questionnaire legal/privacy activation separate from infrastructure and test permissions; test blocked/no-consent paths without overriding the gate.

## Recovery and cleanup
The old staging project is PAUSED, not deleted, and production is unchanged. Disposable QA remains separate. When a test is interrupted, stop the runner and inspect QA state before retrying. Never force shared staging or production cleanup. Deleting this QA later is a **separate high-risk operation** requiring a fresh exact-project authorization. Production restore is not validated by success of QA schema replay.

## Current cut
- QA schema replay: PASS, with a documented state transition between v3.2 and v3.3 **only on empty QA** (`pre_pwd_first_visit.active=false`).
- QA-only ingress and client access Edge Functions: deployed ACTIVE, but functional browser tests NOT RUN.
- QA synthetic Auth users: **BLOCKED until the owner creates the three accounts through the Dashboard**.
- RLS/AAL1/AAL2/cross-client/browser→API→DB: **NOT RUN**.


## Update 16 Nov 2026, after owner-created Auth accounts — EXECUTED

- Owner added the three allowlisted synthetic Auth accounts in the **disposable QA** Supabase Dashboard; identity/email-confirmation state verified by read-only SQL against `yipsjvbgxdmdicijxcph`: `auth.users=3`, all three email-confirmed, no extra Auth users.
- Ran the **exact approved** repository script `supabase/dev/qa_bootstrap_synthetic_profiles.sql` through QA-only Supabase SQL (no Auth internal table writes). Result: no SQL error.
- Independent read-only verification: `public.profiles=3`, account `attention.trainer@example.test` is `trainer`; `qa.client@example.test` and `qa.foreign@example.test` are `client`; every profile `auth_user_id` correctly matches corresponding `auth.users.id` and every email is confirmed. No real client records.
- Clean state preserved: `public.clients=0`, questionnaire assignments `0`, MFA factors `0`, `pre_pwd_first_visit.active=false`, `34` public RLS-enabled tables.
- **Not yet tested**: actual sign-in (no credentials supplied to assistant), TOTP enrollment/AAL2, cross-client negative permissions, full browser/API/DB workflow, cleanup/recovery. These remain `NOT RUN` and cannot be converted to `PASS` on the basis of role-binding SQL.
- Auth setup is now **PASS**; the former prerequisite instructing the owner to create three Auth accounts has been satisfied and must not be repeated.
- Next priority: isolated QA `--qa` preview and trainer-only MFA enrollment with credentials kept local to owner; then verifiable negative auth tests and the full client journey, only after genuine teardown/recovery evidence. Privacy-qualification gating for the PWD template remains deliberately unmodified.
