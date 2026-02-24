# Security Audit — PR #30 (PR-4: STT Integration + Prompt Generation Enforcement Loop)

**Date:** 2026-02-24
**Branch:** `claude/continue-implementation-dke5V`
**Commit:** `8ed5a0d feat: PR-4 — STT integration + prompt generation enforcement loop`
**Scope:** All 22 changed files (1,404 additions, 23 deletions)
**Methodology:** Manual code review of every changed file against TECH_SPEC security requirements and OWASP Top 10

---

## Executive Summary

This PR implements two critical pipeline stages: real STT transcription via OpenAI Whisper and LLM-driven Socratic prompt generation via Anthropic Claude. It also introduces the enforcement loop (word cap, banned phrases, sentence count, enum validation) and prompt injection mitigations (delimiter tags, control character stripping).

The implementation is **generally well-structured** and addresses the majority of security requirements from TECH_SPEC Sections 4.x and 6.4.4. However, the audit identified **12 findings** — 2 critical, 3 high, 4 medium, and 3 low — that should be addressed before merge.

---

## Findings

### CRITICAL

#### C1 — API Error Bodies Logged and Potentially Leaked in Error Messages

**Files:**
- `src/lib/llm/anthropic-llm.ts:109-110`
- `src/lib/stt/openai-stt.ts:37-38`

```typescript
// anthropic-llm.ts
const text = await response.text();
throw new Error(`Anthropic API request failed (${response.status}): ${text}`);

// openai-stt.ts
const body = await response.text();
throw new Error(`OpenAI STT request failed (${response.status}): ${body}`);
```

**Risk:** Anthropic and OpenAI API error responses may contain account identifiers, request IDs, partial API key echoes, rate limit details, or internal error context. These error messages are:
1. Caught in the enforcement loop and stored in `lastError`
2. Logged via `console.error` in `generate-prompt.handler.ts:132`
3. Could propagate up the call stack if uncaught

In a misconfiguration scenario, the API response body could contain the API key itself (e.g., in verbose error modes or proxy reflection). Logging the full response body is a data exposure risk.

**Recommendation:** Log only the HTTP status code and a generic message. Store the full error body at DEBUG level only, and never include the raw API response in error messages that could reach the client:
```typescript
throw new Error(`Anthropic API request failed with status ${response.status}`);
// Log full body at debug level only: logger.debug({ status, body: text })
```

---

#### C2 — No Audio Content Validation Before STT Processing

**File:** `src/jobs/handlers/transcribe-turn.handler.ts:34-42`

```typescript
const audioBuffer = await storageProvider.getObject(turn.studentAudioKey);
// ...infer MIME from extension...
const result = await sttProvider.transcribe(audioBuffer, mimeType);
```

**Risk:** The audio file is fetched from S3 and passed directly to the OpenAI Whisper API without any content validation. An attacker could:
1. Upload a non-audio file with an audio extension (the presigned URL only validates `ContentType` header, not actual file content)
2. Upload a maliciously crafted audio file designed to exploit Whisper parser vulnerabilities
3. Upload a very large file (up to the presigned URL limit) that consumes memory when loaded as a `Buffer`

TECH_SPEC Section 6.4.5 specifically requires "lightweight audio probe after upload" to validate file content.

**Recommendation:**
1. Add a file magic bytes check before processing (e.g., verify WebM/MP4/OGG/WAV header signatures)
2. Add a maximum buffer size check before passing to STT (e.g., 10 MB consistent with the presigned URL limit):
```typescript
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB
if (audioBuffer.length > MAX_AUDIO_BYTES) {
  throw new Error(`Audio file exceeds maximum size`);
}
```
3. Consider running the audio through an FFmpeg probe to validate format integrity

---

### HIGH

#### H1 — S3 `getObject` Key Not Validated

**File:** `src/jobs/handlers/transcribe-turn.handler.ts:28`

```typescript
const audioBuffer = await storageProvider.getObject(turn.studentAudioKey);
```

**File:** `src/lib/storage/s3-storage.ts:48-56` (new `getObject` method)

```typescript
public async getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: this.bucket,
    Key: key,
  });
  const response = await this.client.send(command);
  const byteArray = await response.Body!.transformToByteArray();
  return Buffer.from(byteArray);
}
```

**Risk:** The `getObject` method accepts any string key with no validation. While the `studentAudioKey` is validated at turn creation time (regex: `^turns\/[uuid]\/audio\/[uuid]\/.+$`), this method is a general-purpose storage accessor. If called from any other context with user-controlled input, it could access arbitrary S3 objects.

Additionally, `response.Body!` uses a non-null assertion. If the S3 response has no body (e.g., the object was deleted between the existence check and fetch), this will throw an unhandled `TypeError`.

**Recommendation:**
1. Add key format validation inside `getObject` or document that callers must validate keys
2. Replace the non-null assertion with an explicit check:
```typescript
if (!response.Body) {
  throw new Error(`S3 object not found or empty: ${key}`);
}
```

---

#### H2 — MIME Type Inferred from Extension, Not Content

**File:** `src/jobs/handlers/transcribe-turn.handler.ts:36-46`

```typescript
const ext = turn.studentAudioKey.split(".").pop()?.toLowerCase() ?? "webm";
const mimeMap: Record<string, string> = { ... };
const mimeType = mimeMap[ext] ?? "audio/webm";
```

**Risk:** The MIME type is inferred from the file extension in the storage key, not from the actual file content. An attacker could upload a file with a `.webm` extension that contains non-WebM content. The fallback to `"audio/webm"` means any unrecognized extension also defaults to WebM, which could cause unexpected behavior in the STT provider.

This is compounded by the fact that the storage key's filename segment is user-provided (the `.+` portion of the validated regex). A key like `turns/<uuid>/audio/<uuid>/malicious.xyz` would fall through to `audio/webm`.

**Recommendation:** Use the `ContentType` from the S3 object metadata (returned in the `GetObjectCommand` response) instead of inferring from the extension:
```typescript
const response = await this.client.send(command);
const contentType = response.ContentType ?? "audio/webm";
```

---

#### H3 — No Timeout or Size Cap on External API Calls

**Files:**
- `src/lib/llm/anthropic-llm.ts:98` — `fetch("https://api.anthropic.com/v1/messages", ...)`
- `src/lib/stt/openai-stt.ts:28` — `fetch("https://api.openai.com/v1/audio/transcriptions", ...)`

**Risk:** Both external API calls use `fetch()` with no timeout. If the API hangs or is slow to respond, the job handler will block indefinitely, eventually exhausting worker capacity or causing cascading failures.

Additionally, for the Anthropic API response, there is no maximum response body size check — a malicious or buggy proxy could return an arbitrarily large response.

**Recommendation:** Add `AbortSignal.timeout()` to both fetch calls:
```typescript
const response = await fetch(url, {
  ...options,
  signal: AbortSignal.timeout(30_000), // 30s timeout
});
```

---

### MEDIUM

#### M1 — Enforcement Loop Does Not Feed Back Violation Context to LLM

**File:** `src/jobs/handlers/generate-prompt.handler.ts:93-106`

```typescript
for (let attempt = 0; attempt <= MAX_ENFORCEMENT_RETRIES; attempt++) {
  const output = await llmProvider.generateSocraticResponse(messages);
  const violation = validateOutput(output);
  if (violation) {
    lastError = `${violation.rule}: ${violation.detail}`;
    continue; // retry with same messages
  }
  // ...
}
```

**Risk:** The retry loop calls the LLM with identical messages each time. Without informing the model about why the previous attempt failed, the model is likely to produce the same invalid output repeatedly, wasting all retries. This is a cost amplification issue — 3 LLM calls per failed turn with no convergence improvement.

**Recommendation:** This is not strictly a security vulnerability but a cost/reliability concern. Consider appending a correction hint to the messages on retry:
```typescript
if (violation && attempt < MAX_ENFORCEMENT_RETRIES) {
  messages.push({ role: "assistant", content: output.next_prompt });
  messages.push({ role: "user", content: `Violation: ${violation.detail}. Try again.` });
}
```

---

#### M2 — Source `extractedText` Length Limit Only Applied to Tier 1

**File:** `src/lib/prompt/system-prompt.ts:95-100`

```typescript
if (ctx.source.extractedText && ctx.source.groundingTier === 1) {
  const truncated = ctx.source.extractedText.length > MAX_SOURCE_TEXT_LENGTH
    ? ctx.source.extractedText.slice(0, MAX_SOURCE_TEXT_LENGTH) + "... [truncated]"
    : ctx.source.extractedText;
  lines.push(`- Source text:\n${wrapSourceText(truncated)}`);
}
```

**Risk:** Only Tier 1 source text is included in the prompt (with a length cap). However, if the condition is ever broadened (e.g., to include Tier 2 sources), the `MAX_SOURCE_TEXT_LENGTH` truncation would need to be applied separately. The truncation is coupled to the tier check rather than being a standalone safety guard.

Additionally, the `extractedText` field in the database can be up to 500KB (per source creation validation). The `MAX_SOURCE_TEXT_LENGTH` of 8,000 characters is a sensible truncation for the prompt, but the original field has no sanitization at the database layer.

**Recommendation:** Apply `wrapSourceText` (which includes `stripControlCharacters`) to all source text regardless of whether it's included in the prompt, and ensure the truncation is applied as a standalone safety guard.

---

#### M3 — Graceful Fallback Message Could Be Exploited for Detection

**File:** `src/jobs/handlers/generate-prompt.handler.ts:136-141`

```typescript
await turnDataSource.updateOne({
  id: parsed.turnId,
  assistantText: "I need a moment. Could you rephrase that?",
  assistantPromptType: "clarify",
  assistantDetectedIssue: "none",
  latencyMs,
});
```

**Risk:** The hardcoded fallback message is identical every time the enforcement loop fails. An attacker performing prompt injection could use this consistent response as a signal that their injection was "close" to bypassing enforcement (causing word cap / banned phrase violations rather than producing a valid response). This provides a side channel for iterative prompt injection refinement.

**Recommendation:** Rotate between 2-3 generic fallback messages, or include minor variations, to reduce the signal value of the fallback.

---

#### M4 — `triviumStage` Cast Without Validation

**File:** `src/jobs/handlers/generate-prompt.handler.ts:83`

```typescript
triviumStage: session.triviumStage as PromptContext["triviumStage"],
```

**Risk:** The `triviumStage` value from the database is cast with `as` (type assertion) rather than validated. If the database contains an unexpected value (e.g., due to a migration error or direct DB edit), this would pass an invalid value into the prompt context, potentially causing unexpected system prompt behavior.

**Recommendation:** Validate against the expected enum before use:
```typescript
const validStages = ["grammar", "logic", "rhetoric", "combined"] as const;
const stage = validStages.includes(session.triviumStage as any)
  ? session.triviumStage as PromptContext["triviumStage"]
  : "combined"; // safe default
```

---

### LOW

#### L1 — STT Transcription Not Logged for Audit Trail

**File:** `src/jobs/handlers/transcribe-turn.handler.ts`

**Risk:** The transcribed text is persisted to the database but not logged. For a Socratic tutoring platform, having an audit trail of what the STT produced vs. what was stored (after sanitization and truncation) would be valuable for debugging prompt injection attempts and for monitoring STT quality.

**Recommendation:** Add structured logging of the raw transcription length, sanitized length, and whether truncation was applied (do not log the full text to avoid PII in logs).

---

#### L2 — `MAX_STUDENT_TEXT_LENGTH` Is Generous

**File:** `src/jobs/handlers/transcribe-turn.handler.ts:10`

```typescript
const MAX_STUDENT_TEXT_LENGTH = 10_000;
```

**Risk:** 10,000 characters for a spoken transcription is generous. A typical spoken minute produces ~150 words (~750 characters). At the 10MB audio limit, this could represent ~15 minutes of speech, producing ~11,000 characters. The 10K limit is reasonable but sits near the boundary.

However, this text is later included in the LLM prompt context. If multiple turns each have 10K characters of student text, and 6 turns are included in context (`MAX_CONTEXT_TURNS = 6`), that's up to 60K characters of student text in the prompt — a significant cost driver and potential context window issue.

**Recommendation:** Consider whether 10K per turn is necessary or if a lower limit (e.g., 4,000 characters) would cover realistic speech-to-text output while reducing cost exposure.

---

#### L3 — No Rate Limiting on LLM/STT Calls per Student

**Risk:** Each turn triggers one STT call and potentially 3 LLM calls (1 + 2 retries). There is no per-student rate limit on turn creation beyond the global HTTP rate limiter (100 req/min). A student creating turns rapidly could generate significant API costs.

**Recommendation:** This is partially mitigated by the session state machine (turns only allowed when session is `ACTIVE`). However, consider adding a per-session turn rate limit (e.g., max 1 turn per 5 seconds) to prevent rapid-fire abuse.

---

## Positive Security Observations

The following security measures are **correctly implemented** in this PR:

1. **Prompt injection isolation** (`src/lib/prompt/sanitize.ts`): Student text wrapped in `<student_speech>` tags with clear system prompt instructions not to follow instructions within tags. Source text wrapped in `<source_text>` tags. This follows TECH_SPEC Section 6.4.4.

2. **Control character stripping** (`src/lib/prompt/sanitize.ts:7`): Strips `\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F` while preserving newlines (`\n`) and tabs (`\t`). This prevents null-byte injection and invisible character manipulation.

3. **Structured output via tool_use** (`src/lib/llm/anthropic-llm.ts:88-93`): Uses `tool_choice: { type: "tool", name: "socratic_response" }` to force structured output. Combined with Zod schema validation (`SocraticOutputSchema.parse()`), this is a robust approach to constraining model output.

4. **Enforcement validation pipeline** (`src/lib/prompt/enforcement.ts`): Implements all four TECH_SPEC Section 4.6 checks: schema validation, word cap, banned-phrase scan, and sentence count. Bounded retries (max 2 + 1 initial = 3 attempts).

5. **Enum validation at persistence layer** (`enforcement.ts:103-111`): `validateEnumsForPersistence()` runs Zod enum validation on `prompt_type` and `detected_issue` before writing to the database, as required by TECH_SPEC Section 6.4.4.

6. **Graceful degradation** (container.ts): STT and LLM providers are optional (`null` if env vars not set). Handlers fall back to placeholder behavior. This prevents the application from crashing if external services are unavailable.

7. **Transcription length limit** (`transcribe-turn.handler.ts:10`): `MAX_STUDENT_TEXT_LENGTH = 10_000` prevents storing unbounded STT output.

8. **Context window management** (`system-prompt.ts:19`): `MAX_CONTEXT_TURNS = 6` and `MAX_SOURCE_TEXT_LENGTH = 8_000` limit prompt size.

9. **Zod payload validation** continues for all job payloads (`GeneratePromptPayloadSchema.parse(payload)`).

10. **No new dependencies introduced** — uses native `fetch()` and `FormData` for API calls, avoiding additional attack surface.

---

## Finding Summary

| ID | Severity | Title | File(s) |
|----|----------|-------|---------|
| C1 | CRITICAL | API error bodies logged/leaked | `anthropic-llm.ts`, `openai-stt.ts` |
| C2 | CRITICAL | No audio content validation before STT | `transcribe-turn.handler.ts` |
| H1 | HIGH | S3 `getObject` key not validated + non-null assertion | `s3-storage.ts`, `transcribe-turn.handler.ts` |
| H2 | HIGH | MIME type inferred from extension not content | `transcribe-turn.handler.ts` |
| H3 | HIGH | No timeout on external API calls | `anthropic-llm.ts`, `openai-stt.ts` |
| M1 | MEDIUM | Enforcement loop doesn't feed violation context to LLM | `generate-prompt.handler.ts` |
| M2 | MEDIUM | Source text length limit only applied to Tier 1 | `system-prompt.ts` |
| M3 | MEDIUM | Identical fallback message enables side-channel detection | `generate-prompt.handler.ts` |
| M4 | MEDIUM | `triviumStage` cast without validation | `generate-prompt.handler.ts` |
| L1 | LOW | No audit logging for STT transcription | `transcribe-turn.handler.ts` |
| L2 | LOW | Generous transcription length limit (cost exposure) | `transcribe-turn.handler.ts` |
| L3 | LOW | No per-student rate limit on LLM/STT calls | Architecture |

---

## Recommended Actions Before Merge

**Must fix (blocking):**
1. **C1** — Sanitize API error messages to not include response bodies
2. **C2** — Add audio content validation (magic bytes check + size guard)
3. **H1** — Replace non-null assertion in `getObject` with explicit check
4. **H3** — Add `AbortSignal.timeout()` to external API fetch calls

**Should fix (non-blocking, open issues):**
5. **H2** — Use S3 object metadata for MIME type instead of extension
6. **M3** — Randomize fallback messages
7. **M4** — Validate `triviumStage` instead of type assertion

**Defer to follow-up:**
8. **M1** — Feed enforcement violation context into retry prompt
9. **M2** — Decouple source text sanitization from tier check
10. **L1-L3** — Audit logging, length tuning, per-student rate limits
