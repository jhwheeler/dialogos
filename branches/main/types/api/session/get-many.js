import { z } from "zod";
export const GetManySessionApiParamsSchema = z.object({
    topicId: z.string().uuid(),
});
export const GetManySessionApiOutputSchema = z.object({
    items: z.array(z.object({
        id: z.string().uuid(),
        topicId: z.string().uuid(),
        sourceId: z.string().uuid().nullable(),
        triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
        status: z.enum(["draft", "active", "ended", "aborted"]),
        startedAt: z.string().datetime().nullable(),
        endedAt: z.string().datetime().nullable(),
        createdAt: z.string().datetime(),
    })),
    count: z.number().int(),
});
