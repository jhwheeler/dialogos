import { z } from "zod";

export const PresignUploadTopicFileApiParamsSchema = z.object({
  topicId: z.string().uuid(),
});

export type PresignUploadTopicFileApiParams = z.infer<typeof PresignUploadTopicFileApiParamsSchema>;

export const PresignUploadTopicFileApiBodySchema = z.object({
  kind: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.coerce.number().int().positive(),
});

export type PresignUploadTopicFileApiBody = z.infer<typeof PresignUploadTopicFileApiBodySchema>;

export const PresignUploadTopicFileApiOutputSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
});

export type PresignUploadTopicFileApiOutput = z.infer<typeof PresignUploadTopicFileApiOutputSchema>;
