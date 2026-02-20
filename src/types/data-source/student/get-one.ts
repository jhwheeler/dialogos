import { z } from "zod";

export const GetOneStudentDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type GetOneStudentDataSourceInput = z.infer<typeof GetOneStudentDataSourceInputSchema>;

export const GetOneStudentDataSourceOutputSchema = z.object({
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

export type GetOneStudentDataSourceOutput = z.infer<typeof GetOneStudentDataSourceOutputSchema>;
