import { z } from "zod";
export const PreprocessingStatusApiParamsSchema = z.object({
    topicId: z.string().uuid(),
    sourceId: z.string().uuid(),
});
export const PreprocessingStatusApiOutputSchema = z.object({
    preprocessingStatus: z.enum([
        "none",
        "processing",
        "pending_confirmation",
        "confirmed",
        "degraded",
    ]),
    preprocessingConfidence: z.number().nullable(),
});
