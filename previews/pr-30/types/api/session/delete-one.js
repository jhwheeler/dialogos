import { z } from "zod";
export const DeleteOneSessionApiParamsSchema = z.object({
    sessionId: z.string().uuid(),
});
export const DeleteOneSessionApiOutputSchema = z.object({
    id: z.string().uuid(),
});
