import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { buildTestApp } from "./helpers/build-test-app.js";
import { createTestToken, authHeader } from "./helpers/auth-test-helper.js";
import {
  getTestPrismaClient,
  cleanupTestDatabase,
  disconnectTestPrisma,
} from "./helpers/prisma-test-client.js";

/** Build a valid audio storage key matching the turns presign format. */
function audioKey(filename: string): string {
  return `turns/00000000-0000-0000-0000-000000000000/audio/00000000-0000-0000-0000-000000000001/${filename}`;
}

describe("Turn intake + audio presign routes", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let prisma: PrismaClient;

  let studentAId: string;
  let tokenA: string;
  let topicAId: string;

  let studentBId: string;
  let _tokenB: string;
  let topicBId: string;

  // Active session for student A — most tests use this
  let activeSessionId: string;

  beforeAll(async () => {
    prisma = getTestPrismaClient();
    app = await buildTestApp();

    const studentA = await prisma.student.create({
      data: { displayName: "Student A" },
    });
    studentAId = studentA.id;
    tokenA = await createTestToken(studentAId);

    const studentB = await prisma.student.create({
      data: { displayName: "Student B" },
    });
    studentBId = studentB.id;
    _tokenB = await createTestToken(studentBId);
  });

  beforeEach(async () => {
    await prisma.sessionArtifact.deleteMany();
    await prisma.turn.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany();
    await prisma.topicFile.deleteMany();
    await prisma.topic.deleteMany();

    const topicA = await prisma.topic.create({
      data: { studentId: studentAId, title: "Topic A" },
    });
    topicAId = topicA.id;

    const topicB = await prisma.topic.create({
      data: { studentId: studentBId, title: "Topic B" },
    });
    topicBId = topicB.id;

    // Create an active session for student A
    const session = await prisma.session.create({
      data: {
        studentId: studentAId,
        topicId: topicAId,
        status: "active",
        triviumStage: "combined",
        startedAt: new Date(),
      },
    });
    activeSessionId = session.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await disconnectTestPrisma();
    await app?.close();
  });

  // ─── POST /v1/sessions/:sessionId/turns ─────────────────────

  describe("POST /v1/sessions/:sessionId/turns", () => {
    it("creates a turn with index 0 for an active session", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("test.webm") },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toEqual(expect.any(String));
      expect(body.sessionId).toBe(activeSessionId);
      expect(body.index).toBe(0);
      expect(body.studentAudioKey).toBe(audioKey("test.webm"));
      expect(body.studentText).toBeNull();
      expect(body.assistantText).toBeNull();
      expect(body.assistantPromptType).toBeNull();
      expect(body.assistantDetectedIssue).toBeNull();
      expect(body.latencyMs).toBeNull();
      expect(body.createdAt).toEqual(expect.any(String));
    });

    it("auto-increments turn index for sequential turns", async () => {
      const res0 = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("turn0.webm") },
      });
      expect(res0.json().index).toBe(0);

      const res1 = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("turn1.webm") },
      });
      expect(res1.json().index).toBe(1);

      const res2 = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("turn2.webm") },
      });
      expect(res2.json().index).toBe(2);
    });

    it("returns 409 when session is in draft status", async () => {
      const draftSession = await prisma.session.create({
        data: {
          studentId: studentAId,
          topicId: topicAId,
          status: "draft",
          triviumStage: "combined",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${draftSession.id}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("test.webm") },
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 409 when session is in ended status", async () => {
      const endedSession = await prisma.session.create({
        data: {
          studentId: studentAId,
          topicId: topicAId,
          status: "ended",
          triviumStage: "combined",
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${endedSession.id}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("test.webm") },
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 409 when session is in aborted status", async () => {
      const abortedSession = await prisma.session.create({
        data: {
          studentId: studentAId,
          topicId: topicAId,
          status: "aborted",
          triviumStage: "combined",
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${abortedSession.id}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("test.webm") },
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 404 when session does not exist", async () => {
      const fakeId = crypto.randomUUID();
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${fakeId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("test.webm") },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when accessing another student's session", async () => {
      const sessionB = await prisma.session.create({
        data: {
          studentId: studentBId,
          topicId: topicBId,
          status: "active",
          triviumStage: "combined",
          startedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${sessionB.id}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("test.webm") },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 400 when studentAudioKey is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── GET /v1/sessions/:sessionId/turns/:turnId ─────────────

  describe("GET /v1/sessions/:sessionId/turns/:turnId", () => {
    it("returns a turn by id", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("test.webm") },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${activeSessionId}/turns/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(created.id);
      expect(body.sessionId).toBe(activeSessionId);
      expect(body.index).toBe(0);
      expect(body.studentAudioKey).toBe(audioKey("test.webm"));
    });

    it("returns 404 for a non-existent turn", async () => {
      const fakeId = crypto.randomUUID();
      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${activeSessionId}/turns/${fakeId}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when accessing another student's turn", async () => {
      const sessionB = await prisma.session.create({
        data: {
          studentId: studentBId,
          topicId: topicBId,
          status: "active",
          triviumStage: "combined",
          startedAt: new Date(),
        },
      });

      const turn = await prisma.turn.create({
        data: {
          sessionId: sessionB.id,
          index: 0,
          studentAudioKey: audioKey("b.webm"),
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${sessionB.id}/turns/${turn.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── GET /v1/sessions/:sessionId/turns ──────────────────────

  describe("GET /v1/sessions/:sessionId/turns", () => {
    it("returns an empty array when no turns exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ turns: [] });
    });

    it("returns turns ordered by index", async () => {
      // Create turns in order
      await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("turn0.webm") },
      });
      await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("turn1.webm") },
      });
      await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: audioKey("turn2.webm") },
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.turns).toHaveLength(3);
      expect(body.turns[0].index).toBe(0);
      expect(body.turns[1].index).toBe(1);
      expect(body.turns[2].index).toBe(2);
      expect(body.turns[0].studentAudioKey).toBe(audioKey("turn0.webm"));
      expect(body.turns[1].studentAudioKey).toBe(audioKey("turn1.webm"));
      expect(body.turns[2].studentAudioKey).toBe(audioKey("turn2.webm"));
    });

    it("returns 404 when accessing another student's session turns", async () => {
      const sessionB = await prisma.session.create({
        data: {
          studentId: studentBId,
          topicId: topicBId,
          status: "active",
          triviumStage: "combined",
          startedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${sessionB.id}/turns`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when session does not exist", async () => {
      const fakeId = crypto.randomUUID();
      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${fakeId}/turns`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── POST /v1/sessions/:sessionId/turns/presign-audio ──────

  describe("POST /v1/sessions/:sessionId/turns/presign-audio", () => {
    it("returns 500 when storage is not configured (test env)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns/presign-audio`,
        headers: authHeader(tokenA),
        payload: {
          originalName: "recording.webm",
          mimeType: "audio/webm",
          sizeBytes: 12345,
        },
      });

      // Storage is not configured in test env, so this should fail gracefully
      expect(response.statusCode).toBe(500);
    });

    it("returns 409 when session is in draft status", async () => {
      const draftSession = await prisma.session.create({
        data: {
          studentId: studentAId,
          topicId: topicAId,
          status: "draft",
          triviumStage: "combined",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${draftSession.id}/turns/presign-audio`,
        headers: authHeader(tokenA),
        payload: {
          originalName: "recording.webm",
          mimeType: "audio/webm",
          sizeBytes: 12345,
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 409 when session is in ended status", async () => {
      const endedSession = await prisma.session.create({
        data: {
          studentId: studentAId,
          topicId: topicAId,
          status: "ended",
          triviumStage: "combined",
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${endedSession.id}/turns/presign-audio`,
        headers: authHeader(tokenA),
        payload: {
          originalName: "recording.webm",
          mimeType: "audio/webm",
          sizeBytes: 12345,
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 404 when session does not exist", async () => {
      const fakeId = crypto.randomUUID();
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${fakeId}/turns/presign-audio`,
        headers: authHeader(tokenA),
        payload: {
          originalName: "recording.webm",
          mimeType: "audio/webm",
          sizeBytes: 12345,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when accessing another student's session", async () => {
      const sessionB = await prisma.session.create({
        data: {
          studentId: studentBId,
          topicId: topicBId,
          status: "active",
          triviumStage: "combined",
          startedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${sessionB.id}/turns/presign-audio`,
        headers: authHeader(tokenA),
        payload: {
          originalName: "recording.webm",
          mimeType: "audio/webm",
          sizeBytes: 12345,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── Input validation tests ──────────────────────────────────

  describe("Input validation", () => {
    it("rejects audio presign with unsupported MIME type", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns/presign-audio`,
        headers: authHeader(tokenA),
        payload: {
          originalName: "recording.exe",
          mimeType: "audio/x-custom",
          sizeBytes: 12345,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects audio presign with non-audio MIME type", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns/presign-audio`,
        headers: authHeader(tokenA),
        payload: {
          originalName: "document.pdf",
          mimeType: "application/pdf",
          sizeBytes: 12345,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects audio presign when sizeBytes exceeds 10 MB", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns/presign-audio`,
        headers: authHeader(tokenA),
        payload: {
          originalName: "recording.webm",
          mimeType: "audio/webm",
          sizeBytes: 10_485_761,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects turn creation with invalid studentAudioKey format", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        headers: authHeader(tokenA),
        payload: { studentAudioKey: "invalid/path/audio.webm" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── Auth boundary tests ───────────────────────────────────

  describe("Auth boundaries", () => {
    it("returns 401 for unauthenticated create turn request", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns`,
        payload: { studentAudioKey: audioKey("test.webm") },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for unauthenticated get single turn request", async () => {
      const fakeId = crypto.randomUUID();
      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${activeSessionId}/turns/${fakeId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for unauthenticated list turns request", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${activeSessionId}/turns`,
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for unauthenticated presign request", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${activeSessionId}/turns/presign-audio`,
        payload: {
          originalName: "recording.webm",
          mimeType: "audio/webm",
          sizeBytes: 12345,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
