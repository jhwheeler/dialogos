import { z } from "zod";
export const PresignAudioTurnApiParamsSchema = z.object({
    sessionId: z.string().uuid(),
});
export const PresignAudioTurnApiBodySchema = z.object({
    originalName: z.string().min(1).max(255),
    mimeType: z.enum(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/aac", "audio/flac"], { errorMap: () => ({ message: "Unsupported audio MIME type" }) }),
    sizeBytes: z.coerce.number().int().positive().max(10_485_760, "Audio file must be 10 MB or less"),
});
export const PresignAudioTurnApiOutputSchema = z.object({
    uploadUrl: z.string(),
    storageKey: z.string(),
});
