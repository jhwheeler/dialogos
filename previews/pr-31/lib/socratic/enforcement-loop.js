import { SocraticOutputSchema } from "./types.js";
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
export async function runEnforcementLoop(llmProvider, context, config) {
    const maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
    const wordCap = config?.wordCap ?? DEFAULT_WORD_CAP;
    const totalAttempts = maxRetries + 1;
    const violations = [];
    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        let output;
        try {
            output = await llmProvider.generateSocraticPrompt(context);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            violations.push(`Attempt ${attempt + 1}: LLM call failed — ${msg}`);
            continue;
        }
        // 1. Schema validation
        const parseResult = SocraticOutputSchema.safeParse(output);
        if (!parseResult.success) {
            violations.push(`Attempt ${attempt + 1}: Schema validation failed — ${parseResult.error.message}`);
            continue;
        }
        const validated = parseResult.data;
        // 2. Word cap check
        const wordCount = countWords(validated.nextPrompt);
        if (wordCount > wordCap) {
            violations.push(`Attempt ${attempt + 1}: Word cap exceeded — ${wordCount} words (max ${wordCap})`);
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
    throw new Error(`Enforcement loop exhausted after ${totalAttempts} attempts. Violations:\n${violations.join("\n")}`);
}
function countWords(text) {
    return text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
}
/** Escape special regex characters in a string. */
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function findBannedPhrase(text) {
    const lower = text.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
        const escaped = escapeRegExp(phrase).replace(/\s+/g, "\\s+");
        const pattern = new RegExp(`\\b${escaped}\\b`);
        if (pattern.test(lower)) {
            return phrase;
        }
    }
    return null;
}
/**
 * Check that the text is exactly one sentence.
 * Counts groups of terminal punctuation (. ! ?) that are followed by whitespace
 * and more text, regardless of case. A single trailing punctuation group is allowed.
 */
function isOneSentence(text) {
    const trimmed = text.trim();
    if (!trimmed)
        return false;
    // Count terminal-punctuation groups followed by whitespace and more text.
    // This catches "Define justice. be specific." (lowercase continuation) as well
    // as the uppercase case.
    const sentenceBreaks = trimmed.match(/[.!?]+\s+\S/g);
    if (sentenceBreaks && sentenceBreaks.length > 0) {
        return false;
    }
    return true;
}
