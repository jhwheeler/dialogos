import { z } from "zod";

export const DeleteOneTopicApiInputSchema = z.object({
  topicId: z.string().uuid(),
});

export type DeleteOneTopicApiInput = z.infer<typeof DeleteOneTopicApiInputSchema>;

export const DeleteOneTopicApiOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneTopicApiOutput = z.infer<typeof DeleteOneTopicApiOutputSchema>;
