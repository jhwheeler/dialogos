import { z } from "zod";

export const DeleteOneStudentServiceInputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneStudentServiceInput = z.infer<typeof DeleteOneStudentServiceInputSchema>;

export const DeleteOneStudentServiceOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneStudentServiceOutput = z.infer<typeof DeleteOneStudentServiceOutputSchema>;
