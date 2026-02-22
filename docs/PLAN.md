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

## Phase 0.5: security hardening (done)

Security audit findings implemented (see `docs/SECURITY_AUDIT.md` and TECH_SPEC Section 6.4):

- **Input validation** — String length constraints on all Zod input schemas; file size upper bound (50 MB); `kind` enum validation; `storageKey` format regex; strict student settings schema (replaces `z.unknown()`)
- **HTTP security** — CORS explicit allowlist via `CORS_ORIGIN`; `@fastify/helmet` security headers; `@fastify/rate-limit` (100 req/min); explicit Fastify `bodyLimit` (1 MB)
- **Auth hardening** — JWT algorithm restriction (`HS256`); bounded known-student cache (10k max); `trialRemainingSeconds` and `plan` removed from client-settable fields
- **Storage security** — Presigned URLs include `ContentLength` condition; improved filename sanitization (strip `..`, null bytes, control characters, length limit)
- **Information leakage** — Session error messages no longer leak internal status; Swagger UI restricted to non-production
- **Runtime** — Graceful shutdown on `SIGTERM`/`SIGINT`
- **CI/CD** — Permissions scoped to `contents: read` (only deploy gets `write`); `npm audit --audit-level=high` added as CI step

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

1. **PR-1 — Session lifecycle + Source entity (done ✓)**
   - Source CRUD with grounding tier derivation (TECH_SPEC Section 4.4) and session-source linking.
   - Session CRUD-lite for draft/start/end/abort/list plus single-session retrieval, with full state-machine transition enforcement.
   - Session creation accepts `triviumStage` (grammar/logic/rhetoric/combined) per TECH_SPEC Section 4.1.
   - Includes mappers, DI container wiring, and soft-delete endpoints.
2. **PR-2 — Turn intake + audio presign (done ✓)**
   - Added Turn type/data-source/service/route contracts with `TurnMapper` following established pattern.
   - Implemented `POST /v1/sessions/:sessionId/turns/presign-audio`, `POST /v1/sessions/:sessionId/turns`, `GET /v1/sessions/:sessionId/turns/:turnId`, and `GET /v1/sessions/:sessionId/turns`.
   - Session-active guard enforced: turns can only be created when session status is `ACTIVE` (409 Conflict otherwise).
   - Auto-assigned turn `index` in service layer by counting existing turns for the session (Prisma unique constraint on `(sessionId, index)` guarantees ordering).
   - Persisted turn rows with pending assistant fields; ownership checks flow through parent session.
   - Registered `TurnDataSource` and `TurnService` in `src/lib/container.ts`.
   - **Security: turn index concurrency** — Use atomic `INSERT ... SELECT MAX(index) + 1` or database sequence for turn index assignment. Handle unique constraint violations with a bounded retry (TECH_SPEC Section 6.4.6).
   - **Security: audio upload validation** — Validate audio MIME type on presigned URLs; enforce 10 MB max audio file size (TECH_SPEC Section 6.4.5).
3. **PR-3 — Async pipeline skeleton (next)**
   - Add queue abstraction and job contracts for all three spec-defined jobs: `TRANSCRIBE_TURN`, `GENERATE_PROMPT`, and `RENDER_ARTIFACTS` (TECH_SPEC Section 9.2). Wire no-op/mock handlers for each through service orchestration. `RENDER_ARTIFACTS` handler can remain a stub until Phase 2, but the contract must exist.
   - **Security: job queue hardening** — Ensure jobs are authenticated (cannot be enqueued externally), payloads are validated, retry limits are bounded, and results are access-controlled (TECH_SPEC Section 6.4).
   - Turn status read endpoint (`GET /v1/sessions/:sessionId/turns/:turnId`) already exists from PR-2; use it for polling.
4. **PR-4 — STT integration + prompt generation enforcement loop**
   - Wire real STT provider into the `TRANSCRIBE_TURN` handler (replace no-op from PR-3). Persist `studentText` on the turn.
   - **Security: prompt injection mitigations** — Wrap student text in delimiter tags; strip control characters; sanitize `extractedText` before prompt inclusion; validate all model output fields against expected enums at persistence layer (TECH_SPEC Section 6.4.4).
   - Implement strict structured output validation pipeline from TECH_SPEC Section 4.3 (schema, word cap, banned phrases, one-sentence check, bounded retries) in the `GENERATE_PROMPT` handler.
   - Implement source-anchoring rules enforcement (TECH_SPEC Section 4.4): `locate_passage` and `reconcile` prompt types, grounding tier–aware behavior, anti-offloading constraint.
   - Implement content question handling (TECH_SPEC Section 4.5): redirect → scaffold two-tier protocol. Detect direct content questions and respond with `redirect_to_student` on first ask, `scaffold` on repeated ask.
   - Include `triviumStage` in model context so prompt type distribution follows the selected stage (TECH_SPEC Section 4.1).
   - Persist `assistantText`, `assistantPromptType`, `assistantDetectedIssue`, `latencyMs`.
5. **PR-5 — Basic mobile session screen integration (client)**
   - Wire session start/record/upload/poll/end to backend endpoints with minimal UI controls.
   - Trivium stage picker on session creation screen.
   - Source selection on session creation (link existing sources to session).
   - **Security: secure token storage** — Store JWTs in iOS Keychain / Android Keystore; delete local audio files after upload (TECH_SPEC Section 6.4.9).
   - Keep UI scope limited to proving the loop works end-to-end (real voice → STT → prompt → display).

## Phase 2: concept ledger

- EXTRACT_LEDGER_CANDIDATES job
- LedgerEntry entity + CRUD
- Candidate approval UX (voice or minimal taps)
- Tagging + linking to topics/sources/other entries
- **Security: replace `linkedEntryIds` UUID array with `ledger_entry_links` join table** for referential integrity (TECH_SPEC Section 6.4.8)
- **Security: `verbatimText` is sensitive personal data** — verify encryption at rest, include in export/deletion flows
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

- Trial cap enforcement (basic session counting/time guardrails should exist before this phase)
- Paywall + subscription (store-specific)
- **Security: webhook signature verification** — HMAC verification on all billing webhook endpoints; idempotent processing with deduplication (TECH_SPEC Section 6.4.7)
- **Security: hard-delete implementation** — Scheduled job for GDPR compliance; define retention window; cascade soft-delete for topics (TECH_SPEC Section 6.4.8)
- **Security: certificate pinning** — Implement for production mobile builds (TECH_SPEC Section 6.4.9)
- OCR extraction integration (for photo sources)
- Reference lookup (for known canonical texts)
- Account export + delete
- Markdown export for external writing workflows
