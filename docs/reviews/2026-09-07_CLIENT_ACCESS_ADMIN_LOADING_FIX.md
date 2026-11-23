# Client access admin loading fix — 2026-09-07

Scope: frontend bootstrap hardening only.

Observed production symptom: the tool remained indefinitely on the static loading placeholder.

Fix:
- move module loading behind a small same-origin bootstrap;
- dynamically import the existing admin module;
- detect the first bounded runtime render;
- fail closed after 12 seconds instead of showing an infinite loader;
- provide only retry/back actions in the failure state;
- include the bootstrap in the isolated Netlify deploy allowlist;
- add a contract test and CI check.

Non-goals:
- no change to Auth/MFA/AAL2/RLS semantics;
- no change to `client-access` Edge Function;
- no invitation/revoke operation;
- no schema or migration change;
- no real client data change.

This change is intentionally diagnostic-safe: if the underlying runtime/import path still fails, production will surface a bounded safe error rather than silently hanging, allowing the next failure to be distinguished from a backend status-path issue.
