import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { buildTestApp } from "./helpers/build-test-app.js";
import { createTestToken, authHeader } from "./helpers/auth-test-helper.js";
import {
  getTestPrismaClient,
  cleanupTestDatabase,
  disconnectTestPrisma,
} from "./helpers/prisma-test-client.js";
import { InMemoryJobQueue } from "../src/lib/queue/in-memory-queue.js";
import { JobType } from "../src/lib/queue/types.js";
import type { JobPayload } from "../src/lib/queue/types.js";
import { TurnDataSource } from "../src/data-sources/turn/turn.data-source.js";
import { SessionDataSource } from "../src/data-sources/session/session.data-source.js";
import { TopicDataSource } from "../src/data-sources/topic/topic.data-source.js";
import { SourceDataSource } from "../src/data-sources/source/source.data-source.js";
import { createTranscribeTurnHandler } from "../src/jobs/handlers/transcribe-turn.handler.js";
import { createGeneratePromptHandler } from "../src/jobs/handlers/generate-prompt.handler.js";
import { createRenderArtifactsHandler } from "../src/jobs/handlers/render-artifacts.handler.js";
import type { LlmProvider } from "../src/lib/providers/llm-provider.js";
import type { SocraticOutput, PromptContext } from "../src/lib/providers/llm-provider.js";
import type { SttProvider } from "../src/lib/providers/stt-provider.js";
import type { StorageProvider } from "../src/lib/storage/storage.js";

/** Build a valid audio storage key matching the turns presign format. */
function audioKey(filename: string): string {
  return `turns/00000000-0000-0000-0000-000000000000/audio/00000000-0000-0000-0000-000000000001/${filename}`;
}

// ─── Mock providers ──────────────────────────────────────────

function createMockSttProvider(text: string): SttProvider {
  return {
    async transcribe(): Promise<string> {
      return text;
    },
  };
}

function createMockStorage(): StorageProvider {
  return {
    async getPresignedUploadUrl(): Promise<string> {
      return "https://example.com/upload";
    },
    async deleteObject(): Promise<void> {},
    async getObject(): Promise<Buffer> {
      return Buffer.from("fake-audio-data");
    },
  };
}

function createMockLlmProvider(output: SocraticOutput): LlmProvider {
  return {
    async generateSocraticPrompt(_context: PromptContext): Promise<SocraticOutput> {
      return output;
    },
  };
}

const VALID_LLM_OUTPUT: SocraticOutput = {
  nextPrompt: "Define justice.",
  promptType: "define",
  detectedIssue: "vague_term",
  stopReason: "needs_definition",
};

describe("Job handlers", () => {
  let prisma: PrismaClient;
  let turnDataSource: TurnDataSource;
  let sessionDataSource: SessionDataSource;
  let topicDataSource: TopicDataSource;
  let sourceDataSource: SourceDataSource;

  let studentAId: string;
  let topicAId: string;
  let activeSessionId: string;

  beforeAll(async () => {
    prisma = getTestPrismaClient();
    turnDataSource = new TurnDataSource(prisma);
    sessionDataSource = new SessionDataSource(prisma);
    topicDataSource = new TopicDataSource(prisma);
    sourceDataSource = new SourceDataSource(prisma);

    const studentA = await prisma.student.create({
      data: { displayName: "Handler Test Student" },
    });
    studentAId = studentA.id;
  });

  beforeEach(async () => {
    await prisma.sessionArtifact.deleteMany();
    await prisma.turn.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany();
    await prisma.topicFile.deleteMany();
    await prisma.topic.deleteMany();

    const topicA = await prisma.topic.create({
      data: { studentId: studentAId, title: "Handler Test Topic" },
    });
    topicAId = topicA.id;

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
  });

  describe("TRANSCRIBE_TURN handler", () => {
    it("updates turn with placeholder studentText when no providers", async () => {
      const turn = await prisma.turn.create({
        data: {
          sessionId: activeSessionId,
          index: 0,
          studentAudioKey: audioKey("test.webm"),
        },
      });

      const queue = new InMemoryJobQueue();
      queue.registerHandler(JobType.GENERATE_PROMPT, async () => {}); // no-op for chain target
      const handler = createTranscribeTurnHandler(turnDataSource, queue, null, null);

      await handler({
        jobType: JobType.TRANSCRIBE_TURN,
        turnId: turn.id,
      });

      const updated = await prisma.turn.findUnique({ where: { id: turn.id } });
      expect(updated?.studentText).toBe("[placeholder: transcription pending real STT]");
    });

    it("transcribes audio with mock STT provider", async () => {
      const turn = await prisma.turn.create({
        data: {
          sessionId: activeSessionId,
          index: 0,
          studentAudioKey: audioKey("test.webm"),
        },
      });

      const queue = new InMemoryJobQueue();
      queue.registerHandler(JobType.GENERATE_PROMPT, async () => {});
      const stt = createMockSttProvider("Justice is giving people what they deserve.");
      const storage = createMockStorage();
      const handler = createTranscribeTurnHandler(turnDataSource, queue, stt, storage);

      await handler({
        jobType: JobType.TRANSCRIBE_TURN,
        turnId: turn.id,
      });

      const updated = await prisma.turn.findUnique({ where: { id: turn.id } });
      expect(updated?.studentText).toBe("Justice is giving people what they deserve.");
    });

    it("chain-enqueues GENERATE_PROMPT after transcription", async () => {
      const turn = await prisma.turn.create({
        data: {
          sessionId: activeSessionId,
          index: 0,
          studentAudioKey: audioKey("test.webm"),
        },
      });

      const queue = new InMemoryJobQueue();
      const generateHandler = createGeneratePromptHandler(turnDataSource);
      queue.registerHandler(JobType.GENERATE_PROMPT, generateHandler);
      queue.start();

      const handler = createTranscribeTurnHandler(turnDataSource, queue, null, null);
      await handler({
        jobType: JobType.TRANSCRIBE_TURN,
        turnId: turn.id,
      });

      // Wait for the chained job to complete
      await queue.drain();

      const updated = await prisma.turn.findUnique({ where: { id: turn.id } });
      expect(updated?.studentText).toBe("[placeholder: transcription pending real STT]");
      expect(updated?.assistantText).toBe("[placeholder: prompt pending real LLM]");
      expect(updated?.assistantPromptType).toBe("clarify");
      expect(updated?.assistantDetectedIssue).toBe("none");
      expect(updated?.latencyMs).toBe(0);
    });
  });

  describe("GENERATE_PROMPT handler", () => {
    it("updates turn with placeholder assistant fields when no provider", async () => {
      const turn = await prisma.turn.create({
        data: {
          sessionId: activeSessionId,
          index: 0,
          studentAudioKey: audioKey("test.webm"),
          studentText: "Some transcribed text",
        },
      });

      const handler = createGeneratePromptHandler(turnDataSource);
      await handler({
        jobType: JobType.GENERATE_PROMPT,
        turnId: turn.id,
      });

      const updated = await prisma.turn.findUnique({ where: { id: turn.id } });
      expect(updated?.assistantText).toBe("[placeholder: prompt pending real LLM]");
      expect(updated?.assistantPromptType).toBe("clarify");
      expect(updated?.assistantDetectedIssue).toBe("none");
      expect(updated?.latencyMs).toBe(0);
    });

    it("generates real prompt with mock LLM provider", async () => {
      const turn = await prisma.turn.create({
        data: {
          sessionId: activeSessionId,
          index: 0,
          studentAudioKey: audioKey("test.webm"),
          studentText: "Justice is giving people what they deserve.",
        },
      });

      const llm = createMockLlmProvider(VALID_LLM_OUTPUT);
      const handler = createGeneratePromptHandler(
        turnDataSource,
        sessionDataSource,
        topicDataSource,
        sourceDataSource,
        llm,
      );

      await handler({
        jobType: JobType.GENERATE_PROMPT,
        turnId: turn.id,
      });

      const updated = await prisma.turn.findUnique({ where: { id: turn.id } });
      expect(updated?.assistantText).toBe("Define justice.");
      expect(updated?.assistantPromptType).toBe("define");
      expect(updated?.assistantDetectedIssue).toBe("vague_term");
      expect(updated?.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("falls back to placeholder when no studentText", async () => {
      const turn = await prisma.turn.create({
        data: {
          sessionId: activeSessionId,
          index: 0,
          studentAudioKey: audioKey("test.webm"),
          // studentText is null
        },
      });

      const llm = createMockLlmProvider(VALID_LLM_OUTPUT);
      const handler = createGeneratePromptHandler(
        turnDataSource,
        sessionDataSource,
        topicDataSource,
        sourceDataSource,
        llm,
      );

      await handler({
        jobType: JobType.GENERATE_PROMPT,
        turnId: turn.id,
      });

      const updated = await prisma.turn.findUnique({ where: { id: turn.id } });
      expect(updated?.assistantText).toBe("[placeholder: prompt pending real LLM]");
    });

    it("full pipeline: transcribe with mock STT then generate with mock LLM", async () => {
      const turn = await prisma.turn.create({
        data: {
          sessionId: activeSessionId,
          index: 0,
          studentAudioKey: audioKey("test.webm"),
        },
      });

      const queue = new InMemoryJobQueue();
      const stt = createMockSttProvider("I think justice means fairness.");
      const storage = createMockStorage();
      const llm = createMockLlmProvider(VALID_LLM_OUTPUT);

      queue.registerHandler(
        JobType.TRANSCRIBE_TURN,
        createTranscribeTurnHandler(turnDataSource, queue, stt, storage),
      );
      queue.registerHandler(
        JobType.GENERATE_PROMPT,
        createGeneratePromptHandler(
          turnDataSource,
          sessionDataSource,
          topicDataSource,
          sourceDataSource,
          llm,
        ),
      );
      queue.start();

      await queue.enqueue({
        jobType: JobType.TRANSCRIBE_TURN,
        turnId: turn.id,
      });
      await queue.drain();

      const updated = await prisma.turn.findUnique({ where: { id: turn.id } });
      expect(updated?.studentText).toBe("I think justice means fairness.");
      expect(updated?.assistantText).toBe("Define justice.");
      expect(updated?.assistantPromptType).toBe("define");
      expect(updated?.assistantDetectedIssue).toBe("vague_term");
      expect(updated?.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("RENDER_ARTIFACTS handler", () => {
    it("runs without error (stub)", async () => {
      const handler = createRenderArtifactsHandler();
      await expect(
        handler({
          jobType: JobType.RENDER_ARTIFACTS,
          sessionId: activeSessionId,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("Payload validation in handlers", () => {
    it("TRANSCRIBE_TURN rejects invalid payload", async () => {
      const queue = new InMemoryJobQueue();
      queue.registerHandler(JobType.GENERATE_PROMPT, async () => {});
      const handler = createTranscribeTurnHandler(turnDataSource, queue, null, null);

      await expect(
        handler({ jobType: JobType.GENERATE_PROMPT, turnId: "some-id" } as unknown as JobPayload),
      ).rejects.toThrow();
    });

    it("GENERATE_PROMPT rejects invalid payload", async () => {
      const handler = createGeneratePromptHandler(turnDataSource);

      await expect(
        handler({
          jobType: JobType.RENDER_ARTIFACTS,
          sessionId: "some-id",
        } as unknown as JobPayload),
      ).rejects.toThrow();
    });

    it("RENDER_ARTIFACTS rejects invalid payload", async () => {
      const handler = createRenderArtifactsHandler();

      await expect(
        handler({ jobType: JobType.TRANSCRIBE_TURN, turnId: "some-id" } as unknown as JobPayload),
      ).rejects.toThrow();
    });
  });
});

describe("Turn pipeline integration", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let prisma: PrismaClient;

  let studentAId: string;
  let tokenA: string;
  let topicAId: string;
  let activeSessionId: string;

  beforeAll(async () => {
    prisma = getTestPrismaClient();
    app = await buildTestApp();

    const studentA = await prisma.student.create({
      data: { displayName: "Pipeline Test Student" },
    });
    studentAId = studentA.id;
    tokenA = await createTestToken(studentAId);
  });

  beforeEach(async () => {
    await prisma.sessionArtifact.deleteMany();
    await prisma.turn.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany();
    await prisma.topicFile.deleteMany();
    await prisma.topic.deleteMany();

    const topicA = await prisma.topic.create({
      data: { studentId: studentAId, title: "Pipeline Topic" },
    });
    topicAId = topicA.id;

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

  it("creating a turn triggers async pipeline and polling shows results", async () => {
    // Create a turn via API
    const createResponse = await app.inject({
      method: "POST",
      url: `/v1/sessions/${activeSessionId}/turns`,
      headers: authHeader(tokenA),
      payload: { studentAudioKey: audioKey("test.webm") },
    });
    expect(createResponse.statusCode).toBe(201);
    const turnId = createResponse.json().id;

    // Initially, assistantText should be null in the response
    expect(createResponse.json().assistantText).toBeNull();
    expect(createResponse.json().studentText).toBeNull();

    // Drain the job queue so handlers complete
    await app.container.jobQueue.drain();

    // Poll the turn — should now show placeholder data from the pipeline
    const pollResponse = await app.inject({
      method: "GET",
      url: `/v1/sessions/${activeSessionId}/turns/${turnId}`,
      headers: authHeader(tokenA),
    });
    expect(pollResponse.statusCode).toBe(200);
    const polled = pollResponse.json();
    expect(polled.studentText).toBe("[placeholder: transcription pending real STT]");
    expect(polled.assistantText).toBe("[placeholder: prompt pending real LLM]");
    expect(polled.assistantPromptType).toBe("clarify");
    expect(polled.assistantDetectedIssue).toBe("none");
    expect(polled.latencyMs).toBe(0);
  });

  it("ending a session enqueues RENDER_ARTIFACTS without error", async () => {
    // End the session via API
    const endResponse = await app.inject({
      method: "POST",
      url: `/v1/sessions/${activeSessionId}/end`,
      headers: authHeader(tokenA),
    });
    expect(endResponse.statusCode).toBe(200);
    expect(endResponse.json().status).toBe("ended");

    // Drain the queue — RENDER_ARTIFACTS stub should complete without error
    await app.container.jobQueue.drain();
  });

  it("aborting a session does NOT enqueue RENDER_ARTIFACTS", async () => {
    const abortResponse = await app.inject({
      method: "POST",
      url: `/v1/sessions/${activeSessionId}/abort`,
      headers: authHeader(tokenA),
    });
    expect(abortResponse.statusCode).toBe(200);
    expect(abortResponse.json().status).toBe("aborted");

    // Drain should resolve immediately (no job enqueued)
    await app.container.jobQueue.drain();
  });
});
