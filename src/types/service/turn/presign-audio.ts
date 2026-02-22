import { z } from "zod";

export const PresignAudioTurnServiceInputSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
});

export type PresignAudioTurnServiceInput = z.infer<typeof PresignAudioTurnServiceInputSchema>;

export const PresignAudioTurnServiceOutputSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
});

export type PresignAudioTurnServiceOutput = z.infer<typeof PresignAudioTurnServiceOutputSchema>;
