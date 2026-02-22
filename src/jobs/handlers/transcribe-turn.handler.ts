import type { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import type { JobQueue } from "../../lib/queue/job-queue.js";
import type { JobHandler, JobPayload } from "../../lib/queue/types.js";
import { JobType, TranscribeTurnPayloadSchema } from "../../lib/queue/types.js";

export function createTranscribeTurnHandler(
  turnDataSource: TurnDataSource,
  jobQueue: JobQueue,
): JobHandler {
  return async (payload: JobPayload): Promise<void> => {
    const parsed = TranscribeTurnPayloadSchema.parse(payload);

    // No-op: In PR-4 this will call a real STT provider.
    // For now, write a placeholder to mark the turn as transcribed.
    await turnDataSource.updateOne({
      id: parsed.turnId,
      studentText: "[placeholder: transcription pending real STT]",
    });

    // Chain: enqueue prompt generation now that "transcription" is done
    await jobQueue.enqueue({
      jobType: JobType.GENERATE_PROMPT,
      turnId: parsed.turnId,
    });
  };
}
