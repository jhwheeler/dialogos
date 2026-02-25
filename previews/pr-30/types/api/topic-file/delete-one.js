import { z } from "zod";
export const DeleteOneTopicFileApiInputSchema = z.object({
    topicId: z.string().uuid(),
    fileId: z.string().uuid(),
});
export const DeleteOneTopicFileApiOutputSchema = z.object({
    id: z.string().uuid(),
});
