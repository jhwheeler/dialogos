import { z } from "zod";
export const PresignAudioTurnApiParamsSchema = z.object({
    sessionId: z.string().uuid(),
});
export const PresignAudioTurnApiBodySchema = z.object({
    originalName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.coerce.number().int().positive(),
});
export const PresignAudioTurnApiOutputSchema = z.object({
    uploadUrl: z.string(),
    storageKey: z.string(),
});
