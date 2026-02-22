import { z } from "zod";
export const GetOneStudentServiceInputSchema = z.object({
    id: z.string().uuid(),
});
export const GetOneStudentServiceOutputSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email().nullable(),
    displayName: z.string(),
    plan: z.enum(["free", "paid"]),
    trialRemainingSeconds: z.number().int(),
    settings: z.record(z.unknown()),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
