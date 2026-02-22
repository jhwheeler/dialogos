import { z } from "zod";
export const GetOneByEmailStudentDataSourceInputSchema = z.object({
    email: z.string().email(),
});
export const GetOneByEmailStudentDataSourceOutputSchema = z.object({
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
