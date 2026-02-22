import { z } from "zod";
export const CreateOneTopicFileApiParamsSchema = z.object({
    topicId: z.string().uuid(),
});
export const CreateOneTopicFileApiBodySchema = z.object({
    storageKey: z.string(),
    kind: z.string(),
    originalName: z.string(),
    mimeType: z.string().optional(),
    sizeBytes: z.coerce.number().int().positive(),
});
export const CreateOneTopicFileApiOutputSchema = z.object({
    id: z.string().uuid(),
    kind: z.string(),
    storageKey: z.string(),
    originalName: z.string(),
    mimeType: z.string().nullable(),
    sizeBytes: z.number(),
    createdAt: z.string().datetime(),
});
