import type { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import type { JobQueue } from "../../lib/queue/job-queue.js";
import type { JobHandler, JobPayload } from "../../lib/queue/types.js";
import { JobType, TranscribeTurnPayloadSchema } from "../../lib/queue/types.js";
import type { SttProvider } from "../../lib/providers/stt-provider.js";
import type { StorageProvider } from "../../lib/storage/storage.js";
import { NotFoundError } from "../../errors/not-found-error.js";

/** Strip control characters (keep newlines and tabs). */
function sanitizeTranscription(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}

const MAX_TRANSCRIPTION_LENGTH = 5000;

function mimeTypeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    webm: "audio/webm",
    mp4: "audio/mp4",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    flac: "audio/flac",
    m4a: "audio/m4a",
  };
  return (ext && map[ext]) ?? "audio/webm";
}

export function createTranscribeTurnHandler(
  turnDataSource: TurnDataSource,
  jobQueue: JobQueue,
  sttProvider: SttProvider | null = null,
  storage: StorageProvider | null = null,
): JobHandler {
  return async (payload: JobPayload): Promise<void> => {
    const parsed = TranscribeTurnPayloadSchema.parse(payload);

    const turn = await turnDataSource.getOne({ id: parsed.turnId });
    if (!turn) {
      throw new NotFoundError(`Turn not found: ${parsed.turnId}`);
    }

    let studentText: string;

    if (sttProvider && storage && turn.studentAudioKey) {
      // Real STT path
      const audio = await storage.getObject(turn.studentAudioKey);
      const mimeType = mimeTypeFromKey(turn.studentAudioKey);
      const rawTranscription = await sttProvider.transcribe(audio, mimeType);
      studentText = sanitizeTranscription(rawTranscription).slice(0, MAX_TRANSCRIPTION_LENGTH);
    } else {
      // Placeholder fallback (dev without API keys)
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
