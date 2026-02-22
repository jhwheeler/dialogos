import { z } from "zod";

export const GetOneTurnServiceInputSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type GetOneTurnServiceInput = z.infer<typeof GetOneTurnServiceInputSchema>;

export const GetOneTurnServiceOutputSchema = z.object({
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

export type GetOneTurnServiceOutput = z.infer<typeof GetOneTurnServiceOutputSchema>;
