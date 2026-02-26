import { z } from "zod";
export const GetPreprocessingStatusServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const GetPreprocessingStatusServiceOutputSchema = z.object({
    preprocessingStatus: z.enum([
        "none",
        "processing",
        "pending_confirmation",
        "confirmed",
        "degraded",
    ]),
    preprocessingConfidence: z.number().nullable(),
});
