import { z } from "zod";

export const GetOneTurnApiParamsSchema = z.object({
  sessionId: z.string().uuid(),
  turnId: z.string().uuid(),
});

export type GetOneTurnApiParams = z.infer<typeof GetOneTurnApiParamsSchema>;

export const GetOneTurnApiOutputSchema = z.object({
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

export type GetOneTurnApiOutput = z.infer<typeof GetOneTurnApiOutputSchema>;
