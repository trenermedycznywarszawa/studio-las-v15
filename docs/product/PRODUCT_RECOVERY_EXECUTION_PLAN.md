# Studio Las OS — Product Recovery Execution Plan

**Status:** OWNER ACCEPTED FOR DRAFT PUBLICATION; MERGE PENDING
**Version:** 2.1
**Updated:** 2026-08-03
**Canonical integration line:** `product-recovery`
**No implementation permission:** this document does not authorize runtime, Supabase, production, or real-client-data changes

---

## 1. Role

This is the operational source of truth for the order of Studio Las OS work.

It connects approved product direction with Git and implementation gates. It does not replace Constitution, Product, Architecture, privacy governance, or a scoped PRD.

Authority order:

1. `docs/constitution/`
2. `docs/product/`
3. `docs/architecture/`
4. this execution plan
5. scoped PRD and acceptance contract
6. implementation, code, and runtime

Lower layers may implement approved truth. They may not create it.

---

## 2. Stage 0 audit result

The interrupted turn did not finish Stage 0. The repository contains a valid local documentation candidate, but it has not been pushed or merged. The table below records the verified state and prevents old summaries from becoming truth.

| Source or item | Verified state on 2026-08-03 | Stage 0 decision |
|---|---|---|
| Constitution on `product-recovery@69ea624` | Version 1.0 still treats paper-first as a permanent rule and narrows AI too far. | Supersede with Constitution v1.1 from this Stage 0 branch after Damian accepts it. |
| `docs/product/06_HOME_GUIDANCE_SYSTEM.md` on `product-recovery@69ea624` | Paper owns the morning by default and the app records only a later signal. | Supersede with Home Guidance System v2.0: paper, app, or a deliberate hybrid; one authoritative instruction source. |
| `Studio-Las-OS-Plan-Architektury-v3.md` v3.1 | Valuable product-design input stored outside the canonical repository. Its AI/channel decisions match the approved direction, but its Stage 0 PR assumptions are stale: PR #13 and #17 are already merged. | Adopt its approved product decisions through Constitution, Product, Architecture, and this plan. Do not treat the standalone file as an authority or implementation specification. |
| `Studio-Las-OS-Integration-Map-v1.md` | Historical pre-merge plan for PR #17. It says implementation has not started and makes paper-first guidance the next fixed slice. Both assumptions are now stale. | Preserve as decision evidence only. It does not control the roadmap after Stage 0. |
| PR #13 | Closed and merged as `1d5362e8f40096676532ef3f28908e2fe7df8196`; final staging regression is 25/25 PASS. | Security evidence and ancestor of `product-recovery`; not a branch to merge again and not permission to change production. |
| PR #17 | Closed and merged into `product-recovery` as `c669a79372aae70f63c8b235fd63330c0555ab5e`. | Keep as read-only brief foundation and technical evidence. Its task-orientation acceptance failed and it is not a complete product experience. |
| PR #18 | Open, mergeable Draft at `3dbc61e2f4813ecc4c0f17d6f2217832f4e11466`; one commit ahead and four commits behind `product-recovery` at audit time. | Freeze and preserve. Do not merge, rebase, retarget, or use as the base. Recover components only after approved screen and data contracts exist. |
| Local `agent/trainer-session-brief@aaf527d` worktree | Behind the canonical branch and dirty with mixed documentation, runtime, workflow, test, prototype, and image changes. | Preserve without touching. It is not an integration base and none of its unrelated changes belong to Stage 0. |
| `main@e371c7694f2c30b3bcf1a1bbbab5d3a9ac7b68ba` | Has a separate website-preview commit; it diverges from the OS recovery line. | Not the current OS implementation base. Integrating `product-recovery` with `main` is a later, separately planned decision. |

### Conflict resolution

- The permanent rule is trainer accountability, not compulsory paper.
- A trainer-facing AI assistant may analyze, suggest, and draft. A suggestion remains visibly separate from source facts and from Damian's decision.
- The former phrase "No AI recommendation" in the security-runtime document applied to the existing deterministic `decision-support.js` module. This Stage 0 branch narrows that wording without weakening any security control. A future trainer-facing AI suggestion layer still requires the separate Stage 1 contract.
- Historical `PAPER_FIRST_*` files and dated reviews remain evidence. They cannot override Constitution v1.1 or Home Guidance System v2.0.
- PR #17 and PR #18 are implementation evidence, not sources of product truth.

### PR reuse boundaries

| PR | Preserve | Do not inherit |
|---|---|---|
| #13 | AAL2 enforcement, RLS/Storage/Edge isolation contract, static and authenticated regression evidence. | The old head branch as a new base, any assumption that staging PASS equals production authorization, or any reopening of controls without a new security defect. |
| #17 | Read-only brief composition, provenance and dates, bounded query, empty-state discipline, and its test harness. | The claim that the brief is a complete experience or passed Damian's under-60-second orientation test. |
| #18 | Modular workspace separation, responsive/mobile techniques, accessibility work, visual tokens, and reusable test patterns after file-level review. | Its fixed `Dzisiaj → Brief → Sesja` slice as the architecture of the whole OS, its information hierarchy as approved product truth, or its branch as the implementation base. |

### Unverified assumptions and later decisions

- `docs/architecture/04_CLIENT_SAFE_SURFACES.md` still describes paper as the fixed morning surface and says the app does not guide the morning ritual. This active projection conflicts with Constitution v1.1 and Home Guidance System v2.0; it must be reconciled in a separately reviewed documentation correction before this Stage 0 Draft may merge.
- The adaptive full-intake v2 is described in Plan Architecture v3.1, but neither its claimed DOCX source nor an approved 42-question contract exists in the inspected repository/workspace. Stage 3 cannot begin until that artifact is recovered, versioned, reviewed, and given an explicit owner of truth.
- No AI provider/runtime contract is approved for real client content. Provider, endpoint, retention, region/transfer, logging, cost, fallback, and evaluation remain Stage 1 decisions.
- The final production URL, email/SMTP path, privacy/RODO sign-off, retention schedule, and real-data rollout authorization are not proven complete by the repository evidence inspected here.
- The staging security result does not prove that the same release is deployed and configured in production. Production verification must be a separate controlled release gate.
- PR #18 has technical E2E evidence but no final product acceptance. A passing implementation test cannot substitute for Damian's task test or approved screen contracts.

---

## 3. Permanent decisions

### Product and authority

- The product is the trainer-led Studio Las Method, not the app.
- Damian remains accountable for interpretation, decisions, and client-safe publication.
- Studio Las OS is the operational memory, preparation layer, guidance surface, and publication control for that method.
- The system may improve trainer judgment; it may not silently become the judge.

### AI assistant

Trainer-facing AI may:

- extract facts from approved source material,
- identify missing or inconsistent information,
- propose interview questions,
- suggest hypotheses and alternatives,
- suggest tests, exercises, progressions, regressions, and session structure,
- prepare phone, PWD, follow-up, and report drafts,
- summarize patterns for trainer review.

AI output must remain distinguishable from source facts and trainer decisions. It cannot diagnose, publish, contact the client, change a plan, or present a suggestion as approved meaning without an explicit trainer action.

### Guidance channel

`Paper guides the morning. Trainer gives meaning. App records the signal. Report shows the pattern.` is a design heuristic, not a mandatory interface sequence.

For each client and task, the trainer selects:

- paper,
- app,
- deliberate hybrid.

There must be one authoritative instruction source. The app may present guidance, support a checklist, record repetitions or responses, and collect questions when this improves the process.

### Boundaries that remain

Do not build:

- autonomous client-facing AI coaching,
- auto-diagnosis or automatic progression,
- gamification, streaks, rankings, or compliance scores,
- shame-based red statuses,
- a quantified-self or wearable dashboard,
- a generic SaaS for other trainers,
- duplicate paper and digital plans,
- data collection without a decision, safety, continuity, or report purpose.

---

## 4. Verified technical and Git baseline

### Security foundation

- `446c522ca5c61a9ad01808e7a03ea1ae9138527c` remains the proven secure runtime foundation.
- Security is `CLOSED / PASS`; 25/25 authenticated tests passed.
- PR #13 was merged as `1d5362e8f40096676532ef3f28908e2fe7df8196`.
- MFA/AAL2, RLS, Edge Function, Storage, and client isolation are not reopened by Product Recovery.
- Supabase remains the only application data source of truth.
- Production and real client data remain outside design and staging work.

### Branch truth at Stage 0 entry

- `product-recovery@69ea62446210e4d374d8118176841a4d86a599e1` is the canonical OS integration line.
- `main@e371c7694f2c30b3bcf1a1bbbab5d3a9ac7b68ba` has a separate website-preview commit and is not the active OS development base.
- PR #17 is merged as `c669a79372aae70f63c8b235fd63330c0555ab5e`; its read-only brief remains technical evidence, not the complete product architecture.
- PR #18 is an open Draft at `3dbc61e2f4813ecc4c0f17d6f2217832f4e11466` and has diverged from `product-recovery` (`ahead 1`, `behind 4` at audit time).
- PR #18 must not be merged, rebased, retargeted, or treated as product truth during Stage 0. Its branch remains preserved as implementation evidence until approved screen contracts determine what to recover.

### Stage 0 branch strategy

All Stage 0 documentation changes start from `product-recovery@69ea62446210e4d374d8118176841a4d86a599e1` on one dedicated documentation branch.

No change in Stage 0 may touch:

- runtime JavaScript or HTML,
- Supabase migrations, functions, policies, or configuration,
- production or staging,
- authentication or MFA,
- PR #18 code.

---

## 5. Mandatory gate before any real client data

The 25/25 staging result proves the tested security contract. It does not by itself authorize real data in the new runtime. Real client data may enter Studio Las OS only after one explicit production-readiness decision confirms all three gates below.

### A. Technical and access-control gate

- Production uses Supabase as the only application source of truth; no health, client, session, plan, report, or trainer-note data is persisted in `localStorage`, an offline queue, a demo fixture, a public file, or a parallel spreadsheet.
- Trainer access requires Supabase Auth, the active trainer role, mandatory TOTP MFA, and an AAL2 session. Public signup remains disabled. Recovery and revocation paths are tested without weakening MFA.
- Every Data API object has deliberate object grants and RLS. Exposed tables have RLS enabled and the policy enforces ownership, not only the `authenticated` role. Privileged helpers remain outside exposed schemas or have explicitly restricted execution.
- Cross-tenant tests prove that a trainer cannot access another trainer's client and a client cannot access another client's data. Revocation takes effect as designed.
- The client reads only an explicit client-safe projection. Trainer notes, hypotheses, AI drafts, unpublished reports, technical IDs, and audit data are excluded.
- Storage remains private with explicit client paths, allowed MIME types, size limits, publication metadata, and tested read/write isolation. Client uploads remain disabled until a separate reviewed design is accepted.
- Service-role and AI-provider secrets exist only in trusted server-side operations. Tokens, TOTP material, client content, and raw payloads do not enter URLs, browser bundles, Git, analytics, screenshots, or ordinary logs.
- Backup and restore are verified for the exact release scope; incident ownership, credential rotation, MFA recovery, account revocation, and audit review have executable procedures.
- The exact production release candidate passes the security suite, Data API/RLS/Storage checks, and a controlled end-to-end test with prefixed fictional records before the first real record is created.

Current Supabase guidance confirms that object grants and RLS are separate controls and both must be deliberate: [Securing your API](https://supabase.com/docs/guides/api/securing-your-api).

### B. Privacy and operating gate

- Controller identity, purposes, Article 6 legal basis and Article 9 condition for health-related data are recorded for the actual Studio Las process.
- The privacy notice matches the real flow across the website/form, email, Supabase, hosting, backups, support, and any AI provider.
- Processor agreements, subprocessors, regions, international-transfer safeguards, retention, deletion, export/correction, incident response, and the DPIA decision are approved by a qualified reviewer.
- Data collection is limited to fields with a current process, safety, decision, continuity, or report purpose.
- Formspree email, manual paste, PDF import, Tanita, Polar, and AI each receive a separate approved data-flow decision before real content uses that path.

The European Data Protection Board describes the DPIA as an assessment used to identify safeguards and demonstrate risk control; it is a decision to assess, not a box the AI may close automatically: [EDPB small-business compliance guide](https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en).

### C. AI processing gate

- AI runs through a server-side boundary with an approved provider, contract, endpoint, region/transfer analysis, retention setting, and subprocessor inventory.
- Only the minimum source material needed for the named task is sent. Client content is not reused for unrelated training, analytics, or debugging.
- Prompts, outputs, retries, failures, and model changes have a defined logging and redaction policy; raw client content is not copied into general application logs.
- Source facts, extracted facts, AI hypotheses, AI suggestions, trainer decisions, and client-safe publications remain separate and traceable.
- AI cannot publish, message the client, change a plan, qualify a client, progress/regress an exercise, or close a decision without the explicit Damian action defined for that workflow.
- Failure is safe: Damian can continue manually, and no session or client instruction depends on a model response being available.
- The AI flow first passes diverse fictional cases, including conflicting input, wrong-person attachment, prompt injection inside an uploaded source, incomplete extraction, provider failure, and an inappropriate suggestion.

### Data-environment rule

- Development, automated tests, demos, screenshots, GitHub, staging, and design reviews use fictional or properly anonymized data only.
- Real client data is allowed only in the approved production path after the gates above are signed off.
- The first real-client pilot belongs to the controlled rollout stage, not to Stage 0 or early feature development.

---

## 6. NOW — Stage 0: align product truth

### Goal

Remove the contradiction between the old paper-first prohibition and the approved direction in which AI is a useful trainer assistant and the guidance channel may be paper, app, or hybrid.

### Required changes

- [x] Verify PR #13, #17, and #18 facts rather than trusting old summaries.
- [x] Confirm `product-recovery` as the canonical integration line.
- [x] Define the permanent invariant: trainer accountability and client-safe publication.
- [x] Reclassify Paper/Trainer/App/Report as a design heuristic.
- [x] Define AI as a trainer-facing suggestion and drafting layer.
- [x] Define one authoritative channel per task.
- [x] Prepare Constitution v1.1 on the Stage 0 branch.
- [x] Prepare Home Guidance System v2.0 on the Stage 0 branch.
- [x] Update Product and Architecture projections that still contain absolute paper-first rules.
- [x] Mark historical `PAPER_FIRST_*` documents as evidence, not active product direction.
- [x] Classify Plan Architecture v3.1 and Integration Map v1 as inputs/evidence rather than independent truth.
- [x] Record the mandatory production and AI gate before real client data.
- [x] Prepare this Execution Plan v2.1 on the Stage 0 branch.
- [x] Validate that the Stage 0 diff contains documentation only.
- [ ] Merge the Stage 0 PR into `product-recovery` only after Damian accepts the product direction.

### Exit gate

Stage 0 is complete only when a new contributor can answer consistently:

1. Who decides? Damian.
2. What may AI do? Analyze, suggest, and draft for trainer review.
3. Can the app guide the morning? Yes, when intentionally selected for that client and task.
4. Can paper remain primary? Yes.
5. Can both carry separate versions of the same plan? No.
6. May AI publish or progress a client automatically? No.
7. Which branch is the implementation base? `product-recovery` after the accepted Stage 0 merge.

---

## 7. Implementation roadmap after Stage 0

No phase starts before the previous phase meets its exit gate. Each phase requires its own contract and small Draft PR.

### Stage 1 — Data, permission, and AI contracts

Define before UI:

- source fact, extracted fact, trainer observation, AI hypothesis, AI suggestion, trainer decision, client-safe publication;
- authorship, timestamps, source links, confidence/uncertainty, versioning, and approval state;
- file ingestion boundaries for forms, PDFs, Tanita, and other documents;
- retention, access, audit, and deletion rules;
- model/provider boundary and prohibited logging of client content;
- failure states and human fallback.

**Exit gate:** no AI output can be mistaken for source truth or published without trainer approval; no new schema is approved without mapping to an existing domain concept.

### Stage 2 — First vertical slice: inquiry to phone decision

Flow:

> pasted or imported inquiry → structured facts and gaps → AI-prepared call scenario → Damian's call notes → client reaction → next decision

The slice must support:

- manual paste first; Formspree automation later,
- clear separation of source text and extracted fields,
- suggested questions and communication, not automatic qualification,
- decisions such as continue, send full intake, defer/consult, or not the right product,
- complete audit trail and editability.

**Exit gate:** on fictional cases Damian prepares and closes a call faster, without losing context or accepting AI output blindly.

### Stage 3 — Full intake to PWD preparation

Flow:

> full intake → structured client record → missing/conflicting information → trainer brief → suggested PWD questions and candidate tests

Requirements:

- adaptive full intake is the source, not the legacy 13-section form,
- test suggestions include purpose, what to observe, stop criteria, and what decision the result may change,
- suggestions remain editable and unapproved by default,
- client-safe and trainer-only content stay separate.

**Exit gate:** Damian can prepare the PWD from one coherent brief and trace every important claim to its source.

### Stage 4 — PWD workspace and decision conversation

Combine in one client context:

- interview,
- Tanita PDF ingestion and comparable-measurement context,
- selected functional tests,
- observation, client reaction, trainer interpretation, and decision,
- AI-prepared conversation options,
- START, START CONDITIONAL, DEFER/CONSULT, or NOT THIS PRODUCT,
- follow-up draft when an immediate decision is inappropriate.

**Exit gate:** the workspace supports a good professional decision and conversation; it does not pressure a sale or turn a test result into a diagnosis.

### Stage 5 — Twelve-week program and client portal

Build only after Stages 2–4 prove the upstream model.

Scope:

- week-by-week process structure,
- 90-minute studio session plan,
- home plan from the curated exercise atlas,
- trainer-selected paper/app/hybrid channel,
- digital checklist where useful,
- task-specific repetitions, duration, load, RPE, or response,
- client notes and questions tied to the task,
- plan versioning and publication,
- client portal focused on Today, Plan, and Progress.

**Exit gate:** the client knows what to do and how to ask; Damian sees only information that can improve the next conversation or decision; no duplicate plan or gamification exists.

### Stage 6 — Weekly trainer preparation and session support

AI may prepare:

- what changed,
- unanswered questions,
- missed or modified tasks that deserve a non-judgmental question,
- candidate warm-up, main block, and down-regulation structure,
- alternatives and progressions/regressions,
- questions to ask during the session.

Damian approves the session direction and records the final observation, interpretation, decision, and next step.

**Exit gate:** AI reduces preparation time while the trainer can always see why a suggestion appeared and can ignore or replace it.

### Stage 7 — Twelve-week report and next offer decision

The system assembles evidence; Damian authors and approves meaning.

The report should show:

- starting context,
- selected evidence and comparable measurements,
- meaningful changes,
- adaptations and trainer decisions,
- current capabilities and unresolved limits,
- recommended next direction.

**Exit gate:** the report is useful even when progress is mixed, contains no unapproved AI claim, and supports an honest continuation, independence, referral, pause, or finish decision.

### Stage 8 — Integrations, automation, and controlled pilot

Only after the manual flows work:

- automate Formspree intake,
- automate approved document ingestion,
- evaluate Tanita import reliability,
- evaluate Polar import after defining the minimum useful fields,
- add notifications only where a real missed obligation justifies them,
- pilot one full fictional case,
- then one real client under production privacy controls,
- then 3–5 clients before broader use.

**Exit gate:** automation removes copying without hiding errors, changing decisions, or expanding data collection by default.

---

## 8. Gate for every implementation PR

### Definition of Ready

- one user or trainer decision is named;
- source, owner, visibility, and approval state are defined;
- AI suggestion and trainer decision are separate;
- primary channel and authoritative instruction source are defined;
- scope and forbidden scope are explicit;
- failure and empty states are specified;
- relevant security and privacy boundaries are known;
- acceptance can be tested with fictional data.

### Definition of Done

- acceptance tests pass;
- Supabase remains the only application source of truth;
- Auth, MFA/AAL2, RLS, Storage, and client isolation remain intact;
- source facts, AI output, trainer decisions, and client-safe publication remain distinguishable;
- no automatic client publication or progression exists;
- no duplicate paper/app plan exists;
- phone use is purposeful and accessible;
- the diff is small, auditable, and free of unrelated refactoring;
- Damian confirms usefulness when the change affects his workflow.

---

## 9. Evidence register

| ID | State | Decision or result | Evidence |
|---|---|---|---|
| SEC-01 | DONE | Security CLOSED / PASS, 25/25 | `446c522ca5c61a9ad01808e7a03ea1ae9138527c` |
| PR-13 | DONE | Trainer MFA/AAL2 merged | `1d5362e8f40096676532ef3f28908e2fe7df8196` |
| AUD-01 | DONE | Product Recovery audit merged | PR #14, `6a105b48d00fbf848d8181b5e7bc0e83e31b3085` |
| GIT-01 | DONE | `product-recovery` established as canonical OS line | `f914a2f9ce65d97f0bcfb2e50ba2522c3398a225` |
| PR-17 | EVIDENCE | Read-only brief foundation merged; not complete product architecture | `c669a79372aae70f63c8b235fd63330c0555ab5e` |
| PR-18 | FROZEN | Open Draft preserved for selective recovery after approved contracts | `3dbc61e2f4813ecc4c0f17d6f2217832f4e11466` |
| DIR-01 | ACCEPTED FOR DRAFT | Constitution v1.1, Home Guidance v2.0, AI/channel alignment, and Execution Plan v2.1 | `agent/stage-0-product-truth`; owner accepted 2026-08-03; merge pending |

---

## 10. Next action

Publish the owner-accepted Stage 0 documentation candidate from `agent/stage-0-product-truth` as a Draft PR to `product-recovery` and verify the exact documentation-only diff. Draft publication does not authorize merge; merge still requires a separate explicit owner approval.

Do not merge PR #18, start a new feature PR, change Supabase, or use real client data before Stage 0 is accepted and merged into `product-recovery`.
