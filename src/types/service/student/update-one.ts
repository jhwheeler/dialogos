import { z } from "zod";

export const UpdateOneStudentServiceInputSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  plan: z.enum(["free", "paid"]).optional(),
  trialRemainingSeconds: z.number().int().optional(),
});

export type UpdateOneStudentServiceInput = z.infer<typeof UpdateOneStudentServiceInputSchema>;

export const UpdateOneStudentServiceOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  displayName: z.string(),
  plan: z.enum(["free", "paid"]),
  trialRemainingSeconds: z.number().int(),
  settings: z.record(z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UpdateOneStudentServiceOutput = z.infer<typeof UpdateOneStudentServiceOutputSchema>;
