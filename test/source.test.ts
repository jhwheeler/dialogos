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

describe("Source CRUD routes", () => {
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

  // ─── GET /v1/topics/:topicId/sources ──────────────────────────

  describe("GET /v1/topics/:topicId/sources", () => {
    it("returns an empty list when no sources exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ items: [], count: 0 });
    });

    it("returns only non-deleted sources for the topic", async () => {
      await prisma.source.create({
        data: {
          topicId: topicAId,
          sourceType: "document",
          title: "Active Source",
          groundingTier: 3,
        },
      });
      await prisma.source.create({
        data: {
          topicId: topicAId,
          sourceType: "reference",
          title: "Deleted Source",
          groundingTier: 2,
          deletedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.items).toHaveLength(1);
      expect(body.count).toBe(1);
      expect(body.items[0].title).toBe("Active Source");
    });

    it("returns 404 when accessing another student's topic sources", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicBId}/sources`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── POST /v1/topics/:topicId/sources ─────────────────────────

  describe("POST /v1/topics/:topicId/sources", () => {
    it("creates a source with document type and extracted text (Tier 1)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "document",
          title: "Republic Book I",
          extractedText: "Justice is the advantage of the stronger.",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toEqual(expect.any(String));
      expect(body.topicId).toBe(topicAId);
      expect(body.sourceType).toBe("document");
      expect(body.title).toBe("Republic Book I");
      expect(body.extractedText).toBe("Justice is the advantage of the stronger.");
      expect(body.groundingTier).toBe(1);
      expect(body.createdAt).toEqual(expect.any(String));
    });

    it("creates a reference source without text (Tier 2)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "reference",
          title: "Republic",
          citation: "327a-331d",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.groundingTier).toBe(2);
      expect(body.citation).toBe("327a-331d");
      expect(body.extractedText).toBeNull();
    });

    it("creates a voice_summary source (Tier 3)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "voice_summary",
          title: "My notes on justice",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.groundingTier).toBe(3);
    });

    it("creates a document source without extracted text (Tier 3 until extraction)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "document",
          title: "Uploaded PDF",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.groundingTier).toBe(3);
    });

    it("returns 404 when creating source on another student's topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicBId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "reference",
          title: "Not My Topic",
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 400 when sourceType is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: { title: "No type" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when title is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: { sourceType: "document" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── GET /v1/topics/:topicId/sources/:sourceId ────────────────

  describe("GET /v1/topics/:topicId/sources/:sourceId", () => {
    it("returns a source by id", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: {
          sourceType: "reference",
          title: "Nicomachean Ethics",
          citation: "Book I",
        },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(created.id);
      expect(body.title).toBe("Nicomachean Ethics");
    });

    it("returns 404 for a non-existent source id", async () => {
      const fakeId = crypto.randomUUID();

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources/${fakeId}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when accessing another student's source", async () => {
      const source = await prisma.source.create({
        data: {
          topicId: topicBId,
          sourceType: "reference",
          title: "B's Source",
          groundingTier: 2,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicBId}/sources/${source.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── PATCH /v1/topics/:topicId/sources/:sourceId ──────────────

  describe("PATCH /v1/topics/:topicId/sources/:sourceId", () => {
    it("updates the title of a source", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: { sourceType: "reference", title: "Original" },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${topicAId}/sources/${created.id}`,
        headers: authHeader(tokenA),
        payload: { title: "Updated" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().title).toBe("Updated");
    });

    it("upgrades grounding tier when extractedText is added", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: { sourceType: "document", title: "No text yet" },
      });
      const created = createResponse.json();
      expect(created.groundingTier).toBe(3);

      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${topicAId}/sources/${created.id}`,
        headers: authHeader(tokenA),
        payload: { extractedText: "Now I have text content." },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().groundingTier).toBe(1);
    });

    it("returns 404 when updating another student's source", async () => {
      const source = await prisma.source.create({
        data: {
          topicId: topicBId,
          sourceType: "reference",
          title: "B's Source",
          groundingTier: 2,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${topicBId}/sources/${source.id}`,
        headers: authHeader(tokenA),
        payload: { title: "Hijacked" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── DELETE /v1/topics/:topicId/sources/:sourceId ─────────────

  describe("DELETE /v1/topics/:topicId/sources/:sourceId", () => {
    it("soft-deletes a source", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
        payload: { sourceType: "reference", title: "To Delete" },
      });
      const created = createResponse.json();

      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${topicAId}/sources/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.json().id).toBe(created.id);

      // Verify it no longer appears in list
      const listResponse = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources`,
        headers: authHeader(tokenA),
      });
      expect(listResponse.json().items).toHaveLength(0);

      // Verify GET by id returns 404
      const getResponse = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/sources/${created.id}`,
        headers: authHeader(tokenA),
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it("returns 404 when deleting another student's source", async () => {
      const source = await prisma.source.create({
        data: {
          topicId: topicBId,
          sourceType: "reference",
          title: "B's Source",
          groundingTier: 2,
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${topicBId}/sources/${source.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
