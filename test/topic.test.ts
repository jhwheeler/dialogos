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

describe("Topic CRUD routes", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let prisma: PrismaClient;

  // Student A
  let studentAId: string;
  let tokenA: string;

  // Student B (for ownership isolation tests)
  let studentBId: string;
  let tokenB: string;

  beforeAll(async () => {
    prisma = getTestPrismaClient();
    app = await buildTestApp();

    // Create two test students in the database
    const studentA = await prisma.student.create({
      data: { displayName: "Student A" },
    });
    studentAId = studentA.id;
    tokenA = await createTestToken(studentAId);

    const studentB = await prisma.student.create({
      data: { displayName: "Student B" },
    });
    studentBId = studentB.id;
    tokenB = await createTestToken(studentBId);
  });

  beforeEach(async () => {
    // Clean topics between tests (but keep students)
    await prisma.topic.deleteMany();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await disconnectTestPrisma();
    await app?.close();
  });

  // ─── GET /v1/topics ────────────────────────────────────────────

  describe("GET /v1/topics", () => {
    it("returns an empty list for a student with no topics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/topics",
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ items: [], count: 0 });
    });

    it("returns only non-deleted topics for the authenticated student", async () => {
      // Create two topics for student A
      await prisma.topic.create({
        data: { studentId: studentAId, title: "Active Topic" },
      });
      await prisma.topic.create({
        data: {
          studentId: studentAId,
          title: "Deleted Topic",
          deletedAt: new Date(),
        },
      });
      // Create a topic for student B (should not appear)
      await prisma.topic.create({
        data: { studentId: studentBId, title: "B's Topic" },
      });

      const response = await app.inject({
        method: "GET",
        url: "/v1/topics",
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.items).toHaveLength(1);
      expect(body.count).toBe(1);
      expect(body.items[0].title).toBe("Active Topic");
    });
  });

  // ─── POST /v1/topics ───────────────────────────────────────────

  describe("POST /v1/topics", () => {
    it("creates a topic with title and description", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Philosophy", description: "Intro to Plato" },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toEqual(expect.any(String));
      expect(body.title).toBe("Philosophy");
      expect(body.description).toBe("Intro to Plato");
      expect(body.createdAt).toEqual(expect.any(String));
      expect(body.updatedAt).toEqual(expect.any(String));
    });

    it("creates a topic with title only (description defaults to null)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Math" },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.title).toBe("Math");
      expect(body.description).toBeNull();
    });

    it("returns 400 when title is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── GET /v1/topics/:topicId ───────────────────────────────────

  describe("GET /v1/topics/:topicId", () => {
    it("returns a topic by id", async () => {
      // Create via API so we know the id
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "History", description: "Ancient Rome" },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(created.id);
      expect(body.title).toBe("History");
      expect(body.description).toBe("Ancient Rome");
      expect(body.createdAt).toBe(created.createdAt);
      expect(body.updatedAt).toBe(created.updatedAt);
    });

    it("returns 404 for a non-existent topic id", async () => {
      const fakeId = crypto.randomUUID();

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${fakeId}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── PATCH /v1/topics/:topicId ─────────────────────────────────

  describe("PATCH /v1/topics/:topicId", () => {
    it("updates the title of a topic", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Original", description: "Desc" },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
        payload: { title: "Updated" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.title).toBe("Updated");
      expect(body.description).toBe("Desc");
    });

    it("updates only the description (partial update)", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Stable Title" },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
        payload: { description: "New desc" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.title).toBe("Stable Title");
      expect(body.description).toBe("New desc");
    });

    it("returns 404 when updating a non-existent topic", async () => {
      const fakeId = crypto.randomUUID();

      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${fakeId}`,
        headers: authHeader(tokenA),
        payload: { title: "Nope" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── DELETE /v1/topics/:topicId ────────────────────────────────

  describe("DELETE /v1/topics/:topicId", () => {
    it("soft-deletes a topic and hides it from subsequent requests", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "To Delete" },
      });
      const created = createResponse.json();

      // Delete
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.json()).toEqual({ id: created.id });

      // GET by id should return 404
      const getOneResponse = await app.inject({
        method: "GET",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });
      expect(getOneResponse.statusCode).toBe(404);

      // GET list should not include deleted topic
      const listResponse = await app.inject({
        method: "GET",
        url: "/v1/topics",
        headers: authHeader(tokenA),
      });
      const listBody = listResponse.json();
      const ids = listBody.items.map((t: { id: string }) => t.id);
      expect(ids).not.toContain(created.id);
    });

    it("returns 404 when deleting a non-existent topic", async () => {
      const fakeId = crypto.randomUUID();

      const response = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${fakeId}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── Ownership isolation ───────────────────────────────────────

  describe("Ownership isolation", () => {
    let topicAId: string;

    beforeEach(async () => {
      // Student A creates a topic
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "A's Private Topic" },
      });
      topicAId = createResponse.json().id;
    });

    it("returns 404 when Student B tries to GET Student A's topic", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}`,
        headers: authHeader(tokenB),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when Student B tries to PATCH Student A's topic", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${topicAId}`,
        headers: authHeader(tokenB),
        payload: { title: "Hijacked" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when Student B tries to DELETE Student A's topic", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${topicAId}`,
        headers: authHeader(tokenB),
      });

      expect(response.statusCode).toBe(404);

      // Verify the topic still exists for Student A
      const verifyResponse = await app.inject({
        method: "GET",
        url: `/v1/topics/${topicAId}`,
        headers: authHeader(tokenA),
      });
      expect(verifyResponse.statusCode).toBe(200);
    });

    it("Student B's topic list does not include Student A's topics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/topics",
        headers: authHeader(tokenB),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const ids = body.items.map((t: { id: string }) => t.id);
      expect(ids).not.toContain(topicAId);
    });
  });

  // ─── Additional edge cases ─────────────────────────────────────

  describe("Edge cases", () => {
    it("returns 404 when GET targets a soft-deleted topic", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Will Delete" },
      });
      const created = createResponse.json();

      await app.inject({
        method: "DELETE",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when PATCH targets a soft-deleted topic", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Will Delete" },
      });
      const created = createResponse.json();

      await app.inject({
        method: "DELETE",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
        payload: { title: "Update Deleted" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when DELETE targets an already-deleted topic", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Will Delete Twice" },
      });
      const created = createResponse.json();

      const firstDelete = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });
      expect(firstDelete.statusCode).toBe(200);

      const secondDelete = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });
      expect(secondDelete.statusCode).toBe(404);
    });

    it("returns multiple topics in descending createdAt order", async () => {
      await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "First Created" },
      });

      await new Promise((r) => setTimeout(r, 50));

      await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Second Created" },
      });

      const response = await app.inject({
        method: "GET",
        url: "/v1/topics",
        headers: authHeader(tokenA),
      });

      const body = response.json();
      expect(body.items).toHaveLength(2);
      expect(body.count).toBe(2);
      expect(body.items[0].title).toBe("Second Created");
      expect(body.items[1].title).toBe("First Created");
    });

    it("PATCH updates the updatedAt timestamp", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Before Update" },
      });
      const created = createResponse.json();

      await new Promise((r) => setTimeout(r, 50));

      const patchResponse = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
        payload: { title: "After Update" },
      });

      const patched = patchResponse.json();
      expect(new Date(patched.updatedAt).getTime()).toBeGreaterThan(
        new Date(created.updatedAt).getTime(),
      );
    });

    it("GET /v1/topics/:topicId response includes correct fields", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/v1/topics",
        headers: authHeader(tokenA),
        payload: { title: "Full Shape", description: "Test desc" },
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${created.id}`,
        headers: authHeader(tokenA),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual({
        id: expect.any(String),
        title: "Full Shape",
        description: "Test desc",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      // Should NOT leak internal fields
      expect(body).not.toHaveProperty("studentId");
      expect(body).not.toHaveProperty("deletedAt");
    });
  });

  // ─── Unauthenticated access ────────────────────────────────────

  describe("Unauthenticated access", () => {
    it("returns 401 for GET /v1/topics without auth header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/topics",
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for POST /v1/topics without auth header", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/topics",
        payload: { title: "No auth" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for GET /v1/topics/:topicId without auth header", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/v1/topics/${crypto.randomUUID()}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for PATCH /v1/topics/:topicId without auth header", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/v1/topics/${crypto.randomUUID()}`,
        payload: { title: "No auth" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for DELETE /v1/topics/:topicId without auth header", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/v1/topics/${crypto.randomUUID()}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
