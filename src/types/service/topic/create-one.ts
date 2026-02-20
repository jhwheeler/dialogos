import { z } from "zod";

export const CreateOneTopicServiceInputSchema = z.object({
  studentId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
});

export type CreateOneTopicServiceInput = z.infer<typeof CreateOneTopicServiceInputSchema>;

export const CreateOneTopicServiceOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateOneTopicServiceOutput = z.infer<typeof CreateOneTopicServiceOutputSchema>;
