import { z } from "zod";

export const ConfirmTextSourceApiParamsSchema = z.object({
  topicId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

export type ConfirmTextSourceApiParams = z.infer<typeof ConfirmTextSourceApiParamsSchema>;

export const ConfirmTextSourceApiBodySchema = z.object({
  confirmed: z.boolean(),
  correctedText: z.string().max(50_000).optional(),
});

export type ConfirmTextSourceApiBody = z.infer<typeof ConfirmTextSourceApiBodySchema>;

export const ConfirmTextSourceApiOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  topicFileId: z.string().uuid().nullable(),
  sourceType: z.enum(["photo_ocr", "document", "reference", "voice_summary"]),
  title: z.string(),
  citation: z.string().nullable(),
  extractedText: z.string().nullable(),
  groundingTier: z.number().int(),
  preprocessingStatus: z.string(),
  preprocessingConfidence: z.number().nullable(),
  createdAt: z.string().datetime(),
});

export type ConfirmTextSourceApiOutput = z.infer<typeof ConfirmTextSourceApiOutputSchema>;
