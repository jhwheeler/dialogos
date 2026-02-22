# PR-2: Turn Intake + Audio Presign

## Context

PR-1 (Session lifecycle + Source entity) is merged. The plan (TECH_SPEC.md §16) specifies PR-2 as the next step:

> **PR-2 — Turn intake + audio presign**
> - Add turn type/data-source/service/route contracts. Add `TurnMapper` following established pattern.
> - Implement `POST /v1/sessions/:sessionId/turns/presign-audio` and `POST /v1/sessions/:sessionId/turns`.
> - Enforce session-active guard: turns can only be created when session status is `ACTIVE` (reject with 409 Conflict otherwise).
> - Auto-assign turn `index` in service layer by counting existing turns for the session (the Prisma unique constraint on `(sessionId, index)` guarantees ordering).
> - Persist turn rows with pending assistant fields; keep ownership checks strict.
> - Register `TurnDataSource` and `TurnService` in `src/lib/container.ts`.

The `Turn` model already exists in the Prisma schema (added in PR-1), so no migration is needed.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/sessions/:sessionId/turns/presign-audio` | Get presigned upload URL for student audio |
| `POST` | `/v1/sessions/:sessionId/turns` | Finalize a turn (audio uploaded, create row) |
| `GET` | `/v1/sessions/:sessionId/turns/:turnId` | Get a single turn (for polling in PR-3) |
| `GET` | `/v1/sessions/:sessionId/turns` | List all turns for a session |

## Implementation Steps

### 1. Types — Data Source layer (`src/types/data-source/turn/`)

Create type files following the per-operation kebab-case file pattern:

- **`create-one.ts`** — Input: `{ sessionId, index, studentAudioKey? }`. Output: full Turn row from Prisma.
- **`get-one.ts`** — Input: `{ id }`. Output: full Turn row or null.
- **`get-many.ts`** — Input: `{ sessionId }`. Output: array of Turn rows.
- **`count-by-session.ts`** — Input: `{ sessionId }`. Output: `number` (for auto-indexing).
- **`index.ts`** — barrel re-exports.

### 2. Types — Service layer (`src/types/service/turn/`)

- **`create-one.ts`** — Input: `{ sessionId, studentId, studentAudioKey, durationMs? }`. Output: Turn DTO (id, sessionId, index, studentAudioKey, studentText, assistantText, etc.).
- **`get-one.ts`** — Input: `{ id, studentId }`. Output: Turn DTO.
- **`get-many.ts`** — Input: `{ sessionId, studentId }`. Output: Turn DTO array.
- **`presign-audio.ts`** — Input: `{ sessionId, studentId, originalName, mimeType, sizeBytes }`. Output: `{ uploadUrl, storageKey }`.
- **`index.ts`** — barrel.

### 3. Types — API layer (`src/types/api/turn/`)

- **`create-one.ts`** — Params schema: `{ sessionId }`. Body schema: `{ studentAudioKey, durationMs? }`. Output schema: Turn API shape (dates as ISO strings).
- **`get-one.ts`** — Params schema: `{ sessionId, turnId }`. Output schema: Turn API shape.
- **`get-many.ts`** — Params schema: `{ sessionId }`. Output schema: `{ turns: Turn[] }`.
- **`presign-audio.ts`** — Params schema: `{ sessionId }`. Body schema: `{ originalName, mimeType, sizeBytes }`. Output schema: `{ uploadUrl, storageKey }`.
- **`index.ts`** — barrel.

### 4. Data Source (`src/data-sources/turn/turn.data-source.ts`)

- Constructor takes `PrismaClient`.
- `createOne(input)` — `prisma.turn.create()`.
- `getOne(input)` — `prisma.turn.findUnique()`.
- `getMany(input)` — `prisma.turn.findMany({ where: { sessionId }, orderBy: { index: "asc" } })`.
- `countBySession(input)` — `prisma.turn.count({ where: { sessionId } })` — used for auto-index.

### 5. Mapper (`src/mappers/turn.mapper.ts`)

Static class following the established pattern. Maps Turn Prisma output to service output shape. Operations: `createOne`, `getOne`, `getMany`.

### 6. Service (`src/services/turn/turn.service.ts`)

Constructor takes: `TurnDataSource`, `SessionDataSource`, `StorageProvider | null`.

Methods:
- **`presignAudio(input)`**:
  - Verify session exists + owned by student (via `sessionDataSource.getOne()` + check `studentId`).
  - Verify session status is `active` — if not, throw `ConflictError`.
  - Check storage provider configured — if not, throw `ApiError.internal()`.
  - Generate storage key: `turns/${sessionId}/audio/${crypto.randomUUID()}/${safeName}`.
  - Call `storage.getPresignedUploadUrl()`.
  - Return `{ uploadUrl, storageKey }`.

- **`createOne(input)`**:
  - Verify session exists + owned by student.
  - Verify session status is `active` — if not, throw `ConflictError("Turns can only be created for active sessions")`.
  - Count existing turns for auto-index: `turnDataSource.countBySession({ sessionId })`.
  - Create turn: `turnDataSource.createOne({ sessionId, index: count, studentAudioKey })`.
  - Return mapped output via `TurnMapper.createOne.output.fromDataSourceToService()`.

- **`getOne(input)`**:
  - Get turn by ID. If not found, throw `NotFoundError`.
  - Verify session ownership (load session, check `studentId`).
  - Return mapped output.

- **`getMany(input)`**:
  - Verify session exists + owned by student.
  - Get all turns ordered by index.
  - Return mapped output.

### 7. Routes (`src/api/v1/turn.routes.ts`)

Fastify async plugin with `ZodTypeProvider`, following the session routes pattern:

- **`POST /sessions/:sessionId/turns/presign-audio`** — auth, call `turnService.presignAudio()`, return `{ uploadUrl, storageKey }`.
- **`POST /sessions/:sessionId/turns`** — auth, call `turnService.createOne()`, return turn with ISO-formatted `createdAt`, status `201`.
- **`GET /sessions/:sessionId/turns/:turnId`** — auth, call `turnService.getOne()`, return turn.
- **`GET /sessions/:sessionId/turns`** — auth, call `turnService.getMany()`, return `{ turns: [...] }`.

### 8. Container wiring (`src/lib/container.ts`)

- Import `TurnDataSource` and `TurnService`.
- Instantiate `TurnDataSource(prisma)`.
- Instantiate `TurnService(turnDataSource, sessionDataSource, storage)`.
- Register both in `dataSources.turn` and `services.turn`.

### 9. App registration (`src/app.ts`)

- Import `turnRoutes` from `./api/v1/turn.routes.js`.
- Register inside the `/v1` prefix block.

### 10. Tests (`test/turn.test.ts`)

Route-level integration tests following the session.test.ts pattern:

**Setup:** Create studentA, studentB, topicA, topicB. In `beforeEach`, clean turns/sessions/sources/topics and recreate fixtures. Create an active session for turn tests.

**Presign audio tests:**
- Happy path: presign returns `uploadUrl` + `storageKey` for active session.
- 409 when session is in `draft` status.
- 409 when session is in `ended` status.
- 404 when session doesn't exist.
- 404 when accessing another student's session.

**Create turn tests:**
- Happy path: creates turn with index 0, returns turn shape.
- Creates sequential turns with auto-incrementing index.
- 409 when session is not active (draft, ended, aborted).
- 404 when accessing another student's session.

**Get single turn tests:**
- Happy path: returns turn by id.
- 404 for non-existent turn.
- 404 when accessing another student's turn.

**List turns tests:**
- Returns empty array when no turns exist.
- Returns turns ordered by index.
- 404 when accessing another student's session.

## Key Design Decisions

1. **Auto-index via count**: The service counts existing turns and uses that as the next index. The Prisma unique constraint `(sessionId, index)` guarantees correctness even under race conditions (second write would fail).

2. **Session-active guard**: Both `presignAudio` and `createOne` enforce that the session must be in `active` status. This is a 409 Conflict, not a 400, since the request is structurally valid but conflicts with current state.

3. **Ownership checks flow through session**: Turns don't store `studentId` directly. Ownership is verified by loading the parent session and checking its `studentId`.

4. **Storage dependency is nullable**: Follows the `TopicFileService` pattern — presign fails gracefully if storage isn't configured (useful for tests/local dev without S3).

5. **Assistant fields left null**: `assistantText`, `assistantPromptType`, `assistantDetectedIssue`, `latencyMs` are all nullable and left empty on turn creation. They'll be populated by the async pipeline in PR-3/PR-4.

6. **`durationMs` on create body**: Optional field passed from client indicating audio recording duration. Useful for trial time tracking later. Not stored on the turn itself (no column) — may be used by service for cost accounting in future PRs.

## Files to Create/Modify

**New files (18):**
- `src/types/data-source/turn/create-one.ts`
- `src/types/data-source/turn/get-one.ts`
- `src/types/data-source/turn/get-many.ts`
- `src/types/data-source/turn/count-by-session.ts`
- `src/types/data-source/turn/index.ts`
- `src/types/service/turn/create-one.ts`
- `src/types/service/turn/get-one.ts`
- `src/types/service/turn/get-many.ts`
- `src/types/service/turn/presign-audio.ts`
- `src/types/service/turn/index.ts`
- `src/types/api/turn/create-one.ts`
- `src/types/api/turn/get-one.ts`
- `src/types/api/turn/get-many.ts`
- `src/types/api/turn/presign-audio.ts`
- `src/types/api/turn/index.ts`
- `src/data-sources/turn/turn.data-source.ts`
- `src/services/turn/turn.service.ts`
- `src/mappers/turn.mapper.ts`
- `src/api/v1/turn.routes.ts`
- `test/turn.test.ts`

**Modified files (2):**
- `src/lib/container.ts` — add TurnDataSource + TurnService
- `src/app.ts` — register turnRoutes
