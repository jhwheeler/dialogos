import { z } from "zod";
export const DeleteOneTopicFileServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const DeleteOneTopicFileServiceOutputSchema = z.object({
    id: z.string().uuid(),
});
