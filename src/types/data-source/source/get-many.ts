import { z } from "zod";

export const GetManySourceDataSourceInputSchema = z.object({
  topicId: z.string().uuid(),
});

export type GetManySourceDataSourceInput = z.infer<typeof GetManySourceDataSourceInputSchema>;

export const GetManySourceDataSourceOutputSchema = z.array(
  z.object({
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
  }),
);

export type GetManySourceDataSourceOutput = z.infer<typeof GetManySourceDataSourceOutputSchema>;
