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

describe("Session CRUD + lifecycle routes", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let prisma: PrismaClient;

  let studentAId: string;
  let tokenA: string;
  let topicAId: string;

  let studentBId: string;
  let _tokenB: string;
  let topicBId: string;

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
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await disconnectTestPrisma();
    await app?.close();
  });

  // ─── POST /v1/topics/:topicId/sessions ────────────────────────

  describe("POST /v1/topics/:topicId/sessions", () => {
    it("creates a draft session with default trivium stage", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toEqual(expect.any(String));
      expect(body.topicId).toBe(topicAId);
      expect(body.sourceId).toBeNull();
      expect(body.triviumStage).toBe("combined");
      expect(body.status).toBe("draft");
      expect(body.startedAt).toBeNull();
      expect(body.endedAt).toBeNull();
      expect(body.createdAt).toEqual(expect.any(String));
    });

    it("creates a session with a specific trivium stage", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: { triviumStage: "grammar" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().triviumStage).toBe("grammar");
    });

    it("creates a session linked to a source", async () => {
      const source = await prisma.source.create({
        data: {
          topicId: topicAId,
          sourceType: "reference",
          title: "Republic",
          groundingTier: 2,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: { sourceId: source.id, triviumStage: "logic" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().sourceId).toBe(source.id);
    });

    it("returns 404 when creating session on another student's topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicBId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 400 for invalid trivium stage", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: { triviumStage: "invalid_stage" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── GET /v1/topics/:topicId/sessions ─────────────────────────

  describe("GET /v1/topics/:topicId/sessions", () => {
    it("returns an empty list when no sessions exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ sessions: [] });
    });

    it("returns only non-deleted sessions for the topic", async () => {
      await prisma.session.create({
        data: {
          studentId: studentAId,
          topicId: topicAId,
          status: "draft",
          triviumStage: "combined",
        },
      });
      await prisma.session.create({
        data: {
          studentId: studentAId,
          topicId: topicAId,
          status: "draft",
          triviumStage: "grammar",
          deletedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.sessions).toHaveLength(1);
      expect(body.sessions[0].triviumStage).toBe("combined");
    });

    it("returns 404 when listing sessions on another student's topic", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicBId}/sessions`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── GET /v1/sessions/:sessionId ──────────────────────────────

  describe("GET /v1/sessions/:sessionId", () => {
    it("returns a session by id", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: { triviumStage: "rhetoric" },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(created.id);
      expect(body.triviumStage).toBe("rhetoric");
      expect(body.status).toBe("draft");
    });

    it("returns 404 for a non-existent session id", async () => {
      const fakeId = crypto.randomUUID();
      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${fakeId}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when accessing another student's session", async () => {
      const session = await prisma.session.create({
        data: {
          studentId: studentBId,
          topicId: topicBId,
          status: "draft",
          triviumStage: "combined",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/sessions/${session.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── POST /v1/sessions/:sessionId/start ───────────────────────

  describe("POST /v1/sessions/:sessionId/start", () => {
    it("transitions a draft session to active", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });
      const created = createResponse.json();
      expect(created.status).toBe("draft");

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/start`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("active");
      expect(body.startedAt).toEqual(expect.any(String));
    });

    it("returns 409 when trying to start an already active session", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });
      const created = createResponse.json();

      await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/start`,
        headers: authHeader(tokenA),
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/start`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 409 when trying to start an ended session", async () => {
      const session = await prisma.session.create({
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
        url: `/v1/sessions/${session.id}/start`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 404 when starting another student's session", async () => {
      const session = await prisma.session.create({
        data: {
          studentId: studentBId,
          topicId: topicBId,
          status: "draft",
          triviumStage: "combined",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${session.id}/start`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── POST /v1/sessions/:sessionId/end ─────────────────────────

  describe("POST /v1/sessions/:sessionId/end", () => {
    it("transitions an active session to ended", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });
      const created = createResponse.json();

      await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/start`,
        headers: authHeader(tokenA),
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/end`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("ended");
      expect(body.endedAt).toEqual(expect.any(String));
    });

    it("returns 409 when trying to end a draft session", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/end`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 409 when trying to end an already ended session", async () => {
      const session = await prisma.session.create({
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
        url: `/v1/sessions/${session.id}/end`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ─── POST /v1/sessions/:sessionId/abort ───────────────────────

  describe("POST /v1/sessions/:sessionId/abort", () => {
    it("transitions an active session to aborted", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });
      const created = createResponse.json();

      await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/start`,
        headers: authHeader(tokenA),
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/abort`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("aborted");
      expect(body.endedAt).toEqual(expect.any(String));
    });

    it("returns 409 when trying to abort a draft session", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "POST",
        url: `/v1/sessions/${created.id}/abort`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 409 when trying to abort an aborted session", async () => {
      const session = await prisma.session.create({
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
        url: `/v1/sessions/${session.id}/abort`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(409);
    });
  });

  // ─── DELETE /v1/sessions/:sessionId ───────────────────────────

  describe("DELETE /v1/sessions/:sessionId", () => {
    it("soft-deletes a session", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });
      const created = createResponse.json();

      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/v1/sessions/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.json().id).toBe(created.id);

      // Verify it no longer appears in list
      const listResponse = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
      });
      expect(listResponse.json().sessions).toHaveLength(0);

      // Verify GET by id returns 404
      const getResponse = await app.inject({
        method: "GET",
        url: `/v1/sessions/${created.id}`,
        headers: authHeader(tokenA),
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it("returns 404 when deleting another student's session", async () => {
      const session = await prisma.session.create({
        data: {
          studentId: studentBId,
          topicId: topicBId,
          status: "draft",
          triviumStage: "combined",
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/v1/sessions/${session.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── Full lifecycle test ──────────────────────────────────────

  describe("Full session lifecycle", () => {
    it("completes draft → active → ended lifecycle", async () => {
      // Create draft
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: { triviumStage: "logic" },
      });
      expect(createResponse.statusCode).toBe(201);
      const session = createResponse.json();
      expect(session.status).toBe("draft");

      // Start
      const startResponse = await app.inject({
        method: "POST",
        url: `/v1/sessions/${session.id}/start`,
        headers: authHeader(tokenA),
      });
      expect(startResponse.statusCode).toBe(200);
      expect(startResponse.json().status).toBe("active");

      // End
      const endResponse = await app.inject({
        method: "POST",
        url: `/v1/sessions/${session.id}/end`,
        headers: authHeader(tokenA),
      });
      expect(endResponse.statusCode).toBe(200);
      expect(endResponse.json().status).toBe("ended");
      expect(endResponse.json().endedAt).toEqual(expect.any(String));
    });

    it("completes draft → active → aborted lifecycle", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sessions`,
        headers: authHeader(tokenA),
        payload: {},
      });
      const session = createResponse.json();

      await app.inject({
        method: "POST",
        url: `/v1/sessions/${session.id}/start`,
        headers: authHeader(tokenA),
      });

      const abortResponse = await app.inject({
        method: "POST",
        url: `/v1/sessions/${session.id}/abort`,
        headers: authHeader(tokenA),
      });
      expect(abortResponse.statusCode).toBe(200);
      expect(abortResponse.json().status).toBe("aborted");
    });
  });
});
