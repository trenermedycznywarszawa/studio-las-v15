# Paper-first Protocols

This document defines the paper-first protocol model for Studio Las OS.

This is an OS support document.

It is subordinate to:

1. `docs/constitution/README.md`
2. `docs/product/README.md`
3. `docs/product/00_PRODUCT_MODEL.md`
4. `docs/product/06_HOME_GUIDANCE_SYSTEM.md`
5. future Architecture documents

The goal is not to create a new tracking app. The goal is to protect the Studio Las process:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

## 1. Core rule

The client should not start the morning from the phone.

The morning protocol should be possible to complete fully offline from a printed paper guide or checklist.

The app is used later only to record a short signal.

## 2. What paper does

Paper should:

- show what to do,
- reduce morning decisions,
- keep the client away from screen friction,
- make the protocol feel simple and physical,
- support calm repetition,
- give the client a stable reference.

Paper is the instruction layer.

## 3. What the app does

The app should:

- record whether the protocol was done,
- record only the selected signal approved by the trainer and architecture,
- allow one short optional note when useful,
- give the trainer useful signal,
- prepare data for future 4/8/12-week reports.

The app is the signal layer.

It should not become the morning ritual.

## 4. Example: offline Poranny Reset

This is only an example. It is not a production prescription.

### Poranny Reset — 8-10 minutes

Purpose:

- start the day with a calm body signal,
- reduce stiffness,
- notice the body's state before loading it,
- prepare for normal daily movement.

Suggested paper structure:

1. One calm breath check — 30 seconds  
   Notice whether breathing feels easy or tense.

2. Gentle spine movement — 1-2 minutes  
   Move slowly. No pushing.

3. Hip and ankle wake-up — 2 minutes  
   Focus on range that feels safe.

4. Sit-to-stand or supported squat pattern — 2 minutes  
   Keep it easy. Stop if symptoms clearly increase.

5. Shoulder and neck mobility — 1-2 minutes  
   Move within comfortable range.

6. Final check — 30 seconds  
   Ask: Do I feel the same, calmer, or more irritated?

The exact exercises should be assigned by the trainer to the client.

## 5. Example paper checklist

Printed checklist example:

```text
PORANNY RESET — tydzień 1

Cel: spokojnie uruchomić ciało, nie zrobić treningu.

Dzisiaj wykonaj:
[ ] 3 spokojne oddechy
[ ] 6 wolnych ruchów kręgosłupa
[ ] 6 ruchów bioder / kostek
[ ] 5 spokojnych wstań z krzesła
[ ] 4 ruchy barków / szyi
[ ] Zatrzymaj się i oceń: ciało jest spokojniejsze / bez zmian / bardziej napięte

Zasada:
Nie szukaj idealnego wykonania. Szukaj spokojnego sygnału.

Stop:
Przerwij, jeśli pojawi się wyraźny wzrost bólu, zawroty głowy, nietypowy objaw albo niepokój.
```

## 6. Minimal digital check-in

The digital check-in must take no more than 30-45 seconds.

This is a conceptual signal model, not a final UI specification and not an approved database schema.

Possible fields:

- `date`
- `client_id`
- protocol or assignment reference
- protocol done: yes/no
- one selected subjective signal when useful
- optional short note
- `created_at`

Energy and symptom scores may be used when they support the trainer decision and report pattern, but they must not become universal daily scoring by default.

Do not add 15 questions.

Do not make it a life survey.

Do not turn it into quantified-self tracking.

## 7. Conceptual UX shape of the digital check-in

This section is conceptual.

It is not a UI specification.

The final UI must be approved by the Architecture layer and must preserve the rule that the morning starts on paper, not in the app.

The check-in should feel like:

- "Zapisz krótki sygnał."
- "To zajmie mniej niż minutę."
- "Nie oceniaj idealnie. Wystarczy przybliżenie."
- "Trener zobaczy wzorzec w kontekście całego procesu."

Possible conceptual flow:

1. Did you do the assigned paper protocol today?  
   Yes / No

2. Selected signal for this protocol  
   Only if the trainer has defined one.

3. Optional note  
   One short text field.

4. Save.

No feed. No streak. No motivational score.

## 8. Protocol design rules

A paper-first protocol should be:

- short,
- clear,
- printable,
- safe to understand without the app,
- assigned by the trainer,
- connected to the current process goal,
- easy to review in a report,
- simple enough for a tired or anxious client.

A protocol should include:

- name,
- purpose,
- offline instructions,
- estimated minutes,
- stop criteria,
- what to notice,
- when to record the signal.

## 9. What protocols must not do

Protocols must not:

- overload the client,
- create medical diagnosis claims,
- give generic advice disconnected from the trainer's decision,
- require phone use in the morning,
- require wearable devices,
- ask for long daily journaling,
- track irrelevant life data,
- create guilt for missing a day,
- use streaks or badges,
- turn the client into a data-entry worker.

## 10. Relationship to home plans and guidance

The current OS already contains home-plan and guidance concepts.

Before implementation, paper-first protocols must be compared with existing structures:

- `home_plans`,
- `home_plan_items`,
- `guidance_events`,
- `guidance_pilots`,
- `reports`.

Do not add new tables until Architecture and schema gap analysis confirm that existing structures are insufficient.

## 11. Report use

Paper-first data should later help answer:

- Was the protocol actually used?
- Did the selected signal change across the period?
- Was there a pattern around missed days?
- Did the protocol reduce chaos or create friction?
- What should the trainer change next?

The report should show patterns, not judge the client.

## 12. Implementation guardrail

Do not implement directly from this document.

Use this document only after reading:

1. `docs/constitution/README.md`
2. `docs/product/README.md`
3. `docs/product/06_HOME_GUIDANCE_SYSTEM.md`
4. future Architecture documents

This document protects paper-first logic.

It does not replace architecture.
