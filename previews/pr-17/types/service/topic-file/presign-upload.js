import { z } from "zod";
export const PresignUploadTopicFileServiceInputSchema = z.object({
    topicId: z.string().uuid(),
    studentId: z.string().uuid(),
    kind: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
});
export const PresignUploadTopicFileServiceOutputSchema = z.object({
    uploadUrl: z.string(),
    storageKey: z.string(),
});
