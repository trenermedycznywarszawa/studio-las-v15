# Final security regression — Studio Las OS — 2026-07-21

## CLOSED / PASS

Final result: **25/25 missing authenticated tests PASS**.

The last blocker (no active authenticated staging sessions) was removed with a
staging-only, prefixed test fixture. Only the previously missing authenticated
HTTP checks were executed. Previously passed SQL/RLS, Storage-static, anon,
invalid-JWT, local, MFA-enrollment, backup and parity checks were not repeated.

Target verified before each database or Storage write:

- project name: `studio-las-os-staging`
- project ref: `ulauyoqjoetjqktegeuq`
- status: `ACTIVE_HEALTHY`

Production was not queried, used, or changed.

## Missing authenticated HTTP tests

### Auth and Edge Function `client-access`

All three synthetic users obtained AAL1 sessions through the normal staging
Auth password-token endpoint. No JWT was constructed manually and no
service-role key was used as a user session.

| Case | Result |
|---|---|
| client A, AAL1 | `403 mfa_aal2_required` |
| client B, AAL1 | `403 mfa_aal2_required` |
| trainer, AAL1 | `403 mfa_aal2_required` |
| trainer TOTP enroll → challenge → verify | `200`; resulting claim `aal2` |
| trainer, AAL2, own client | `200` |
| trainer, AAL2, client owned by another trainer | `404 owner_client_not_found` |
| trainer, AAL2, invalid client id | `400 invalid_request` |

The AAL2 gate is therefore enforced before the trainer/client ownership
operation, and ownership isolation is enforced after AAL2.

### Storage REST

The private test object was created only under the prefixed client-A path and
was deleted after the checks.

| Case | Result |
|---|---|
| trainer, AAL2, upload own object | `200` |
| trainer, AAL2, read own object | `200` |
| client A, AAL1, read own object | `200` |
| client B, AAL1, read client-A object | `400` (denied) |
| trainer, AAL1, read own object | `400` (denied) |
| trainer, AAL2, write client-B path | `400` (denied) |
| client A, AAL1, write own path | `400` (denied) |
| cleanup delete of test object | `200` |

No denied Storage request created or changed an object.

### Portal direct API / client isolation

The portal snapshot RPC was called directly over PostgREST, not through the
UI. Client A received only the A marker and client B only the B marker. Direct
`clients` selects for both client identities returned an empty result for the
cross-client filter. Client A's direct PATCH against client B returned HTTP
`200` with zero affected rows; no foreign data changed.

## Cleanup and residual-state verification

Created only in staging, with the unambiguous prefix
`sec-reg-20260721-final`:

- one synthetic trainer Auth identity and profile;
- two synthetic client Auth identities and profiles;
- two synthetic clients, ownership links, client-user links and visible test
  sessions;
- one private Storage metadata row and one temporary PDF object;
- one verified TOTP factor for the synthetic trainer.

Removed after testing: the object, metadata, sessions, client-user and
client-trainer links, client rows, profiles, Auth identities, Auth users, MFA
factor/challenges and refresh/session rows. Final staging counts for all of
those prefixed resources are zero; Storage objects are zero; no debug signup
identity exists. The append-only `security_audit_events` rows are retained as
the intentional audit trail and are not active test data.

All test sessions were logged out and final counts are `auth.sessions = 0` and
`auth.refresh_tokens = 0`. The temporary secret state file outside the repo
was removed and no matching temporary files remain. Passwords, JWTs, refresh
tokens, service-role keys and full user records are absent from this report,
the repository and terminal output.

## Files and product changes

Changed file: this report only. No application code, migration, Edge Function,
Storage policy or configuration was changed. No product defect was observed;
there is no fix, commit or PR.

## Final statement

Etap bezpieczeństwa Studio Las OS został zamknięty.
