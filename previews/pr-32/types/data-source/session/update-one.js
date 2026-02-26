import { z } from "zod";
export const UpdateOneSessionDataSourceInputSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(["draft", "active", "ended", "aborted"]).optional(),
    startedAt: z.coerce.date().optional(),
    endedAt: z.coerce.date().optional(),
});
export const UpdateOneSessionDataSourceOutputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    topicId: z.string().uuid(),
    sourceId: z.string().uuid().nullable(),
    triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
    status: z.enum(["draft", "active", "ended", "aborted"]),
    startedAt: z.coerce.date().nullable(),
    endedAt: z.coerce.date().nullable(),
    costCentsEstimate: z.number().int(),
    trialSecondsUsed: z.number().int(),
    createdAt: z.coerce.date(),
    deletedAt: z.coerce.date().nullable(),
});
