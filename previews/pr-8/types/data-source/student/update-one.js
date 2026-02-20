import { z } from "zod";
export const UpdateOneStudentDataSourceInputSchema = z.object({
    id: z.string().uuid(),
    displayName: z.string().optional(),
    settings: z.record(z.unknown()).optional(),
    plan: z.enum(["free", "paid"]).optional(),
    trialRemainingSeconds: z.number().int().optional(),
});
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
