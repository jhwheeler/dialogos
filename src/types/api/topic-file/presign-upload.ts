import { z } from "zod";

export const PresignUploadTopicFileApiParamsSchema = z.object({
  topicId: z.string().uuid(),
});

export type PresignUploadTopicFileApiParams = z.infer<typeof PresignUploadTopicFileApiParamsSchema>;

export const PresignUploadTopicFileApiBodySchema = z.object({
  kind: z.enum(["pdf", "image", "text", "other"]),
  originalName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(255),
  sizeBytes: z.coerce.number().int().positive().max(52_428_800),
});

export type PresignUploadTopicFileApiBody = z.infer<typeof PresignUploadTopicFileApiBodySchema>;

export const PresignUploadTopicFileApiOutputSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
});

export type PresignUploadTopicFileApiOutput = z.infer<typeof PresignUploadTopicFileApiOutputSchema>;
