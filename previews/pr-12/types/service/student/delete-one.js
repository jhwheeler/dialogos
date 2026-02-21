import { z } from "zod";
export const DeleteOneStudentServiceInputSchema = z.object({
    id: z.string().uuid(),
});
export const DeleteOneStudentServiceOutputSchema = z.object({
    id: z.string().uuid(),
});
