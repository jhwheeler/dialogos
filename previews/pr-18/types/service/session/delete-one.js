import { z } from "zod";
export const DeleteOneSessionServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const DeleteOneSessionServiceOutputSchema = z.object({
    id: z.string().uuid(),
});
