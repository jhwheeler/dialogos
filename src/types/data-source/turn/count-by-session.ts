import { z } from "zod";

export const CountBySessionTurnDataSourceInputSchema = z.object({
  sessionId: z.string().uuid(),
});

export type CountBySessionTurnDataSourceInput = z.infer<
  typeof CountBySessionTurnDataSourceInputSchema
>;
