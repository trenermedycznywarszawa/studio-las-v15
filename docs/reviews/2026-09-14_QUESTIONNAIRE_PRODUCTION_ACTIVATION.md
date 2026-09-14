# Pre-PWD v3.3 — production activation, 2026-09-14

Owner explicitly approved production Netlify deployment and activation in production Supabase in this session, after approving publication of the administrator contact details.

- Implementation: PR #73; source commit 4efc6f24f497e827467d0086ffad01d2d9cda362.
- Production site: studio-las-os.netlify.app; site ID be1d8997-0857-48ab-b3a1-d9f681e2678a.
- Production deploy: 6aa7e8142251ce71bfa59097.
- Artifact SHA256: 5dee06b9c97c998b79518844ee72614fbea83611d41eb63a1bfe04313ee728b0.
- Preview checked before production: 6aa7e670df560a5e697f8ca1.
- Published client-questionnaires.js, studio-las-config.js and deploy-manifest.json matched the local deploy payload exactly (HTTP 200).
- Manifest sourceDirty=true reflects untracked local output/ verification artifacts; the payload is built from the existing explicit allowlist. Those artifacts are not deployed.

Production Supabase ufcumhbnuyernuwepcij: pre_pwd_first_visit active=true. The activation transaction locked the template, required exactly one current released version, and verified version 3.3 plus definition hash e66bb5bf4882cd5400b691ed8a22272e4b8c1389792e33c69a19afc038888660 before updating only the active flag. No client assignments or answers were created or changed.

Existing source migration 20260914100000_questionnaire_v33_unified_health_consent.sql maps to hosted production migration 20260914110439_questionnaire_v33_unified_health_consent. It was already applied; activation did not reapply it.

Validation: local health-consent and client portal tests PASS; PR73 static security and deployment bundle checks PASS. Authenticated staging browser workflow 34842587345 attempt 2 PASS, including questionnaire draft privacy, server resume, conscious submission and trainer brief. Attempt 1 failed on a staging trainer_questionnaire_submissions request during the PWD test, before questionnaire testing; the rerun passed without a code change. This is staging Auth evidence, not a real-client production E2E claim.

Operational rollback: set only pre_pwd_first_visit.active=false to prevent new assignments. This does not revoke existing assignments or erase data. Restore Netlify deploy 6aa7d64db852aa78ba286654 only if reverting the contact UI is necessary, with template inactive. Preserve v3.3 definitions, consent history and submitted responses.

PR73 remains open; deployed implementation is the source commit above, not a merged base-branch release. Keep this deployment identity when preparing any subsequent production bundle.
