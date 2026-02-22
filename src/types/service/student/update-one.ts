import { z } from "zod";
import { StudentSettingsSchema } from "../../shared/student-settings.js";

/** Client-facing update: plan and trialRemainingSeconds are server-only. */
export const UpdateOneStudentServiceInputSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(500).optional(),
  settings: StudentSettingsSchema.optional(),
});

export type UpdateOneStudentServiceInput = z.infer<typeof UpdateOneStudentServiceInputSchema>;

export const UpdateOneStudentServiceOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  displayName: z.string(),
  plan: z.enum(["free", "paid"]),
  trialRemainingSeconds: z.number().int(),
  settings: StudentSettingsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UpdateOneStudentServiceOutput = z.infer<typeof UpdateOneStudentServiceOutputSchema>;
