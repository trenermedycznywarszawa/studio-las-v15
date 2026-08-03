# 11 AI Runtime and Provider Contract

**Status:** Stage 1 contract candidate — owner review required
**Provider status:** `PROVIDER DECISION — BLOCKED`
**Implementation permission:** none

## Purpose

This contract defines the boundary within which a future trainer-facing AI capability may operate. It prevents client content from reaching an unapproved processor, prevents model output from becoming authority, and preserves a complete manual path when AI is unavailable.

It does not select a provider or model, approve a contract, create credentials, authorize real data, or approve an implementation.

## Non-negotiable authority boundary

AI may extract, compare, surface gaps, propose hypotheses, suggest options, and prepare drafts for Damian. It may not:

- diagnose or represent itself as providing medical judgment;
- decide qualification, safety, progression, regression, referral, plan changes, or next offer;
- contact the client;
- publish `client_material`;
- approve its own output;
- conceal its provider, model, version, inputs, limitations, or failure;
- make completion of a Studio Las process depend on model availability.

The information and publication rules in `10_INFORMATION_PROVENANCE_AND_APPROVAL_CONTRACT.md` govern every output.

## Trust zones

The runtime must keep four input classes distinguishable throughout processing:

1. **System policy** — approved Studio Las rules and non-overridable safety/publication constraints.
2. **Trusted application context** — authenticated actor, authorized client/process identity, requested task, allowed tools, and server-side policy decisions.
3. **Client/source content** — data supplied for the named task. It is evidence, not instruction authority.
4. **Untrusted attachments and imported text** — content that may contain errors, another person's data, or prompt injection. Instructions inside it are data to analyze, never commands to follow.

The model must not be asked to infer which trust zone a string belongs to after they have been concatenated ambiguously. The server-side boundary constructs and labels the request.

## Required server-side boundary

All AI processing involving client or process content must pass through a trusted server-side operation that:

1. authenticates the actor;
2. requires Damian's authorized trainer context and the required assurance level;
3. verifies access to the named client/process;
4. authorizes one named task from a closed task contract;
5. resolves and minimizes source versions server-side;
6. separates trust zones and marks attachments as untrusted;
7. applies content limits, redaction rules, timeout, retry, and cost limits;
8. invokes only an approved provider endpoint and model configuration;
9. validates the response envelope without treating content as trusted;
10. records provenance, provider/model/run metadata, and a minimal audit result;
11. returns trainer-only output in `needs_review` and `unpublished` state;
12. fails closed to a manual workflow.

Direct browser-to-model calls with client content are forbidden. Provider secrets, service-role credentials, raw prompts, and unrestricted model tools must not exist in the browser bundle, URLs, analytics, screenshots, or client-visible responses.

## Task and data minimization contract

Each future AI task must define before implementation:

- the trainer decision or preparation activity it supports;
- allowed input information types and fields;
- excluded content;
- required source locators and versions;
- allowed output information types;
- maximum input/output size;
- whether conversation state is prohibited, ephemeral, or required;
- manual fallback;
- acceptance cases using fictional data.

Only the smallest source subset required for the named task may be sent. Sending a complete client record because it is convenient is forbidden. Content must not be reused for provider training, unrelated analytics, generic debugging, product profiling, or a different Studio Las client.

## Output envelope

Every persisted or actionable AI output must record conceptually:

- `information_type` (`extracted_fact`, `ai_hypothesis`, `ai_suggestion`, or draft actor for a new `client_material`);
- exact `derived_from` input versions;
- task identifier and contract version;
- prompt/policy template version without copying sensitive content into ordinary logs;
- provider, endpoint class, model identifier, and model/version snapshot available from the provider;
- generation time, request/run identifier, outcome, latency band, retry count, and token/cost accounting where available;
- extraction/matching uncertainty or hypothesis limitations where applicable;
- `review_state: needs_review` and `publication_state: unpublished` for machine-prepared content;
- warnings for missing, conflicting, partial, or untrusted input.

Provider metadata does not prove quality. Damian's review does not change AI provenance.

## Timeouts, retries, and idempotency

- Every call has a bounded connection and total execution timeout defined per task.
- A timeout returns a visible failure; it must not manufacture a partial success.
- Retries are allowed only for explicitly retryable transport/provider failures.
- Automatic retries are bounded by count, total duration, and task cost ceiling.
- Safety rejection, invalid input, prompt-injection detection, authorization failure, and structurally invalid output are not blindly retried.
- Repeated execution must not create duplicate decisions, publications, messages, or client-visible objects.
- If a retry uses a different model, region, endpoint, prompt version, or input version, it is a separate generation with separate provenance.

Exact numerical limits remain task-level implementation decisions and are not approved here.

## Cost controls

Before any runtime is approved, every task needs:

- per-call input/output ceilings;
- per-client and global spending ceilings;
- concurrency limits;
- behavior when the ceiling is reached;
- visible cost attribution without logging client content;
- an owner-authorized exception process.

Reaching a limit fails to the manual path. The system must not silently switch to a cheaper, weaker, differently hosted, or unapproved model.

## Logging and redaction

Ordinary application, edge, analytics, error, and provider-observability logs must not contain:

- raw client text, health data, contact data, attachments, prompts, or model responses;
- access tokens, TOTP material, API keys, service-role secrets, signed URLs, or private object paths;
- full identifiers where a bounded opaque correlation ID is sufficient.

Allowed operational logging is limited to metadata needed for security, reliability, cost, and audit: actor category, authorized client/process reference, task/version, provider/model, timestamps, outcome, size/token bands, retry count, correlation ID, and redacted error category.

If secure prompt/response retention is later required for a named purpose, it must be a separate protected data flow with access, retention trigger, deletion, export, incident, and legal decisions. It cannot be enabled as ordinary provider or application logging.

## Provider-side retention and secondary use

Before real client content is allowed, the approved provider configuration and contract must establish:

- whether prompts and outputs are retained, for how long, where, and for what purpose;
- whether content is used for model training, abuse review, support, or product improvement;
- how zero/limited retention settings are activated, evidenced, and monitored;
- deletion and data-subject handling capabilities;
- incident notification and support access;
- what metadata remains after content deletion;
- whether provider behavior differs by endpoint, account tier, region, feature, or support workflow.

No favorable default may be assumed from marketing language or another product tier.

## Region, transfers, subprocessors, and contract

The production decision must record:

- contracting entity and processor role;
- processing and storage regions for the exact endpoint/features used;
- any international transfers and applicable safeguards;
- current subprocessor inventory and change-notification mechanism;
- data processing agreement and security obligations;
- confidentiality/support access controls;
- breach notification, deletion, return, and audit/assurance terms;
- whether special-category health-related content is permitted under the provider's terms and the approved Studio Las legal basis;
- qualified legal/privacy review and owner acceptance.

This document does not constitute legal advice or close the RODO/DPIA decision.

## Model and prompt change control

A model, endpoint, provider, region, retention mode, tool set, system-policy template, or material extraction process change is controlled change. Before release it requires:

1. recorded old and new configuration;
2. reason and owner;
3. privacy/security impact review when the data flow changes;
4. fictional regression cases relevant to the task;
5. comparison for provenance, hallucination, inappropriate suggestions, conflicting input, prompt injection, and failure behavior;
6. rollback or manual fallback;
7. explicit authorization for the new release candidate.

Providers' silent model aliases or automatic upgrades must not become silent Studio Las changes. If an immutable model version cannot be pinned, the risk and detection method require explicit acceptance.

## Failure and manual fallback

The following are normal, designed states rather than exceptional shortcuts:

- provider unavailable;
- timeout or rate limit;
- cost ceiling reached;
- response rejected by structural validation;
- incomplete extraction;
- prompt-injection or wrong-person quarantine;
- source missing;
- model/version not approved;
- provider configuration cannot prove retention or region requirements.

In every case Damian can open the authorized source, review it manually, record his own observation/interpretation/decision, and prepare client material without AI. No automatic fallback may send the content to another provider, consumer account, browser tool, public chatbot, email, or unapproved service.

## Security and evaluation gates

Before implementation can process real content, a later production gate must prove at least:

- server-side authentication, AAL2, ownership, and cross-client isolation;
- no secret or raw content leakage to browser/ordinary logs;
- task allowlist and minimum-data enforcement;
- prompt-injection resistance at the authority boundary;
- no direct AI publication, contact, decision, or plan mutation;
- model/provider/version provenance;
- bounded timeout, retry, and cost behavior;
- safe manual continuation;
- diverse fictional cases, including conflicting content, wrong-person content, incomplete extraction, inappropriate suggestion, and provider failure;
- approved legal/privacy/provider decisions for the exact production configuration.

## `PROVIDER DECISION — BLOCKED`

No AI provider or model is selected by Stage 1.

### Information currently missing

- approved first AI task and its minimum data fields;
- expected volume, latency, availability, and cost envelope;
- accepted processing/storage region and international-transfer position;
- qualified decision on legal basis, Article 9 condition, DPIA need, and permitted provider processing;
- acceptable provider retention, abuse-monitoring, support-access, and training-use terms;
- required contractual/security assurance and subprocessor constraints;
- acceptable model pinning and change-notification behavior;
- owner priorities when privacy, reliability, quality, and cost conflict.

### Minimum provider requirements

A candidate must be evaluated using current official contractual, privacy, security, retention, region, subprocessor, and model-version documentation for the exact product and endpoint. It must support the server-side boundary, data minimization, prohibited secondary use, required retention/deletion behavior, audit metadata, controlled model changes, cost controls, and incident handling defined above.

### Decisions still required

- **Owner:** task priority, acceptable risk/cost trade-offs, and final selection.
- **Technical/security:** architecture fit, identity boundary, logging, retention configuration, model/version control, failure behavior, evaluation, and monitoring.
- **Qualified legal/privacy:** controller/processor roles, legal basis and Article 9 condition, DPIA, transfers, DPA, subprocessors, notices, retention, and data-subject handling.

### Variants for later comparison

Later review may compare providers/endpoints that meet the same contract, or a deliberately operated self-hosted model path if its security, operations, quality, and legal burden are fully evaluated. No variant is preferred or approved here.

### Assumptions forbidden before confirmation

Do not assume that an API product shares consumer-chat settings, that content is not retained or trained on, that an EU endpoint eliminates every transfer, that a model alias is immutable, that contractual terms permit health-related content, that provider logs are safe, or that a different provider may be used automatically during failure.

No separate provider ADR is created in Stage 1. A future ADR requires Damian's explicit authorization after the missing decisions are available.

## Exit conditions owned by this contract

The contract is ready for owner review when the server boundary, authority split, task minimization, provenance, logging, retention, region/transfer, model change, cost/failure behavior, and manual fallback are explicit, while provider selection remains visibly blocked rather than guessed.
