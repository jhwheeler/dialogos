import { z } from "zod";

export const DeleteOneSourceApiParamsSchema = z.object({
  topicId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

export type DeleteOneSourceApiParams = z.infer<typeof DeleteOneSourceApiParamsSchema>;

export const DeleteOneSourceApiOutputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneSourceApiOutput = z.infer<typeof DeleteOneSourceApiOutputSchema>;
