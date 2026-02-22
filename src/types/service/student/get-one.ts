import { z } from "zod";
import { StudentSettingsSchema } from "../../shared/student-settings.js";

export const GetOneStudentServiceInputSchema = z.object({
  id: z.string().uuid(),
});

export type GetOneStudentServiceInput = z.infer<typeof GetOneStudentServiceInputSchema>;

export const GetOneStudentServiceOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  displayName: z.string(),
  plan: z.enum(["free", "paid"]),
  trialRemainingSeconds: z.number().int(),
  settings: StudentSettingsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type GetOneStudentServiceOutput = z.infer<typeof GetOneStudentServiceOutputSchema>;
