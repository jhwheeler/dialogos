import { z } from "zod";

export const CreateOneStudentDataSourceInputSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(500),
});

export type CreateOneStudentDataSourceInput = z.infer<typeof CreateOneStudentDataSourceInputSchema>;

export const CreateOneStudentDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  displayName: z.string(),
  plan: z.enum(["free", "paid"]),
  trialRemainingSeconds: z.number().int(),
  voiceRate: z.number().nullable(),
  autoplay: z.boolean().nullable(),
  strictness: z.enum(["low", "medium", "high"]).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type CreateOneStudentDataSourceOutput = z.infer<
  typeof CreateOneStudentDataSourceOutputSchema
>;
