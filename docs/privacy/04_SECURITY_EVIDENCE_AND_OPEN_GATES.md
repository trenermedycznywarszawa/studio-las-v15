# Security evidence and open gates

**Status: DRAFT — NOT LEGAL APPROVAL**

## Current technical evidence

### Authentication and trainer security

- Supabase Auth is the production identity system.
- Trainer MFA/TOTP and AAL2 enforcement are part of the production boundary.
- Pilot-hardening evidence records owner-confirmed production trainer login + TOTP success.
- Public self-signup has been verified disabled (`disable_signup=true`).
- Browser code must never contain a service-role key.

### Data isolation

- RLS/owner-scope is the primary database isolation model.
- Client access is intentionally narrower than trainer access.
- Public inquiry ingress does not grant anonymous read access to inquiry/client/process tables.
- Protected trainer writes reuse authenticated/AAL2 server-side boundaries.

### Publication / provenance

- Client-authored source data, trainer interpretation, trainer decision and client-safe publication remain distinct.
- PWD does not automatically publish Guidance.
- Guidance publication is an explicit trainer action/versioned release.
- Questionnaire drafts are not trainer-visible until explicit client submission according to the questionnaire contract.

### Storage and audit

- Client documents are designed for private Supabase Storage, with publication controlled by metadata.
- `security_audit_events` records metadata such as actor, action, table/row/client IDs and changed column names; it is not intended to copy record values.

### Hosting

- Production Studio Las OS is deployed as an allowlisted static bundle to Netlify.
- Current production deploy after PR #82 is `ready` and corresponds to `product-recovery@61fc83cb415bf471ae23b1b75c3b69b42f4c8f2f`.
- The restrictive CSP is a security control and must not be weakened merely to allow hosting-provider-injected UI.

## Technical items completed by this package

- live production schema/category inventory prepared read-only without reading client row values;
- production region recorded (`eu-west-1`);
- current data flows mapped;
- provider/processor unknowns made explicit rather than guessed;
- technical rights capability matrix prepared;
- retention worksheet prepared without inventing legal periods;
- relationship between operational questionnaire consultation (#71) and broader privacy gate (#12) documented.

## Remaining gates before Issue #12 may truthfully be closed

The following are not technical facts that can be invented or auto-approved by this repository:

1. Qualified reviewer identity/role and approval date.
2. Final controller identity/contact details.
3. Purpose + Article 6 basis for each processing operation.
4. Article 9 condition for health-related processing.
5. Final privacy notice / information-duty text matched to actual production flows.
6. Final retention/deletion schedule.
7. Processor/DPA and transfer review for Supabase, email and other actual providers.
8. DPIA decision and rationale.
9. Approved rights-request procedure and identity verification.
10. Approved incident/breach procedure.
11. Backup provider/mechanism, expiry and tested restore/deletion behavior.
12. Tested understandable client export (not raw SQL).
13. Approved correction, restriction and irreversible deletion workflows.

## Pilot decision vs formal closure

The repository contains an operational owner decision, after a reported verbal legal consultation, to keep pre-PWD questionnaire v3.3 active. The closure note for #71 explicitly says this is not evidence of a written formal legal audit, DPIA conclusion, processor review or retention schedule.

Therefore:
- it is accurate to describe the **questionnaire-specific operational gate** as resolved by owner decision;
- it is not accurate to describe the **broader Issue #12 formal privacy/RODO gate** as complete.

## Recommended next action for Issue #12

Use this package as the technical annex for a qualified Polish privacy/RODO reviewer. The reviewer should fill only the legal/organizational decisions above, rather than re-discovering the technical system from scratch.

When those decisions are supplied, update this package with the approved references, implement any required operational changes, validate them, and only then close Issue #12.
