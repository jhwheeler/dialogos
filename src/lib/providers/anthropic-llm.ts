import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, PromptContext, SocraticOutput } from "./llm-provider.js";

export interface AnthropicLlmConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const SOCRATIC_RESPONSE_TOOL = {
  name: "socratic_response" as const,
  description:
    "Emit the structured Socratic response for this turn. You MUST call this tool with your response.",
  input_schema: {
    type: "object" as const,
    properties: {
      next_prompt: {
        type: "string" as const,
        description:
          "The single sentence to speak to the student. Must be <= 12 words. One sentence only.",
      },
      prompt_type: {
        type: "string" as const,
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
        description: "The type of Socratic move being made.",
      },
      detected_issue: {
        type: "string" as const,
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
        description: "The issue detected in the student's speech, or 'none'.",
      },
      stop_reason: {
        type: "string" as const,
        enum: [
          "needs_definition",
          "needs_example",
          "needs_premise",
          "needs_scope",
          "needs_source_evidence",
          "ok_continue",
        ],
        description: "Why the conversation is pausing at this point.",
      },
    },
    required: ["next_prompt", "prompt_type", "detected_issue", "stop_reason"],
  },
};

export class AnthropicLlm implements LlmProvider {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  public constructor(config: AnthropicLlmConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? "claude-sonnet-4-20250514";
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 256;
  }

  public async generateSocraticPrompt(context: PromptContext): Promise<SocraticOutput> {
    const messages: Anthropic.MessageParam[] = [];

    for (const turn of context.conversationHistory) {
      if (turn.role === "student") {
        messages.push({ role: "user", content: turn.text });
      } else {
        messages.push({ role: "assistant", content: turn.text });
      }
    }

    // Add the current student text as the final user message
    messages.push({ role: "user", content: context.currentStudentText });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: context.systemMessage,
      tools: [SOCRATIC_RESPONSE_TOOL],
      tool_choice: { type: "tool", name: "socratic_response" },
      messages,
    });

    // Extract the tool_use block
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (!toolUseBlock) {
      throw new Error("Anthropic response did not contain a tool_use block");
    }

    const input = toolUseBlock.input as Record<string, string>;

    return {
      nextPrompt: input.next_prompt,
      promptType: input.prompt_type,
      detectedIssue: input.detected_issue,
      stopReason: input.stop_reason,
    };
  }
}
