import { z } from "zod";
// ─── Job type constants ──────────────────────────────────────
export const JobType = {
    TRANSCRIBE_TURN: "TRANSCRIBE_TURN",
    GENERATE_PROMPT: "GENERATE_PROMPT",
    RENDER_ARTIFACTS: "RENDER_ARTIFACTS",
    PREPROCESS_SOURCE: "PREPROCESS_SOURCE",
};
// ─── Per-job payload schemas ─────────────────────────────────
export const TranscribeTurnPayloadSchema = z.object({
    jobType: z.literal(JobType.TRANSCRIBE_TURN),
    turnId: z.string().uuid(),
});
export const GeneratePromptPayloadSchema = z.object({
    jobType: z.literal(JobType.GENERATE_PROMPT),
    turnId: z.string().uuid(),
});
export const RenderArtifactsPayloadSchema = z.object({
    jobType: z.literal(JobType.RENDER_ARTIFACTS),
    sessionId: z.string().uuid(),
});
export const PreprocessSourcePayloadSchema = z.object({
    jobType: z.literal(JobType.PREPROCESS_SOURCE),
    sourceId: z.string().uuid(),
});
// ─── Discriminated union of all payloads ─────────────────────
export const JobPayloadSchema = z.discriminatedUnion("jobType", [
    TranscribeTurnPayloadSchema,
    GeneratePromptPayloadSchema,
    RenderArtifactsPayloadSchema,
    PreprocessSourcePayloadSchema,
]);
