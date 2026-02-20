import { z } from "zod";
export const DeleteOneTopicApiInputSchema = z.object({
    topicId: z.string().uuid(),
});
export const DeleteOneTopicApiOutputSchema = z.object({
    id: z.string().uuid(),
});
