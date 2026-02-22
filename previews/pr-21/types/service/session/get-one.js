import { z } from "zod";
export const GetOneSessionServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const GetOneSessionServiceOutputSchema = z.object({
    id: z.string().uuid(),
    topicId: z.string().uuid(),
    sourceId: z.string().uuid().nullable(),
    triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
    status: z.enum(["draft", "active", "ended", "aborted"]),
    startedAt: z.coerce.date().nullable(),
    endedAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
});
