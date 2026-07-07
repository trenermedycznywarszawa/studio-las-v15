# Work Split: ChatGPT and Codex

## Purpose

This document defines how work should be split between ChatGPT and Codex in the Studio Las OS project.

The goal is to keep strategic architecture coherent while using Codex for controlled repository work.

## Core rule

Codex executes bounded tasks.

ChatGPT guards the product architecture.

Neither tool should bypass the hierarchy:

1. Constitution
2. Product
3. Architecture
4. PRD
5. Implementation
6. Code

## ChatGPT responsibilities

ChatGPT should own:

- product interpretation,
- architecture reasoning,
- document hierarchy,
- method-to-OS translation,
- critical review of assumptions,
- defining task scope for Codex,
- writing Codex prompts,
- reviewing Codex outputs,
- deciding whether a change is safe to accept.

ChatGPT should not casually push implementation forward before architecture is clear.

## Codex responsibilities

Codex should own bounded repository tasks such as:

- file audits,
- consistency checks,
- small documentation updates,
- schema gap analysis after Architecture approval,
- implementation only after a precise prompt,
- tests and verification reports,
- small reversible code changes.

Codex should not decide product direction.

Codex should not introduce new architecture unless explicitly asked to propose options.

Codex should not move from documentation into code without explicit permission.

## Tasks ChatGPT should do directly

ChatGPT may directly update repository documentation when the task is:

- high-level architecture,
- product doctrine,
- documentation governance,
- method mapping,
- decision hierarchy,
- small source-of-truth cleanup,
- review documents.

Reason:

These tasks require preserving product meaning more than executing code.

## Tasks Codex should do

Codex should be used when the task requires:

- searching many files,
- checking code paths,
- comparing schema and UI state,
- producing implementation reports,
- making small patches to existing code,
- running local tests,
- producing file/commit summaries,
- verifying no forbidden drift occurred.

## Codex prompt requirements

Every Codex task must include:

1. Repository name.
2. Current project context.
3. Files to read first.
4. Exact scope.
5. What must not be changed.
6. Success criteria.
7. Required final report format.
8. Instruction to avoid broad refactors.
9. Instruction to preserve Constitution/Product/Architecture hierarchy.
10. Instruction to list files modified and commit hash.

## Default bans for Codex tasks

Unless explicitly allowed, Codex must not change:

- authentication,
- Supabase config,
- SQL migrations,
- production database data,
- public site layout,
- `localStorage` fallback,
- client-facing AI behavior,
- gamification/streaks/points,
- wearable integrations,
- push notifications,
- pricing or business offer copy.

## Review protocol

After Codex completes a task, ChatGPT should review:

1. Did Codex stay inside scope?
2. Did it modify only allowed files?
3. Did it preserve the document hierarchy?
4. Did it introduce product drift?
5. Did it create implementation before architecture?
6. Did it document risks and next steps?
7. Are there hidden assumptions that need correction?

If any answer is concerning, do not continue to the next task until the issue is resolved.

## Practical split for Stage 3 — Architecture

ChatGPT should write directly:

- `00_ARCHITECTURE_PRINCIPLES.md`,
- `01_METHOD_TO_OS_MAPPING.md`,
- first versions of core architecture doctrine.

Codex should audit or support:

- whether architecture documents conflict with existing repo docs,
- whether existing code/schema already has concepts matching the architecture,
- later schema gap analysis,
- later small implementation tasks.

## Final rule

Use Codex for execution speed.

Use ChatGPT for architectural judgment.

If the two disagree, pause and resolve the product/architecture issue before writing code.
