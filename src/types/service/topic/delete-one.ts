import { z } from "zod";

export const DeleteOneTopicServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type DeleteOneTopicServiceInput = z.infer<typeof DeleteOneTopicServiceInputSchema>;

export const DeleteOneTopicServiceOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneTopicServiceOutput = z.infer<typeof DeleteOneTopicServiceOutputSchema>;
