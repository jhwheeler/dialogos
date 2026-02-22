import { z } from "zod";

export const GetManyTurnDataSourceInputSchema = z.object({
  sessionId: z.string().uuid(),
});

export type GetManyTurnDataSourceInput = z.infer<typeof GetManyTurnDataSourceInputSchema>;

export const GetManyTurnDataSourceOutputSchema = z.array(
  z.object({
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
  }),
);

export type GetManyTurnDataSourceOutput = z.infer<typeof GetManyTurnDataSourceOutputSchema>;
