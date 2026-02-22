import { z } from "zod";
export const UpdateOneTopicServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    title: z.string().optional(),
    description: z.string().optional(),
});
export const UpdateOneTopicServiceOutputSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
