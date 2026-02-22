import { z } from "zod";

export const UpdateOneSourceApiParamsSchema = z.object({
  topicId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

export type UpdateOneSourceApiParams = z.infer<typeof UpdateOneSourceApiParamsSchema>;

export const UpdateOneSourceApiBodySchema = z.object({
  title: z.string().optional(),
  citation: z.string().optional(),
  extractedText: z.string().optional(),
});

export type UpdateOneSourceApiBody = z.infer<typeof UpdateOneSourceApiBodySchema>;

export const UpdateOneSourceApiOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  topicFileId: z.string().uuid().nullable(),
  sourceType: z.enum(["photo_ocr", "document", "reference", "voice_summary"]),
  title: z.string(),
  citation: z.string().nullable(),
  extractedText: z.string().nullable(),
  groundingTier: z.number().int(),
  createdAt: z.string().datetime(),
});

export type UpdateOneSourceApiOutput = z.infer<typeof UpdateOneSourceApiOutputSchema>;
