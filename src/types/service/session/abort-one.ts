import { z } from "zod";

export const AbortOneSessionServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type AbortOneSessionServiceInput = z.infer<typeof AbortOneSessionServiceInputSchema>;

export const AbortOneSessionServiceOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
  status: z.enum(["draft", "active", "ended", "aborted"]),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type AbortOneSessionServiceOutput = z.infer<typeof AbortOneSessionServiceOutputSchema>;
