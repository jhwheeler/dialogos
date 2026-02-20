import { z } from "zod";

export const CreateOneTopicApiInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

export type CreateOneTopicApiInput = z.infer<typeof CreateOneTopicApiInputSchema>;

export const CreateOneTopicApiOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateOneTopicApiOutput = z.infer<typeof CreateOneTopicApiOutputSchema>;
