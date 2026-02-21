import { z } from "zod";
export const GetOneTopicApiInputSchema = z.object({
    topicId: z.string().uuid(),
});
export const GetOneTopicApiOutputSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
