# Dialogos Security Audit (2026-02-22)

## Scope
- **Implemented codebase**: current Fastify + Prisma backend in `src/` and current tests in `test/`.
- **Planned build-out**: architecture and phased delivery in `docs/TECH_SPEC.md` and `docs/PLAN.md`.

## Method
- Reviewed auth, routing, validation, storage upload, deletion, and operational-exposure surfaces.
- Reviewed planned queue/STT/model and billing phases for forward-looking security gaps.
- Ran baseline checks:
  - `npm audit --omit=dev` (result: **0 prod dependency vulnerabilities**)
  - `npm run lint` (passed)
  - `npm run test` (failed in this environment due to missing Postgres at `127.0.0.1:5432`)
  - `npm run build` (passed)

## Existing strengths
- Route-level auth and ownership checks are consistently applied across topic/source/session/file APIs.
- Zod request/response schema validation and centralized error handling are in place.
- Session lifecycle transitions are guarded in the data layer with conditional updates.
- Security-relevant tests exist for auth and ownership boundaries.

## Findings (implemented code)

### High
1. **JWT validation is too permissive**  
   `src/api/auth.plugin.ts` validates signature and `sub`, but does not enforce issuer/audience constraints or explicit algorithm policy.  
   **Risk:** token confusion across environments or issuers, weaker trust-boundary guarantees.

2. **Upload/finalization flow can be abused**  
   `src/types/api/topic-file/presign-upload.ts` and `src/types/api/topic-file/create-one.ts` accept broad unbounded metadata; `src/services/topic-file/topic-file.service.ts` finalizes client-provided `storageKey` without binding to a server-issued presign record; `src/lib/storage/s3-storage.ts` uses long presign TTL and no checksum/content-length constraints.  
   **Risk:** oversized uploads, storage-key abuse, poisoned metadata, and avoidable storage cost/abuse.

3. **Deletion/compliance behavior does not yet match spec promises**  
   Current services soft-delete individual records, while `docs/TECH_SPEC.md` specifies cascade soft-delete and queued hard-delete windows for account/data deletion.  
   **Risk:** compliance and privacy expectation mismatch.

### Medium
4. **CORS is fully open (`origin: true`)**  
   In `src/app.ts`, this is broad for bearer-token APIs.  
   **Risk:** increased attack surface if client token handling is ever weak.

5. **No rate limiting on sensitive endpoints**  
   No limiter controls are present in `src/app.ts`/route registration.  
   **Risk:** brute-force, abuse, and resource exhaustion on auth/presign/session endpoints.

6. **Swagger UI exposed by default**  
   `/docs` is always registered in `src/app.ts`.  
   **Risk:** production reconnaissance surface.

7. **Unbounded in-memory identity cache**  
   `knownStudents` set in `src/api/auth.plugin.ts` can grow without expiry.  
   **Risk:** long-lived memory growth/DoS pressure.

## Findings (plan/build-out)

### High-priority planning gaps
1. **Billing webhook security requirements are underspecified**  
   `docs/TECH_SPEC.md` defines webhook endpoint but does not require signature verification, replay prevention, or idempotency handling.

2. **Queue/STT/model security controls are not explicit**  
   Planned async pipeline (`TRANSCRIBE_TURN`, `GENERATE_PROMPT`, `RENDER_ARTIFACTS`) lacks explicit requirements for:
   - prompt-injection resistance when ingesting transcript/source text,
   - PII handling/redaction policy for logs/artifacts,
   - worker authentication/authorization boundaries,
   - retry/dead-letter behavior with security-sensitive failure handling.

3. **Data lifecycle policy is declared but not operationalized**  
   Retention window is “define later”; no concrete deletion SLO, audit logging, or verification workflow is defined in phase tasks.

## Prioritized remediation plan

### P0 (next security hardening PR)
- Enforce strict JWT claim checks (`iss`, `aud`, `exp`/`nbf`) and allowed algorithms.
- Add API rate limiting (global + tighter limits for auth, presign, and turn endpoints).
- Harden uploads:
  - enforce allowlists for `kind`/MIME,
  - enforce max sizes server-side,
  - bind `storageKey` finalization to a server-issued presign token/record,
  - shorten presign TTL and include integrity constraints where supported.
- Restrict CORS to explicit trusted origins by environment.

### P1 (near-term)
- Align delete behavior with spec: cascade soft-delete + queued hard-delete implementation and verification.
- Gate or disable Swagger UI in production.
- Bound or replace `knownStudents` cache (TTL/LRU or DB-backed existence checks with caching policy).

### P1/P2 (before queue + billing go-live)
- Add explicit security acceptance criteria to phase tasks for:
  - webhook signature verification + replay/idempotency controls,
  - queue worker authZ boundaries and secret handling,
  - transcript/source/artifact PII minimization and retention controls,
  - security logging and incident response hooks.

## Recommended security acceptance checks (add to ongoing delivery)
- Auth token claim validation tests (issuer/audience mismatch, alg mismatch).
- Upload abuse tests (invalid MIME, oversize, forged storageKey finalization).
- Rate-limit tests for sensitive routes.
- Deletion verification tests (soft-delete visibility and hard-delete completion path).
- Webhook security tests (invalid signature, replayed payload, duplicate delivery idempotency).
