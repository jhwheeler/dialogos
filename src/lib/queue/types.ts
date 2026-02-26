import { z } from "zod";

// ─── Job type constants ──────────────────────────────────────
export const JobType = {
  TRANSCRIBE_TURN: "TRANSCRIBE_TURN",
  GENERATE_PROMPT: "GENERATE_PROMPT",
  RENDER_ARTIFACTS: "RENDER_ARTIFACTS",
  PREPROCESS_SOURCE: "PREPROCESS_SOURCE",
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

export const PreprocessSourcePayloadSchema = z.object({
  jobType: z.literal(JobType.PREPROCESS_SOURCE),
  sourceId: z.string().uuid(),
});
export type PreprocessSourcePayload = z.infer<typeof PreprocessSourcePayloadSchema>;

// ─── Discriminated union of all payloads ─────────────────────
export const JobPayloadSchema = z.discriminatedUnion("jobType", [
  TranscribeTurnPayloadSchema,
  GeneratePromptPayloadSchema,
  RenderArtifactsPayloadSchema,
  PreprocessSourcePayloadSchema,
]);
export type JobPayload = z.infer<typeof JobPayloadSchema>;

// ─── Payload lookup by job type ──────────────────────────────
export type PayloadForJobType<T extends JobType> = T extends "TRANSCRIBE_TURN"
  ? TranscribeTurnPayload
  : T extends "GENERATE_PROMPT"
    ? GeneratePromptPayload
    : T extends "RENDER_ARTIFACTS"
      ? RenderArtifactsPayload
      : T extends "PREPROCESS_SOURCE"
        ? PreprocessSourcePayload
        : never;

// ─── Handler interface ───────────────────────────────────────
export type JobHandler = (payload: JobPayload) => Promise<void>;
