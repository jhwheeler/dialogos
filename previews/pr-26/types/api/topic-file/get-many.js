import { z } from "zod";
export const GetManyTopicFileApiInputSchema = z.object({
    topicId: z.string().uuid(),
});
export const GetManyTopicFileApiOutputSchema = z.object({
    files: z.array(z.object({
        id: z.string().uuid(),
        kind: z.string(),
        storageKey: z.string(),
        originalName: z.string(),
        mimeType: z.string().nullable(),
        sizeBytes: z.number(),
        createdAt: z.string().datetime(),
    })),
});
