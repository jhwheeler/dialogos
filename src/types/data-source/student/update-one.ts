import { z } from "zod";
import { StudentSettingsSchema } from "../../shared/student-settings.js";

export const UpdateOneStudentDataSourceInputSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(500).optional(),
  settings: StudentSettingsSchema.optional(),
  plan: z.enum(["free", "paid"]).optional(),
  trialRemainingSeconds: z.number().int().nonnegative().optional(),
});

export type UpdateOneStudentDataSourceInput = z.infer<typeof UpdateOneStudentDataSourceInputSchema>;

export const UpdateOneStudentDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  displayName: z.string(),
  plan: z.enum(["free", "paid"]),
  trialRemainingSeconds: z.number().int(),
  settings: z.unknown(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type UpdateOneStudentDataSourceOutput = z.infer<
  typeof UpdateOneStudentDataSourceOutputSchema
>;
