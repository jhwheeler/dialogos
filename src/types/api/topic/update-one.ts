import { z } from "zod";

export const UpdateOneTopicApiParamsSchema = z.object({
  topicId: z.string().uuid(),
});

export type UpdateOneTopicApiParams = z.infer<typeof UpdateOneTopicApiParamsSchema>;

export const UpdateOneTopicApiBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
});

export type UpdateOneTopicApiBody = z.infer<typeof UpdateOneTopicApiBodySchema>;

export const UpdateOneTopicApiOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UpdateOneTopicApiOutput = z.infer<typeof UpdateOneTopicApiOutputSchema>;
