import type { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import type { JobQueue } from "../../lib/queue/job-queue.js";
import type { JobHandler, JobPayload } from "../../lib/queue/types.js";
import { JobType, TranscribeTurnPayloadSchema } from "../../lib/queue/types.js";
import type { SttProvider } from "../../lib/stt/stt-provider.js";
import type { StorageProvider } from "../../lib/storage/storage.js";
import { stripControlCharacters } from "../../lib/prompt/sanitize.js";

/** Maximum transcription length to persist (guard against runaway output). */
const MAX_STUDENT_TEXT_LENGTH = 10_000;

export function createTranscribeTurnHandler(
  turnDataSource: TurnDataSource,
  jobQueue: JobQueue,
  sttProvider: SttProvider | null,
  storageProvider: StorageProvider | null,
): JobHandler {
  return async (payload: JobPayload): Promise<void> => {
    const parsed = TranscribeTurnPayloadSchema.parse(payload);

    let studentText: string;

    if (sttProvider && storageProvider) {
      // Fetch the turn to get the audio storage key
      const turn = await turnDataSource.getOne({ id: parsed.turnId });
      if (!turn || !turn.studentAudioKey) {
        throw new Error(`Turn ${parsed.turnId} not found or has no audio key`);
      }

      // Fetch audio from storage
      const audioBuffer = await storageProvider.getObject(turn.studentAudioKey);

      // Infer MIME type from the storage key extension
      const ext = turn.studentAudioKey.split(".").pop()?.toLowerCase() ?? "webm";
      const mimeMap: Record<string, string> = {
        webm: "audio/webm",
        mp4: "audio/mp4",
        mp3: "audio/mpeg",
        ogg: "audio/ogg",
        wav: "audio/wav",
        aac: "audio/aac",
        flac: "audio/flac",
      };
      const mimeType = mimeMap[ext] ?? "audio/webm";

      // Run STT
      const result = await sttProvider.transcribe(audioBuffer, mimeType);

      // Sanitize: strip control characters, enforce length limit (TECH_SPEC 6.4.4)
      studentText = stripControlCharacters(result.text).slice(0, MAX_STUDENT_TEXT_LENGTH);
    } else {
      // Fallback: no STT provider configured — write placeholder
      studentText = "[placeholder: transcription pending real STT]";
    }

    await turnDataSource.updateOne({
      id: parsed.turnId,
      studentText,
    });

    // Chain: enqueue prompt generation now that transcription is done
    await jobQueue.enqueue({
      jobType: JobType.GENERATE_PROMPT,
      turnId: parsed.turnId,
    });
  };
}
