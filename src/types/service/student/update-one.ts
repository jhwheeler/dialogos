import { z } from "zod";

/** Client-facing update: plan and trialRemainingSeconds are server-only. */
export const UpdateOneStudentServiceInputSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(500).optional(),
  voiceRate: z.number().min(0.5).max(2.0).nullable().optional(),
  autoplay: z.boolean().nullable().optional(),
  strictness: z.enum(["low", "medium", "high"]).nullable().optional(),
});

export type UpdateOneStudentServiceInput = z.infer<typeof UpdateOneStudentServiceInputSchema>;

export const UpdateOneStudentServiceOutputSchema = z.object({
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
});

export type UpdateOneStudentServiceOutput = z.infer<typeof UpdateOneStudentServiceOutputSchema>;
