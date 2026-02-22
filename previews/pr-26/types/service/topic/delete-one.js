import { z } from "zod";
export const DeleteOneTopicServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const DeleteOneTopicServiceOutputSchema = z.object({
    id: z.string().uuid(),
});
