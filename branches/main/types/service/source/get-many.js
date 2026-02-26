import { z } from "zod";
export const GetManySourceServiceInputSchema = z.object({
    topicId: z.string().uuid(),
    studentId: z.string().uuid(),
});
export const GetManySourceServiceOutputSchema = z.array(z.object({
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
}));
