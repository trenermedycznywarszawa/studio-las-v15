# 07 Inquiry to Phone Decision System

**Status:** STAGE 2 CANDIDATE FOR INDEPENDENT DELEGATED PROTOTYPE RE-AUDIT
**Authorization:** contract and fictional workflow prototype only
**First AI task:** `Prepare the trainer for the first inquiry phone call.`

## Purpose

This document defines the first Studio Las vertical workflow from an incoming inquiry to Damian's explicit decision after the first phone call.

The workflow helps Damian preserve context, prepare useful questions, conduct a calm first conversation, and close it with a deliberate next step. It does not automate qualification, diagnose a person, decide whether training is safe, or contact the client.

## Role of the first phone call

The first call is a short, human conversation used to understand the inquiry, clarify uncertainty, and decide what should happen next. It sits between the initial contact and any later full intake, PWD, assessment, or training process.

It is not:

- a diagnosis or medical consultation;
- a complete intake or PWD;
- an automated sales qualification;
- a promise that Studio Las is appropriate or that training is safe;
- a booking flow;
- a pressure-based sales script;
- permission to send a questionnaire or message automatically.

## Value for the client

A good first call should let the client:

- explain the situation in their own words;
- understand why Damian is asking a question;
- correct or expand the original inquiry;
- hear uncertainty expressed honestly;
- avoid repeating the same context unnecessarily;
- finish without sales pressure or a forced commitment;
- know the agreed next step, if there is one.

## Value for Damian

The workflow should let Damian:

- see the immutable inquiry beside any extraction or suggestion;
- identify missing, conflicting, or unclear information quickly;
- edit or reject preparation items before using them;
- record client statements separately from his observations and interpretations;
- make the final decision himself;
- create an unpublished follow-up draft only when useful;
- complete the entire process manually when AI is unavailable.

No claim that the workflow saves time is accepted from prototype timers alone. Any real improvement claim requires a later, separately authorized comparison with Damian's actual baseline.

## Current inquiry entry audit

The current public entry is `ankieta-kontakt.html`. Its primary form, `ankieta-krotka`, posts manually authored form data to the configured Formspree endpoint. The fields visible in the repository are:

- `_subject`;
- `Imię`;
- `Telefon`;
- `Email`;
- `Skąd dojeżdża`;
- one or more `Problem` values;
- `Poziom bólu`;
- `Gotowość do pracy`;
- `Opis sytuacji`;
- `Zgoda RODO`;
- optional `Zgoda na kontakt`.

The same page also has a smaller `kontakt-prosty` form with `_subject`, `Kontakt`, and `Wiadomość`. Both forms submit with `fetch` and `FormData`; on failure the page offers a mailto fallback and does not display false success.

For Stage 2, Formspree remains a manual source. Damian may copy a fictional or later lawfully handled inquiry into the workflow. There is no Formspree API, webhook, inbox access, polling, or automatic import in this scope.

## Workflow

### 1. Before the call — source

Damian selects a fictional case or pastes fictional inquiry text. The system creates an immutable `source_artifact` view with source label, source-author category, capture time, version, and a pseudonymous inquiry identifier.

The original text remains separate from extraction. Editing preparation never edits the source.

### 2. Before the call — preparation

The preparation view separates:

- `Co wiemy` — direct source facts or reviewable extracted facts;
- `Czego nie wiemy` — missing information, never silently stored as a negative answer;
- `Co jest sprzeczne lub niejasne` — unresolved conflicts and ambiguity;
- `Cel rozmowy` — the explicitly selected task purpose;
- `Proponowane pytania` — five to eight optional trainer-only suggestions;
- `Tematy wymagające ostrożności` — warnings, not diagnoses;
- `Proponowany przebieg rozmowy` — opening, middle, and closing suggestions.

Every prepared item shows an allowed information type when applicable, a separate operational role, author, exact version, source locator, lineage, and review state. Damian may approve, create a trainer-authored derivative, or reject it. The original remains unchanged and visible. AI-origin items remain visibly different from source facts and remain `needs_review` and `unpublished` until deliberate review.

### 3. During the call

Damian may record a note as:

- client statement;
- Damian observation;
- Damian interpretation.

Client statements and reactions use `source_fact` semantics plus separate operational roles and retain client authorship, call context, exact versions, and supersession. Damian's meaning is always a separate `trainer_interpretation`. Questions may be marked `asked`, `skipped`, or `incomplete answer`. Corrections create new versions rather than replacing earlier wording.

There is no score, discipline judgment, automatic qualification, or automatic decision.

### 4. After the call — Damian's decision

Damian selects exactly one decision and writes a short rationale supported by selected facts or notes:

1. `CONTINUE` — continue contact or perform an agreed next step without sending the full intake yet;
2. `SEND_FULL_INTAKE` — a full diagnostic intake may be sent later through a separately approved process;
3. `DEFER_OR_CONSULT` — defer the decision or ask the person to consult a named issue first;
4. `NOT_RIGHT_PRODUCT` — Studio Las is not the right product for this person at this stage.

AI may present options and considerations. It may not select, record, or impersonate Damian's decision.

### 5. Optional follow-up draft

After Damian records the decision, the system may prepare a new `client_material` draft. It must remain visibly marked:

`DO SPRAWDZENIA — NIE WYSŁANO`

The draft is generated deterministically from the active exact decision and the exact evidence versions saved with it; fixture wording cannot contradict Damian's choice. It starts with `review_state: needs_review` and `publication_state: unpublished`, preserves complete `derived_from`, and has no send or publish action. Editing creates a superseding `client_material` version. A later exact-version review and separate publication/contact process are outside Stage 2.

## Sales-pressure boundaries

The workflow must not:

- manufacture urgency, scarcity, guilt, or fear;
- treat hesitation as an objection to overcome;
- optimize for conversion rate at the expense of fit or safety;
- recommend a decision from demographic, health, pain, or readiness signals;
- hide `NOT_RIGHT_PRODUCT` or `DEFER_OR_CONSULT` behind weaker visual treatment;
- imply that completion of the form creates an obligation.

Questions should be brief, optional in practice, and tied to the purpose of the first call.

## AI scope

The approved first AI task is only:

`Prepare the trainer for the first inquiry phone call.`

Within that task, AI may identify direct facts, missing information, conflicts, proposed questions, caution topics, a short conversation outline, structured post-call notes, possible next steps for Damian's review, and a follow-up draft when requested.

AI may not diagnose, establish safety, qualify, decide, create a plan or booking, send a message, contact the client, publish content, or change workflow state without Damian's action.

The Stage 2 prototype simulates this boundary with deterministic local fictional fixtures. It does not call an AI service. `PROVIDER DECISION — BLOCKED` remains unchanged.

## Manual fallback

The manual path is a first-class workflow:

1. read the immutable source;
2. write known facts and missing questions manually;
3. conduct the call using Damian's own preparation;
4. record notes with explicit authorship;
5. select and justify the decision;
6. write a follow-up draft manually if needed.

AI unavailability must never block the call or make an empty output look successful. A manually pasted source cannot enter or claim fixture-assisted mode; its placeholders must be deliberately replaced or rejected before use.

## Separation from full intake and PWD

The first inquiry call collects only enough context to choose the next step. It does not replace the full intake, PWD, medical consultation, movement assessment, first training session, or later planning.

`SEND_FULL_INTAKE` is a decision to enter a later, separately authorized process. It does not send anything in this workflow.

## Good client experience criteria

- The conversation feels calm, human, and non-coercive.
- Damian can explain what came from the client's inquiry and what is still uncertain.
- The client can correct earlier information.
- The call does not imply diagnosis or guaranteed suitability.
- The next step is clear without an automatic commitment.
- No draft is sent without a later explicit approval and delivery action.

## Good Damian experience criteria

- Source, extraction, AI suggestion, trainer interpretation, and trainer decision are distinguishable at a glance.
- Preparation contains five to eight relevant questions but allows rejection and editing.
- Damian can finish manually without AI.
- Notes preserve authorship and context without duplicating the full source into audit logs.
- The final decision is impossible to save without Damian's explicit choice, rationale, and reviewed exact-version evidence.
- Material changes to preparation, call records, reaction, rationale, selected evidence, or decision invalidate dependent decision/draft versions and require a new save.
- The delegated prototype audit can record preparation time and decision-close time without claiming an improvement in advance.

## Stage 2 acceptance boundary

This document is a candidate for independent delegated prototype re-audit. It authorizes neither production implementation nor the use of real client data.

Damian delegated fictional-prototype QA to ChatGPT. Stage 2 prototype review remains open until an independent delegated audit records `PASS`, `PASS WITH CORRECTIONS`, or `FAIL`. This delegation does not transfer Damian's authority over product direction or any later schema, provider, real-data, staging, production, merge, or Stage 3 gate.
