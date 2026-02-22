import { z } from "zod";
export const PresignUploadTopicFileApiParamsSchema = z.object({
    topicId: z.string().uuid(),
});
export const PresignUploadTopicFileApiBodySchema = z.object({
    kind: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.coerce.number().int().positive(),
});
export const PresignUploadTopicFileApiOutputSchema = z.object({
    uploadUrl: z.string(),
    storageKey: z.string(),
});
