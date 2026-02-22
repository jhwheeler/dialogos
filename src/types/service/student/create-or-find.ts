import { z } from "zod";
import { StudentSettingsSchema } from "../../shared/student-settings.js";

export const CreateOrFindStudentServiceInputSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(500),
});

export type CreateOrFindStudentServiceInput = z.infer<typeof CreateOrFindStudentServiceInputSchema>;

export const CreateOrFindStudentServiceOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  displayName: z.string(),
  plan: z.enum(["free", "paid"]),
  trialRemainingSeconds: z.number().int(),
  settings: StudentSettingsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  created: z.boolean(),
});

export type CreateOrFindStudentServiceOutput = z.infer<
  typeof CreateOrFindStudentServiceOutputSchema
>;
