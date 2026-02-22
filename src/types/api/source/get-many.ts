import { z } from "zod";

export const GetManySourceApiParamsSchema = z.object({
  topicId: z.string().uuid(),
});

export type GetManySourceApiParams = z.infer<typeof GetManySourceApiParamsSchema>;

export const GetManySourceApiOutputSchema = z.object({
  sources: z.array(
    z.object({
      id: z.string().uuid(),
      topicId: z.string().uuid(),
      topicFileId: z.string().uuid().nullable(),
      sourceType: z.enum(["photo_ocr", "document", "reference", "voice_summary"]),
      title: z.string(),
      citation: z.string().nullable(),
      extractedText: z.string().nullable(),
      groundingTier: z.number().int(),
      createdAt: z.string().datetime(),
    }),
  ),
});

export type GetManySourceApiOutput = z.infer<typeof GetManySourceApiOutputSchema>;
