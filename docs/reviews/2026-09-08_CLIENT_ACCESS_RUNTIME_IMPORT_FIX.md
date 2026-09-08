# Client access runtime import fix — 2026-09-08

Observed production console error:

`Uncaught SyntaxError: The requested module '../assets/os/runtime.js' does not provide an export named 'getProductionRuntimeConfig'`

Root cause: `tools/client-access-admin.js` imported `getProductionRuntimeConfig`, while the canonical runtime exports `getRuntimeConfig`.

Fix scope:
- change only the client-access admin import and invocation to `getRuntimeConfig`;
- preserve Auth/MFA/AAL2/RLS and Edge Function semantics;
- no schema, migration, client data, invitation, revoke, `main`, or public ingress changes.

The two inline-script CSP errors visible in DevTools originate from the injected Netlify badge UI and are not the Studio Las OS module-start failure.
