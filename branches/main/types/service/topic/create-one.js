import { z } from "zod";
export const CreateOneTopicServiceInputSchema = z.object({
    studentId: z.string().uuid(),
    title: z.string(),
    description: z.string().optional(),
});
export const CreateOneTopicServiceOutputSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
