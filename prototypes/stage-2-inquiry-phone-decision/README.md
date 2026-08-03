# Stage 2 Inquiry → Phone → Decision prototype

**Status:** fictional owner-workflow prototype; not production software

This directory demonstrates the Stage 2 contract without AI, network access, persistent storage, Formspree, Supabase, or real client data.

## Run locally on Windows

From the repository root:

```powershell
py -3 -m http.server 8765 --directory prototypes/stage-2-inquiry-phone-decision
```

Open:

`http://127.0.0.1:8765/`

The local server only serves these static files. The prototype's Content Security Policy sets `connect-src 'none'`, and the JavaScript contains no network client. Stop the server with `Ctrl+C`.

You can also use another verified local static-file server. Do not deploy this prototype and do not paste real inquiries.

## What is local

- `index.html` — four-stage accessible workflow shell;
- `styles.css` — local responsive presentation, including a 360 px layout and visible focus;
- `fixtures.js` — 15 explicit fictional cases and deterministic preparation content;
- `app.js` — current-page state and interactions only.

Refresh clears every change. There is no `localStorage`, `sessionStorage`, IndexedDB, cookie, service worker, analytics, remote font, runtime dependency, API, AI call, send action, or publish action.

## Fictional cases

1. Complete and consistent inquiry.
2. Very short inquiry.
3. Missing client goal.
4. Conflicting statements.
5. Unclear pain or limitation description.
6. Topic requiring earlier consultation.
7. Person likely outside the product scope.
8. Person uncertain and afraid of training.
9. Deliberately inappropriate AI-simulated question that must be rejected.
10. Client changes an earlier answer during the call.
11. AI unavailable; full manual fallback.
12. Follow-up draft remains unapproved and unsent.
13. Attempted automatic qualification is blocked.
14. Attempted other-client disclosure is denied.
15. Partially pasted or clipped source.

All people, statements, identifiers, notes, and outcomes are fictional.

## Automated structural test

From the repository root:

```powershell
node scripts/test_stage2_inquiry_phone_decision.mjs
```

This checks static contract boundaries. It does not establish usefulness or owner acceptance.

## Damian's owner workflow test

### Rule

Only Damian records the result. The prototype is not accepted merely because automated tests pass.

Use only the included fictional cases. Do not copy a real Formspree message, email, phone number, client note, or client record.

### Preparation

1. Start the local server and open the prototype at a desktop width.
2. Open browser developer tools and keep the Network panel visible if useful.
3. Prepare a timer independent of the prototype.
4. Record the browser and viewport used.
5. Repeat the keyboard and 360 px checks at the end.

### Required scenario set

Run at least these cases end to end:

- 01 for the ordinary path;
- 04 for conflicting facts;
- 09 and reject the inappropriate question before starting the call;
- 10 and add a new `Wypowiedź klienta` that differs from the original source;
- 11 using manual fallback only;
- 12 and create a draft;
- 13 to confirm no automatic qualification;
- 14 to confirm no other-client disclosure;
- 15 to confirm the partial-source warning.

Review the remaining six fixtures for coverage and wording. Damian may run them end to end when a concern appears.

### Timed workflow

For cases 01 and 11:

1. Start timing immediately before selecting the case.
2. Stop the first timer when you believe you are ready to begin the call.
3. Record `source_to_call_ready_seconds`.
4. Count screen changes needed to reach that point.
5. Simulate the call by marking question outcomes, adding at least one client statement, one Damian observation, and one Damian interpretation.
6. Start the second timer when you choose `Zakończ rozmowę i zdecyduj`.
7. Select a decision, enter a rationale, select evidence, and save.
8. Stop the timer and record `call_end_to_decision_seconds`.
9. Do not interpret these values as improvement until compared with Damian's real baseline in a separately authorized evaluation.

### Comprehension and control checks

For each required scenario answer `YES`, `NO`, or `UNCLEAR`:

- Can I point to the immutable source?
- Can I point to a direct/source-derived fact?
- Can I point to a fictional AI suggestion?
- Can I tell who authored each preparation item?
- Can I see the exact source locator or lineage label?
- Can I correct an extraction without changing the source?
- Can I reject a question and keep it out of the active call?
- Can I distinguish a client statement, my observation, and my interpretation?
- Is the selected decision unambiguously mine?
- Can I finish without AI?
- Does client material remain `DO SPRAWDZENIA — NIE WYSŁANO`?
- Is there no real send, publish, booking, scoring, or automatic qualification control?

### Accessibility and narrow-screen checks

1. Set the viewport to 360 px wide.
2. Complete source selection, preparation, one note, and decision entry.
3. Record whether any horizontal page overflow appears.
4. Reload and use only `Tab`, `Shift+Tab`, `Space`, `Enter`, and arrow keys where native controls support them.
5. Confirm that every primary action is reachable and focus is always visible.
6. Trigger empty-source, empty-note, and missing-decision/rationale validation; confirm the messages are understandable.

## Result form

```text
STAGE 2 OWNER WORKFLOW TEST
Date:
Tester: Damian
Browser/version:
Viewport(s): desktop / 360 px

Case 01 source_to_call_ready_seconds:
Case 01 call_end_to_decision_seconds:
Case 01 screen_switches:

Case 11 source_to_call_ready_seconds:
Case 11 call_end_to_decision_seconds:
Case 11 screen_switches:

Required scenarios completed: 01 / 04 / 09 / 10 / 11 / 12 / 13 / 14 / 15
Remaining fixtures reviewed: 02 / 03 / 05 / 06 / 07 / 08

Fact/source distinction: YES / NO / UNCLEAR
AI-suggestion distinction: YES / NO / UNCLEAR
Extraction correction works: YES / NO / UNCLEAR
Question rejection works: YES / NO / UNCLEAR
Decision is clearly Damian's: YES / NO / UNCLEAR
Draft remains unsent: YES / NO / UNCLEAR
Manual fallback works: YES / NO / UNCLEAR
360 px without horizontal overflow: YES / NO / UNCLEAR
Keyboard operation and visible focus: YES / NO / UNCLEAR
Empty/error messages are clear: YES / NO / UNCLEAR

Observed friction:
Required corrections:
What must remain unchanged:

OWNER RESULT: PASS / PASS WITH CORRECTIONS / FAIL
Owner signature/confirmation:
```

`PASS` means the fictional workflow is understandable and ready for the next separately authorized decision. It does not authorize schema, provider selection, real data, Formspree automation, staging, production, merge, or Stage 3.
