import { z } from "zod";

export const DeleteOneSourceDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneSourceDataSourceInput = z.infer<typeof DeleteOneSourceDataSourceInputSchema>;

export const DeleteOneSourceDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  topicFileId: z.string().uuid().nullable(),
  sourceType: z.enum(["photo_ocr", "document", "reference", "voice_summary"]),
  title: z.string(),
  citation: z.string().nullable(),
  extractedText: z.string().nullable(),
  groundingTier: z.number().int(),
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type DeleteOneSourceDataSourceOutput = z.infer<typeof DeleteOneSourceDataSourceOutputSchema>;
