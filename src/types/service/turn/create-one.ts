import { z } from "zod";

export const CreateOneTurnServiceInputSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentAudioKey: z.string().min(1).max(1000),
});

export type CreateOneTurnServiceInput = z.infer<typeof CreateOneTurnServiceInputSchema>;

export const CreateOneTurnServiceOutputSchema = z.object({
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

export type CreateOneTurnServiceOutput = z.infer<typeof CreateOneTurnServiceOutputSchema>;
