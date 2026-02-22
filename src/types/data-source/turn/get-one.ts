import { z } from "zod";

export const GetOneTurnDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type GetOneTurnDataSourceInput = z.infer<typeof GetOneTurnDataSourceInputSchema>;

export const GetOneTurnDataSourceOutputSchema = z.object({
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

export type GetOneTurnDataSourceOutput = z.infer<typeof GetOneTurnDataSourceOutputSchema>;
