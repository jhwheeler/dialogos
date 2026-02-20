import { z } from "zod";

export const DeleteOneTopicFileServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type DeleteOneTopicFileServiceInput = z.infer<typeof DeleteOneTopicFileServiceInputSchema>;

export const DeleteOneTopicFileServiceOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneTopicFileServiceOutput = z.infer<typeof DeleteOneTopicFileServiceOutputSchema>;
