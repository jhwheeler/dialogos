import type { JobType, JobPayload, JobHandler } from "./types.js";

export interface JobQueue {
  /** Enqueue a job for async processing. Validates payload before accepting. */
  enqueue(payload: JobPayload): Promise<void>;

  /** Register a handler for a specific job type. Must be called before start(). */
  registerHandler(jobType: JobType, handler: JobHandler): void;

  /** Begin processing enqueued jobs. */
  start(): void;

  /** Wait for all currently pending jobs to finish processing. */
  drain(): Promise<void>;

  /** Drain pending jobs and stop accepting new ones. */
  shutdown(): Promise<void>;
}
