import { z } from "zod";
export const GetManyTopicFileServiceInputSchema = z.object({
    topicId: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const GetManyTopicFileServiceOutputSchema = z.array(z.object({
    id: z.string().uuid(),
    kind: z.string(),
    storageKey: z.string(),
    originalName: z.string(),
    mimeType: z.string().nullable(),
    sizeBytes: z.number(),
    createdAt: z.string().datetime(),
}));
