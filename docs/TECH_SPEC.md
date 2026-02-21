# Dialogos v0.1 — Implementation-Ready Spec

**Status:** Draft v0.1 (implementation scope locked to MVP)
**Primary platform:** Mobile (Flutter)
**Backend:** TypeScript (Fastify) + Prisma + Postgres (Supabase) + Object Storage (Supabase Storage or S3)
**Core interaction style:** Socrates Mode always-on (no alternate modes in MVP)

---

## 0) Product definition

**Dialogos is a voice-first training app for oral mastery of what a student studies.**
A student speaks. The system responds with short Socratic prompts that force definitions, distinctions, argument structure, and rhetorical clarity **without supplying the missing substance**.

### 0.1 Non-negotiables (MVP)

- **Socrates Mode is the default** and only mode.
- **One move per turn:** exactly one question or instruction per assistant turn.
- **No praise / no padding / no recap unless asked.**
- **Audio-first UX:** minimal screen attention; screen exists for control + review.
- **Student terminology:** call them *student*, not *user*.

### 0.2 Success criteria

- A student can complete a session hands-free/eyes-free except for starting/stopping.
- Output is consistently non-sycophantic and low-fluff.
- Artifacts (transcript, summary, rubric) feel like a coach's notes, not an essay generator.
- Cost per session is predictable and capped.

---

## 1) MVP scope

### 1.1 In scope

- Authentication: Apple + Google (LinkedIn optional later)
- CRUD for Topics, Sessions
- File uploads attached to Topics (optional in-session upload later)
- Voice session loop: record → transcribe → generate next prompt → speak prompt
- Transcript in screenplay format
- End-of-session summary with Grammar/Logic/Rhetoric sections
- Rubric scoring
- Paywall after free trial allowance
- Delete/export all personal data

### 1.2 Out of scope (v0.1)

- OCR extraction / quoting from PDFs
- Spaced repetition
- Multi-agent analysis
- "Friendly tutor" mode
- Social/community features
- Advanced analytics dashboards

---

## 2) Core domain objects

### 2.1 Student

Represents an authenticated person.

- `id` (UUID)
- `email` (nullable if provider doesn't provide; store normalized)
- `displayName`
- `createdAt`, `updatedAt`
- `settings` (JSON: voice rate, autoplay, strictness flags)
- `plan` (free | paid)
- `trialRemainingSeconds` (int)
- `deletedAt` (nullable)

### 2.2 Topic

Long-lived study project.

- `id` (UUID)
- `studentId` (FK)
- `title`
- `description` (optional)
- `createdAt`, `updatedAt`, `deletedAt`

### 2.3 TopicFile

Uploaded file reference (PDF/image/text).

- `id` (UUID)
- `topicId` (FK)
- `kind` (pdf | image | text | other)
- `storageKey`
- `originalName`
- `mimeType`
- `sizeBytes`
- `createdAt`, `deletedAt`

### 2.4 Session

Discrete practice run inside a topic.

- `id` (UUID)
- `topicId` (FK)
- `studentId` (FK redundant but convenient for queries)
- `status` (draft | active | ended | aborted)
- `startedAt`, `endedAt`
- `costCentsEstimate` (int)
- `trialSecondsUsed` (int)
- `deletedAt`

### 2.5 Turn

A single exchange: student utterance → system prompt.

- `id` (UUID)
- `sessionId` (FK)
- `index` (int, 0..n)
- `studentAudioKey` (nullable)
- `studentText` (nullable until STT completes)
- `assistantText` (the spoken prompt; short)
- `assistantPromptType` (enum)
- `assistantDetectedIssue` (enum/string)
- `createdAt`, `latencyMs`

### 2.6 Artifacts

Generated at end of session (and optionally mid-session).

- `SessionArtifact`
  - `id` (UUID)
  - `sessionId` (FK)
  - `kind` (transcript | summary | rubric | export_md)
  - `content` (TEXT or JSON)
  - `createdAt`

---

## 3) UX / flows (mobile)

### 3.1 Onboarding

1. Sign in (Apple/Google)
2. Audio-led onboarding rules (pre-recorded audio to avoid model cost):
   - "You will be questioned. I won't supply the missing substance."
   - "One prompt at a time. Keep answers short."
3. Create first Topic (title + optional description)
4. Start first Session (trial)

### 3.2 Navigation

- **Topics list**
  - Create Topic
  - Delete Topic (soft-delete; cascades to sessions/files)
- **Topic detail**
  - Sessions list (latest first)
  - Files list
  - Start new session
- **Session detail (review)**
  - Summary
  - Rubric
  - Transcript (screenplay)
  - Export

### 3.3 Session screen (audio-first)

- Dark background, minimal UI
- Primary control: **push-to-talk** (PTT) or tap-to-record
- Secondary: end session, pause, repeat prompt, show transcript
- Optional: keep screen awake toggle
- No distracting waveform; allow subtle "listening" indicator

---

## 4) Socrates Mode: behavioral contract

These are not aspirational instructions to the model. They are **mechanical guarantees** enforced by server-side validation. The model is one component; the enforcement layer is what turns tone guidance into a reliable contract.

### 4.1 Output schema (strict)

All model outputs used for prompting MUST validate against this JSON schema:

```json
{
  "next_prompt": "string (<= 12 words default)",
  "prompt_type": "define | distinguish | premise | inference | objection | compress | clarify | example | scope | contradiction",
  "detected_issue": "vague_term | missing_premise | equivocation | drift | contradiction | unclear_referent | unsupported_claim | none",
  "stop_reason": "needs_definition | needs_example | needs_premise | needs_scope | ok_continue"
}
```

Only `next_prompt` is spoken to the student. All other fields are stored for instrumentation and artifact generation but never surfaced during the session.

### 4.2 Style constraints

Hard rules (enforced by server-side validation + regeneration):

- `next_prompt` must be **one sentence**.
- No praise words (blocklist): "great", "perfect", "awesome", "nice job", "excellent", "love", "good" (in evaluative sense), etc.
- No recap unless the student explicitly requests a recap (detect via intent or explicit phrase).
- No unsolicited teaching paragraphs.
- Default `next_prompt` word count ≤ 12 (configurable to 16 max; keep it tight).
- No rhetorical flourishes; neutral, direct.

### 4.3 Enforcement loop

Every model response goes through a validation pipeline before reaching the student:

1. **Schema validation** — response must parse against the strict JSON schema. If not, regenerate (up to 2 retries, then fail the turn gracefully).
2. **Word cap check** — count words in `next_prompt`. If over limit, regenerate.
3. **Banned-phrase scan** — run `next_prompt` against the praise/padding blocklist. If match, regenerate.
4. **Sentence count check** — `next_prompt` must contain exactly one sentence. If not, regenerate.
5. **TTS gate** — only the `next_prompt` field is sent to TTS / spoken aloud. No other field is ever surfaced to the student during the session.

This pipeline is the difference between "we asked the model to behave" and "the system guarantees it." A general chat UI cannot enforce this; the enforcement layer is a core product requirement.

### 4.4 Prompting strategy

- Run model in **structured output mode**.
- Keep conversation context minimal:
  - include last N turns (N=6 by default)
  - include session goal (topic title + optional description)
  - include current drill target ("grammar/logic/rhetoric") **only if surfaced in artifact**, otherwise keep implicit.
- Use a "Socrates system message" that describes allowed moves + bans.
- Low temperature, small token cap.

---

## 5) Session state machine

### 5.1 State definitions

- `DRAFT`: created but not started
- `ACTIVE`: in progress
- `ENDED`: completed successfully
- `ABORTED`: ended early (network / user / payment)

### 5.2 Turn-level state machine

Each "turn" is an internal mini-state machine; the session is a repetition of turns.

```mermaid
stateDiagram-v2
  [*] --> Idle

  Idle --> Recording : student_press_record
  Recording --> UploadingAudio : student_release_record
  UploadingAudio --> Transcribing : audio_uploaded
  Transcribing --> GeneratingPrompt : stt_ready
  GeneratingPrompt --> SpeakingPrompt : prompt_validated
  SpeakingPrompt --> Idle : tts_done

  UploadingAudio --> Idle : cancel
  Transcribing --> Idle : cancel
  GeneratingPrompt --> Idle : cancel

  Transcribing --> Error : stt_failed
  GeneratingPrompt --> Error : model_failed
  SpeakingPrompt --> Error : tts_failed

  Error --> Idle : retry
  Error --> [*] : abort_session
```

### 5.3 Session lifecycle

- Create session → `DRAFT`
- Start session → `ACTIVE`
- End session (student ends or trial ends) → `ENDED` or `ABORTED`
- Generate artifacts as async job upon `ENDED`

---

## 6) Backend architecture (TypeScript)

### 6.1 Layers

1) **API Layer**
- Fastify routes
- auth, input/output validation
- calls Services only

2) **Service Layer**
- business logic orchestration
- session state transitions
- cost accounting
- queue job scheduling

3) **DataSource Layer**
- one class per table
- Prisma-only operations
- no business logic

### 6.2 Folder structure (suggested)

```
/src
  /api
    /v1
      topics.routes.ts
      sessions.routes.ts
      files.routes.ts
      billing.routes.ts
      account.routes.ts
    auth.plugin.ts
    validation.ts
  /services
    TopicService.ts
    SessionService.ts
    ArtifactService.ts
    BillingService.ts
    FileService.ts
  /dataSources
    StudentDataSource.ts
    TopicDataSource.ts
    TopicFileDataSource.ts
    SessionDataSource.ts
    TurnDataSource.ts
    SessionArtifactDataSource.ts
  /types
    api.ts
    dto.ts
    db.ts
    domain.ts
  /jobs
    queue.ts
    jobs.ts
    handlers/
      transcribeTurn.ts
      generatePrompt.ts
      renderArtifacts.ts
  /lib
    logger.ts
    errors.ts
    time.ts
```

### 6.3 Validation

- Use Zod (or equivalent) for request/response validation.
- For AI prompt outputs, validate strictly and regenerate if invalid.

---

## 7) Database schema (Postgres)

### 7.1 Tables

Minimal schema (DDL sketch):

```sql
create table students (
  id uuid primary key,
  email text,
  display_name text not null,
  plan text not null default 'free',
  trial_remaining_seconds int not null default 180,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table topics (
  id uuid primary key,
  student_id uuid not null references students(id),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table topic_files (
  id uuid primary key,
  topic_id uuid not null references topics(id),
  kind text not null,
  storage_key text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table sessions (
  id uuid primary key,
  student_id uuid not null references students(id),
  topic_id uuid not null references topics(id),
  status text not null,
  started_at timestamptz,
  ended_at timestamptz,
  cost_cents_estimate int not null default 0,
  trial_seconds_used int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table turns (
  id uuid primary key,
  session_id uuid not null references sessions(id),
  index int not null,
  student_audio_key text,
  student_text text,
  assistant_text text,
  assistant_prompt_type text,
  assistant_detected_issue text,
  latency_ms int,
  created_at timestamptz not null default now()
);

create unique index turns_session_index on turns(session_id, index);

create table session_artifacts (
  id uuid primary key,
  session_id uuid not null references sessions(id),
  kind text not null,
  content text not null,
  created_at timestamptz not null default now()
);
```

### 7.2 Notes

- Use soft delete (`deleted_at`) for compliance + safety.
- Add RLS (row-level security) if using Supabase auth directly; if backend owns auth, enforce via API.
- Ensure `turns(session_id, index)` unique for deterministic transcript ordering.

---

## 8) API design (REST, versioned)

### 8.1 Auth

Preferred: server verifies identity tokens from Apple/Google, then issues your own JWT session token.

- `Authorization: Bearer <jwt>`
- JWT contains `studentId`

### 8.2 Endpoints

All endpoints under `/v1`.

#### Topics

- `GET /v1/topics`
  - returns: list of topics (non-deleted)
- `POST /v1/topics`
  - body: `{ title, description? }`
- `GET /v1/topics/:topicId`
- `PATCH /v1/topics/:topicId`
  - body: `{ title?, description? }`
- `DELETE /v1/topics/:topicId`
  - soft-delete; cascades sessions/files

#### Topic files

- `GET /v1/topics/:topicId/files`
- `POST /v1/topics/:topicId/files/presign`
  - body: `{ kind, originalName, mimeType, sizeBytes }`
  - returns: `{ uploadUrl, storageKey }`
- `POST /v1/topics/:topicId/files`
  - body: `{ storageKey, kind, originalName, mimeType, sizeBytes }` (finalize metadata)
- `DELETE /v1/topics/:topicId/files/:fileId`

#### Sessions

- `GET /v1/topics/:topicId/sessions`
- `POST /v1/topics/:topicId/sessions`
  - body: `{ }`
  - creates `DRAFT`
- `POST /v1/sessions/:sessionId/start`
  - transitions to `ACTIVE`
- `POST /v1/sessions/:sessionId/end`
  - transitions to `ENDED`, enqueues artifact job
- `DELETE /v1/sessions/:sessionId`
  - soft delete

#### Turns (core loop)

- `POST /v1/sessions/:sessionId/turns/presign-audio`
  - returns uploadUrl + storageKey
- `POST /v1/sessions/:sessionId/turns`
  - body: `{ studentAudioKey, durationMs }`
  - server enqueues STT + prompt job
  - returns: `{ turnId }`
- `GET /v1/sessions/:sessionId/turns/:turnId`
  - returns turn including `assistantText` when ready
- Optional realtime:
  - `GET /v1/sessions/:sessionId/stream` (SSE or WebSocket) to push `assistantText` updates

#### Artifacts

- `GET /v1/sessions/:sessionId/artifacts`
- `GET /v1/sessions/:sessionId/artifacts/:artifactId`

#### Billing / trial

- `GET /v1/billing/status`
- `POST /v1/billing/checkout` (store-specific; may be handled client-side)
- `POST /v1/billing/webhook` (server-to-server)

#### Account privacy

- `POST /v1/account/export`
- `POST /v1/account/delete`
  - schedules deletion job; immediate soft-delete; hard-delete within policy window

---

## 9) Job queue + async processing

### 9.1 Why a queue

- STT + model call + TTS can be slow and should not block request threads.
- Artifact generation should run after session end.

### 9.2 Jobs

- `TRANSCRIBE_TURN(turnId)`
  - fetch audio from storage
  - run STT
  - write `studentText`
- `GENERATE_PROMPT(turnId)`
  - collect last N turns
  - call model for strict JSON prompt
  - validate; regenerate if invalid
  - write `assistantText`, prompt metadata
- `RENDER_ARTIFACTS(sessionId)`
  - build transcript (screenplay)
  - build summary (G/L/R sections)
  - build rubric
  - persist artifacts

### 9.3 Speaking (TTS)

MVP approach: generate TTS on-demand in client from `assistantText` OR server generates audio.

- Prefer client-side TTS initially for simplicity/cost (device voices).
- If you need consistent voice across platforms, generate on server and store `assistantAudioKey` per turn.

---

## 10) Cost controls

- Track per-session:
  - total STT seconds
  - total model tokens
  - total TTS seconds (if server TTS)
- Hard caps:
  - `trialRemainingSeconds` decrement by recorded speech duration
  - stop session when exhausted, then prompt paywall
- Model call caps:
  - small `max_output_tokens`
  - minimal context window
  - forbid "assistant essays" by schema validation
- Student-facing cost visibility:
  - trial time remaining is always visible in the UI
  - before starting a session, show estimated cost or trial time that will be used
  - on session end (including cap-triggered end), always generate artifacts before closing — never cut off mid-session without a clean exit

---

## 11) Session instrumentation

### 11.1 Why this matters

Structured metrics are what separate a training system from a chat log. The enforcement layer (Section 4) already produces structured metadata per turn (`prompt_type`, `detected_issue`). Instrumentation aggregates this into signals the student and the system can use.

### 11.2 Per-session metrics (stored on session end)

Computed from turns and artifacts when a session transitions to `ENDED`:

- `turnCount` (int)
- `durationSeconds` (int, `endedAt - startedAt`)
- `promptTypeDistribution` (JSON object: `{ define: 3, distinguish: 1, objection: 2, ... }`)
- `detectedIssueDistribution` (JSON object: `{ vague_term: 2, drift: 1, none: 4, ... }`)
- `rubricScores` (from artifact: Clarity, Definitions, Structure, Objection-handling, Drift — each 1–5)
- `avgResponseLatencyMs` (mean of per-turn latency — rough fluency proxy)

### 11.3 Storage

Add a `session_metrics` table or store as JSON on the session row:

```sql
create table session_metrics (
  id uuid primary key,
  session_id uuid not null references sessions(id) unique,
  turn_count int not null,
  duration_seconds int not null,
  prompt_type_distribution jsonb not null,
  detected_issue_distribution jsonb not null,
  rubric_scores jsonb not null,
  avg_response_latency_ms int,
  created_at timestamptz not null default now()
);
```

Populated by the `RENDER_ARTIFACTS` job (which already has access to all turns).

### 11.4 Cross-session queries (post-MVP, but schema-ready now)

With per-session metrics stored in structured form, cross-session trend queries become straightforward:

- rubric score deltas per topic over last N sessions
- issue distribution shift (e.g., fewer `vague_term` flags over time)
- session frequency / consistency
- definition clarity trend (ratio of `define`/`distinguish` prompts to `vague_term` issues)

These power the progress signals described in PRODUCT.md. For v0.1, store the data; surface only per-session rubric in the review screen.

### 11.5 API

- `GET /v1/sessions/:sessionId/metrics` — returns per-session metrics
- `GET /v1/topics/:topicId/metrics` (post-MVP) — returns aggregated trend data

---

## 12) Transcript format (screenplay)

### 12.1 Example

```
STUDENT: A cause is...
DIALOGOS: Define "cause" in one sentence.
STUDENT: By cause I mean...
DIALOGOS: Distinguish material from formal cause.
...
```

### 12.2 Rendering rules

- Always left-aligned.
- `STUDENT:` and `DIALOGOS:` labels.
- Optional subtle color tint per speaker in UI (not bubbles).

---

## 13) Session summary format

### 13.1 Summary object

- `one_paragraph_summary`
- `grammar_notes[]`
- `logic_notes[]`
- `rhetoric_notes[]`
- `open_questions[]`
- `rubric_scores`

### 13.2 Rubric

Scores 1–5 with one-line evidence:

- Clarity
- Definitions
- Structure
- Objection-handling
- Drift

Rules:

- Evidence must quote student text snippets, not invent content.

---

## 14) Privacy & deletion

### 14.1 Delete topic/session

Soft-delete and hide from UI.
Queue hard-delete (audio/files/artifacts) within a retention window (define later).

### 14.2 Delete account

- Soft-delete student record
- cascade soft-delete all related records
- enqueue hard-delete job:
  - delete storage objects
  - delete DB rows (or anonymize) per policy

### 14.3 Export

Bundle:

- topics.json
- sessions.json
- transcripts.md
- summaries.json
- rubric.json

---

## 15) Mobile (Flutter) client architecture

### 15.1 Layers

1) API clients (pure HTTP):
- `TopicApiClient`
- `SessionApiClient`
- `FileApiClient`
- `BillingApiClient`

2) Services (orchestrate + caching):
- `TopicService`
- `SessionService`
- `AudioService`
- `ArtifactService`

3) UI (screens)
- TopicsListScreen
- TopicDetailScreen
- SessionScreen
- SessionReviewScreen
- AccountSettingsScreen

### 15.2 Suggested state management

Pick one and stay consistent:

- Riverpod (recommended for modularity) OR Bloc.

### 15.3 Session loop (client)

- Record audio
- Upload audio via presigned URL
- POST turn finalize to backend
- Subscribe for prompt readiness (poll or websocket)
- Speak prompt
- Repeat

---

## 16) Implementation plan (phased)

### Phase 0: foundations

- Repo setup (backend + mobile)
- Auth flow
- Database schema + Prisma
- Topic CRUD

### Phase 1: session loop

Phase 0 is complete (foundations are in place). Phase 1 should now be split into small backend-first PRs, each shipping one vertical slice.

#### Phase 1 immediate next step (PR-1)

**Implement session lifecycle API (draft → active → ended/aborted) with strict backend layering.**

Scope:

- Add `Session` types in all three layers (`src/types/api/session`, `src/types/service/session`, `src/types/data-source/session`) using per-operation kebab-case files and namespace barrels.
- Add `SessionDataSource` (Prisma-only methods, `input` parameter naming, no business logic).
- Add `SessionMapper` following the established static-class pattern in `src/mappers/` (e.g., `SessionMapper.getOne.output.fromDataSourceToService()`).
- Add `SessionService` methods for:
  - create draft session
  - get single session (for use in later PRs and polling)
  - start session (enforce valid transition `DRAFT -> ACTIVE`)
  - end session (enforce valid transition `ACTIVE -> ENDED`)
  - abort session (enforce valid transition `ACTIVE -> ABORTED`, per Section 5 — "ended early: network/user/payment")
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
- Register `SessionDataSource` and `SessionService` in `src/lib/container.ts` so they are accessible via `fastify.container.services.session`.
- Keep authorization behavior consistent with topic routes (student can only access their own topic/session records).

Acceptance checks:

- Unit tests for service state transitions (DRAFT→ACTIVE, ACTIVE→ENDED, ACTIVE→ABORTED) and invalid transitions (e.g., DRAFT→ENDED, ENDED→ACTIVE).
- Route tests for auth boundaries, 404 ownership behavior, and happy-path transitions.
- No queue/STT/model calls yet in PR-1 (defer to PR-3/PR-4 below).

#### Phase 1 PR split (backend-focused)

1. **PR-1 — Session lifecycle (start now)**
   - Session CRUD-lite for draft/start/end/abort/list plus single-session retrieval, with full state-machine transition enforcement.
   - Includes mapper, DI container wiring, and soft-delete endpoint.
2. **PR-2 — Turn intake + audio presign**
   - Add turn type/data-source/service/route contracts. Add `TurnMapper` following established pattern.
   - Implement `POST /v1/sessions/:sessionId/turns/presign-audio` and `POST /v1/sessions/:sessionId/turns`.
   - Enforce session-active guard: turns can only be created when session status is `ACTIVE` (reject with 409 Conflict otherwise).
   - Auto-assign turn `index` in service layer by counting existing turns for the session (the Prisma unique constraint on `(sessionId, index)` guarantees ordering).
   - Persist turn rows with pending assistant fields; keep ownership checks strict.
   - Register `TurnDataSource` and `TurnService` in `src/lib/container.ts`.
3. **PR-3 — Async pipeline skeleton**
   - Add queue abstraction and job contracts for all three spec-defined jobs: `TRANSCRIBE_TURN`, `GENERATE_PROMPT`, and `RENDER_ARTIFACTS` (Section 9.2). Wire no-op/mock handlers for each through service orchestration. `RENDER_ARTIFACTS` handler can remain a stub until Phase 2, but the contract must exist.
   - Add turn status read endpoint (`GET /v1/sessions/:sessionId/turns/:turnId`) for polling.
4. **PR-4 — STT integration + prompt generation enforcement loop**
   - Wire real STT provider into the `TRANSCRIBE_TURN` handler (replace no-op from PR-3). Persist `studentText` on the turn.
   - Implement strict structured output validation pipeline from Section 4.3 (schema, word cap, banned phrases, one-sentence check, bounded retries) in the `GENERATE_PROMPT` handler.
   - Persist `assistantText`, `assistantPromptType`, `assistantDetectedIssue`, `latencyMs`.
5. **PR-5 — Basic mobile session screen integration (client)**
   - Wire session start/record/upload/poll/end to backend endpoints with minimal UI controls.
   - Keep UI scope limited to proving the loop works end-to-end (real voice → STT → prompt → display).

### Phase 2: artifacts + review

- Transcript renderer
- Summary + rubric generation
- Session review screens
- Export + delete account

### Phase 3: billing

- Trial cap
- Paywall + subscription
- Webhook validation
- Post-pay unlock

---

## 17) Testing requirements

- Unit tests for Services (state transitions, caps)
- Contract tests for API (OpenAPI snapshot)
- Integration test: full "turn" pipeline with mocked STT/model
- Load test: concurrent sessions (queue behavior)
- Security tests: auth bypass, topic/session access control

---

## 18) Open questions (explicitly tracked)

- Do we do device TTS or server TTS for v0.1?
- Do we support streaming (websocket) or polling for prompt readiness?
- Trial allowance: one session vs N minutes?
- Storage provider choice: Supabase Storage vs S3 (cost/ops tradeoff)

---

## Appendix A — Example system prompt (server-side)

(Provide as a template; implement in code, not in UI)

- You are Dialogos. You speak in short, neutral prompts.
- You may only ask one question or give one instruction per turn.
- You must not praise the student.
- You must not recap what the student said unless asked.
- You must not supply missing arguments or content.
- Output MUST match the JSON schema exactly.
