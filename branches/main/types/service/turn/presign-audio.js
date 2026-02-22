import { z } from "zod";
export const PresignAudioTurnServiceInputSchema = z.object({
    sessionId: z.string().uuid(),
    studentId: z.string().uuid(),
    originalName: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive().max(10_485_760),
});
export const PresignAudioTurnServiceOutputSchema = z.object({
    uploadUrl: z.string(),
    storageKey: z.string(),
});
