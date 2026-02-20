import { z } from "zod";
export const TokenExchangeApiInputSchema = z.object({
    provider: z.enum(["google"]),
    identityToken: z.string().min(1),
});
export const TokenExchangeApiOutputSchema = z.object({
    accessToken: z.string(),
    student: z.object({
        id: z.string().uuid(),
        email: z.string().email().nullable(),
        displayName: z.string(),
    }),
});
