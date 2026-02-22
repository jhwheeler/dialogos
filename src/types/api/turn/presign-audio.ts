import { z } from "zod";

export const PresignAudioTurnApiParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

export type PresignAudioTurnApiParams = z.infer<typeof PresignAudioTurnApiParamsSchema>;

export const PresignAudioTurnApiBodySchema = z.object({
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.coerce.number().int().positive(),
});

export type PresignAudioTurnApiBody = z.infer<typeof PresignAudioTurnApiBodySchema>;

export const PresignAudioTurnApiOutputSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
});

export type PresignAudioTurnApiOutput = z.infer<typeof PresignAudioTurnApiOutputSchema>;
