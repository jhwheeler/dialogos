import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, PromptContext, SocraticOutput } from "./llm-provider.js";
import {
  PROMPT_TYPE_VALUES,
  DETECTED_ISSUE_VALUES,
  STOP_REASON_VALUES,
} from "../socratic/types.js";

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
        enum: [...PROMPT_TYPE_VALUES],
        description: "The type of Socratic move being made.",
      },
      detected_issue: {
        type: "string" as const,
        enum: [...DETECTED_ISSUE_VALUES],
        description: "The issue detected in the student's speech, or 'none'.",
      },
      stop_reason: {
        type: "string" as const,
        enum: [...STOP_REASON_VALUES],
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

    const input = toolUseBlock.input as Record<string, unknown>;

    return {
      nextPrompt: String(input.next_prompt ?? ""),
      promptType: String(input.prompt_type ?? ""),
      detectedIssue: String(input.detected_issue ?? ""),
      stopReason: String(input.stop_reason ?? ""),
    };
  }
}
