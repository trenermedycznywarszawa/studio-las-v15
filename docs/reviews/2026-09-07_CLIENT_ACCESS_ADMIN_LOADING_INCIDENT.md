# Client access admin loading incident — 2026-09-07

Status: active investigation.

Observed on production Netlify UI after production `client-access` Edge Function deployment: `/tools/client-access-admin.html` remains indefinitely on the static loading placeholder `Ładowanie bezpiecznego narzędzia dostępu…`.

Implication: the admin module does not reach any of its explicit runtime states (`login`, MFA, admin, or fatal). This must be treated as a frontend bootstrap/runtime failure, not as proof that the Edge Function status path works.

Constraints:
- no real client invitations during diagnosis;
- no client data modification;
- do not change `main`;
- preserve Auth/MFA/AAL2/RLS contracts;
- fix must fail closed and surface a bounded, user-safe error instead of an infinite loading state.

Production backend state at incident time:
- `client-access` ACTIVE, `verify_jwt=true`;
- `public-inquiry-ingress` ACTIVE;
- production RPC preflight passed before deploy.
