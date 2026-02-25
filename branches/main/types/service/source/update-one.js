import { z } from "zod";
export const UpdateOneSourceServiceInputSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    title: z.string().optional(),
    citation: z.string().optional(),
    extractedText: z.string().optional(),
});
export const UpdateOneSourceServiceOutputSchema = z.object({
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
