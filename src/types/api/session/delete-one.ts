import { z } from "zod";

export const DeleteOneSessionApiParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

export type DeleteOneSessionApiParams = z.infer<typeof DeleteOneSessionApiParamsSchema>;

export const DeleteOneSessionApiOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneSessionApiOutput = z.infer<typeof DeleteOneSessionApiOutputSchema>;
