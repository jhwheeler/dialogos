import { z } from "zod";
export const PresignAudioTurnServiceInputSchema = z.object({
    sessionId: z.string().uuid(),
    studentId: z.string().uuid(),
    originalName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int().positive(),
});
export const PresignAudioTurnServiceOutputSchema = z.object({
    uploadUrl: z.string(),
    storageKey: z.string(),
});
