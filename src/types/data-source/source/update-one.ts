import { z } from "zod";

export const UpdateOneSourceDataSourceInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  citation: z.string().optional(),
  extractedText: z.string().optional(),
  groundingTier: z.number().int().optional(),
  preprocessingStatus: z
    .enum(["none", "processing", "pending_confirmation", "confirmed", "degraded"])
    .optional(),
  preprocessingConfidence: z.number().nullable().optional(),
});

export type UpdateOneSourceDataSourceInput = z.infer<typeof UpdateOneSourceDataSourceInputSchema>;

export const UpdateOneSourceDataSourceOutputSchema = z.object({
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

export type UpdateOneSourceDataSourceOutput = z.infer<typeof UpdateOneSourceDataSourceOutputSchema>;
