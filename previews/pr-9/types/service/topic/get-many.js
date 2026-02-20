import { z } from "zod";
export const GetManyTopicServiceInputSchema = z.object({
    studentId: z.string().uuid(),
});
export const GetManyTopicServiceOutputSchema = z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
}));
