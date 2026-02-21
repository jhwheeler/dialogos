# Audit: Copilot Phase 1 PR Split Plan

**Date:** 2026-02-21
**Reviewed:** `copilot/plan-phase-one-steps` branch — changes to `docs/TECH_SPEC.md`
**Reviewer:** Claude

## Overview

The plan replaces the original four bullet points in TECH_SPEC.md Phase 1 with a 5-PR backend-first split. Overall the structure is reasonable — vertical slices, backend before client, progressive dependency. But there are several issues ranging from a direct contradiction with the existing codebase to meaningful gaps.

---

## Issues

### 1. `safeParse` contradiction (PR-1) — Breaking with established pattern

The plan says:

> Use API schemas from type layer and validate both request and response with `safeParse` in route handlers.

Phase 0 explicitly **migrated away** from manual `safeParse` to `fastify-type-provider-zod` + Swagger (commit `7bbfdb5`: "refactor: replace manual safeParse with fastify-type-provider-zod + Swagger"). The current routes declare schemas in the Fastify route config and let the type provider handle validation declaratively. Going back to manual `safeParse` in handlers would contradict the established pattern and regress an intentional refactor.

**Fix:** Replace with "Declare Zod schemas in route config via `fastify-type-provider-zod`, consistent with existing topic routes."

### 2. Missing ABORTED state (PR-1) — Incomplete state machine

The plan only covers `DRAFT → ACTIVE` and `ACTIVE → ENDED` transitions. The Prisma schema already defines `status: draft | active | ended | aborted`, and the spec (Section 5) defines ABORTED as "ended early (network/user/payment)." The plan doesn't mention:

- `ACTIVE → ABORTED` transition
- Whether ABORTED is deferred or intentionally excluded

This should be explicit. If deferred, say so. If included, add it to PR-1 scope.

### 3. No single-session retrieval endpoint (PR-1)

PR-1 defines list, create, start, and end — but no `GET /v1/sessions/:sessionId`. The spec endpoint summary (Section 8.2) implies this exists, and PR-2 will need it to verify session status before creating turns. PR-3 needs it for polling session state. Adding it now avoids a gap.

### 4. Mapper layer not mentioned anywhere

Phase 0 established a mapper pattern (`src/mappers/`) with static classes that transform data between layers (e.g., `TopicMapper.getOne.output.fromDataSourceToService()`). The plan mentions types, data-sources, services, and routes, but never mentions session mappers. An implementer unfamiliar with the codebase would miss this layer entirely.

### 5. DI container registration not mentioned

Each PR adding new DataSources and Services needs to register them in `src/lib/container.ts`. This is the wiring that makes everything accessible via `fastify.container.services.session`. Not calling this out is an easy thing to forget.

### 6. STT implementation gap between PR-3 and PR-4

PR-3 creates mock/no-op handlers for `TRANSCRIBE_TURN` and `GENERATE_PROMPT`. PR-4 implements the prompt generation enforcement loop. But **no PR implements actual STT transcription**. The plan goes from mock to prompt generation without wiring in a real STT provider. Either:

- PR-4 should include STT, or
- A PR-3.5 or expanded PR-4 scope should be explicit about it

Without real STT, PR-5's "prove the loop works end-to-end" can't actually work with voice input.

### 7. Session-active guard missing from PR-2 scope

PR-2 adds turn intake but doesn't explicitly state that turns can only be created when a session is `ACTIVE`. This is a critical business rule — you shouldn't be able to add turns to a `DRAFT`, `ENDED`, or `ABORTED` session. It's implied but should be explicit in acceptance criteria.

### 8. Turn index assignment not specified (PR-2)

The Prisma schema has a unique constraint on `(sessionId, index)` for deterministic transcript ordering. PR-2 doesn't mention how `index` gets assigned (auto-increment in service? count existing turns? client-provided?). This is a design decision that should be called out.

### 9. RENDER_ARTIFACTS job omitted from PR-3

The spec defines three async job types: `TRANSCRIBE_TURN`, `GENERATE_PROMPT`, and `RENDER_ARTIFACTS`. PR-3 only stubs the first two. Even if artifact rendering is Phase 2, the job contract should be defined in PR-3's queue abstraction so the interface is complete.

---

## What the plan gets right

- **Backend-first ordering** — correct priority given mobile is Flutter and backend is the constraint
- **Vertical slices** — each PR ships something testable in isolation
- **PR-1 scope** — session lifecycle is the right starting point
- **PR-4 enforcement pipeline** — correctly identifies Section 4.3 as the critical implementation
- **PR-5 as proof** — "prove the loop works" is the right framing for the first client PR
- **Acceptance criteria on PR-1** — unit tests for transitions + route tests for auth/ownership is the right testing strategy
- **Dependency flow** — PR-1 → PR-2 → PR-3 → PR-4 → PR-5 is the correct order

---

## Verdict

The plan's structure and sequencing are sound. The main problems are:

1. The `safeParse` instruction directly contradicts an existing refactor
2. Several established patterns (mappers, DI container, type provider) are not mentioned, which risks inconsistent implementation
3. There are scope gaps around the ABORTED state, STT implementation, and a missing getOne endpoint that will cause friction in later PRs

**Recommendation:** Fix issue #1 (safeParse) before merging — it will actively mislead an implementer. Issues #2–9 should be addressed as amendments or captured as implementation notes so they aren't lost.
