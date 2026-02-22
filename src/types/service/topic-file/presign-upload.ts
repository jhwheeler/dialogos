import { z } from "zod";

export const PresignUploadTopicFileServiceInputSchema = z.object({
  topicId: z.string().uuid(),
  studentId: z.string().uuid(),
  kind: z.enum(["pdf", "image", "text", "other"]),
  originalName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(52_428_800),
});

export type PresignUploadTopicFileServiceInput = z.infer<
  typeof PresignUploadTopicFileServiceInputSchema
>;

export const PresignUploadTopicFileServiceOutputSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
});

export type PresignUploadTopicFileServiceOutput = z.infer<
  typeof PresignUploadTopicFileServiceOutputSchema
>;
