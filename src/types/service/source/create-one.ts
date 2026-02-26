import { z } from "zod";

export const CreateOneSourceServiceInputSchema = z.object({
  topicId: z.string().uuid(),
  studentId: z.string().uuid(),
  topicFileId: z.string().uuid().optional(),
  sourceType: z.enum(["photo_ocr", "document", "reference", "voice_summary"]),
  title: z.string(),
  citation: z.string().optional(),
  extractedText: z.string().optional(),
});

export type CreateOneSourceServiceInput = z.infer<typeof CreateOneSourceServiceInputSchema>;

export const CreateOneSourceServiceOutputSchema = z.object({
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

export type CreateOneSourceServiceOutput = z.infer<typeof CreateOneSourceServiceOutputSchema>;
