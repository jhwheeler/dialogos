import { z } from "zod";
export const CreateOneTopicFileServiceInputSchema = z.object({
    topicId: z.string().uuid(),
    studentId: z.string().uuid(),
    storageKey: z.string(),
    kind: z.string(),
    originalName: z.string(),
    mimeType: z.string().optional(),
    sizeBytes: z.number(),
});
export const CreateOneTopicFileServiceOutputSchema = z.object({
    id: z.string().uuid(),
    kind: z.string(),
    storageKey: z.string(),
    originalName: z.string(),
    mimeType: z.string().nullable(),
    sizeBytes: z.number(),
    createdAt: z.string().datetime(),
});
