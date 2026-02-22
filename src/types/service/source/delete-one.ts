import { z } from "zod";

export const DeleteOneSourceServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type DeleteOneSourceServiceInput = z.infer<typeof DeleteOneSourceServiceInputSchema>;

export const DeleteOneSourceServiceOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneSourceServiceOutput = z.infer<typeof DeleteOneSourceServiceOutputSchema>;
