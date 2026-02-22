import { z } from "zod";
export const GetOneSourceApiParamsSchema = z.object({
    topicId: z.string().uuid(),
    sourceId: z.string().uuid(),
});
export const GetOneSourceApiOutputSchema = z.object({
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
