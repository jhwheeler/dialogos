import { z } from "zod";

export const UpdateOneTurnDataSourceInputSchema = z.object({
  id: z.string().uuid(),
  studentText: z.string().nullable().optional(),
  assistantText: z.string().nullable().optional(),
  assistantPromptType: z.string().nullable().optional(),
  assistantDetectedIssue: z.string().nullable().optional(),
  latencyMs: z.number().int().nullable().optional(),
});

export type UpdateOneTurnDataSourceInput = z.infer<typeof UpdateOneTurnDataSourceInputSchema>;

export const UpdateOneTurnDataSourceOutputSchema = z.object({
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

export type UpdateOneTurnDataSourceOutput = z.infer<typeof UpdateOneTurnDataSourceOutputSchema>;
