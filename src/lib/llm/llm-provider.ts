import { z } from "zod";

// ─── Strict output schema (TECH_SPEC Section 4.1) ──────────────

export const PromptTypeEnum = z.enum([
  "define",
  "distinguish",
  "premise",
  "inference",
  "objection",
  "compress",
  "clarify",
  "example",
  "scope",
  "contradiction",
  "locate_passage",
  "reconcile",
  "redirect_to_student",
  "scaffold",
]);
export type PromptType = z.infer<typeof PromptTypeEnum>;

export const DetectedIssueEnum = z.enum([
  "vague_term",
  "missing_premise",
  "equivocation",
  "drift",
  "contradiction",
  "unclear_referent",
  "unsupported_claim",
  "unsupported_by_source",
  "contradicts_source",
  "misattribution",
  "content_request",
  "none",
]);
export type DetectedIssue = z.infer<typeof DetectedIssueEnum>;

export const StopReasonEnum = z.enum([
  "needs_definition",
  "needs_example",
  "needs_premise",
  "needs_scope",
  "needs_source_evidence",
  "ok_continue",
]);
export type StopReason = z.infer<typeof StopReasonEnum>;

export const SocraticOutputSchema = z.object({
  next_prompt: z.string(),
  prompt_type: PromptTypeEnum,
  detected_issue: DetectedIssueEnum,
  stop_reason: StopReasonEnum,
});
export type SocraticOutput = z.infer<typeof SocraticOutputSchema>;

// ─── LLM provider interface ────────────────────────────────────

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmProvider {
  /**
   * Generate a structured Socratic output from the given messages.
   * The provider is responsible for obtaining valid JSON from the model;
   * schema validation is handled by the caller (enforcement loop).
   */
  generateSocraticResponse(messages: LlmMessage[]): Promise<SocraticOutput>;
}
