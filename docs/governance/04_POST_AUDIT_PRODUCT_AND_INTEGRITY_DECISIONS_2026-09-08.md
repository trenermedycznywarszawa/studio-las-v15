# Studio Las OS — Post-Audit Product & Integrity Decisions

**Status:** OWNER ACCEPTED — canonical decision record  
**Date:** 2026-09-08  
**Owner:** Damian / Studio Las  
**Scope:** product direction, publication integrity, historical truth, release/recovery discipline, client UX, trainer UX, data minimisation and sequencing of the rebuild  
**Authority:** this record is an explicit Owner Decision. It supplements the Master Spec and specializes the areas named below. Existing Constitution, security, provenance, lifecycle and privacy contracts remain authoritative in their own scope.

---

## 1. Why this decision exists

A read-only product, UX, architecture and engineering audit of the current Studio Las OS established that the product does **not** need a full rewrite.

The current stack and several domain foundations are useful and should be preserved. The material weaknesses are concentrated in:

1. publication integrity,
2. historical truth,
3. production reconstructability,
4. the order in which the client interface asks a person to act,
5. the order in which the trainer interface presents information for a decision,
6. unnecessary or premature data collection and product complexity.

The strategic decision is therefore:

> **Preserve the core. Rebuild selected boundaries and interaction flows. Do not restart the application.**

The purpose of the rebuild is not to make Studio Las OS larger. It is to make the service more trustworthy, easier to operate and more coherent for the client.

---

## 2. Product goal after the audit

Studio Las OS should strengthen the 1:1 service so that:

- the client immediately understands the current agreed action,
- the client understands why it matters and what boundary applies,
- the client can report what happened without feeling judged by a tracker,
- Damian sees the exact changed or unresolved context that can alter today's decision,
- published guidance can be trusted as the instruction that was actually approved and delivered,
- original client observations retain their historical meaning,
- the 12-week report can credibly explain regained capability using preserved evidence,
- production can be reconstructed from controlled sources with the intended security boundaries.

The product is successful when it improves **judgment, continuity, trust and evidence of change**. It is not successful because it has more screens, metrics or automation.

---

## 3. Architecture decision — preserve the current core

### Preserve

Unless a later implementation finding proves a specific component unsafe or economically irrational, preserve:

- Supabase,
- the small browser JavaScript frontend,
- RLS and owner/client authorization boundaries,
- trainer MFA / AAL2,
- explicit trainer judgment,
- PWD as a selective workflow,
- inquiry decisions,
- controlled client projections,
- the existing Guidance Release concept and lineage,
- cycle decisions,
- reports as a publication container,
- paper / app / deliberate hybrid channel choice.

### Do not do

Do not use the audit as justification for:

- framework migration,
- microservices,
- a new backend,
- a generic workflow engine,
- an enterprise event-sourcing architecture,
- a new design system project before core journeys are corrected.

The principal engineering problem is **where invariants are enforced**, not the programming language or framework.

---

## 4. P0 invariant — published guidance must be complete and immutable

### Problem

The current publication flow can validate that at least one included task is complete while publishing other active tasks that are incomplete. Authorized trainer writes can also mutate prescribed content after publication or bypass parts of the intended publication lifecycle.

This means explicit publication exists, but publication is not yet a trustworthy boundary between draft and approved client instruction.

### Decision

A release may be published only when **every included action** required by the release satisfies its publication contract.

At minimum, each included action must have all client-critical fields required by the current domain contract, including the intended action, dose/instruction and relevant stop or boundary criteria where applicable.

After publication:

- client-critical prescribed content is immutable,
- silent in-place edits are forbidden,
- a meaningful change creates a new draft/version and requires a new deliberate publication,
- withdrawal and delivery metadata may change only through controlled lifecycle operations,
- client history must continue to point to the exact instruction version that applied at that time.

### Why

Without this invariant:

- the client can receive incomplete guidance,
- historical events can later refer to a prescription that was not actually delivered,
- a 12-week report can misrepresent the process,
- an administrative mistake can defeat the intended approval workflow.

### Implementation principle

Prefer the smallest robust model:

**editable draft → complete-set validation → deliberate publication → frozen published content → new draft for changes.**

Do not introduce enterprise event sourcing unless a demonstrated future requirement justifies it.

---

## 5. P0 invariant — production must be reconstructable

### Problem

The audit established only partial production reconstructability. Application and Edge Function source can largely be matched to controlled source, but the full production database/security surface is not yet proven replayable from one unambiguous migration and release chain.

### Decision

A release is operationally trustworthy only when Studio Las can identify:

- source commit / source equivalent,
- built artifact identity,
- database migration mapping,
- Edge Function revision identity,
- relevant non-secret configuration references,
- staging verification evidence,
- a tested recovery path for database/Auth/Storage responsibilities appropriate to the current plan and architecture.

A small release manifest is preferred over a new deployment platform.

### Why

A system that works today but cannot be reconstructed reliably is fragile precisely when failure, migration or security recovery matters most.

---

## 6. Historical truth — original client observations must be preserved

### Problem

Client-origin observations can currently be edited by trainer-authorized paths, while ordinary audit metadata does not preserve the previous field values required to reproduce the original client statement.

### Decision

Original client-origin observations are historical evidence and must not be silently overwritten.

Corrections must be represented as attributed corrections/additions with:

- actor,
- time,
- reason where relevant,
- relation to the original observation.

Trainer interpretation remains a separate semantic layer from the client's original observation.

### Why

Studio Las must distinguish:

**what the client reported** from **what Damian later interpreted or corrected**.

This protects trust, reporting quality and the meaning of historical data.

---

## 7. Client product decision — current action before data collection

### Decision

The client portal should converge toward a contextual **„Dzisiaj” / current-action surface**, not a daily tracker.

The default information order is:

1. current agreed action or guidance,
2. one short explanation of its purpose,
3. dose/instruction and relevant boundary,
4. a trainer-approved smaller alternative only when useful,
5. optional short response about what happened,
6. next meeting / clear contact path,
7. progress or report only when currently relevant.

The chosen `paper`, `app` or `deliberate_hybrid` channel remains authoritative for the release. The screen must communicate the current version/channel coherently instead of pretending every client is app-first.

### Why

The client opens Studio Las to understand the next step, not to navigate software or complete a reporting ritual before seeing the action.

A rest day must not manufacture an artificial task merely to keep the interface populated.

---

## 8. Guidance variants — one appropriate action is the default

### Superseding clarification

The older rule that **minimum / standard / extended** must be present for every training-day action, ritual and homework task is no longer canonical.

### New rule

Default to **one appropriate trainer-approved action**.

Add a **smaller / reduced alternative** when Damian expects it to reduce all-or-nothing behaviour, preserve continuity or improve safe self-management for that specific person or situation.

Add an **extended option** only when there is a clear client-specific purpose. It is never required merely for symmetry.

### Why

Mandatory three-way variants:

- increase decision cost,
- can imply that the extended version is the better version,
- encourage product structure to replace trainer judgment,
- create unnecessary content and UI complexity.

The premium message is:

> **This is the appropriate action for you now.**

not:

> Choose how much product you want to consume.

This decision should be reflected in the materials/visual-card standard and any future Guidance UI.

---

## 9. Trainer product decision — „Teraz” is a decision surface

### Primary question

> **What changed since the last relevant interaction that should change today's decision?**

### Immediate visibility should prioritize

1. client's goal in their own words,
2. current guidance and relevant boundaries,
3. important new or unresolved observation,
4. previous decision and observed response,
5. today's next action,
6. checkpoint/end-of-cycle decision when due.

### Deeper, on-demand information

Examples:

- full session history,
- raw body-composition detail,
- heart-rate details,
- old PWD records,
- exercise-library metadata,
- historical reports,
- account administration.

### Signal lifecycle rule

A signal that requires contact or another unresolved action must not disappear merely because it was acknowledged or reviewed.

The system must distinguish at minimum:

- seen/acknowledged,
- still actionable/unresolved,
- resolved/completed where such a distinction is required by the real workflow.

Do not create a generic task-management or escalation platform to solve this.

---

## 10. Data minimisation decision

### Principle

A field is justified only when Studio Las can answer:

> **What decision can Damian make differently because this information exists?**

If there is no meaningful answer, the field should not be required and should normally not be collected by default.

### Default between-session/pre-session signal

Prefer:

1. **Anything different that Damian should know before this session/action?**
2. optional short explanation,
3. one additional readiness/reaction measure only when it has a defined decision purpose.

Do not automatically require a bundle of energy, sleep, stress, soreness, symptom and readiness scores.

### Acquisition/intake

The short first-contact flow is the default.

The old broad full-health questionnaire must be removed from the default journey and should be retired or quarantined until its necessity, processor/data path, transparency and retention are deliberately reviewed.

Selective questions belong after qualification when they are relevant to the person and decision.

### Measurements

RPE, HR, Tanita and other measures are tools, not mandatory rituals. Use them only when they answer an agreed question.

---

## 11. Reports and evidence of change

### Decision

Do not build a large Progress Engine or generic analytics dashboard.

The first strong 12-week report should be built from a **small number of preserved, comparable, dated observations** that answer:

- what mattered at the start,
- what the client could or could not do,
- what changed,
- what evidence supports that statement,
- how Damian interprets the change,
- what comes next.

The seven movements remain a reference library, not a mandatory universal score.

### Implementation strategy

Prove the report manually with real service use before automating repeated assembly.

### Why

Studio Las's defensible advantage is not a chart library. It is the quality of trainer judgment plus credible evidence that a person regained a meaningful capability.

---

## 12. What not to build now

Do not treat the following as missing essentials:

- AI coach,
- autonomous training decisions,
- readiness score,
- gamification,
- streaks,
- social feed,
- custom chat platform,
- comprehensive wearable dashboard,
- universal three-level programmes,
- elaborate analytics/engagement system,
- new notification centre,
- speculative workflow engines.

These may be reconsidered only when real operational evidence proves a problem that cannot be solved more simply.

---

## 13. UX and premium perception

Premium in Studio Las means:

- personal and deliberate instruction,
- low cognitive load,
- relevant context remembered by the system,
- calm and recoverable errors,
- no infrastructure jargon on client surfaces,
- no empty panels competing for attention,
- no unnecessary metrics,
- paper and app agreeing about the active instruction,
- Damian's interpretation and the client's progress being understandable.

Visual polish comes **after** integrity and decision hierarchy.

Do not confuse a prettier dashboard with a safer or more premium service.

---

## 14. Implementation priority

Codex/developer must determine the exact implementation sequence from live dependencies, but the product priority is constrained as follows.

### P0 — trust boundary

- complete-set publication validation,
- prevent lifecycle bypass,
- prevent silent edits of published prescribed content,
- reconcile production-only security/database changes,
- prove a controlled staging reconstruction/release identity.

### P1 — historical and interaction quality

- protect original client observations and corrections,
- retire/rework legacy broad intake,
- remove fabricated default observations,
- correct ambiguous completion semantics,
- recompose client current-action surface,
- correct signal identity and unresolved follow-through,
- verify/release already-existing phase-aware trainer work,
- make save/loading/error states recoverable.

### P2 — evidence and refinement

- pilot comparable functional evidence,
- build the first concise 12-week report workflow,
- accessibility/plain-language pass,
- remove inputs proven unnecessary by real use.

### P3 — optional polish

Only after evidence of benefit:

- secondary metric views,
- optional media,
- additional visual polish.

Do not run all priorities simultaneously. Later work must not weaken P0 guarantees.

---

## 15. Success criteria for the rebuild

The rebuild is moving in the right direction when:

- every published included action is complete according to its contract,
- published prescribed content cannot change silently,
- historical client responses preserve their original meaning,
- production can be reconstructed with the intended access/security boundary,
- the client can explain the current action without navigating several panels,
- Damian can identify the information that can change today's decision quickly,
- a reduced or missed action creates useful context rather than a failure score,
- save/network failures do not leave the user uncertain whether a write succeeded,
- a few baseline/follow-up observations can support a credible report of meaningful change.

Do **not** optimize for:

- app opens,
- time in app,
- streaks,
- mandatory daily check-in rates,
- generic workout counts,
- engagement scores.

---

## 16. Working rule for Codex and future developers

Before implementing any new feature or refactor, ask:

1. What real client/trainer problem does this solve?
2. What invariant or decision does it strengthen?
3. Is there a smaller solution?
4. Does it preserve historical meaning?
5. Does it preserve or improve privacy and authorization?
6. Does it reduce or increase cognitive load?
7. Can the same outcome be achieved manually until demand is proven?
8. Does it make the Studio Las service better, or merely make the software larger?

When in doubt, prefer:

**simple → explicit → reversible → testable → auditable.**

---

## 17. Strategic conclusion

The rebuild is not a feature programme.

It is a trust-and-clarity programme:

**TRUSTWORTHY GUIDANCE → TRUE HISTORY → RECONSTRUCTABLE SYSTEM → CLEAR CLIENT ACTION → BETTER TRAINER DECISION → CREDIBLE EVIDENCE OF CHANGE.**

That sequence is the reason for the work.