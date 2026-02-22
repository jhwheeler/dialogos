import type { JobQueue } from "./job-queue.js";
import type { JobType, JobPayload, JobHandler } from "./types.js";
import { JobPayloadSchema } from "./types.js";

interface QueueEntry {
  payload: JobPayload;
  attempt: number;
}

interface InMemoryQueueOptions {
  maxRetries?: number;
  logger?: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
}

const noopLogger = {
  info: () => {},
  error: () => {},
};

export class InMemoryJobQueue implements JobQueue {
  private readonly handlers = new Map<JobType, JobHandler>();
  private readonly pending: QueueEntry[] = [];
  private readonly maxRetries: number;
  private readonly logger: {
    info: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };

  private running = false;
  private stopped = false;
  private processing = false;
  private drainResolvers: Array<() => void> = [];

  public constructor(options: InMemoryQueueOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.logger = options.logger ?? noopLogger;
  }

  public registerHandler(jobType: JobType, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  public async enqueue(payload: JobPayload): Promise<void> {
    if (this.stopped) {
      throw new Error("Queue is shut down; cannot enqueue new jobs");
    }

    // Validate payload
    const parsed = JobPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid job payload: ${parsed.error.message}`);
    }

    // Verify a handler is registered for this job type
    if (!this.handlers.has(parsed.data.jobType)) {
      throw new Error(`No handler registered for job type: ${parsed.data.jobType}`);
    }

    this.pending.push({ payload: parsed.data, attempt: 0 });
    this.logger.info({ jobType: parsed.data.jobType }, "Job enqueued");

    if (this.running) {
      this.scheduleProcessing();
    }
  }

  public start(): void {
    this.running = true;
    this.scheduleProcessing();
  }

  public async drain(): Promise<void> {
    if (this.pending.length === 0 && !this.processing) {
      return;
    }

    return new Promise<void>((resolve) => {
      this.drainResolvers.push(resolve);
    });
  }

  public async shutdown(): Promise<void> {
    this.stopped = true;
    await this.drain();
    this.running = false;
  }

  private scheduleProcessing(): void {
    if (this.processing || this.pending.length === 0) {
      return;
    }

    this.processing = true;
    setImmediate(() => {
      void this.processLoop();
    });
  }

  private async processLoop(): Promise<void> {
    while (this.pending.length > 0) {
      const entry = this.pending.shift()!;
      const handler = this.handlers.get(entry.payload.jobType);

      if (!handler) {
        this.logger.error(
          { jobType: entry.payload.jobType },
          "No handler registered for job type; dropping job",
        );
        continue;
      }

      try {
        this.logger.info(
          { jobType: entry.payload.jobType, attempt: entry.attempt + 1 },
          "Job processing started",
        );
        await handler(entry.payload);
        this.logger.info({ jobType: entry.payload.jobType }, "Job completed successfully");
      } catch (error) {
        const nextAttempt = entry.attempt + 1;
        if (nextAttempt < this.maxRetries) {
          this.logger.error(
            { jobType: entry.payload.jobType, attempt: nextAttempt, error },
            "Job failed; scheduling retry",
          );
          this.pending.push({ payload: entry.payload, attempt: nextAttempt });
        } else {
          this.logger.error(
            { jobType: entry.payload.jobType, attempt: nextAttempt, error },
            "Job failed; max retries exhausted — dropping job",
          );
        }
      }
    }

    this.processing = false;
    this.resolveDrainers();
  }

  private resolveDrainers(): void {
    const resolvers = this.drainResolvers.splice(0);
    for (const resolve of resolvers) {
      resolve();
    }
  }
}
