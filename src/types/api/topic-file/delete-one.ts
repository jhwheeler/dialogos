import { z } from "zod";

export const DeleteOneTopicFileApiInputSchema = z.object({
  topicId: z.string().uuid(),
  fileId: z.string().uuid(),
});

export type DeleteOneTopicFileApiInput = z.infer<typeof DeleteOneTopicFileApiInputSchema>;

export const DeleteOneTopicFileApiOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneTopicFileApiOutput = z.infer<typeof DeleteOneTopicFileApiOutputSchema>;
