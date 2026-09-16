# Studio Las OS — production Supabase Auth configuration gate

## Status

This is a mandatory production checklist for the linked Supabase project.

Repository code cannot prove dashboard or Management API settings. The operator
must capture non-sensitive evidence that the target project matches this gate.

Real client identity, health or process data must not be entered until this gate,
the database rollout, trainer MFA and the privacy/legal gate all pass.

Target project ref currently used by the runtime:

`ufcumhbnuyernuwepcij`

## 1. URL configuration

Set the production Site URL to the exact application entry point:

`https://trenermedycznywarszawa.github.io/studio-las-v15/studio-las-os.html`

Allow exactly the production callback URL above for invitation and recovery.

Production rules:

- no `localhost` URL in the production allowlist,
- no broad `*` or `**` wildcard,
- no repository-root wildcard,
- no retired `studio-management-os-3.0.html` callback,
- no demo callback,
- no HTTP callback,
- no third-party redirect domain.

If a separate staging project is used, its exact staging URL belongs only in that
staging project's allowlist.

The invitation and recovery email templates must use the requested redirect URL
rather than silently falling back to a stale Site URL.

## 2. User creation model

Studio Las OS is invitation-only.

Required production configuration:

- public email sign-up disabled,
- anonymous sign-in disabled,
- phone sign-up disabled unless separately approved and implemented,
- manual identity linking disabled,
- social login providers disabled unless separately reviewed,
- email confirmation remains enabled,
- only the trusted `client-access` Edge Function or an audited administrator may
  invite a client,
- trainer accounts are provisioned administratively and must complete mandatory
  MFA before accessing data.

The absence of a sign-up button in the UI is not sufficient. The Supabase project
setting itself must reject public account creation.

## 3. Password policy

The current client UI enforces 12–128 characters. The Supabase server must enforce
at least the same minimum so API calls cannot bypass the browser rule.

Required production policy:

- minimum length: 12 characters,
- strongest available required-character policy unless the qualified security
  reviewer approves a stronger passphrase-only alternative,
- leaked-password protection enabled where the selected Supabase plan supports it,
- password-change reauthentication reviewed and enabled when compatible with the
  invitation/recovery and trainer MFA flows,
- no temporary passwords sent by Studio Las,
- no passwords stored in Studio Las tables, audit rows, logs, issues or support
  messages.

Changing the project policy must be tested against:

- invitation password setup,
- recovery password setup,
- existing fictional users,
- trainer MFA enrollment and challenge,
- weak-password and leaked-password errors.

## 4. Email delivery

The Supabase default SMTP service is a development aid, not the production mail
system for client invitations and password recovery.

Before production:

- configure a dedicated custom SMTP provider,
- use a dedicated authentication sender address,
- configure SPF, DKIM and DMARC for the sending domain,
- keep authentication mail separate from marketing mail,
- verify delivery to common Polish mailbox providers,
- verify bounce and complaint handling,
- verify that the provider and data-processing relationship are included in the
  privacy/RODO review,
- remove promotional copy, emojis, client health context and user-supplied content
  from authentication templates.

Email templates must contain only the minimum information needed to activate or
recover access. Do not include diagnosis, symptoms, program details, trainer notes
or the client's full profile.

## 5. Enumeration resistance

The password-recovery page intentionally gives the same neutral response whether
or not an account exists.

Verify that:

- the browser response remains neutral,
- Edge Function and Auth errors are not exposed verbatim,
- response timing does not create an obvious account-existence signal during
  ordinary testing,
- support procedures do not confirm account existence to an unverified caller,
- invitations are available only to the owner trainer and are not a public
  endpoint.

## 6. Auth rate limits and abuse protection

Review the project's current Auth rate limits through the dashboard or Management
API. Do not accept undocumented defaults as the production decision.

At minimum record and test limits for:

- password sign-in attempts,
- password recovery requests,
- invitation/email sends,
- token refresh,
- MFA challenge and verification,
- anonymous users, which should be disabled,
- OTP/magic-link endpoints, which should not be part of the Studio Las login
  surface unless separately approved.

Enable CAPTCHA or another Supabase-supported attack-protection control where it is
needed for the public password-recovery request surface. CAPTCHA must not become a
substitute for rate limiting, neutral responses or MFA.

Tests must confirm that rate-limit responses:

- do not reveal account existence,
- do not cause the UI to retry automatically in a loop,
- do not fall back to a weaker authentication route,
- produce a safe user-facing message.

## 7. Session and refresh-token configuration

Review and record the production values for:

- JWT expiry,
- inactivity timeout,
- absolute session lifetime,
- single-session or concurrent-session policy,
- refresh-token rotation and reuse detection,
- session revocation after password recovery,
- session behavior after account revocation,
- session behavior after MFA factor removal,
- trainer lost-device response.

The chosen values must balance the low-frequency Studio Las workflow with the
risk of an unattended or stolen trainer device.

Required behavior regardless of exact durations:

- revoked client relationship loses RPC/Storage access immediately through RLS,
- disabled/deleted Auth user cannot refresh a session,
- password reset does not bypass pending MFA for trainers,
- expired or replayed refresh tokens fail closed,
- logout clears the current tab's session and pending password/MFA context.

Do not document access tokens, refresh tokens or JWT contents in the PR evidence.

## 8. Email callback verification

Using fictional staging accounts, test the real delivered links for:

- client invitation,
- password recovery,
- expired invitation,
- reused invitation,
- expired recovery,
- reused recovery.

Record whether the configured project delivers:

- hash-session callbacks containing access/refresh tokens, or
- authorization-code/PKCE callbacks.

The current runtime supports the reviewed `invite` and `recovery` hash-session
callback contract. If the target project delivers an authorization code instead,
stop the release. Do not manually copy tokens or disable PKCE. Implement and
review a proper code-exchange flow first.

## 9. Auth audit and alerting

Before production define how Studio Las will review and respond to:

- repeated failed trainer logins,
- MFA enrollment or factor removal,
- password recovery,
- client invitation and revocation,
- unusual geographic or device activity where available,
- email-delivery failures,
- rate-limit spikes,
- account lockout,
- compromised trainer email or device.

Supabase Auth audit evidence and Studio Las metadata audit serve different
purposes. Neither may contain passwords, TOTP codes, factor secrets or raw tokens.

## 10. Evidence required in PR #9

Add a non-sensitive comment with:

- production Site URL,
- exact redirect allowlist entries,
- confirmation that public and anonymous signup are disabled,
- password-policy settings without example passwords,
- leaked-password protection status and plan limitation if unavailable,
- SMTP provider name and verified sender domain, without credentials,
- SPF/DKIM/DMARC pass status,
- recorded Auth rate-limit categories and test result,
- CAPTCHA/attack-protection decision,
- session-policy summary,
- invitation and recovery callback format,
- fictional-account test matrix,
- date and operator of the review.

Do not include:

- Supabase access tokens,
- database passwords,
- SMTP credentials,
- Auth JWTs,
- invitation/recovery links,
- real email addresses,
- real client information.

## Stop conditions

Stop deployment rather than weakening controls if:

- exact redirects cannot be configured,
- public signup remains enabled,
- server password policy is weaker than the application rule,
- production email depends on default Supabase SMTP,
- email callbacks differ from the implemented and reviewed contract,
- rate limits or abuse protection cannot be verified,
- trainer sessions can access data without the required AAL2 MFA state,
- revocation does not immediately block data access,
- a fix would require a browser service-role key, disabling RLS or making a bucket
  public.
