import { z } from "zod";

export const GetOneByEmailStudentDataSourceInputSchema = z.object({
  email: z.string().email(),
});

export type GetOneByEmailStudentDataSourceInput = z.infer<
  typeof GetOneByEmailStudentDataSourceInputSchema
>;

export const GetOneByEmailStudentDataSourceOutputSchema = z.object({
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

export type GetOneByEmailStudentDataSourceOutput = z.infer<
  typeof GetOneByEmailStudentDataSourceOutputSchema
>;
