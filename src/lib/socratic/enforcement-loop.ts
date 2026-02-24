import type { LlmProvider } from "../providers/llm-provider.js";
import type { PromptContext, SocraticOutput } from "../providers/llm-provider.js";
import { SocraticOutputSchema } from "./types.js";
import type { SocraticOutputValidated } from "./types.js";

export interface EnforcementConfig {
  maxRetries?: number;
  wordCap?: number;
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_WORD_CAP = 12;

const BANNED_PHRASES = [
  "great",
  "perfect",
  "awesome",
  "excellent",
  "nice job",
  "good job",
  "love",
  "well done",
  "brilliant",
  "fantastic",
  "wonderful",
  "amazing",
  "impressive",
];

/**
 * Run the enforcement loop: call the LLM, validate the output, retry on failure.
 * Throws if all retries are exhausted.
 */
export async function runEnforcementLoop(
  llmProvider: LlmProvider,
  context: PromptContext,
  config?: EnforcementConfig,
): Promise<SocraticOutputValidated> {
  const maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const wordCap = config?.wordCap ?? DEFAULT_WORD_CAP;
  const totalAttempts = maxRetries + 1;

  const violations: string[] = [];

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    let output: SocraticOutput;

    try {
      output = await llmProvider.generateSocraticPrompt(context);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      violations.push(`Attempt ${attempt + 1}: LLM call failed — ${msg}`);
      continue;
    }

    // 1. Schema validation
    const parseResult = SocraticOutputSchema.safeParse(output);
    if (!parseResult.success) {
      violations.push(
        `Attempt ${attempt + 1}: Schema validation failed — ${parseResult.error.message}`,
      );
      continue;
    }

    const validated = parseResult.data;

    // 2. Word cap check
    const wordCount = countWords(validated.nextPrompt);
    if (wordCount > wordCap) {
      violations.push(
        `Attempt ${attempt + 1}: Word cap exceeded — ${wordCount} words (max ${wordCap})`,
      );
      continue;
    }

    // 3. Banned-phrase scan
    const bannedMatch = findBannedPhrase(validated.nextPrompt);
    if (bannedMatch) {
      violations.push(`Attempt ${attempt + 1}: Banned phrase detected — "${bannedMatch}"`);
      continue;
    }

    // 4. Sentence count check (exactly one sentence)
    if (!isOneSentence(validated.nextPrompt)) {
      violations.push(`Attempt ${attempt + 1}: Multiple sentences detected in nextPrompt`);
      continue;
    }

    // All checks passed
    return validated;
  }

  throw new Error(
    `Enforcement loop exhausted after ${totalAttempts} attempts. Violations:\n${violations.join("\n")}`,
  );
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function findBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`);
    if (pattern.test(lower)) {
      return phrase;
    }
  }
  return null;
}

/**
 * Check that the text is exactly one sentence.
 * Heuristic: count sentence-ending punctuation (. ! ?) that are followed by
 * a space and uppercase letter or end of string. Allow trailing punctuation.
 */
function isOneSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Count sentence-ending punctuation marks
  // Split on sentence boundaries: a terminal punctuation followed by space + uppercase
  const sentenceBreaks = trimmed.match(/[.!?]\s+[A-Z]/g);
  if (sentenceBreaks && sentenceBreaks.length > 0) {
    return false;
  }

  return true;
}
