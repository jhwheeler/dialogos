import { z } from "zod";

export const TokenExchangeApiInputSchema = z.object({
  provider: z.enum(["google"]),
  identityToken: z.string().min(1),
});

export type TokenExchangeApiInput = z.infer<typeof TokenExchangeApiInputSchema>;

export const TokenExchangeApiOutputSchema = z.object({
  accessToken: z.string(),
  student: z.object({
    id: z.string().uuid(),
    email: z.string().email().nullable(),
    displayName: z.string(),
  }),
});

export type TokenExchangeApiOutput = z.infer<typeof TokenExchangeApiOutputSchema>;
