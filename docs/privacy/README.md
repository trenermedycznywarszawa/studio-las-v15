# Studio Las OS — Privacy / RODO technical evidence package

**Status: DRAFT — NOT LEGAL APPROVAL**  
**Prepared:** 2026-09-17  
**Scope:** technical evidence for Issue #12; no legal conclusion, no change to runtime, schema, production data, Auth, RLS, Storage or deployment.

## Purpose

This package separates technical facts from decisions reserved for a qualified Polish privacy/RODO reviewer.

It is based on:
- `docs/DATA_POLICY.md`;
- Constitution and Source of Truth Registry;
- current `product-recovery@61fc83cb415bf471ae23b1b75c3b69b42f4c8f2f`;
- read-only inspection of production Supabase project `ufcumhbnuyernuwepcij` on 2026-09-17;
- current production Netlify project `studio-las-os`;
- merged security, MFA, questionnaire and pilot-hardening evidence in repository history.

No client row values were read for this package. Schema/catalog metadata only was queried.

## Files

1. `01_DATA_INVENTORY.md` — application data categories, tables and relevant columns.
2. `02_DATA_FLOWS_AND_PROVIDERS.md` — system flows, providers and known/unknown processor facts.
3. `03_RIGHTS_AND_RETENTION_MATRIX.md` — technical capabilities and unresolved retention/deletion decisions.
4. `04_SECURITY_EVIDENCE_AND_OPEN_GATES.md` — security evidence, remaining gaps and closure conditions for Issue #12.

## Current technical boundary

Studio Las OS intentionally separates:
- public first contact from client records;
- client-authored signals from trainer interpretation;
- trainer drafts from client-safe publication;
- Auth/MFA from application data;
- structured application records from private documents;
- metadata-only security audit from health/process content.

Supabase PostgreSQL is the structured production source of truth. Client-facing material is exposed only through approved projections/workflows. Trainer access is protected by Auth, role/ownership checks, RLS and AAL2/MFA. The application does not use browser `localStorage` as a production health/process store.

## What this package does not establish

This package does **not** establish GDPR/RODO compliance and does not choose:
- Article 6 legal bases;
- Article 9 condition for health data;
- whether consent is the correct basis for each processing purpose;
- final retention periods;
- processor/DPA sufficiency or transfer mechanism;
- DPIA requirement;
- final privacy notice wording;
- lawful deletion/restriction rules for former clients;
- tax/business/medical-adjacent retention obligations.

Those remain human/legal decisions.

## Relationship to Issue #71

Issue #71 records an owner-reported verbal legal consultation and an operational decision to keep questionnaire v3.3 active. Its closure explicitly states that it is **not** a written legal opinion, formal DPIA conclusion, processor review, retention schedule or article-by-article GDPR memorandum. It therefore does not by itself satisfy the broader closure criteria of Issue #12.
