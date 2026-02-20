import { z } from "zod";
export const CreateOneStudentDataSourceInputSchema = z.object({
    email: z.string().email().optional(),
    displayName: z.string(),
});
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
