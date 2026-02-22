import { z } from "zod";

export const CreateOneStudentDataSourceInputSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(500),
});

export type CreateOneStudentDataSourceInput = z.infer<typeof CreateOneStudentDataSourceInputSchema>;

// Output uses z.unknown() for settings because Prisma returns JsonValue.
// Strict validation happens in the service/mapper layer.
export const CreateOneStudentDataSourceOutputSchema = z.object({
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

export type CreateOneStudentDataSourceOutput = z.infer<
  typeof CreateOneStudentDataSourceOutputSchema
>;
