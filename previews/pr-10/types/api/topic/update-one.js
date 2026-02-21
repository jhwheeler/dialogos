import { z } from "zod";
export const UpdateOneTopicApiParamsSchema = z.object({
    topicId: z.string().uuid(),
});
export const UpdateOneTopicApiBodySchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
});
export const UpdateOneTopicApiOutputSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
