import { z } from "zod";
export const DeleteOneSourceApiParamsSchema = z.object({
    topicId: z.string().uuid(),
    sourceId: z.string().uuid(),
});
export const DeleteOneSourceApiOutputSchema = z.object({
    id: z.string().uuid(),
});
