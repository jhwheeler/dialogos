import { z } from "zod";

export const GetOneTopicApiInputSchema = z.object({
  topicId: z.string().uuid(),
});

export type GetOneTopicApiInput = z.infer<typeof GetOneTopicApiInputSchema>;

export const GetOneTopicApiOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GetOneTopicApiOutput = z.infer<typeof GetOneTopicApiOutputSchema>;
