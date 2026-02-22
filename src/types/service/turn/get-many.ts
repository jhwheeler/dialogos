import { z } from "zod";

export const GetManyTurnServiceInputSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type GetManyTurnServiceInput = z.infer<typeof GetManyTurnServiceInputSchema>;

export const GetManyTurnServiceOutputSchema = z.array(
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
);

export type GetManyTurnServiceOutput = z.infer<typeof GetManyTurnServiceOutputSchema>;
