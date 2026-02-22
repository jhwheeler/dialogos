import { z } from "zod";

// ─── Job type constants ──────────────────────────────────────
export const JobType = {
  TRANSCRIBE_TURN: "TRANSCRIBE_TURN",
  GENERATE_PROMPT: "GENERATE_PROMPT",
  RENDER_ARTIFACTS: "RENDER_ARTIFACTS",
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

// ─── Per-job payload schemas ─────────────────────────────────
export const TranscribeTurnPayloadSchema = z.object({
  jobType: z.literal(JobType.TRANSCRIBE_TURN),
  turnId: z.string().uuid(),
});
export type TranscribeTurnPayload = z.infer<typeof TranscribeTurnPayloadSchema>;

export const GeneratePromptPayloadSchema = z.object({
  jobType: z.literal(JobType.GENERATE_PROMPT),
  turnId: z.string().uuid(),
});
export type GeneratePromptPayload = z.infer<typeof GeneratePromptPayloadSchema>;

export const RenderArtifactsPayloadSchema = z.object({
  jobType: z.literal(JobType.RENDER_ARTIFACTS),
  sessionId: z.string().uuid(),
});
export type RenderArtifactsPayload = z.infer<typeof RenderArtifactsPayloadSchema>;

// ─── Discriminated union of all payloads ─────────────────────
export const JobPayloadSchema = z.discriminatedUnion("jobType", [
  TranscribeTurnPayloadSchema,
  GeneratePromptPayloadSchema,
  RenderArtifactsPayloadSchema,
]);
export type JobPayload = z.infer<typeof JobPayloadSchema>;

// ─── Payload lookup by job type ──────────────────────────────
export type PayloadForJobType<T extends JobType> = T extends "TRANSCRIBE_TURN"
  ? TranscribeTurnPayload
  : T extends "GENERATE_PROMPT"
    ? GeneratePromptPayload
    : T extends "RENDER_ARTIFACTS"
      ? RenderArtifactsPayload
      : never;

// ─── Handler interface ───────────────────────────────────────
export type JobHandler = (payload: JobPayload) => Promise<void>;
