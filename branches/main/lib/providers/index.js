import { OpenAiStt } from "./openai-stt.js";
import { AnthropicLlm } from "./anthropic-llm.js";
import { OpenAiCompatibleLlm } from "./openai-compatible-llm.js";
export { OpenAiStt } from "./openai-stt.js";
export { AnthropicLlm } from "./anthropic-llm.js";
export { OpenAiCompatibleLlm } from "./openai-compatible-llm.js";
/**
 * Create an STT provider based on env config.
 * Returns null if no API key is configured (placeholder fallback).
 */
export function createSttProvider(env) {
    const provider = env.STT_PROVIDER ?? "openai-whisper";
    if (provider === "openai-whisper") {
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey)
            return null;
        return new OpenAiStt({
            apiKey,
            model: env.STT_MODEL,
            baseURL: env.STT_BASE_URL,
        });
    }
    return null;
}
/**
 * Create an LLM provider based on env config.
 * Returns null if no API key is configured (placeholder fallback).
 */
export function createLlmProvider(env) {
    const provider = env.LLM_PROVIDER ?? "anthropic";
    if (provider === "anthropic") {
        const apiKey = env.ANTHROPIC_API_KEY;
        if (!apiKey)
            return null;
        return new AnthropicLlm({
            apiKey,
            model: env.ANTHROPIC_MODEL,
        });
    }
    if (provider === "openai") {
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey)
            return null;
        return new OpenAiCompatibleLlm({
            apiKey,
            model: env.OPENAI_MODEL,
            baseURL: env.OPENAI_BASE_URL,
        });
    }
    return null;
}
