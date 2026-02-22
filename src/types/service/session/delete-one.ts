import { z } from "zod";

export const DeleteOneSessionServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type DeleteOneSessionServiceInput = z.infer<typeof DeleteOneSessionServiceInputSchema>;

export const DeleteOneSessionServiceOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneSessionServiceOutput = z.infer<typeof DeleteOneSessionServiceOutputSchema>;
