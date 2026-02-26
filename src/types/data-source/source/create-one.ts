import { z } from "zod";

export const CreateOneSourceDataSourceInputSchema = z.object({
  topicId: z.string().uuid(),
  topicFileId: z.string().uuid().optional(),
  sourceType: z.enum(["photo_ocr", "document", "reference", "voice_summary"]),
  title: z.string(),
  citation: z.string().optional(),
  extractedText: z.string().optional(),
  groundingTier: z.number().int(),
});

export type CreateOneSourceDataSourceInput = z.infer<typeof CreateOneSourceDataSourceInputSchema>;

export const CreateOneSourceDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  topicFileId: z.string().uuid().nullable(),
  sourceType: z.enum(["photo_ocr", "document", "reference", "voice_summary"]),
  title: z.string(),
  citation: z.string().nullable(),
  extractedText: z.string().nullable(),
  groundingTier: z.number().int(),
  preprocessingStatus: z.enum([
    "none",
    "processing",
    "pending_confirmation",
    "confirmed",
    "degraded",
  ]),
  preprocessingConfidence: z.number().nullable(),
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type CreateOneSourceDataSourceOutput = z.infer<typeof CreateOneSourceDataSourceOutputSchema>;
