import type { LlmProvider, LlmMessage, SocraticOutput } from "./llm-provider.js";
import { SocraticOutputSchema } from "./llm-provider.js";

export interface AnthropicLlmConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Anthropic Claude LLM provider using the Messages API with tool_use
 * for structured output conforming to the Socratic output schema.
 */
export class AnthropicLlm implements LlmProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  public constructor(config: AnthropicLlmConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "claude-sonnet-4-20250514";
    this.maxTokens = config.maxTokens ?? 256;
    this.temperature = config.temperature ?? 0.2;
  }

  public async generateSocraticResponse(messages: LlmMessage[]): Promise<SocraticOutput> {
    // Separate system message from conversation messages
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: systemMessage?.content ?? "",
      messages: conversationMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools: [
        {
          name: "socratic_response",
          description:
            "Generate the next Socratic prompt for the student. You MUST use this tool to provide your response.",
          input_schema: {
            type: "object" as const,
            properties: {
              next_prompt: {
                type: "string",
                description:
                  "The spoken prompt for the student. Must be one sentence, 12 words or fewer.",
              },
              prompt_type: {
                type: "string",
                enum: [
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
                ],
              },
              detected_issue: {
                type: "string",
                enum: [
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
                ],
              },
              stop_reason: {
                type: "string",
                enum: [
                  "needs_definition",
                  "needs_example",
                  "needs_premise",
                  "needs_scope",
                  "needs_source_evidence",
                  "ok_continue",
                ],
              },
            },
            required: ["next_prompt", "prompt_type", "detected_issue", "stop_reason"],
          },
        },
      ],
      tool_choice: { type: "tool" as const, name: "socratic_response" },
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API request failed (${response.status}): ${text}`);
    }

    const result = (await response.json()) as {
      content: Array<{ type: string; input?: Record<string, unknown> }>;
    };

    // Extract tool_use block
    const toolUse = result.content.find((block) => block.type === "tool_use");
    if (!toolUse?.input) {
      throw new Error("Anthropic response did not contain a tool_use block");
    }

    // Parse against our Zod schema — may throw if the model produced invalid values
    return SocraticOutputSchema.parse(toolUse.input);
  }
}
