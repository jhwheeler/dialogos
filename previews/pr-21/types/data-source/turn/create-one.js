import { z } from "zod";
export const CreateOneTurnDataSourceInputSchema = z.object({
    sessionId: z.string().uuid(),
    index: z.number().int().nonnegative(),
    studentAudioKey: z.string().optional(),
});
export const CreateOneTurnDataSourceOutputSchema = z.object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    index: z.number().int(),
    studentAudioKey: z.string().nullable(),
    studentText: z.string().nullable(),
    assistantText: z.string().nullable(),
    assistantPromptType: z.string().nullable(),
    assistantDetectedIssue: z.string().nullable(),
    latencyMs: z.number().int().nullable(),
    createdAt: z.coerce.date(),
});
