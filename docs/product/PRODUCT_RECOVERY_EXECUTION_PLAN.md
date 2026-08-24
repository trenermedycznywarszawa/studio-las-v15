# Studio Las OS — Product Recovery Execution Plan

**Status:** STAGES 0–4 OWNER ACCEPTED, MERGED AND CLOSED; STAGE 5 PRODUCT DECISION BRIEF, ARCHITECTURE CONTRACT, AND PRD 005 OWNER ACCEPTED, MERGED AND CLOSED; PROTOTYPE AND IMPLEMENTATION NOT AUTHORIZED
**Version:** 2.13
**Updated:** 2026-08-24
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

## 2. Stage 0 closure and audit result

Stage 0 was owner accepted and squash-merged into `product-recovery` as `62f2366e0c77abf2d1413e437173cc82a7735455` on 2026-08-03. The table below preserves the verified entry-state audit and prevents old summaries from becoming current truth.

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

- **Resolved in Stage 0:** `docs/architecture/04_CLIENT_SAFE_SURFACES.md` now follows Constitution v1.1 and Home Guidance System v2.0. Paper, the app, and a deliberate hybrid are valid trainer-selected channels, with one authoritative instruction source and Damian’s approval required before AI-prepared material is published to the client.
- **Source evidence verified on 2026-08-10; controlled archive P2 closed on 2026-08-11:** the two DOCX hashes and interpretation are recorded in `docs/product/STAGE_3_SOURCE_ARTIFACT_MANIFEST.md`. The sources define 26 core prompts plus four conditional module profiles, not an approved 42-question form; seven observation domains are not seven mandatory tests. The encrypted package is canonical in the private controlled-source repository at package/evidence commit `8b290cdb2c665077905c77d91cca7500255a3bb2`; package SHA-256, privacy, checksum, restore, restored-hash, encrypted-backup, and cleanup evidence passed, and access follows that repository's `stage-3/ACCESS_PROCEDURE.md`.
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
- [x] Merge the owner-accepted Stage 0 PR into `product-recovery` as `62f2366e0c77abf2d1413e437173cc82a7735455`.

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

- the nine information types, with `Client Signal` mapped to allowed source-information types rather than added as a tenth type;
- `client_material` as the only type eligible for the controlled Studio Las client-publication lifecycle;
- independent `information_type`, `review_state`, and `publication_state` axes, with visibility kept as a separate authorization/projection rule;
- semantic information objects separated from operational records and artifacts;
- authorship, timestamps, complete `derived_from` links, source locators, uncertainty, versioning, and exact-version approval;
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

**Closure record:** the separate read-only audit completed with `PASS` on 2026-08-10 for exact commit `00412a73e8faeb5187d8fa797e768a8bdb7cbb64` and tree `5f30c4392d191bb88bddf8ee49f928f3d9e0c430`. Damian accepted Stage 3 on 2026-08-11; PR #23 was marked Ready for review and merged into `product-recovery` as `0d9a8e89623ebc7cc9db3edf53fa9550c31f4de3`. The separate controlled source-DOCX archive P2 was then closed on 2026-08-11 by private package/evidence commit `8b290cdb2c665077905c77d91cca7500255a3bb2`; the canonical package, SHA-256, access procedure, filename privacy, checksum, clean restore, restored hashes, encrypted backup, and cleanup evidence are recorded in `docs/product/STAGE_3_SOURCE_ARTIFACT_MANIFEST.md`.

### Stage 4 — PWD workspace and decision conversation

Combine in one client context:

- interview,
- optional Tanita evidence from a prepared package and comparable-measurement context; real PDF upload, parsing, OCR, and import-reliability automation remain Stage 8 concerns,
- selected functional tests,
- observation, client reaction, trainer interpretation, and decision,
- AI-prepared conversation options,
- START, START CONDITIONAL, DEFER/CONSULT, or NOT THIS PRODUCT,
- follow-up draft when an immediate decision is inappropriate.

**Exit gate:** the workspace supports a good professional decision and conversation; it does not pressure a sale or turn a test result into a diagnosis.

**Stage 4 completion record:** `OWNER ACCEPTED, MERGED AND CLOSED — BOUNDED FICTIONAL PROTOTYPE CONTRACT ONLY`. Stage 4A is the delivery slice that proves the complete Stage 4 product contract and exit gate. Damian accepted Stage 4A on 2026-08-16 after an independent read-only audit reported `0 P0 / 0 P1` and the suite reached `52/52 PASS`. Exact accepted head `ad101c87e4eca13ce18517ec9cc8b9277392756b` and tree `41747abd450c60e6f9a2b8c85fb41dae04a1efca` were merged through PR #25 as merge commit `149fb9538a2491bed5cbf71c6885fe789247d541`.

The subsequent read-only Stage 4 Completion Gate mapped every Stage 4 scope item and the roadmap exit gate to that accepted evidence. Interview context arrives through the exact Stage 3 handoff; Tanita comparability, selected observations, client reaction, trainer interpretation, reviewed conversation options, all four decisions, and the unsendable follow-up are demonstrated. The phrase `Tanita PDF ingestion` does not require real upload/parser/OCR in Stage 4: Stage 8 assigns approved document-ingestion automation and Tanita import-reliability evaluation to the period after manual flows work. No product-contract gap remains, and no Stage 4B is required.

This closes Stage 4 only as a bounded fictional product-contract prototype. It does not authorize runtime, real AI, real Tanita ingestion, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, real data, staging, production, deployment, publication, integration with `main`, or Stage 5. Stage 5 requires a separate explicit owner decision.

### Stage 5 — Twelve-week guidance and adaptation loop

The accepted Stage 5 Product Decision Brief defines the product truth for a manual loop beginning from an exact current qualifying Stage 4 `START`. Damian accepted exact head `c16ac756af35b3977fc344babcb374fb29e2afe5` and tree `5d51ce05a9945f67eb259419d0f69ea4e6caa780` after an independent read-only audit reported `READY FOR OWNER ACCEPTANCE DECISION` with `0 P0 / 0 P1 / 1 P2`; PR #27 merged it through `f2ef7c9d07c7e8b9fb88eff723ebc5b74f56c145`. That Brief evidence did not itself authorize Architecture, PRD, prototype, AI, schema, or runtime.

On 2026-08-17 Damian separately authorized autonomous preparation and independent audit of one Stage 5 Architecture Contract from exact base `product-recovery@3298cbf45ad38f5789b93381bb308c5a46fc3329`. The contract remained Draft through two independent final read-only audits and a separate owner acceptance decision, as required. This authorization history did not create PRD, prototype, UI, schema, Supabase, runtime, real-data, AI, or implementation permission.

The accepted Architecture Contract translates this Stage 5 scope without changing Product truth:

- twelve weeks as a commercial and review envelope, not a fixed curriculum;
- start, approximately week-4, approximately week-8, and week-12 review anchors without automatic progression;
- one current trainer-owned focus;
- one authoritative current guidance version;
- trainer-selected paper, app, or deliberate-hybrid channel with a stale-instruction retirement rule;
- minimum-effective guidance with explicit dose and stop/reduction criteria;
- optional task-specific result, response, note, or contextual question only when it can change a decision;
- non-judgmental done-as-planned, changed/partial, stopped, and not-done states, with question as a separate axis;
- explicit trainer review and versioned continue, simplify, progress, regress, replace, pause, channel-change, refer, or close decision;
- selected report-ready evidence without building the Stage 7 report;
- a quiet client-safe projection of Now, Respond or ask, and Published summaries when the app is the selected channel.

**Product Decision Brief exit gate — completed:** exact head `c16ac756af35b3977fc344babcb374fb29e2afe5` and tree `5d51ce05a9945f67eb259419d0f69ea4e6caa780` completely and consistently define the Stage 5 product truth, map it to accepted higher-layer authority, contain no Architecture, PRD, prototype, schema, runtime, or AI decision, and passed independent read-only semantic review with `0 P0 / 0 P1 / 1 P2`. Damian separately accepted that exact artifact; PR #27 merged it through `f2ef7c9d07c7e8b9fb88eff723ebc5b74f56c145`. Completion did not itself authorize Architecture; the later authorization below is separate.

**Architecture Contract exit gate — completed:** exact head `02fcb175460b340d13cf4fc0833081a0ae071706` and tree `34c24a4880ca7543550cd51d912250a28e0b691d` translate the accepted Stage 5 Product truth into exact responsibilities, lineage, channel authority, client-safe publication and withdrawal, failure states, complete manual fallback, and a bounded fictional acceptance model without creating UI, schema, provider, runtime, or implementation decisions. Two independent final read-only audits each reported `0 P0 / 0 P1 / 0 P2`. Damian separately accepted that exact artifact; PR #28 merged it through `37613418cc25ba46bb1f31237d54cc6c113750bd`. Completion does not authorize PRD 005, a prototype, or implementation.

**Downstream fictional prototype exit gate — not currently authorized:** from one exact current qualifying Stage 4 `START`, the complete manual loop works through paper, app, and deliberate hybrid without duplicate truth, AI, integration, or automation; only requested decision-relevant signals return; old guidance cannot remain actionable; selected evidence becomes report-ready without adherence scoring, automatic progression, gamification, or Stage 7 report generation. The fictional prototype must also complete moderated tests with 5–7 representative target users and test the provisional client and trainer time budgets, with Damian explicitly approving or revising the later operational criteria. This gate may be attempted only after the separately accepted Product, Architecture, and PRD layers and a separate explicit prototype authorization.

**Product Decision Brief closure:** on 2026-08-17 Damian separately owner accepted exact head `c16ac756af35b3977fc344babcb374fb29e2afe5` and tree `5d51ce05a9945f67eb259419d0f69ea4e6caa780` after the independent audit result `0 P0 / 0 P1 / 1 P2`. PR #27 merged the accepted Brief through `f2ef7c9d07c7e8b9fb88eff723ebc5b74f56c145`. Status is `OWNER ACCEPTED, MERGED AND CLOSED — PRODUCT DECISION BRIEF ONLY`.

**Architecture authorization and closure:** on 2026-08-17 Damian authorized one Draft Stage 5 Architecture Contract from exact base `product-recovery@3298cbf45ad38f5789b93381bb308c5a46fc3329`, to remain Draft through independent audit and a separate owner decision. After two final audits each reported `0 P0 / 0 P1 / 0 P2`, Damian accepted exact head `02fcb175460b340d13cf4fc0833081a0ae071706` and tree `34c24a4880ca7543550cd51d912250a28e0b691d`; PR #28 merged it through `37613418cc25ba46bb1f31237d54cc6c113750bd`. Status is `OWNER ACCEPTED, MERGED AND CLOSED — ARCHITECTURE CONTRACT ONLY`. That closure did not itself authorize PRD 005 or any downstream work; the later PRD authorization below is separate.

**PRD 005 authorization:** on 2026-08-17 Damian directed `autoryzuj Stage 5 PRD 005`. Under the accepted Product Brief, Architecture Contract, and existing gates, this authorizes exactly one Draft PRD 005 from `product-recovery@03757a7402baa3f288ae31c46452efd354731862` plus minimum Registry and Execution Plan projections. The PRD may define testable behavioral requirements, failure behavior, fictional acceptance cases, and the later moderated-validation contract. It must remain Draft through independent audit and a separate owner decision.

This authorization does not accept the Draft, mark it Ready, authorize merge, or permit prototype work, UI, HTML, CSS, JavaScript, tests, fixtures, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, runtime, real or simulated AI, real data, staging, production, deployment, publication, Stage 6–8, or implementation.

**PRD 005 closure:** on 2026-08-24 Damian separately owner accepted exact head `df0ef4661ebf5ca0ac356eba7ee3bddca743802c` and tree `1853cbcdabdb482c1180753db1c45379b55328d5` after two independent final read-only audits each reported `READY FOR OWNER ACCEPTANCE DECISION` with `0 P0 / 0 P1 / 0 P2`. PR #29 was marked Ready and merged into `product-recovery` as `5026507aa0c2f7f3a0f36a0a78350b8bc5e5d556`. Status is `OWNER ACCEPTED, MERGED AND CLOSED — PRD 005 ONLY`. This closure changes no Product, Architecture, or PRD behavioral truth and creates no prototype, UI, schema, Supabase, runtime, AI, real-data, deployment, or implementation permission.

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
| DIR-01 | DONE | Constitution v1.1, Home Guidance v2.0, AI/channel alignment, and Execution Plan v2.1 merged | PR #20; `62f2366e0c77abf2d1413e437173cc82a7735455`; owner accepted 2026-08-03 |
| PR-21 | DONE | Stage 1 data, permission, and AI contracts owner accepted 2026-08-03; Execution Plan v2.2 remains contract-only with no implementation permission | Draft PR #21; this acceptance commit (`docs: record Stage 1 owner acceptance`; exact SHA recorded in the PR after publication); 18/18 exit gate PASS; 7/7 tests PASS; `git diff --check` PASS; no implementation authorization |
| STG-02 | DONE | Inquiry → phone → Damian decision contract and fictional prototype owner accepted and merged | PR #22; merge `040bce6303c9138ba3b1af6366def54c21bd157c`; Chrome audit PASS; 8/8 regression PASS; 18/18 Stage 2 contract PASS; owner accepted 2026-08-10 |
| STG-03 | DONE | Adaptive full intake → traceable PWD brief → Damian readiness decision | Owner accepted 2026-08-11; PR #23 merge `0d9a8e89623ebc7cc9db3edf53fa9550c31f4de3`; independent read-only audit PASS 2026-08-10 on exact head `00412a73e8faeb5187d8fa797e768a8bdb7cbb64`; controlled source archive P2 closed 2026-08-11 at private package/evidence commit `8b290cdb2c665077905c77d91cca7500255a3bb2` |
| STG-04A | DONE | Fictitious PWD decision-conversation prototype contract owner accepted, merged, and closed | Owner accepted 2026-08-16; PR #25; accepted head `ad101c87e4eca13ce18517ec9cc8b9277392756b`; tree `41747abd450c60e6f9a2b8c85fb41dae04a1efca`; merge `149fb9538a2491bed5cbf71c6885fe789247d541`; independent audit `0 P0 / 0 P1`; Stage 4A `52/52 PASS`; implementation not authorized |
| STG-04 | DONE | PWD workspace and decision-conversation product contract completed by Stage 4A evidence; full roadmap Stage 4 closed | Stage 4 Completion Gate 2026-08-16; all scope/exit-gate requirements mapped; real document ingestion and Tanita import automation remain Stage 8; no Stage 4B; implementation not authorized |
| STG-05-PLAN | DONE | Twelve-week guidance and adaptation loop Product Decision Brief owner accepted, merged, and closed | Owner accepted 2026-08-17; PR #27; head `c16ac756af35b3977fc344babcb374fb29e2afe5`; tree `5d51ce05a9945f67eb259419d0f69ea4e6caa780`; audit `0 P0 / 0 P1 / 1 P2`; merge `f2ef7c9d07c7e8b9fb88eff723ebc5b74f56c145`; no downstream permission |
| STG-05-ARCH | DONE | Stage 5 Architecture Contract owner accepted, merged, and closed | Owner accepted 2026-08-17; PR #28; accepted head `02fcb175460b340d13cf4fc0833081a0ae071706`; tree `34c24a4880ca7543550cd51d912250a28e0b691d`; two final audits each `0 P0 / 0 P1 / 0 P2`; merge `37613418cc25ba46bb1f31237d54cc6c113750bd`; no downstream permission |
| STG-05-PRD | DONE | Stage 5 PRD 005 owner accepted, merged, and closed | Owner accepted 2026-08-24; PR #29; accepted head `df0ef4661ebf5ca0ac356eba7ee3bddca743802c`; tree `1853cbcdabdb482c1180753db1c45379b55328d5`; two final audits each `0 P0 / 0 P1 / 0 P2`; merge `5026507aa0c2f7f3a0f36a0a78350b8bc5e5d556`; no downstream permission |

---

## 10. Next action

Stages 0–4 are owner accepted, merged, and closed as bounded fictional prototype contracts. The narrow PRD exceptions remain historical entry decisions and do not replace the later, separate owner acceptance decisions. Stage 4A was accepted and merged on 2026-08-16 for exact head `ad101c87e4eca13ce18517ec9cc8b9277392756b` and tree `41747abd450c60e6f9a2b8c85fb41dae04a1efca`, after an independent audit reported `0 P0 / 0 P1` and the suite reached `52/52 PASS`.

The Stage 4 Completion Gate confirms that the accepted Stage 4A task `conduct_pwd_and_record_trainer_decision`, contract `stage4-v1`, demonstrates the full Stage 4 product scope and exit gate. Stage 4A remains the delivery-slice name; it is not evidence of an undefined remaining Stage 4 segment. Real document ingestion and Tanita import reliability belong to Stage 8 and do not keep Stage 4 open.

PR #18 remains frozen. Stage 4 is closed. The Stage 5 Product Decision Brief, Architecture Contract, and PRD 005 are owner accepted, merged, and closed at the exact evidence above. The next permissible Stage 5 layer is bounded fictional prototype planning, but it remains unauthorized and requires a separate explicit owner decision.

Prototype work, UI, runtime, real or simulated AI, real Tanita ingestion, schema, SQL, migrations, Supabase, Auth, MFA, RLS, Storage, Edge Functions, real data, staging, production, deployment, publication, integration with `main`, Stage 6, and implementation remain unauthorized.
