import type { SocraticOutput } from "../llm/llm-provider.js";
import { SocraticOutputSchema, PromptTypeEnum, DetectedIssueEnum } from "../llm/llm-provider.js";

// ─── Configurable limits ────────────────────────────────────────

/** Default maximum word count for next_prompt. */
const DEFAULT_WORD_CAP = 12;

/** Maximum retries before failing the turn gracefully. */
export const MAX_ENFORCEMENT_RETRIES = 2;

// ─── Banned phrases (TECH_SPEC Section 4.2) ────────────────────

const BANNED_PHRASES = [
  "great",
  "perfect",
  "awesome",
  "nice job",
  "excellent",
  "love",
  "good job",
  "well done",
  "wonderful",
  "fantastic",
  "brilliant",
  "amazing",
  "impressive",
  "nicely done",
  "good work",
  "keep it up",
  "that's right",
  "exactly right",
];

// Pre-compile a case-insensitive regex matching any banned phrase as a whole word
const BANNED_REGEX = new RegExp(
  `\\b(${BANNED_PHRASES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i",
);

// ─── Validation functions ──────────────────────────────────────

export interface EnforcementViolation {
  rule: "schema" | "word_cap" | "banned_phrase" | "sentence_count";
  detail: string;
}

/**
 * Count words in a string. Splits on whitespace.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Count sentences in a string. A sentence ends with . ? or !
 * Handles common abbreviations by requiring whitespace or end-of-string after the period.
 */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  const matches = trimmed.match(/[.!?]+(?:\s|$)/g);
  // If no sentence-ending punctuation found, treat the whole text as one sentence
  // (the model may omit the period)
  return matches ? matches.length : 1;
}

/**
 * Check if a string contains any banned praise/padding phrases.
 */
export function containsBannedPhrase(text: string): string | null {
  const match = BANNED_REGEX.exec(text);
  return match ? match[0] : null;
}

/**
 * Validate a SocraticOutput against all enforcement rules.
 * Returns null if valid, or the first violation found.
 */
export function validateOutput(
  output: SocraticOutput,
  wordCap: number = DEFAULT_WORD_CAP,
): EnforcementViolation | null {
  // 1. Schema validation (enum values)
  const schemaResult = SocraticOutputSchema.safeParse(output);
  if (!schemaResult.success) {
    return { rule: "schema", detail: schemaResult.error.message };
  }

  // 2. Word cap check
  const words = countWords(output.next_prompt);
  if (words > wordCap) {
    return {
      rule: "word_cap",
      detail: `next_prompt has ${words} words (max ${wordCap})`,
    };
  }

  // 3. Banned-phrase scan
  const banned = containsBannedPhrase(output.next_prompt);
  if (banned) {
    return {
      rule: "banned_phrase",
      detail: `next_prompt contains banned phrase: "${banned}"`,
    };
  }

  // 4. Sentence count check — must be exactly one sentence
  const sentences = countSentences(output.next_prompt);
  if (sentences > 1) {
    return {
      rule: "sentence_count",
      detail: `next_prompt has ${sentences} sentences (must be exactly 1)`,
    };
  }

  return null;
}

/**
 * Validate that assistant fields match expected enums before persistence.
 * This is the persistence-layer enum validation required by TECH_SPEC Section 6.4.4.
 */
export function validateEnumsForPersistence(
  promptType: string,
  detectedIssue: string,
): boolean {
  return (
    PromptTypeEnum.safeParse(promptType).success &&
    DetectedIssueEnum.safeParse(detectedIssue).success
  );
}
