# Dialogos v0.1 Technical Spec (implementation baseline)

## Stack
- Mobile: Flutter
- Backend: TypeScript + Fastify
- Data: Prisma + Postgres (Supabase)
- Storage: Supabase Storage or S3

## Architecture layers
1. API layer (routes, auth, validation)
2. Service layer (session orchestration, business logic)
3. DataSource layer (Prisma table access only)

## Core entities
- Student
- Topic
- TopicFile
- Session
- Turn
- SessionArtifact

## Core session lifecycle
- Session states: DRAFT → ACTIVE → ENDED/ABORTED
- Turn pipeline:
  1. audio upload
  2. STT transcription
  3. prompt generation (strict JSON output)
  4. TTS playback (client-side preferred in MVP)

## Socrates Mode contract
Model output is validated against strict schema with:
- `next_prompt`
- `prompt_type`
- `detected_issue`
- `stop_reason`

Enforced constraints:
- one sentence prompt
- one move per turn
- default ≤12 words
- no praise/padding
- no unsolicited recap

## API scope (MVP)
- Topics CRUD
- Topic file upload/finalize/delete
- Sessions create/start/end/delete
- Turns presign/create/get
- Artifacts list/get
- Billing status/checkout/webhook
- Account export/delete

## Queue jobs (MVP)
- `TRANSCRIBE_TURN(turnId)`
- `GENERATE_PROMPT(turnId)`
- `RENDER_ARTIFACTS(sessionId)`

## Testing baseline
- Unit tests for service state transitions and limits
- API contract tests
- Integration test for full turn pipeline (mock STT/model)
- Access control/security checks

## Open decisions
- Polling vs websocket/SSE for turn readiness
- Device TTS vs server TTS
- Trial allowance policy
- Supabase Storage vs S3 final choice
