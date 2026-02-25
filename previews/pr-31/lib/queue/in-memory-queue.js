import { JobPayloadSchema } from "./types.js";
const noopLogger = {
    info: () => { },
    error: () => { },
};
export class InMemoryJobQueue {
    handlers = new Map();
    pending = [];
    maxRetries;
    logger;
    running = false;
    stopped = false;
    processing = false;
    drainResolvers = [];
    constructor(options = {}) {
        this.maxRetries = options.maxRetries ?? 3;
        this.logger = options.logger ?? noopLogger;
    }
    registerHandler(jobType, handler) {
        this.handlers.set(jobType, handler);
    }
    async enqueue(payload) {
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
    start() {
        this.running = true;
        this.scheduleProcessing();
    }
    async drain() {
        if (this.pending.length === 0 && !this.processing) {
            return;
        }
        return new Promise((resolve) => {
            this.drainResolvers.push(resolve);
        });
    }
    async shutdown() {
        this.stopped = true;
        await this.drain();
        this.running = false;
    }
    scheduleProcessing() {
        if (this.processing || this.pending.length === 0) {
            return;
        }
        this.processing = true;
        setImmediate(() => {
            void this.processLoop();
        });
    }
    async processLoop() {
        while (this.pending.length > 0) {
            const entry = this.pending.shift();
            const handler = this.handlers.get(entry.payload.jobType);
            if (!handler) {
                this.logger.error({ jobType: entry.payload.jobType }, "No handler registered for job type; dropping job");
                continue;
            }
            try {
                this.logger.info({ jobType: entry.payload.jobType, attempt: entry.attempt + 1 }, "Job processing started");
                await handler(entry.payload);
                this.logger.info({ jobType: entry.payload.jobType }, "Job completed successfully");
            }
            catch (error) {
                const nextAttempt = entry.attempt + 1;
                if (nextAttempt < this.maxRetries) {
                    this.logger.error({ jobType: entry.payload.jobType, attempt: nextAttempt, error }, "Job failed; scheduling retry");
                    this.pending.push({ payload: entry.payload, attempt: nextAttempt });
                }
                else {
                    this.logger.error({ jobType: entry.payload.jobType, attempt: nextAttempt, error }, "Job failed; max retries exhausted — dropping job");
                }
            }
        }
        this.processing = false;
        this.resolveDrainers();
    }
    resolveDrainers() {
        const resolvers = this.drainResolvers.splice(0);
        for (const resolve of resolvers) {
            resolve();
        }
    }
}
