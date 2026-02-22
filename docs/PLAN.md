# Dialogos — Implementation Plan (phased)

Extracted from [TECH_SPEC.md](./TECH_SPEC.md) Section 16. This document tracks the phased delivery plan; the tech spec retains all domain, architecture, and behavioral details.

---

## Phase 0: foundations (done)

- Repo setup (backend + mobile)
- Auth flow (Supabase JWT)
- Database schema + Prisma (Student, Topic, TopicFile)
- Topic CRUD + TopicFile CRUD
- S3 presigned upload flow
- Test infrastructure

## Phase 1: core session loop

Phase 0 is complete (foundations are in place). Phase 1 should now be split into small backend-first PRs, each shipping one vertical slice.

### Phase 1 immediate next step (PR-1)

**Implement session lifecycle API (draft → active → ended/aborted) with strict backend layering, plus Source entity for source-grounding.**

Scope:

- Add `Source` types, data source, mapper, service, and CRUD routes (`POST /v1/topics/:topicId/sources`, `GET /v1/topics/:topicId/sources`, `DELETE /v1/sources/:sourceId`). Sources link uploaded files to topics for grounding (TECH_SPEC Section 4.4). Include `grounding_tier` derivation (Tier 1/2/3) based on whether extracted text is available.
- Add `Session` types in all three layers (`src/types/api/session`, `src/types/service/session`, `src/types/data-source/session`) using per-operation kebab-case files and namespace barrels.
- Add `SessionDataSource` (Prisma-only methods, `input` parameter naming, no business logic).
- Add `SessionMapper` following the established static-class pattern in `src/mappers/` (e.g., `SessionMapper.getOne.output.fromDataSourceToService()`).
- Add `SessionService` methods for:
  - create draft session (accepts `triviumStage` — grammar/logic/rhetoric/combined per TECH_SPEC Section 4.1; and links to selected sources)
  - get single session (for use in later PRs and polling)
  - start session (enforce valid transition `DRAFT -> ACTIVE`)
  - end session (enforce valid transition `ACTIVE -> ENDED`)
  - abort session (enforce valid transition `ACTIVE -> ABORTED`, per TECH_SPEC Section 5 — "ended early: network/user/payment")
  - list sessions for topic (non-deleted only)
- Add `/v1` routes for:
  - `GET /v1/topics/:topicId/sessions`
  - `POST /v1/topics/:topicId/sessions`
  - `GET /v1/sessions/:sessionId`
  - `POST /v1/sessions/:sessionId/start`
  - `POST /v1/sessions/:sessionId/end`
  - `POST /v1/sessions/:sessionId/abort`
  - `DELETE /v1/sessions/:sessionId` (soft delete)
- Declare Zod schemas in route config via `fastify-type-provider-zod`, consistent with existing topic routes (do NOT use manual `safeParse` — Phase 0 migrated away from that pattern).
- Register `SourceDataSource`, `SourceService`, `SessionDataSource`, and `SessionService` in `src/lib/container.ts`.
- Keep authorization behavior consistent with topic routes (student can only access their own topic/session records).

Acceptance checks:

- Unit tests for service state transitions (DRAFT→ACTIVE, ACTIVE→ENDED, ACTIVE→ABORTED) and invalid transitions (e.g., DRAFT→ENDED, ENDED→ACTIVE).
- Unit tests for Source CRUD and grounding tier derivation.
- Route tests for auth boundaries, 404 ownership behavior, and happy-path transitions.
- No queue/STT/model calls yet in PR-1 (defer to PR-3/PR-4 below).

### Phase 1 PR split (backend-focused)

1. **PR-1 — Session lifecycle + Source entity (start now)**
   - Source CRUD with grounding tier derivation (TECH_SPEC Section 4.4) and session-source linking.
   - Session CRUD-lite for draft/start/end/abort/list plus single-session retrieval, with full state-machine transition enforcement.
   - Session creation accepts `triviumStage` (grammar/logic/rhetoric/combined) per TECH_SPEC Section 4.1.
   - Includes mappers, DI container wiring, and soft-delete endpoints.
2. **PR-2 — Turn intake + audio presign**
   - Add turn type/data-source/service/route contracts. Add `TurnMapper` following established pattern.
   - Implement `POST /v1/sessions/:sessionId/turns/presign-audio` and `POST /v1/sessions/:sessionId/turns`.
   - Enforce session-active guard: turns can only be created when session status is `ACTIVE` (reject with 409 Conflict otherwise).
   - Auto-assign turn `index` in service layer by counting existing turns for the session (the Prisma unique constraint on `(sessionId, index)` guarantees ordering).
   - Persist turn rows with pending assistant fields; keep ownership checks strict.
   - Register `TurnDataSource` and `TurnService` in `src/lib/container.ts`.
3. **PR-3 — Async pipeline skeleton**
   - Add queue abstraction and job contracts for all three spec-defined jobs: `TRANSCRIBE_TURN`, `GENERATE_PROMPT`, and `RENDER_ARTIFACTS` (TECH_SPEC Section 9.2). Wire no-op/mock handlers for each through service orchestration. `RENDER_ARTIFACTS` handler can remain a stub until Phase 2, but the contract must exist.
   - Add turn status read endpoint (`GET /v1/sessions/:sessionId/turns/:turnId`) for polling.
4. **PR-4 — STT integration + prompt generation enforcement loop**
   - Wire real STT provider into the `TRANSCRIBE_TURN` handler (replace no-op from PR-3). Persist `studentText` on the turn.
   - Implement strict structured output validation pipeline from TECH_SPEC Section 4.3 (schema, word cap, banned phrases, one-sentence check, bounded retries) in the `GENERATE_PROMPT` handler.
   - Implement source-anchoring rules enforcement (TECH_SPEC Section 4.4): `locate_passage` and `reconcile` prompt types, grounding tier–aware behavior, anti-offloading constraint.
   - Implement content question handling (TECH_SPEC Section 4.5): redirect → scaffold two-tier protocol. Detect direct content questions and respond with `redirect_to_student` on first ask, `scaffold` on repeated ask.
   - Include `triviumStage` in model context so prompt type distribution follows the selected stage (TECH_SPEC Section 4.1).
   - Persist `assistantText`, `assistantPromptType`, `assistantDetectedIssue`, `latencyMs`.
5. **PR-5 — Basic mobile session screen integration (client)**
   - Wire session start/record/upload/poll/end to backend endpoints with minimal UI controls.
   - Trivium stage picker on session creation screen.
   - Source selection on session creation (link existing sources to session).
   - Keep UI scope limited to proving the loop works end-to-end (real voice → STT → prompt → display).

## Phase 2: concept ledger

- EXTRACT_LEDGER_CANDIDATES job
- LedgerEntry entity + CRUD
- Candidate approval UX (voice or minimal taps)
- Tagging + linking to topics/sources/other entries
- Ledger view per topic

## Phase 3: spaced re-oralization

- ReviewScheduleItem entity
- SCHEDULE_REVIEWS job
- Mini re-oralization session flow (60–90 seconds)
- Resurface prompts from Concept Ledger entries
- In-app notification/prompt system

## Phase 4: analytics + argument fingerprint

- Cross-session trend queries
- Form-based signal tracking aggregation
- Personal pattern detection logic
- Trends dashboard UI
- Argument fingerprint visualization

## Phase 5: billing + launch polish

- Trial cap enforcement
- Paywall + subscription (store-specific)
- Webhook validation
- OCR extraction integration (for photo sources)
- Reference lookup (for known canonical texts)
- Account export + delete
- Markdown export for external writing workflows
