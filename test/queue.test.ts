import { describe, it, expect, vi } from "vitest";
import { InMemoryJobQueue } from "../src/lib/queue/in-memory-queue.js";
import { JobType } from "../src/lib/queue/types.js";
import type { JobPayload } from "../src/lib/queue/types.js";

describe("InMemoryJobQueue", () => {
  function createQueue(maxRetries = 3) {
    return new InMemoryJobQueue({ maxRetries });
  }

  it("processes an enqueued job via registered handler", async () => {
    const queue = createQueue();
    const handler = vi.fn<(payload: JobPayload) => Promise<void>>().mockResolvedValue(undefined);

    queue.registerHandler(JobType.TRANSCRIBE_TURN, handler);
    queue.start();

    const turnId = "00000000-0000-0000-0000-000000000001";
    await queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId });
    await queue.drain();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      jobType: JobType.TRANSCRIBE_TURN,
      turnId,
    });
  });

  it("validates payloads and rejects invalid ones", async () => {
    const queue = createQueue();
    const handler = vi.fn<(payload: JobPayload) => Promise<void>>().mockResolvedValue(undefined);
    queue.registerHandler(JobType.TRANSCRIBE_TURN, handler);
    queue.start();

    // Missing turnId
    await expect(
      queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN } as unknown as JobPayload),
    ).rejects.toThrow("Invalid job payload");

    // Invalid UUID
    await expect(
      queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId: "not-a-uuid" } as JobPayload),
    ).rejects.toThrow("Invalid job payload");
  });

  it("rejects enqueue for unregistered job type", async () => {
    const queue = createQueue();
    queue.start();

    const turnId = "00000000-0000-0000-0000-000000000001";
    await expect(queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId })).rejects.toThrow(
      "No handler registered for job type",
    );
  });

  it("processes jobs in FIFO order", async () => {
    const queue = createQueue();
    const order: string[] = [];
    const handler = vi
      .fn<(payload: JobPayload) => Promise<void>>()
      .mockImplementation(async (payload) => {
        if (payload.jobType === JobType.TRANSCRIBE_TURN) {
          order.push(`transcribe-${payload.turnId}`);
        }
      });

    queue.registerHandler(JobType.TRANSCRIBE_TURN, handler);
    queue.start();

    const id1 = "00000000-0000-0000-0000-000000000001";
    const id2 = "00000000-0000-0000-0000-000000000002";
    const id3 = "00000000-0000-0000-0000-000000000003";
    await queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId: id1 });
    await queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId: id2 });
    await queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId: id3 });
    await queue.drain();

    expect(order).toEqual([`transcribe-${id1}`, `transcribe-${id2}`, `transcribe-${id3}`]);
  });

  it("retries failed jobs up to maxRetries then drops them", async () => {
    const queue = createQueue(2);
    const handler = vi
      .fn<(payload: JobPayload) => Promise<void>>()
      .mockRejectedValue(new Error("fail"));

    queue.registerHandler(JobType.TRANSCRIBE_TURN, handler);
    queue.start();

    const turnId = "00000000-0000-0000-0000-000000000001";
    await queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId });
    await queue.drain();

    // Initial attempt + 1 retry = 2 total calls (maxRetries = 2)
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("continues processing remaining jobs after a handler error", async () => {
    const queue = createQueue(1); // no retries
    let callCount = 0;
    const handler = vi.fn<(payload: JobPayload) => Promise<void>>().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("first job fails");
      }
    });

    queue.registerHandler(JobType.TRANSCRIBE_TURN, handler);
    queue.start();

    const id1 = "00000000-0000-0000-0000-000000000001";
    const id2 = "00000000-0000-0000-0000-000000000002";
    await queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId: id1 });
    await queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId: id2 });
    await queue.drain();

    // First job fails (1 attempt, no retries), second job succeeds
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("rejects enqueue after shutdown", async () => {
    const queue = createQueue();
    const handler = vi.fn<(payload: JobPayload) => Promise<void>>().mockResolvedValue(undefined);
    queue.registerHandler(JobType.TRANSCRIBE_TURN, handler);
    queue.start();
    await queue.shutdown();

    const turnId = "00000000-0000-0000-0000-000000000001";
    await expect(queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId })).rejects.toThrow(
      "Queue is shut down",
    );
  });

  it("drain resolves immediately when no jobs are pending", async () => {
    const queue = createQueue();
    queue.start();
    await queue.drain(); // should not hang
  });

  it("processes jobs across different job types", async () => {
    const queue = createQueue();
    const transcribeHandler = vi
      .fn<(payload: JobPayload) => Promise<void>>()
      .mockResolvedValue(undefined);
    const renderHandler = vi
      .fn<(payload: JobPayload) => Promise<void>>()
      .mockResolvedValue(undefined);

    queue.registerHandler(JobType.TRANSCRIBE_TURN, transcribeHandler);
    queue.registerHandler(JobType.RENDER_ARTIFACTS, renderHandler);
    queue.start();

    const turnId = "00000000-0000-0000-0000-000000000001";
    const sessionId = "00000000-0000-0000-0000-000000000002";
    await queue.enqueue({ jobType: JobType.TRANSCRIBE_TURN, turnId });
    await queue.enqueue({ jobType: JobType.RENDER_ARTIFACTS, sessionId });
    await queue.drain();

    expect(transcribeHandler).toHaveBeenCalledTimes(1);
    expect(renderHandler).toHaveBeenCalledTimes(1);
  });
});
