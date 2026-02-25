import { z } from "zod";
export const CountBySessionTurnDataSourceInputSchema = z.object({
    sessionId: z.string().uuid(),
});
