import { JobType, TranscribeTurnPayloadSchema } from "../../lib/queue/types.js";
export function createTranscribeTurnHandler(turnDataSource, jobQueue) {
    return async (payload) => {
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
