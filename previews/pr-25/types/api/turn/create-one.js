import { z } from "zod";
export const CreateOneTurnApiParamsSchema = z.object({
    sessionId: z.string().uuid(),
});
export const CreateOneTurnApiBodySchema = z.object({
    studentAudioKey: z
        .string()
        .min(1)
        .max(1000)
        .regex(/^turns\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/audio\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/.+$/, "Invalid audio storage key format"),
});
export const CreateOneTurnApiOutputSchema = z.object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    index: z.number().int(),
    studentAudioKey: z.string().nullable(),
    studentText: z.string().nullable(),
    assistantText: z.string().nullable(),
    assistantPromptType: z.string().nullable(),
    assistantDetectedIssue: z.string().nullable(),
    latencyMs: z.number().int().nullable(),
    createdAt: z.string().datetime(),
});
