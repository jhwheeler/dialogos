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
  bookPhase: z.enum(["closed_recall", "open_text", "final_compression"]).nullable(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type CreateOneSessionServiceOutput = z.infer<typeof CreateOneSessionServiceOutputSchema>;
