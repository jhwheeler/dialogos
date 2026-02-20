import { z } from "zod";

export const CreateOrFindStudentServiceInputSchema = z.object({
  email: z.string().email(),
  displayName: z.string(),
});

export type CreateOrFindStudentServiceInput = z.infer<typeof CreateOrFindStudentServiceInputSchema>;

export const CreateOrFindStudentServiceOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  displayName: z.string(),
  plan: z.enum(["free", "paid"]),
  trialRemainingSeconds: z.number().int(),
  settings: z.record(z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  created: z.boolean(),
});

export type CreateOrFindStudentServiceOutput = z.infer<
  typeof CreateOrFindStudentServiceOutputSchema
>;
