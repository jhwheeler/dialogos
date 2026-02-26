import { z } from "zod";

export const ConfirmTextSourceServiceInputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  confirmed: z.boolean(),
  correctedText: z.string().optional(),
});

export type ConfirmTextSourceServiceInput = z.infer<typeof ConfirmTextSourceServiceInputSchema>;

export const ConfirmTextSourceServiceOutputSchema = z.object({
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

export type ConfirmTextSourceServiceOutput = z.infer<typeof ConfirmTextSourceServiceOutputSchema>;
