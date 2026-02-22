import { z } from "zod";

export const CreateOneTurnApiParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

export type CreateOneTurnApiParams = z.infer<typeof CreateOneTurnApiParamsSchema>;

export const CreateOneTurnApiBodySchema = z.object({
  studentAudioKey: z.string(),
});

export type CreateOneTurnApiBody = z.infer<typeof CreateOneTurnApiBodySchema>;

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

export type CreateOneTurnApiOutput = z.infer<typeof CreateOneTurnApiOutputSchema>;
