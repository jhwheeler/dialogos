import { z } from "zod";

export const GetOneSessionServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type GetOneSessionServiceInput = z.infer<typeof GetOneSessionServiceInputSchema>;

export const GetOneSessionServiceOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
  status: z.enum(["draft", "active", "ended", "aborted"]),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type GetOneSessionServiceOutput = z.infer<typeof GetOneSessionServiceOutputSchema>;
