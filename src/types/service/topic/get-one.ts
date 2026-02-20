import { z } from "zod";

export const GetOneTopicServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type GetOneTopicServiceInput = z.infer<typeof GetOneTopicServiceInputSchema>;

export const GetOneTopicServiceOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type GetOneTopicServiceOutput = z.infer<typeof GetOneTopicServiceOutputSchema>;
