import { z } from "zod";
export const DeleteOneTopicFileDataSourceInputSchema = z.object({
    id: z.string().uuid(),
});
export const DeleteOneTopicFileDataSourceOutputSchema = z.object({
    id: z.string().uuid(),
    topicId: z.string().uuid(),
    kind: z.string(),
    storageKey: z.string(),
    originalName: z.string(),
    mimeType: z.string().nullable(),
    sizeBytes: z.coerce.bigint(),
    createdAt: z.coerce.date(),
    deletedAt: z.coerce.date().nullable(),
});
