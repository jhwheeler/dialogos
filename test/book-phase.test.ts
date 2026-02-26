import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { buildTestApp } from "./helpers/build-test-app.js";
import { createTestToken, authHeader } from "./helpers/auth-test-helper.js";
import {
  getTestPrismaClient,
  cleanupTestDatabase,
  disconnectTestPrisma,
} from "./helpers/prisma-test-client.js";

describe("Book phase state machine", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let prisma: PrismaClient;

  let studentId: string;
  let token: string;
  let topicId: string;

  beforeAll(async () => {
    prisma = getTestPrismaClient();
    app = await buildTestApp();

    const student = await prisma.student.create({
      data: { displayName: "Phase Student" },
    });
    studentId = student.id;
    token = await createTestToken(studentId);
  });

  beforeEach(async () => {
    await prisma.sessionArtifact.deleteMany();
    await prisma.turn.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany();
    await prisma.topicFile.deleteMany();
    await prisma.topic.deleteMany();

    const topic = await prisma.topic.create({
      data: { studentId, title: "Phase Topic" },
    });
    topicId = topic.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await disconnectTestPrisma();
    await app?.close();
  });

  it("starting a Combined session sets bookPhase to closed_recall", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/v1/topics/${topicId}/sessions`,
      headers: authHeader(token),
      payload: { triviumStage: "combined" },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().bookPhase).toBeNull();

    const startRes = await app.inject({
      method: "POST",
      url: `/v1/sessions/${createRes.json().id}/start`,
      headers: authHeader(token),
    });
    expect(startRes.statusCode).toBe(200);
    expect(startRes.json().bookPhase).toBe("closed_recall");
  });

  it("starting a non-Combined session leaves bookPhase null", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/v1/topics/${topicId}/sessions`,
      headers: authHeader(token),
      payload: { triviumStage: "grammar" },
    });

    const startRes = await app.inject({
      method: "POST",
      url: `/v1/sessions/${createRes.json().id}/start`,
      headers: authHeader(token),
    });
    expect(startRes.statusCode).toBe(200);
    expect(startRes.json().bookPhase).toBeNull();
  });

  it("forward transitions work: closed_recall → open_text → final_compression", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/v1/topics/${topicId}/sessions`,
      headers: authHeader(token),
      payload: { triviumStage: "combined" },
    });
    const sessionId = createRes.json().id;

    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/start`,
      headers: authHeader(token),
    });

    // closed_recall → open_text
    const res1 = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/transition-book-phase`,
      headers: authHeader(token),
      payload: { targetPhase: "open_text" },
    });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().bookPhase).toBe("open_text");

    // open_text → final_compression
    const res2 = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/transition-book-phase`,
      headers: authHeader(token),
      payload: { targetPhase: "final_compression" },
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().bookPhase).toBe("final_compression");
  });

  it("backward transitions are rejected (409)", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/v1/topics/${topicId}/sessions`,
      headers: authHeader(token),
      payload: { triviumStage: "combined" },
    });
    const sessionId = createRes.json().id;

    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/start`,
      headers: authHeader(token),
    });

    // Advance to open_text
    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/transition-book-phase`,
      headers: authHeader(token),
      payload: { targetPhase: "open_text" },
    });

    // Try to go back to closed_recall
    const res = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/transition-book-phase`,
      headers: authHeader(token),
      payload: { targetPhase: "closed_recall" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("skipping phases is rejected (409)", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/v1/topics/${topicId}/sessions`,
      headers: authHeader(token),
      payload: { triviumStage: "combined" },
    });
    const sessionId = createRes.json().id;

    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/start`,
      headers: authHeader(token),
    });

    // Try to skip from closed_recall to final_compression
    const res = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/transition-book-phase`,
      headers: authHeader(token),
      payload: { targetPhase: "final_compression" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("non-combined sessions reject book phase transitions (409)", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/v1/topics/${topicId}/sessions`,
      headers: authHeader(token),
      payload: { triviumStage: "logic" },
    });
    const sessionId = createRes.json().id;

    await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/start`,
      headers: authHeader(token),
    });

    const res = await app.inject({
      method: "POST",
      url: `/v1/sessions/${sessionId}/transition-book-phase`,
      headers: authHeader(token),
      payload: { targetPhase: "closed_recall" },
    });
    expect(res.statusCode).toBe(409);
  });
});
