import { z } from "zod";
export const DeleteOneSourceServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const DeleteOneSourceServiceOutputSchema = z.object({
    id: z.string().uuid(),
});
