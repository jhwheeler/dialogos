import { z } from "zod";

// ─── Enum values ────────────────────────────────────────────

export const PROMPT_TYPE_VALUES = [
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
] as const;

export type PromptType = (typeof PROMPT_TYPE_VALUES)[number];

export const DETECTED_ISSUE_VALUES = [
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
] as const;

export type DetectedIssue = (typeof DETECTED_ISSUE_VALUES)[number];

export const STOP_REASON_VALUES = [
  "needs_definition",
  "needs_example",
  "needs_premise",
  "needs_scope",
  "needs_source_evidence",
  "ok_continue",
] as const;

export type StopReason = (typeof STOP_REASON_VALUES)[number];

// ─── Zod schema for LLM output validation ──────────────────

export const SocraticOutputSchema = z.object({
  nextPrompt: z.string().min(1),
  promptType: z.enum(PROMPT_TYPE_VALUES),
  detectedIssue: z.enum(DETECTED_ISSUE_VALUES),
  stopReason: z.enum(STOP_REASON_VALUES),
});

export type SocraticOutputValidated = z.infer<typeof SocraticOutputSchema>;
