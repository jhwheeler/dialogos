import { z } from "zod";
export const EndOneSessionServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const EndOneSessionServiceOutputSchema = z.object({
    id: z.string().uuid(),
    topicId: z.string().uuid(),
    sourceId: z.string().uuid().nullable(),
    triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
    status: z.enum(["draft", "active", "ended", "aborted"]),
    bookPhase: z.enum(["closed_recall", "open_text", "final_compression"]).nullable(),
    startedAt: z.string().datetime().nullable(),
    endedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
});
