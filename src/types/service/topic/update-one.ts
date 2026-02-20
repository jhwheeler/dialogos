import { z } from "zod";

export const UpdateOneTopicServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateOneTopicServiceInput = z.infer<typeof UpdateOneTopicServiceInputSchema>;

export const UpdateOneTopicServiceOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UpdateOneTopicServiceOutput = z.infer<typeof UpdateOneTopicServiceOutputSchema>;
