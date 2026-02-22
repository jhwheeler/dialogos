import { z } from "zod";

export const DeleteOneStudentDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneStudentDataSourceInput = z.infer<typeof DeleteOneStudentDataSourceInputSchema>;

export const DeleteOneStudentDataSourceOutputSchema = z.object({
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

export type DeleteOneStudentDataSourceOutput = z.infer<
  typeof DeleteOneStudentDataSourceOutputSchema
>;
