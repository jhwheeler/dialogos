import { z } from "zod";
export const GetOneTopicServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const GetOneTopicServiceOutputSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
