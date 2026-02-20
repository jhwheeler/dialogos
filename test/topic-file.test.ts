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

describe("Topic File CRUD routes", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let prisma: PrismaClient;

  // Student A
  let studentAId: string;
  let tokenA: string;
  let topicAId: string;

  // Student B (for ownership isolation tests)
  let studentBId: string;
  let tokenB: string;
  let _topicBId: string;

  beforeAll(async () => {
    prisma = getTestPrismaClient();
    app = await buildTestApp();

    // Create two test students
    const studentA = await prisma.student.create({
      data: { displayName: "File Test Student A" },
    });
    studentAId = studentA.id;
    tokenA = await createTestToken(studentAId);

    const studentB = await prisma.student.create({
      data: { displayName: "File Test Student B" },
    });
    studentBId = studentB.id;
    tokenB = await createTestToken(studentBId);

    // Create a topic for each student
    const topicA = await prisma.topic.create({
      data: { studentId: studentAId, title: "Student A Topic" },
    });
    topicAId = topicA.id;

    const topicB = await prisma.topic.create({
      data: { studentId: studentBId, title: "Student B Topic" },
    });
    _topicBId = topicB.id;
  });

  beforeEach(async () => {
    // Clean only files between tests (keep students and topics)
    await prisma.topicFile.deleteMany();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await disconnectTestPrisma();
    await app?.close();
  });

  // ─── GET /v1/topics/:topicId/files ──────────────────────────────

  describe("GET /v1/topics/:topicId/files", () => {
    it("returns an empty list when there are no files", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ files: [] });
    });

    it("returns files after one has been created", async () => {
      // Create a file record via the API
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
        payload: {
          storageKey: `topics/${topicAId}/files/${crypto.randomUUID()}/notes.pdf`,
          kind: "pdf",
          originalName: "notes.pdf",
          mimeType: "application/pdf",
          sizeBytes: 12345,
        },
      });
      expect(createResponse.statusCode).toBe(201);

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.files).toHaveLength(1);
      expect(body.files[0].originalName).toBe("notes.pdf");
    });
  });

  // ─── POST /v1/topics/:topicId/files ─────────────────────────────

  describe("POST /v1/topics/:topicId/files", () => {
    it("creates a file record and returns it with 201", async () => {
      const storageKey = `topics/${topicAId}/files/${crypto.randomUUID()}/notes.pdf`;

      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
        payload: {
          storageKey,
          kind: "pdf",
          originalName: "notes.pdf",
          mimeType: "application/pdf",
          sizeBytes: 12345,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toEqual(expect.any(String));
      expect(body.kind).toBe("pdf");
      expect(body.storageKey).toBe(storageKey);
      expect(body.originalName).toBe("notes.pdf");
      expect(body.mimeType).toBe("application/pdf");
      expect(body.sizeBytes).toBe(12345);
      expect(body.createdAt).toEqual(expect.any(String));
    });

    it("returns 400 when the request body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── DELETE /v1/topics/:topicId/files/:fileId ───────────────────

  describe("DELETE /v1/topics/:topicId/files/:fileId", () => {
    it("soft-deletes a file and hides it from subsequent list requests", async () => {
      // Create a file first
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
        payload: {
          storageKey: `topics/${topicAId}/files/${crypto.randomUUID()}/to-delete.pdf`,
          kind: "pdf",
          originalName: "to-delete.pdf",
          mimeType: "application/pdf",
          sizeBytes: 999,
        },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();

      // Delete
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${topicAId}/files/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.json()).toEqual({ id: created.id });

      // List should be empty now
      const listResponse = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toEqual({ files: [] });
    });
  });

  // ─── POST /v1/topics/:topicId/files/presign ─────────────────────

  describe("POST /v1/topics/:topicId/files/presign", () => {
    it("returns 500 when storage is not configured", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files/presign`,
        headers: authHeader(tokenA),
        payload: {
          kind: "pdf",
          originalName: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  // ─── Ownership isolation ────────────────────────────────────────

  describe("Ownership isolation", () => {
    it("returns 404 when Student B tries to list files on Student A's topic", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenB),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when Student B tries to create a file on Student A's topic", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenB),
        payload: {
          storageKey: `topics/${topicAId}/files/${crypto.randomUUID()}/hijack.pdf`,
          kind: "pdf",
          originalName: "hijack.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when Student B tries to delete a file on Student A's topic", async () => {
      // Student A creates a file
      const createResponse = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
        payload: {
          storageKey: `topics/${topicAId}/files/${crypto.randomUUID()}/owned.pdf`,
          kind: "pdf",
          originalName: "owned.pdf",
          mimeType: "application/pdf",
          sizeBytes: 500,
        },
      });
      expect(createResponse.statusCode).toBe(201);
      const fileId = createResponse.json().id;

      // Student B tries to delete it
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${topicAId}/files/${fileId}`,
        headers: authHeader(tokenB),
      });

      expect(deleteResponse.statusCode).toBe(404);

      // Verify the file still exists for Student A
      const listResponse = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/files`,
        headers: authHeader(tokenA),
      });
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json().files).toHaveLength(1);
    });
  });

  // ─── Non-existent topic ─────────────────────────────────────────

  describe("Non-existent topic", () => {
    it("returns 404 when listing files for a non-existent topic", async () => {
      const fakeTopicId = crypto.randomUUID();

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${fakeTopicId}/files`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── Unauthenticated access ─────────────────────────────────────

  describe("Unauthenticated access", () => {
    it("returns 401 for GET /v1/topics/:topicId/files without auth header", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}/files`,
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for POST /v1/topics/:topicId/files without auth header", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files`,
        payload: {
          storageKey: "test-key",
          kind: "pdf",
          originalName: "test.pdf",
          sizeBytes: 100,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for POST /v1/topics/:topicId/files/presign without auth header", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/topics/${topicAId}/files/presign`,
        payload: {
          kind: "pdf",
          originalName: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for DELETE /v1/topics/:topicId/files/:fileId without auth header", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${topicAId}/files/${crypto.randomUUID()}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
