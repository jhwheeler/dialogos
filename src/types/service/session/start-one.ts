import { z } from "zod";

export const StartOneSessionServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type StartOneSessionServiceInput = z.infer<typeof StartOneSessionServiceInputSchema>;

export const StartOneSessionServiceOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
  status: z.enum(["draft", "active", "ended", "aborted"]),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

export type StartOneSessionServiceOutput = z.infer<typeof StartOneSessionServiceOutputSchema>;
