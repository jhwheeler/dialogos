import { z } from "zod";

export const GetManyTurnApiParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

export type GetManyTurnApiParams = z.infer<typeof GetManyTurnApiParamsSchema>;

export const GetManyTurnApiOutputSchema = z.object({
  items: z.array(
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
      createdAt: z.string().datetime(),
    }),
  ),
  count: z.number().int(),
});

export type GetManyTurnApiOutput = z.infer<typeof GetManyTurnApiOutputSchema>;
