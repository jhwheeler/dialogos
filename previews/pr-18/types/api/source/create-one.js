import { z } from "zod";
export const CreateOneSourceApiParamsSchema = z.object({
    topicId: z.string().uuid(),
});
export const CreateOneSourceApiBodySchema = z.object({
    sourceType: z.enum(["photo_ocr", "document", "reference", "voice_summary"]),
    title: z.string(),
    citation: z.string().optional(),
    topicFileId: z.string().uuid().optional(),
    extractedText: z.string().optional(),
});
export const CreateOneSourceApiOutputSchema = z.object({
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
