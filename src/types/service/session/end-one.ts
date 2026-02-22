import { z } from "zod";

export const EndOneSessionServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type EndOneSessionServiceInput = z.infer<typeof EndOneSessionServiceInputSchema>;

export const EndOneSessionServiceOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
  status: z.enum(["draft", "active", "ended", "aborted"]),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

export type EndOneSessionServiceOutput = z.infer<typeof EndOneSessionServiceOutputSchema>;
