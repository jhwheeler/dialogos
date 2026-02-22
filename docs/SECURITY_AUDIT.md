# Dialogos — Security Audit

**Date:** 2026-02-22
**Scope:** Full codebase (existing code) + planned architecture (TECH_SPEC.md, PLAN.md)
**Methodology:** Manual code review of every source file, schema, configuration, and specification document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Part A — Existing Code Audit](#2-part-a--existing-code-audit)
   - [A1. Authentication & Authorization](#a1-authentication--authorization)
   - [A2. Input Validation](#a2-input-validation)
   - [A3. Data Exposure & Information Leakage](#a3-data-exposure--information-leakage)
   - [A4. Storage & File Handling](#a4-storage--file-handling)
   - [A5. Database Security](#a5-database-security)
   - [A6. Configuration & Secrets](#a6-configuration--secrets)
   - [A7. CORS & HTTP Security](#a7-cors--http-security)
   - [A8. Denial of Service Vectors](#a8-denial-of-service-vectors)
   - [A9. CI/CD Pipeline](#a9-cicd-pipeline)
   - [A10. Dependency & Runtime](#a10-dependency--runtime)
3. [Part B — Planned Architecture Audit (TECH_SPEC + PLAN)](#3-part-b--planned-architecture-audit)
   - [B1. Turn Pipeline & Audio Handling](#b1-turn-pipeline--audio-handling)
   - [B2. LLM Integration & Prompt Injection](#b2-llm-integration--prompt-injection)
   - [B3. Billing & Trial Enforcement](#b3-billing--trial-enforcement)
   - [B4. Job Queue & Async Processing](#b4-job-queue--async-processing)
   - [B5. Account Privacy & Data Deletion](#b5-account-privacy--data-deletion)
   - [B6. Concept Ledger (Phase 2)](#b6-concept-ledger-phase-2)
   - [B7. Webhook Security (Phase 5)](#b7-webhook-security-phase-5)
   - [B8. Mobile Client Concerns](#b8-mobile-client-concerns)
4. [Finding Summary Table](#4-finding-summary-table)
5. [Prioritized Recommendations](#5-prioritized-recommendations)

---

## 1. Executive Summary

The Dialogos backend is a well-structured TypeScript/Fastify application with a clean layered architecture and several good security foundations: JWT-based authentication, Zod schema validation, ownership checks on all resources, soft deletes, and parameterized queries via Prisma ORM. These are meaningful positives.

However, the audit identified **30 findings** across the existing code and planned architecture. The most critical clusters are:

- **Unbounded input fields** — nearly all string inputs lack length constraints, enabling storage exhaustion and potential DoS
- **Permissive CORS** — `origin: true` reflects any origin, defeating cross-origin protections
- **Missing rate limiting** — no request throttling exists at any layer
- **Unvalidated settings field** — `z.unknown()` accepts arbitrary JSON, enabling prototype pollution or unexpected data storage
- **Planned LLM integration without prompt injection mitigations** — the tech spec's turn pipeline feeds user speech into model context without addressing injection vectors

No SQL injection, XSS, or direct authentication bypass was found. The use of Prisma ORM and Zod validation at the framework level provides a strong baseline.

---

## 2. Part A — Existing Code Audit

### A1. Authentication & Authorization

#### A1.1 — JWT Verification Is Sound ✅

`src/api/auth.plugin.ts` correctly uses the `jose` library's `jwtVerify()` with the Supabase JWT secret. It validates:
- Presence and format of `Authorization: Bearer <token>` header
- Cryptographic signature
- Token expiration (handled by `jose` automatically)
- Presence of `sub` claim

Tests in `test/auth.test.ts` cover missing header, wrong prefix, malformed token, wrong secret, expired token, and missing `sub` claim.

#### A1.2 — In-Memory Known-Student Cache Has No Eviction ⚠️ LOW

**File:** `src/api/auth.plugin.ts:22`

```typescript
const knownStudents = new Set<string>();
```

This set grows unboundedly over the lifetime of the process. For a long-lived server with many unique students, this is an unbounded memory growth vector.

**Risk:** Memory exhaustion over time in production (low severity in early stage, higher at scale).

**Recommendation:** Replace with an LRU cache with a configurable maximum size (e.g., `lru-cache` with 10k entries), or add a TTL-based expiry mechanism.

#### A1.3 — No JWT Algorithm Restriction ⚠️ MEDIUM

**File:** `src/api/auth.plugin.ts:36`

```typescript
const { payload } = await jwtVerify(token, secret);
```

The `jwtVerify` call does not specify `algorithms` in the options. While `jose` defaults to reasonable behavior and the symmetric key type constrains what's accepted, explicitly specifying `{ algorithms: ["HS256"] }` is a defense-in-depth measure against algorithm confusion attacks.

**Recommendation:** Add explicit algorithm restriction:
```typescript
await jwtVerify(token, secret, { algorithms: ["HS256"] });
```

#### A1.4 — Ownership Checks Are Consistently Applied ✅

Every service method that retrieves a resource checks `studentId` against the authenticated user. Resources belonging to other students return `NotFoundError` (not `ForbiddenError`), which avoids leaking the existence of other students' resources. This is a good security pattern.

#### A1.5 — No Role-Based Authorization ⚠️ INFO

All students have equal access. There is no admin role or elevated privilege concept. This is fine for the current scope but will need attention when billing/admin features are added in Phase 5.

### A2. Input Validation

#### A2.1 — No String Length Constraints on Any User Input 🔴 CRITICAL

**Affected files:** Every API input schema across `src/types/api/`, `src/types/service/`, and `src/types/data-source/`.

The following user-facing input fields have **zero** length constraints:

| Field | Endpoint | Max length enforced |
|-------|----------|-------------------|
| `title` | POST/PATCH /topics | None |
| `description` | POST/PATCH /topics | None |
| `title` | POST/PATCH /sources | None |
| `citation` | POST/PATCH /sources | None |
| `extractedText` | POST/PATCH /sources | None |
| `originalName` | POST /files, /files/presign | None |
| `mimeType` | POST /files, /files/presign | None |
| `kind` | POST /files, /files/presign | None |
| `storageKey` | POST /files | None |
| `displayName` | Auto-provisioned from JWT | None |

A malicious client could send a `POST /v1/topics` request with a `title` containing 100MB of data. This passes Zod validation and gets written directly to PostgreSQL.

**Impact:**
- Database storage exhaustion
- Memory pressure during request processing
- Potential downstream issues if `extractedText` (designed for full document text) is unbounded when returned in responses

**Recommendation:** Add `.min(1).max(N)` constraints to every string field:
- `title`: `.max(500)`
- `description`: `.max(5000)`
- `citation`: `.max(1000)`
- `extractedText`: `.max(500_000)` (documents can be long, but set a sane limit)
- `originalName`: `.max(500)`
- `mimeType`: `.max(255)`
- `kind`: Validate against an enum of allowed values (`pdf`, `image`, `text`, `other`)
- `storageKey`: `.max(1000)` and validate format (should match the pattern the presign endpoint generates)

#### A2.2 — `settings` Field Accepts Arbitrary Data 🔴 CRITICAL

**File:** `src/types/data-source/student/create-one.ts`, `update-one.ts`, and service layer equivalents

```typescript
settings: z.unknown()           // in create schema
settings: z.record(z.unknown()) // in update schema
```

The `settings` JSONB column accepts any JSON value with zero validation. This means an attacker can store:
- Deeply nested objects (causing processing issues on read)
- Extremely large objects (storage abuse)
- Unexpected keys that future code might naively trust

While `settings` is not currently exposed via any API route (student records are created/updated only via the auth plugin's `ensureExists`), the `StudentService.updateOne()` method exists and accepts unvalidated settings. Any future student profile endpoint would inherit this vulnerability.

**Recommendation:** Define a strict schema for settings matching the spec's definition (`voice rate`, `autoplay`, `strictness flags`):
```typescript
const SettingsSchema = z.object({
  voiceRate: z.number().min(0.5).max(2.0).optional(),
  autoplay: z.boolean().optional(),
  strictness: z.enum(["low", "medium", "high"]).optional(),
}).strict();
```

#### A2.3 — No File Size Upper Bound on Upload 🟡 HIGH

**File:** `src/types/api/topic-file/presign-upload.ts`, `create-one.ts`

`sizeBytes` is validated as a positive integer but has no upper bound. A client can claim `sizeBytes: 999999999999` to get a presigned URL for an enormous file, potentially running up storage costs.

**Recommendation:** Add `.max(52_428_800)` (50MB) or appropriate business-level limit. Also enforce the same limit on the S3 presigned URL (via `Content-Length` conditions in the PUT policy).

#### A2.4 — `storageKey` Not Validated Against Expected Pattern 🟡 HIGH

**File:** `src/services/topic-file/topic-file.service.ts:76-83`

When `createOne` is called (file metadata finalization), the `storageKey` comes directly from the client. The presign endpoint generates keys in the format `topics/{topicId}/files/{uuid}/{safeName}`, but the finalize endpoint does not verify the submitted `storageKey` matches that format or was actually issued by the presign endpoint.

A malicious client could submit a `storageKey` pointing to a different student's file path or an arbitrary S3 object.

**Recommendation:**
1. Validate `storageKey` format against a regex: `^topics/[a-f0-9-]{36}/files/[a-f0-9-]{36}/.+$`
2. Ideally, track issued presigned keys (e.g., in a short-lived cache or pending-upload table) and verify the finalize request matches an issued key.

#### A2.5 — UUID Parameters Are Validated ✅

All route parameters (`:topicId`, `:sessionId`, `:sourceId`, `:fileId`) use `.uuid()` validation via Zod. This prevents path traversal or injection through route parameters.

#### A2.6 — `kind` Field Not Enum-Validated 🟡 MEDIUM

**File:** `src/types/api/topic-file/create-one.ts`, `presign-upload.ts`

The `kind` field for TopicFile is `z.string()` but should be constrained to valid values. The Prisma schema defines TopicFile.kind as `String` (freeform), but the tech spec defines specific kinds: `pdf`, `image`, `text`, `other`.

**Recommendation:** Use `z.enum(["pdf", "image", "text", "other"])`.

### A3. Data Exposure & Information Leakage

#### A3.1 — Error Messages Leak Internal State 🟡 MEDIUM

**File:** `src/services/session/session.service.ts:110-112`

```typescript
throw new ConflictError(
  `Cannot start session: current status is '${current?.status ?? "unknown"}', expected 'draft'`
);
```

Session transition errors reveal the current internal status to the client. While this aids debugging, it gives an attacker insight into session state machines. Similar patterns exist in `endOne` and `abortOne`.

**Recommendation:** Return generic conflict messages to the client. Log the detailed message server-side.

#### A3.2 — Swagger UI Exposed Without Authentication 🟡 MEDIUM

**File:** `src/app.ts:59`

```typescript
app.register(swaggerUi, { routePrefix: "/docs" });
```

The OpenAPI documentation and Swagger UI are accessible to anyone without authentication. This exposes the complete API surface, including all endpoints, request/response schemas, and parameter types.

**Recommendation:** Restrict Swagger UI to non-production environments:
```typescript
if (env.NODE_ENV !== "production") {
  app.register(swaggerUi, { routePrefix: "/docs" });
}
```

#### A3.3 — Health Endpoint Does Not Require Auth ✅

`/v1/health` is correctly unauthenticated — standard practice for health checks.

#### A3.4 — Ownership Violations Return 404 Not 403 ✅

When a student tries to access another student's resource, the response is `404 Not Found`, not `403 Forbidden`. This prevents resource enumeration (the attacker cannot distinguish "doesn't exist" from "exists but not yours").

### A4. Storage & File Handling

#### A4.1 — Presigned URLs Have No Content-Length Condition 🟡 HIGH

**File:** `src/lib/storage/s3-storage.ts:37-41`

```typescript
const command = new PutObjectCommand({
  Bucket: this.bucket,
  Key: key,
  ContentType: contentType,
});
```

The presigned upload URL constrains `ContentType` but not `Content-Length`. A client could upload a file much larger than declared in `sizeBytes`, bypassing any size validation.

**Recommendation:** Add `ContentLength` conditions to the presigned URL or validate actual file size after upload via S3 HeadObject before finalizing the record.

#### A4.2 — Presigned URL Expiry Is 1 Hour (Default) ✅

The default 3600-second expiry is reasonable. Could be tightened to 15 minutes for uploads if desired.

#### A4.3 — File Deletion Is Soft-Delete Only — Storage Objects Not Cleaned 🟡 MEDIUM

**File:** `src/services/topic-file/topic-file.service.ts:88-108`

`deleteOne` only sets `deletedAt` in the database. The actual S3 object is never deleted. Over time, this leads to orphaned storage objects and unnecessary costs.

**Recommendation:** Schedule async S3 object deletion after soft-delete (consistent with the tech spec's plan for hard-delete within a retention window).

#### A4.4 — `originalName` Sanitization Is Minimal 🟡 MEDIUM

**File:** `src/services/topic-file/topic-file.service.ts:63`

```typescript
const safeName = input.originalName.replace(/[/\\]/g, "_");
```

Only forward/backslash characters are replaced. Other dangerous characters are not handled:
- `..` (path traversal when used in some contexts)
- Null bytes (`\0`)
- Unicode control characters
- Extremely long filenames

The name is used in the S3 key path, so the risk is limited (S3 treats keys as opaque strings), but downstream consumers of `originalName` (exports, downloads) could be vulnerable.

**Recommendation:** Apply stricter sanitization: strip non-printable characters, limit length, and consider a whitelist approach (alphanumeric + common punctuation).

### A5. Database Security

#### A5.1 — No SQL Injection Risk ✅

All database operations use Prisma's parameterized query builder. No raw SQL is used anywhere in the codebase. This effectively eliminates SQL injection.

#### A5.2 — No Database Connection Pooling Configuration ⚠️ LOW

**File:** `src/lib/prisma.ts`

The Prisma client is instantiated with defaults. In production, connection pool settings (`connection_limit`, `pool_timeout`) should be tuned to prevent connection exhaustion under load.

**Recommendation:** Configure via `DATABASE_URL` query parameters: `?connection_limit=10&pool_timeout=30`.

#### A5.3 — Soft Delete Not Enforced at Database Level 🟡 MEDIUM

Soft-delete filtering (`deletedAt: null`) is applied in application code, not via PostgreSQL Row-Level Security (RLS) or database views. This means:
- A bug in any data source method could leak soft-deleted records
- Direct database access (admin tools, other services) would see all records

The tech spec mentions RLS (Section 7.2): "Add RLS if using Supabase auth directly; if backend owns auth, enforce via API." The backend currently owns auth, so this is acceptable, but adding a default scope or middleware-level filter would be defense-in-depth.

#### A5.4 — No Database Indexes for Common Query Patterns ⚠️ LOW

The schema has no explicit indexes beyond primary keys and the `turns(session_id, index)` unique index. For production scale, add indexes on:
- `topics(student_id)` — filtered by `studentId` in every query
- `sessions(topic_id, student_id)` — for session listing
- `sources(topic_id)` — for source listing
- All `deleted_at` columns used in WHERE clauses

Not a security issue per se, but slow queries under load can cascade into availability problems.

### A6. Configuration & Secrets

#### A6.1 — `.env.test` Contains Hardcoded Secrets Checked Into Git 🟡 MEDIUM

**File:** `.env.test`

```
SUPABASE_JWT_SECRET=test-secret-key-must-be-at-least-32-characters
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dialogos_test
```

The same test secret appears in three places: `.env.test`, `test/helpers/auth-test-helper.ts`, and `test/helpers/build-test-app.ts`. While these are test-only values, if the test secret were ever used in a non-test environment (misconfiguration), it would be trivially discoverable.

**Risk:** Low (test values only), but violates least-surprise.

**Recommendation:** Use a single source of truth (environment variable) for the test secret rather than hardcoding it in multiple files.

#### A6.2 — `.env.example` Contains Placeholder Secret ✅

The example file correctly uses `change-me-to-at-least-32-characters-long-secret` as a placeholder. Zod validation in `src/lib/env.ts` enforces the 32-character minimum.

#### A6.3 — `.gitignore` Correctly Excludes `.env` ✅

The `.env` file (production secrets) is excluded from git. Only `.env.example` and `.env.test` are tracked.

#### A6.4 — No Secret Rotation Mechanism ⚠️ INFO

The JWT secret is a single static value. There is no mechanism for key rotation (supporting two active secrets during rollover). This is fine for early development but should be addressed before production.

### A7. CORS & HTTP Security

#### A7.1 — CORS Reflects Any Origin 🔴 CRITICAL

**File:** `src/app.ts:37`

```typescript
app.register(cors, { origin: true });
```

`origin: true` tells the CORS middleware to reflect **any** origin back as `Access-Control-Allow-Origin`. This means:
- Any website can make credentialed cross-origin requests to this API
- If authentication tokens are sent via cookies (future change), any site could steal them
- Even with Bearer tokens, a malicious page visited by a logged-in student could make API calls on their behalf if the token is accessible

**Recommendation:** Replace with an explicit allowlist:
```typescript
app.register(cors, {
  origin: [
    "https://app.dialogos.example.com",
    ...(env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
  ],
  credentials: true,
});
```

#### A7.2 — No Security Headers 🟡 HIGH

The application does not set standard security headers:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`

These headers protect against clickjacking, MIME-type sniffing, and protocol downgrade attacks.

**Recommendation:** Use `@fastify/helmet` or set headers manually:
```typescript
app.register(helmet, {
  contentSecurityPolicy: false, // API-only, no HTML
  hsts: { maxAge: 31536000 },
});
```

#### A7.3 — No Rate Limiting 🔴 CRITICAL

There is no rate limiting at any layer — neither per-IP nor per-student. Every endpoint is vulnerable to brute-force and abuse:
- Authentication endpoint flooding
- Resource creation spam (topics, sessions, sources)
- Presigned URL generation spam (storage cost attack)

**Recommendation:** Add `@fastify/rate-limit`:
```typescript
app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});
```
Apply stricter limits to mutation endpoints and auth-related paths.

### A8. Denial of Service Vectors

#### A8.1 — No Request Body Size Limit 🔴 CRITICAL

Fastify has a default `bodyLimit` of 1MB, which is reasonable. However, this is not explicitly configured, and the `extractedText` field (designed to hold full document text) may need special treatment.

**Recommendation:** Explicitly set `bodyLimit` in Fastify config and consider a larger limit only for specific routes that need it (e.g., source creation with extractedText).

#### A8.2 — No Pagination on List Endpoints 🟡 HIGH

**Files:** All `getMany` data source methods

List endpoints (`GET /topics`, `GET /topics/:id/files`, `GET /topics/:id/sources`, `GET /topics/:id/sessions`) return **all** non-deleted records with no pagination. A student with thousands of records would get unbounded response payloads.

**Recommendation:** Add `limit`/`offset` or cursor-based pagination to all list endpoints. Default to `limit: 50`, `max: 100`.

#### A8.3 — No Timeout on Prisma Queries ⚠️ LOW

Long-running queries (e.g., on large datasets) have no statement timeout. A slow query could hold a connection pool slot indefinitely.

**Recommendation:** Set a statement timeout in the database connection string or as a Prisma middleware.

### A9. CI/CD Pipeline

#### A9.1 — CI Secrets in Workflow Are Test-Only ✅

The CI workflow uses test-specific values (`ci-test-secret-key-must-be-at-least-32-characters`) and a local Postgres container. No production secrets are exposed.

#### A9.2 — Deploy Step Uses `GITHUB_TOKEN` With `contents: write` ⚠️ LOW

**File:** `.github/workflows/ci-cd.yml:12`

```yaml
permissions:
  contents: write
```

This grants write access to repository contents for all jobs, but only the deploy job needs it. The principle of least privilege would scope this to the deploy job only.

**Recommendation:** Move the `permissions` block from the workflow level to the `deploy` job level.

#### A9.3 — No Dependency Vulnerability Scanning ⚠️ MEDIUM

The CI pipeline does not run `npm audit` or any supply chain security tool (Dependabot, Snyk, Socket). Vulnerable transitive dependencies would go undetected.

**Recommendation:** Add `npm audit --audit-level=high` to CI and enable Dependabot or similar.

#### A9.4 — No Lock File Integrity Check ⚠️ LOW

`npm ci` is used (which verifies the lock file matches `package.json`), but there is no explicit integrity check for tampered lock files. This is generally sufficient.

### A10. Dependency & Runtime

#### A10.1 — Fastify v5 + Pino Logging ✅

Current and well-maintained framework. No known vulnerabilities in the versions used.

#### A10.2 — No Process Signal Handling for Graceful Shutdown 🟡 MEDIUM

**File:** `src/server.ts`

The server starts but has no graceful shutdown handler for `SIGTERM`/`SIGINT`. In containerized deployments, this means:
- In-flight requests may be dropped on deploy
- Database connections may not be properly closed

**Recommendation:**
```typescript
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
```

---

## 3. Part B — Planned Architecture Audit

This section audits the security implications of features described in TECH_SPEC.md and PLAN.md that have not yet been implemented.

### B1. Turn Pipeline & Audio Handling

#### B1.1 — Audio Upload Without Content Validation 🟡 HIGH

**TECH_SPEC Section 8.2:** `POST /v1/sessions/:sessionId/turns/presign-audio` returns an upload URL.

The plan does not specify content validation for uploaded audio files. An attacker could upload non-audio data (malware, scripts) using the presigned URL.

**Recommendation:**
- Validate MIME type on the presigned URL (`audio/webm`, `audio/wav`, etc.)
- After upload, verify the file is actually audio before processing (via a lightweight probe)
- Set a maximum audio file size (e.g., 10MB for a 15-minute session)

#### B1.2 — STT Output Used Directly as Model Input 🔴 CRITICAL

**TECH_SPEC Section 9.2:** `TRANSCRIBE_TURN` writes `studentText`, which is then used by `GENERATE_PROMPT` as part of the model context.

The transcribed student speech becomes part of the LLM prompt. This creates a prompt injection vector: a student could speak instructions to the LLM that override the system prompt ("Ignore previous instructions and..."). While the audio-first UX makes this less convenient than typing, it is still feasible.

**Recommendation:**
- Wrap student text in clearly delineated delimiters that the system prompt instructs the model to treat as user content only
- Apply input sanitization to transcribed text (strip control characters, limit length)
- Rely on the structured output validation pipeline (Section 4.6) as a defense-in-depth layer — it already validates that output matches the strict JSON schema, which limits what a prompt injection could achieve
- Monitor for anomalous model outputs that deviate from expected `prompt_type` distribution

#### B1.3 — Turn Index Race Condition 🟡 MEDIUM

**PLAN.md PR-2:** "Auto-assign turn `index` in service layer by counting existing turns."

If two turn-creation requests arrive simultaneously for the same session, both could count the same number of existing turns and try to insert the same index. The `@@unique([sessionId, index])` constraint will catch this, but the error handling is unspecified.

**Recommendation:** Use a database sequence or `INSERT ... SELECT MAX(index) + 1` in a single atomic query. Handle unique constraint violations with a retry.

### B2. LLM Integration & Prompt Injection

#### B2.1 — Source Text Included in Model Context 🟡 HIGH

**TECH_SPEC Section 4.7:** The system prompt includes `{{source.extractedText | truncate}}`.

`extractedText` comes from user-uploaded documents (OCR, document upload). This text could contain adversarial content designed to manipulate the LLM:
- Invisible text in PDFs (white-on-white)
- OCR of images containing prompt injection text
- Document content that includes "SYSTEM: ignore previous instructions"

**Recommendation:**
- Strip non-printable characters and control sequences from extracted text
- Clearly delineate source text in the prompt with role-based markers
- Apply content length limits in the prompt (truncation is mentioned but should be enforced strictly)
- Consider a two-pass approach: first pass extracts text, second pass sanitizes before prompt inclusion

#### B2.2 — Model Retry Logic Could Amplify Cost 🟡 MEDIUM

**TECH_SPEC Section 4.6:** "If not, regenerate (up to 2 retries, then fail the turn gracefully)."

The enforcement loop retries model calls up to 2 times per turn. An attacker who crafts inputs that consistently trigger retries (e.g., by including praise words in their speech that the model echoes) could triple the model API cost.

**Recommendation:**
- Track retry counts per session and flag sessions with abnormally high retry rates
- Consider caching failed generation context to reduce redundant API calls on retry

#### B2.3 — No Consideration of Model Output Exfiltration 🟡 MEDIUM

The spec stores `assistantPromptType` and `assistantDetectedIssue` from model output. While these are enum-like fields, they come from LLM output. If the model is compromised or manipulated, these fields could contain unexpected values.

**Recommendation:** Validate all model output fields against their expected enums server-side (the spec's schema validation partially addresses this, but enforce it at the persistence layer too).

### B3. Billing & Trial Enforcement

#### B3.1 — Trial Enforcement Not Yet Implemented 🟡 HIGH

**TECH_SPEC Section 10:** "trialRemainingSeconds decrement by recorded speech duration. Stop session when exhausted."

Currently, `trialRemainingSeconds` defaults to 180 but is never decremented. A free-tier student can create unlimited sessions with no enforcement.

**Risk:** Unlimited resource consumption on free tier until billing is implemented.

**Recommendation:** Even before full billing (Phase 5), implement basic session counting or time-based limits as guardrails.

#### B3.2 — `trialRemainingSeconds` Can Be Set Directly ⚠️ MEDIUM

**File:** `src/services/student/student.service.ts:60-66`

The `updateOne` method accepts `trialRemainingSeconds` as input. If a student profile update endpoint is ever exposed, a student could set their own trial time to an arbitrary value.

**Recommendation:** Never accept `trialRemainingSeconds` or `plan` from client input. These fields should only be modifiable by server-side logic (billing webhook, session end handler).

#### B3.3 — No Cost Cap Per Model Call 🟡 MEDIUM

**TECH_SPEC Section 10:** Mentions "small `max_output_tokens`" and "minimal context window" but doesn't specify hard limits.

**Recommendation:** Enforce `max_tokens` and context window limits as server-side constants, not configurable per-request. Track per-student daily cost and implement circuit breakers.

### B4. Job Queue & Async Processing

#### B4.1 — No Queue Technology Specified 🟡 MEDIUM

**TECH_SPEC Section 9.1:** "STT + model call + TTS can be slow and should not block request threads."

The plan calls for async processing but doesn't specify the queue technology. Security considerations vary significantly between options:
- **In-process queue** (BullMQ/Redis): requires Redis security hardening
- **Database-backed queue** (pgBoss): inherits Postgres security
- **Managed queue** (SQS, Cloud Tasks): requires IAM configuration

**Recommendation:** Whatever technology is chosen, ensure:
- Jobs are authenticated (cannot be enqueued by external actors)
- Job payloads are validated before processing
- Failed jobs have bounded retry limits to prevent infinite loops
- Job results are not exposed to unauthorized users

#### B4.2 — Job Handler Has Access to Full Database ⚠️ LOW

Job handlers will likely share the same Prisma client and full database access. A compromised job handler (e.g., via a dependency vulnerability in the STT library) could access any student's data.

**Recommendation:** Consider running job handlers with scoped database permissions or in isolated processes.

### B5. Account Privacy & Data Deletion

#### B5.1 — Hard Delete Not Implemented 🟡 HIGH

**TECH_SPEC Section 14:** "Queue hard-delete (audio/files/artifacts) within a retention window."

Soft-delete is implemented, but hard-delete is not. Deleted data persists indefinitely in both the database and S3 storage. This is a compliance concern (GDPR Article 17 right to erasure, CCPA).

**Recommendation:** Implement a scheduled hard-delete job before launch. Define and document the retention window.

#### B5.2 — No Data Export Implemented Yet ⚠️ INFO

**TECH_SPEC Section 14.3:** Data export is planned for Phase 5.

For GDPR compliance (right of access/portability), this should be prioritized alongside deletion.

#### B5.3 — Cascade Soft-Delete Not Implemented 🟡 MEDIUM

Deleting a topic currently only soft-deletes the topic record. Related sessions, files, sources are NOT cascade-deleted. A student who "deletes" a topic may expect all related data to be gone, but it persists.

**Recommendation:** Implement cascade soft-delete in the `TopicService.deleteOne` method, or clearly document this behavior.

### B6. Concept Ledger (Phase 2)

#### B6.1 — Verbatim Student Speech Stored Long-Term 🟡 MEDIUM

**TECH_SPEC Section 2.8:** `verbatimText` stores exact quotes from student speech.

This is sensitive personal data. Long-term storage of speech content requires:
- Encryption at rest (verify PostgreSQL/Supabase encryption settings)
- Access controls on the ledger
- Inclusion in data export/deletion flows

#### B6.2 — `linkedEntryIds` Is a UUID Array Without Referential Integrity 🟡 MEDIUM

**TECH_SPEC Section 7.1:**

```sql
linked_entry_ids uuid[] not null default '{}'
```

Using a UUID array for references (instead of a join table) means:
- No foreign key enforcement — entries can reference deleted/nonexistent entries
- No cascade behavior
- No efficient join queries

This isn't a direct security vulnerability but could lead to data integrity issues that manifest as security bugs (e.g., referencing an entry belonging to a different student).

**Recommendation:** Use a join table (`ledger_entry_links`) instead of a UUID array column.

### B7. Webhook Security (Phase 5)

#### B7.1 — Billing Webhook Endpoint Needs Signature Verification 🟡 HIGH

**TECH_SPEC Section 8.2:** `POST /v1/billing/webhook` (server-to-server)

The plan acknowledges this endpoint but doesn't specify webhook signature verification. Without verification, any actor could forge billing events (e.g., confirming a payment that never happened).

**Recommendation:** Implement HMAC signature verification (Stripe, RevenueCat, or whichever payment provider is used). Never trust unverified webhook payloads.

#### B7.2 — Webhook Must Be Idempotent ⚠️ INFO

Webhooks can be delivered multiple times. Processing the same payment event twice could double-credit a student's account.

**Recommendation:** Use idempotency keys. Track processed webhook IDs and skip duplicates.

### B8. Mobile Client Concerns

#### B8.1 — Token Storage on Device 🟡 HIGH

**TECH_SPEC Section 15:** Flutter mobile client handles JWT tokens.

Tokens stored in SharedPreferences or equivalent are accessible if the device is rooted/jailbroken. For a paid product handling student data, secure storage is important.

**Recommendation:** Store tokens in platform-specific secure storage (iOS Keychain, Android Keystore).

#### B8.2 — Certificate Pinning Not Mentioned ⚠️ MEDIUM

The mobile client communicates with the backend over HTTPS, but no certificate pinning is mentioned. Without pinning, a MITM proxy (e.g., corporate network) could intercept API traffic.

**Recommendation:** Implement certificate pinning for production builds.

#### B8.3 — Audio Recordings Stored Locally Before Upload ⚠️ LOW

During the record → upload flow, audio recordings exist as local files. These contain student speech (potentially sensitive).

**Recommendation:** Delete local audio files immediately after successful upload. Store them in app-private directories (not accessible to other apps).

---

## 4. Finding Summary Table

| ID | Severity | Category | Finding | Code/Plan |
|----|----------|----------|---------|-----------|
| A2.1 | 🔴 CRITICAL | Input Validation | No string length constraints on any input field | Code |
| A2.2 | 🔴 CRITICAL | Input Validation | `settings` accepts arbitrary unvalidated JSON | Code |
| A7.1 | 🔴 CRITICAL | HTTP Security | CORS reflects any origin (`origin: true`) | Code |
| A7.3 | 🔴 CRITICAL | HTTP Security | No rate limiting on any endpoint | Code |
| A8.1 | 🔴 CRITICAL | DoS | Fastify body limit not explicitly configured | Code |
| B1.2 | 🔴 CRITICAL | LLM Security | STT output used in model context without injection mitigations | Plan |
| A2.3 | 🟡 HIGH | Input Validation | No file size upper bound | Code |
| A2.4 | 🟡 HIGH | Input Validation | `storageKey` not validated against expected pattern | Code |
| A4.1 | 🟡 HIGH | Storage | Presigned URL has no Content-Length condition | Code |
| A7.2 | 🟡 HIGH | HTTP Security | No security headers (HSTS, X-Frame-Options, etc.) | Code |
| A8.2 | 🟡 HIGH | DoS | No pagination on list endpoints | Code |
| B1.1 | 🟡 HIGH | File Upload | Planned audio upload without content validation | Plan |
| B2.1 | 🟡 HIGH | LLM Security | Source text in model context enables prompt injection | Plan |
| B3.1 | 🟡 HIGH | Business Logic | Trial enforcement not implemented | Code+Plan |
| B5.1 | 🟡 HIGH | Privacy | Hard delete not implemented (GDPR concern) | Code+Plan |
| B7.1 | 🟡 HIGH | Billing | Webhook endpoint needs signature verification | Plan |
| B8.1 | 🟡 HIGH | Mobile | Token storage security on device | Plan |
| A1.3 | ⚠️ MEDIUM | Auth | No explicit JWT algorithm restriction | Code |
| A2.6 | 🟡 MEDIUM | Input Validation | `kind` field not enum-validated | Code |
| A3.1 | 🟡 MEDIUM | Info Leak | Error messages leak session internal status | Code |
| A3.2 | 🟡 MEDIUM | Info Leak | Swagger UI exposed without auth in all envs | Code |
| A4.3 | 🟡 MEDIUM | Storage | Soft-deleted files not cleaned from S3 | Code |
| A4.4 | 🟡 MEDIUM | Storage | Minimal filename sanitization | Code |
| A5.3 | 🟡 MEDIUM | Database | Soft delete not enforced at database level | Code |
| A9.3 | ⚠️ MEDIUM | CI/CD | No dependency vulnerability scanning | Code |
| A10.2 | 🟡 MEDIUM | Runtime | No graceful shutdown handler | Code |
| B1.3 | 🟡 MEDIUM | Concurrency | Turn index race condition | Plan |
| B2.2 | 🟡 MEDIUM | LLM Cost | Retry logic amplifies model API cost | Plan |
| B3.2 | ⚠️ MEDIUM | Business Logic | `trialRemainingSeconds` settable by client | Code |
| B5.3 | 🟡 MEDIUM | Privacy | Cascade soft-delete not implemented | Code |
| B6.2 | 🟡 MEDIUM | Data Integrity | `linkedEntryIds` array lacks referential integrity | Plan |
| B8.2 | ⚠️ MEDIUM | Mobile | No certificate pinning mentioned | Plan |
| A1.2 | ⚠️ LOW | Auth | In-memory student cache unbounded | Code |
| A5.2 | ⚠️ LOW | Database | No connection pool tuning | Code |
| A5.4 | ⚠️ LOW | Database | Missing indexes for common queries | Code |
| A6.1 | 🟡 MEDIUM | Secrets | Test secrets hardcoded in multiple files | Code |
| A9.2 | ⚠️ LOW | CI/CD | `contents: write` permission over-scoped | Code |

---

## 5. Prioritized Recommendations

### Immediate (before any public-facing deployment)

1. **Add string length constraints** to all Zod input schemas (A2.1)
2. **Replace `origin: true`** CORS with explicit allowlist (A7.1)
3. **Add rate limiting** via `@fastify/rate-limit` (A7.3)
4. **Define strict settings schema** replacing `z.unknown()` (A2.2)
5. **Add security headers** via `@fastify/helmet` (A7.2)
6. **Validate `storageKey`** format and ownership on file finalization (A2.4)
7. **Add file size limits** — both Zod validation and S3 presigned URL conditions (A2.3, A4.1)
8. **Restrict Swagger UI** to non-production (A3.2)
9. **Add pagination** to all list endpoints (A8.2)
10. **Explicitly configure** `bodyLimit` in Fastify constructor (A8.1)

### Before Phase 1 Turn Pipeline (PR-2 through PR-4)

11. **Design prompt injection mitigations** for STT → model context pipeline (B1.2)
12. **Sanitize source text** before including in model prompts (B2.1)
13. **Validate audio file content** after upload (B1.1)
14. **Handle turn index concurrency** with atomic inserts (B1.3)
15. **Add graceful shutdown** handler (A10.2)

### Before Production Launch (Phase 5)

16. **Implement trial enforcement** guardrails (B3.1)
17. **Implement hard-delete** for GDPR compliance (B5.1)
18. **Implement cascade soft-delete** for topics (B5.3)
19. **Add webhook signature verification** for billing (B7.1)
20. **Add dependency vulnerability scanning** to CI (A9.3)
21. **Add explicit JWT algorithm restriction** (A1.3)
22. **Mobile: use secure storage** for tokens (B8.1)
23. **Mobile: implement certificate pinning** (B8.2)

### Ongoing / Low Priority

24. Replace in-memory student set with LRU cache (A1.2)
25. Add database indexes for query performance (A5.4)
26. Tune connection pool settings (A5.2)
27. Scope CI permissions to specific jobs (A9.2)
28. Consolidate test secret into a single source (A6.1)

---

*This audit is a point-in-time assessment. It should be revisited as new features are implemented, particularly the LLM integration (PR-4), billing system (Phase 5), and any endpoints that accept file content.*
