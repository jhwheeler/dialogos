import { z } from "zod";

export const CreateOneSessionServiceInputSchema = z.object({
  studentId: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().optional(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]).optional(),
});

export type CreateOneSessionServiceInput = z.infer<typeof CreateOneSessionServiceInputSchema>;

export const CreateOneSessionServiceOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
  status: z.enum(["draft", "active", "ended", "aborted"]),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

export type CreateOneSessionServiceOutput = z.infer<typeof CreateOneSessionServiceOutputSchema>;
