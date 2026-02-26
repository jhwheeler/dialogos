import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { buildTestApp } from "./helpers/build-test-app.js";
import { createTestToken, authHeader } from "./helpers/auth-test-helper.js";
import {
  getTestPrismaClient,
  cleanupTestDatabase,
  disconnectTestPrisma,
} from "./helpers/prisma-test-client.js";

describe("Source preprocessing routes", () => {
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

  // ─── Preprocessing status starts as "none" ──────────────────

  it("new source has preprocessingStatus 'none'", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/topics/${topicAId}/sources`,
      headers: authHeader(tokenA),
      payload: {
        sourceType: "document",
        title: "Test Doc",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.preprocessingStatus).toBe("none");
    expect(body.preprocessingConfidence).toBeNull();
  });

  // ─── POST preprocess ────────────────────────────────────────

  describe("POST /v1/topics/:topicId/sources/:sourceId/preprocess", () => {
    it("sets status to 'processing' and returns 200", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "document",
          title: "Doc to preprocess",
        },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources/${created.id}/preprocess`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.preprocessingStatus).toBe("processing");
      expect(body.id).toBe(created.id);
    });

    it("returns 404 for another student's source", async () => {
      const source = await prisma.source.create({
        data: {
          topicId: topicBId,
          sourceType: "document",
          title: "B's Source",
          groundingTier: 3,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicBId}/sources/${source.id}/preprocess`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── GET preprocessing-status ───────────────────────────────

  describe("GET /v1/topics/:topicId/sources/:sourceId/preprocessing-status", () => {
    it("returns current preprocessing status", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "document",
          title: "Status Check Doc",
        },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources/${created.id}/preprocessing-status`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.preprocessingStatus).toBe("none");
      expect(body.preprocessingConfidence).toBeNull();
    });

    it("returns updated status after preprocessing is triggered", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "document",
          title: "Status After Preprocess",
        },
      });
      const created = createResponse.json();

      // Trigger preprocessing
      await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources/${created.id}/preprocess`,
        headers: authHeader(tokenA),
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources/${created.id}/preprocessing-status`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // After job runs (no LLM in test), it will be either "processing" or "degraded"
      expect(["processing", "degraded"]).toContain(body.preprocessingStatus);
    });
  });

  // ─── POST confirm-text ──────────────────────────────────────

  describe("POST /v1/topics/:topicId/sources/:sourceId/confirm-text", () => {
    it("confirms extracted text and promotes to Tier 1", async () => {
      // Create a source and manually set it to pending_confirmation
      const source = await prisma.source.create({
        data: {
          topicId: topicAId,
          sourceType: "document",
          title: "Pending Confirmation",
          groundingTier: 3,
          extractedText: "Some extracted text",
          preprocessingStatus: "pending_confirmation",
          preprocessingConfidence: 0.85,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources/${source.id}/confirm-text`,
        headers: authHeader(tokenA),
        payload: { confirmed: true },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.preprocessingStatus).toBe("confirmed");
      expect(body.groundingTier).toBe(1);
      expect(body.extractedText).toBe("Some extracted text");
    });

    it("uses correctedText when confirmed=false with correction", async () => {
      const source = await prisma.source.create({
        data: {
          topicId: topicAId,
          sourceType: "document",
          title: "Needs Correction",
          groundingTier: 3,
          extractedText: "Wrong text",
          preprocessingStatus: "pending_confirmation",
          preprocessingConfidence: 0.5,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources/${source.id}/confirm-text`,
        headers: authHeader(tokenA),
        payload: {
          confirmed: false,
          correctedText: "Corrected text here",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.preprocessingStatus).toBe("confirmed");
      expect(body.extractedText).toBe("Corrected text here");
      expect(body.groundingTier).toBe(1);
    });

    it("returns error when source is not in pending_confirmation status", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "document",
          title: "Not Pending",
        },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources/${created.id}/confirm-text`,
        headers: authHeader(tokenA),
        payload: { confirmed: true },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 for another student's source", async () => {
      const source = await prisma.source.create({
        data: {
          topicId: topicBId,
          sourceType: "document",
          title: "B's Source",
          groundingTier: 3,
          preprocessingStatus: "pending_confirmation",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicBId}/sources/${source.id}/confirm-text`,
        headers: authHeader(tokenA),
        payload: { confirmed: true },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── Graceful degradation ───────────────────────────────────

  describe("graceful degradation", () => {
    it("source without topicFileId degrades after preprocessing job runs", async () => {
      // Create source without topicFileId
      const source = await prisma.source.create({
        data: {
          topicId: topicAId,
          sourceType: "document",
          title: "No File Source",
          groundingTier: 3,
        },
      });

      // Trigger preprocessing
      await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources/${source.id}/preprocess`,
        headers: authHeader(tokenA),
      });

      // Wait a moment for the job queue to process
      await app.container.jobQueue.drain();

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources/${source.id}/preprocessing-status`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.preprocessingStatus).toBe("degraded");
    });
  });
});
