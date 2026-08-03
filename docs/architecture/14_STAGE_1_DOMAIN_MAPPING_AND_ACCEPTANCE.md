# 14 Stage 1 Domain Mapping and Acceptance

**Status:** Stage 1 contract candidate — owner review required
**Schema status:** `SCHEMA — NOT APPROVED`
**Data rule:** fictional cases only

## Purpose

This document maps the Stage 1 contracts to existing Studio Las domain concepts and current implementation evidence without approving reuse, new structures, tables, fields, SQL, migrations, or runtime behavior.

It also defines contract acceptance cases. These are semantic tests for later PRD and implementation, not executable tests and not evidence that production is ready.

## Mapping rules

- The domain concept comes before storage.
- Existing code and SQL are audit inputs, not sources of product truth.
- `reuse_candidate` means “inspect further,” not “approved to reuse.”
- `gap` means the current structures do not visibly preserve the required meaning.
- `blocked` means a legal, security, owner, or upstream decision is missing.
- One information object need not equal one table, and one table must not silently mix meanings.
- Any future schema proposal needs a separate scoped ADR/PRD answering the existing data-model decision test.

## Domain-to-current-state mapping

| Stage 1 concept | Domain object / decision supported | Current implementation evidence to inspect | Lifecycle | History | Owner | Visibility | Semantic reuse risk | Later gap / ADR question | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `source_artifact` | Source Evidence supporting a client/process decision | `client_documents`; `client_intakes.raw_payload`; private Storage contract | Persistent only for approved purpose; quarantine may be temporary | Immutable original and replacement relation required | Studio Las; source authorship remains explicit | Trainer/system; client only through separate approved material | Existing document status combines audience/publication and lacks complete integrity/reprocessing semantics | How to preserve hash, source version, quarantine, claimed/confirmed subject, and deletion dependencies | `gap` |
| `source_fact` | Source Evidence / Client Context | Intake fields, measurement source fields, source text currently embedded in records | Persistent when decision-relevant; otherwise temporary | Source wording and locator history required | Original source actor; Studio Las records it | Trainer by default | Existing fields may look verified although they are only claims from a source | How to represent exact source statement and locator without duplicating the source | `gap` |
| `extracted_fact` | Structured Source Evidence supporting preparation | `client_intakes`; `body_measurements` parse metadata; existing import records | Working until reviewed; persistent when used by downstream decisions | Extraction run, correction, and process/model version required | Extraction actor/runtime; Damian reviews | Trainer-only before a separate client material | Current parse fields do not prove exact locator, complete lineage, or immutable corrected versions | Whether existing measurement/import structures can preserve extraction provenance safely | `reuse_candidate` |
| `trainer_observation` | Session Observation / Measurement Observation | `sessions.trainer_observation`; `post_session_observations`; `assessment_results`; `training_load_observations` | Persistent when decision-relevant | Version/correction history required for material use | Damian | Trainer-only by default | Several structures overlap; observation may be mixed with decisions or client summaries | Which existing domain object owns observation in each workflow without creating duplicate truth | `reuse_candidate` |
| `ai_hypothesis` | Working Trainer Hypothesis support | `clients.working_hypothesis` is current evidence only | Temporary or working; persist only for continuity/audit purpose | Generation and disposition history required when used | AI authors; Damian owns any later interpretation | Trainer-only | Current field suggests one mutable hypothesis and does not distinguish AI from trainer authorship | Whether Trainer Hypothesis needs versioned provenance independent of current client field | `gap` |
| `ai_suggestion` | Decision Support input, never a decision | No approved persistent structure; deterministic `decision-support.js` is not an AI suggestion store | Prefer temporary; persist only when needed for review/audit/continuity | Preserve version if accepted/rejected or used downstream | AI authors; Damian accepts/rejects | Trainer-only | Reusing task, decision, or note fields would make suggestion look authoritative | Define minimal persistence and relation to a later trainer decision | `gap` |
| `trainer_interpretation` | Trainer Interpretation | Measurement/assessment interpretation fields; notes; report preparation | Working or historical when decision-relevant | Version and uncertainty history required | Damian | Trainer-only by default | Current fields are distributed and may combine interpretation with summary | Decide ownership by workflow and avoid automatic conversion to fact/client copy | `reuse_candidate` |
| `trainer_decision` | Next Decision / Session, guidance, safety, report decision | Decision fields in sessions, assessments, observations; home-plan status | Persistent when it changes process | Decision, rationale, supersession, actor/time required | Damian | Trainer; communicated through separate client material | Enumerated legacy values and plan statuses may encode implementation-era vocabulary or mix action with state | Map each decision to the Studio Las Method before reuse | `reuse_candidate` |
| `client_material` | Client-safe Summary, Guidance, Report, or Communication | Client-summary fields; `home_plans`; `home_plan_items`; `reports`; `client_documents` | Draft through approved publication/withdrawal lifecycle | Exact content versions, approvals, publications, withdrawals | Damian approves; drafting actor recorded | Client only when exact version is published | Existing `client_visible`, `audience`, `status`, and `published_at` fields collapse independent axes and do not prove exact-version approval | Unified conceptual publication contract across surfaces without making one generic content table by default | `gap` |
| `derived_from` | Evidence Lineage supporting accountable decisions/publications | `document_id`; `related_table`/`related_id`; session and home-plan foreign keys; import records | As long as derivative/audit purpose remains | Immutable version-specific lineage required | System preserves; Damian reviews exceptions | Trainer/system; client citations only when intentionally exposed | Current relations are sparse, sometimes row-level rather than version-level, and usually single-source | How to represent many-input, exact-version lineage and downstream invalidation | `gap` |
| Review state | Damian's content review process | Various `status`/`quality_status` fields | Per exact information version | State-event history required | Damian for approval/rejection | Trainer; client never sees internal review state by default | Existing statuses carry domain lifecycle or publication meaning and cannot be treated as one universal review state | Context-specific projection of the closed review vocabulary | `gap` |
| Publication state | Client availability of one exact approved version | `published_at`, `client_visible`, `audience`, `status`; client-safe RPC projections | Through publish/withdraw lifecycle | Publication/withdrawal history required | Damian initiates; system enforces | Client only for published version | Current fields can disagree and do not prove version binding or withdrawal | Design one enforcement contract across reports, guidance, summaries, and documents | `gap` |
| Source ingestion | Source Evidence acquisition and validation | `client_documents`, private Storage, import batches/records, Tanita parse fields | Source-profile dependent | Acquisition, quarantine, extraction, reprocessing history | Damian/authorized service | Trainer/system before publication transformation | Existing bucket is PDF-only and current schema does not constitute a general ingestion contract | Separate source profiles, safety processor, quarantine, identity resolution, and legal flow | `blocked` |
| Audit | Accountability and security evidence | `security_audit_events` metadata-only audit | Retention class pending legal/security decision | Append-only meaning | Studio Las security/operations | Privileged review only | Existing audit records row/column mutation, not semantic approval, lineage, provider run, publication, or deletion workflow | Extend concept without copying sensitive content; exact implementation later | `reuse_candidate` |
| Retention/deletion/export | Data Lifecycle | `deleted_at`; access revocation; Storage deletion; backups; no complete cross-system workflow | Purpose/legal-class dependent | Request, decision, action, failure, processor/backup evidence | Studio Las with qualified legal/privacy authority | Requester receives approved result; internals remain protected | Soft delete and individual table behavior cannot prove end-to-end deletion or lawful retention | Retention schedule, DPIA/legal basis, dependency handling, export, providers, backups | `blocked` |
| AI runtime/provider | Trainer-facing AI preparation boundary | No approved AI runtime/provider integration | Ephemeral by default; exact task/provider policy required | Run/config/model metadata when output is used | Studio Las; Damian owns supported decision | Trainer-only outputs | Choosing from code convenience would create provider, logging, transfer, and retention truth by accident | Complete provider/legal/security/owner decision after task definition | `blocked` |

No row approves a future table or field. Existing names above identify audit evidence only.

## Acceptance notation

- `S1`, `E1`, `H1`, `G1`, `I1`, `D1`, and `M1` denote fictional versions of source, extracted fact, AI hypothesis, AI suggestion, trainer interpretation, trainer decision, and client material.
- `M2 supersedes M1` denotes a new immutable material version.
- “None” under client visibility means no client surface returns the object.
- Every audit event below is metadata-only and must not copy raw sensitive content into ordinary logs.

## Contract acceptance cases — source, extraction, and AI

| ID and fictional case | Type / review / publication | `derived_from` and version | Damian sees / required action | Client visibility | Audit event | Critical error prohibited | Manual fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A01 Valid inquiry | `source_artifact` S1 plus reviewed `extracted_fact` E1; E1 `approved`; both `unpublished` | E1 → S1 with exact fields/ranges; v1 | Original beside extraction; confirm/correct E1 before use | None | Acquire, associate, extract, approve | Treat form claims as verified truth or client material | Read S1 and record selected facts manually |
| A02 Contradictory inquiry | S1; E1/E2 `extracted_fact`, `needs_review`, `unpublished` | Each fact → conflicting S1 locators; v1 | Conflict is prominent; resolve or preserve uncertainty | None | Conflict detected and disposition | Silently choose one answer | Ask during call and record later source/decision |
| A03 Missing information | S1 plus only present extracted facts; `needs_review`; `unpublished` | Facts → S1; missing item has no fabricated object | Sees “not provided,” may create a question/suggestion | None | Incomplete extraction | Store missing as “no” | Review form and ask manually |
| A04 Incorrect extraction | E1 `extracted_fact`, `rejected`, `unpublished` | E1 → S1; v1 | Original and error visible; reject/correct | None | Extraction rejected | Use E1 downstream after rejection | Transcribe correct fact from S1 |
| A05 Manual correction | E2 `extracted_fact`, `approved`, `unpublished` | E2 → S1 and `supersedes` E1; v2 | Reviews exact correction and source locator | None | Corrected by Damian | Overwrite E1 or source | Record corrected v2 manually |
| A06 Another person's document | S1 `source_artifact`, `needs_review`, `unpublished`, quarantined | No client lineage until confirmed; v1 | Identity conflict; reject/reassign/quarantine | None, especially not alleged client | Proposed match rejected/reassigned | Auto-attach on AI probability | Handle securely outside client record under approved process |
| A07 Prompt injection in attachment | S1 remains source; any E1 `needs_review`, `unpublished` | E1 → S1 content locator; v1 | Suspicious text shown as data, not instruction; decide quarantine/use | None | Injection signal and outcome | Attachment changes system policy, tools, scope, or recipient | Read safe portions manually |
| A08 Inappropriate AI suggestion | G1 `ai_suggestion`, `rejected`, `unpublished` | G1 → reviewed inputs; v1 with model/run | Rationale/limits visible; reject | None | Suggestion rejected | Execute/publish suggestion automatically | Damian chooses a safe action independently |
| A09 Model timeout/failure | No fabricated information object; run failed | Attempt references intended source versions and config | Visible failure; continue manually | None | Timeout/failure, retries, cost | Empty output presented as success or silent provider switch | Complete task from sources |
| A10 Model changes between analyses | G1 and G2 remain distinct `ai_suggestion`, `needs_review`, `unpublished` | Each → same exact inputs; separate model/config versions | Compares differences; accepts neither by default | None | Controlled model/config change and both runs | Overwrite G1 or hide model change | Use prior approved manual process |
| A11 Damian rejects suggestion | G1 `ai_suggestion`, `rejected`, `unpublished` | Provenance retained; v1 | Rejection and reason; makes separate decision if needed | None | Review rejected | Convert rejection into low-confidence decision | Record `trainer_decision` independently |
| A12 AI unavailable runtime | No AI object; process remains open/manual | Existing sources unchanged | Sees manual path and no false blocker | None | Runtime unavailable | Prevent call/session/report work | Manual review and drafting |
| A13 Missing original source | E1 remains `extracted_fact`, returns to `needs_review`, `unpublished` | E1 → unresolved S1 reference; v1 | Integrity warning; recover source or limit use | None | Source unavailable and dependencies flagged | Detach E1 and treat as source truth | Reacquire source or ask client |
| A14 Partially read document | E1 facts `needs_review`, `unpublished`; extraction run partial | Each → readable S1 locator; unread ranges explicit | Reviews read/unread scope; may transcribe manually | None | Partial outcome | Mark complete or interpret blank as negative | Read remaining pages manually/request better file |
| A15 Client mismatch after extraction | S1/E1 quarantined, `needs_review`, `unpublished` | E1 → S1; client association revoked, not relinked silently | Resolve identity and downstream impact | None | Mismatch and association change | Keep facts on wrong client | Correct association under approved process |
| A16 Exact file reprocessing | E2 `extracted_fact`, `needs_review`, `unpublished` | E1 and E2 → same S1 hash; separate extraction versions | Compares run/process differences | None | Reprocessing run | Overwrite E1 or create second original | Re-read S1 manually |

## Contract acceptance cases — client material and state separation

| ID and fictional case | Type / review / publication | `derived_from` and version | Damian sees / required action | Client visibility | Audit event | Critical error prohibited | Manual fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A17 Create material from AI suggestion | M1 `client_material`, `needs_review`, `unpublished`; G1 remains `ai_suggestion` | M1 → G1 and every material source behind G1; v1 | Draft, lineage, AI authorship; edit/approve/reject | None | Material created | Change G1's type/status into client content | Damian writes M1 from sources |
| A18 Publish AI suggestion directly | G1 `ai_suggestion`, any review, always `unpublished` | G1 provenance retained; v1 | Forbidden action and reason | None | Attempt denied | `ai_suggestion` becomes published | Create and approve separate M1 |
| A19 Publish material in `needs_review` | M1 `client_material`, `needs_review`, `unpublished` | Complete lineage; v1 | Must review exact v1 | None | Publish attempt denied | Publish because draft looks safe | Review and approve or rewrite |
| A20 Publish rejected material | M1 `client_material`, `rejected`, `unpublished` | Lineage retained; v1 | Rejection remains final for v1 | None | Publish attempt denied | `rejected` + `published` | Create M2 and review anew |
| A21 Publish approved exact version | M1 `client_material`, `approved`, then deliberate `published` | Complete lineage; exact approved v1 hash | Separate approve and publish actions for named use | Exact M1 v1 only | Approval then publication | Publish different bytes/use/client | Damian hands over exact approved offline copy under recorded process |
| A22 Edit after approval | M1 stays approved; M2 `client_material`, `needs_review`, `unpublished`, supersedes M1 | M2 keeps lineage and relation; v2 | Reviews changed v2; new approval required | M2 none; M1 only if still valid/published | New version and denied unapproved publish | Silent edit under M1 approval | Review/publish M2 deliberately |
| A23 Withdraw published material | M1 `client_material`, `approved`, `withdrawn` after prior `published` | v1, lineage and publication history intact | Gives reason and withdrawal action | No longer displayed | Withdrawal with original publication data | Delete audit or continue showing M1 | Remove physical handout/use and record replacement as applicable |
| A24 Hypothesis status changed to fact | H1 remains `ai_hypothesis`; state change denied; `unpublished` | H1 provenance retained; v1 | Sees invalid type-mutation attempt | None | Attempt denied | `ai_hypothesis` → `source_fact` through status | Create separately sourced fact or Damian interpretation |
| A25 Remove `derived_from` before publish | M1 remains `client_material`, `approved`, `unpublished` until lineage restored/reapproved as needed | Missing link makes gate fail; v1 | Missing provenance and affected source visible | None | Lineage removal/attempt denied | Publish provenance-detached content | Rebuild M1 from known sources |
| A26 Multi-source material; one source later wrong | Published M1 moves to `withdrawn`; replacement M2 `needs_review`, `unpublished` | M1 → S1,S2,S3; S2 invalidated; M2 keeps valid/corrected lineage | Reviews impact, withdraws/revalidates, prepares M2 | M1 removed; M2 none until approved/published | Source invalidation, dependency flag, withdrawal | Keep M1 live or silently remove S2 | Correct message directly and publish approved replacement |
| A27 Approved hypothesis published without material | H1 `ai_hypothesis`, even if `approved`, remains `unpublished` | H1 → sources; v1 | Approval is review of hypothesis, not communication | None | Publish attempt denied | Approval changes epistemic type | Create separate M1 |
| A28 Material derived from trainer decision | D1 `trainer_decision`; M1 `client_material`, `needs_review`, `unpublished` | M1 → D1 and material supporting inputs; v1 | Confirms wording and intended use | None until exact approval/publication | Material created/reviewed | Expose raw decision/rationale automatically | Damian communicates decision directly and records material if needed |

## Contract acceptance cases — lifecycle and access

| ID and fictional case | Type / review / publication | `derived_from` and version | Damian sees / required action | Client visibility | Audit event | Critical error prohibited | Manual fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A29 Data correction request | Affected objects keep type; corrected versions return to appropriate review; publications may be withdrawn | Dependency graph preserved; new versions supersede old | Verify requester/scope, review corrections and dependencies | Only approved current material; no other-person/trainer-only data | Request, verification, versions, outcome | Overwrite source/history or expose internal notes | Secure manual review and response |
| A30 Deletion request | Types unchanged until approved disposition; visibility restricted as required | Dependencies enumerated before deletion/anonymization | Verify identity, legal exceptions, providers/backups, record outcome | Only what remains lawfully/currently published; then removed as decided | Request through completion/failure | Soft-delete one row and claim complete deletion | Execute documented cross-system checklist manually |
| A31 Access revoked | Existing information types/states unchanged; authorization closed | Content lineage unchanged | Confirm owner-scoped revocation and outcome | No future client access | Grant/revoke/session outcome | Delete process data automatically or leave active access | Revoke through controlled admin path and verify |
| A32 Published source later unavailable | M1 may become `withdrawn`; dependent objects `needs_review` as appropriate | Unresolved S1 remains recorded; versions intact | Recover source, assess impact, withdraw/revalidate | No affected material while unresolved unless explicitly justified | Source loss, dependency review, withdrawal/revalidation | Detach lineage and continue silently | Reacquire source or issue approved correction |
| A33 Duplicate file for second claimed client | One S1; second association remains pending/quarantined | Association relation separate from artifact version | Compare identity evidence; reject or confirm deliberately | None to either client by acquisition alone | Duplicate and association decision | Share one person's source with another | Obtain correct source separately |
| A34 Export request | Export artifact is controlled output, not `client_material`; source types unchanged | Export manifest references included exact versions | Verify requester, scope, exclusions, delivery | Requester sees only approved lawful scope | Request, generation, delivery/expiry | Include other clients, raw audit, or secrets | Prepare reviewed encrypted export manually |

## Acceptance requirements across every case

Every later implementation test must assert:

- information type, review state, and publication state independently;
- exact input and output versions;
- complete `derived_from` relations;
- Damian's required action and authority;
- client projection behavior;
- metadata-only audit behavior;
- safe manual continuation;
- denial of the named critical error.

Passing a happy path cannot compensate for a forbidden transition that remains possible.

## Stage 1 decision register

### Contract decisions made

- Nine information types are defined; `client_material` is the only client-content type.
- Review and publication states are independent from type and from each other.
- Exact-version approval and complete `derived_from` lineage are mandatory.
- AI content is trainer-only by default and cannot publish, decide, contact, or mutate a plan.
- Original sources remain separate and immutable in meaning.
- Ingestion is fail-closed on wrong-person, prompt-injection, unsupported, and partial-content risks.
- Lifecycle covers providers, attachments, exports, audit, access revocation, dependencies, and backups.
- Manual completion without AI is mandatory.

### Decisions blocked or deferred

- AI provider, model, endpoint, region, retention, DPA, subprocessor, transfer, and cost selection;
- approved first AI task and exact minimum input;
- schema and implementation structures;
- source-profile MIME/size/parser/safety limits;
- final retention periods, legal bases, Article 9 condition, DPIA, notices, and deletion exceptions;
- production authorization and use of real client data.

Blocked/deferred decisions are visible contract outcomes. They do not authorize assumptions.

## Stage 1 exit-gate assessment template

Stage 1 may be reported ready for owner contract review only if repository validation confirms all of the following:

- [ ] information types contain no review/publication state;
- [ ] `client_material` is the only client-content type;
- [ ] the three axes remain independent;
- [ ] every derivative preserves `derived_from`;
- [ ] AI-based material is a new object, not a type/status mutation;
- [ ] publication requires `approved` plus Damian's auditable exact-version approval and a separate publication action;
- [ ] rejection blocks publication;
- [ ] withdrawal preserves history and removes client visibility;
- [ ] approval changes neither provenance nor epistemic type;
- [ ] source integrity, wrong-person handling, and prompt injection are covered;
- [ ] AI runtime, logging, retention, transfer, model change, failure, and manual fallback are contracted or explicitly blocked;
- [ ] legal, security, owner, and implementation decisions remain visible;
- [ ] mapping does not approve schema or implementation by implication;
- [ ] all acceptance cases above are present;
- [ ] the seven exact inherited regression commands and `git diff --check` pass on the final tree.

If any item fails, the required outcome is:

`STAGE 1 — BLOCKED BEFORE OWNER CONTRACT REVIEW`
