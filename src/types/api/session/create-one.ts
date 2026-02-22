import { z } from "zod";

export const CreateOneSessionApiParamsSchema = z.object({
  topicId: z.string().uuid(),
});

export type CreateOneSessionApiParams = z.infer<typeof CreateOneSessionApiParamsSchema>;

export const CreateOneSessionApiBodySchema = z.object({
  sourceId: z.string().uuid().optional(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]).optional(),
});

export type CreateOneSessionApiBody = z.infer<typeof CreateOneSessionApiBodySchema>;

export const CreateOneSessionApiOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
  status: z.enum(["draft", "active", "ended", "aborted"]),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type CreateOneSessionApiOutput = z.infer<typeof CreateOneSessionApiOutputSchema>;
