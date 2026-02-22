import { z } from "zod";
export const CreateOneTopicFileApiParamsSchema = z.object({
    topicId: z.string().uuid(),
});
export const CreateOneTopicFileApiBodySchema = z.object({
    storageKey: z
        .string()
        .max(1000)
        .regex(/^topics\/[a-f0-9-]{36}\/files\/[a-f0-9-]{36}\/.+$/, "Invalid storage key format"),
    kind: z.enum(["pdf", "image", "text", "other"]),
    originalName: z.string().min(1).max(500),
    mimeType: z.string().max(255).optional(),
    sizeBytes: z.coerce.number().int().positive().max(52_428_800),
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
