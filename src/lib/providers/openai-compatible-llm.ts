import OpenAI from "openai";
import type { LlmProvider, PromptContext, SocraticOutput } from "./llm-provider.js";
import {
  PROMPT_TYPE_VALUES,
  DETECTED_ISSUE_VALUES,
  STOP_REASON_VALUES,
} from "../socratic/types.js";

export interface OpenAiCompatibleLlmConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

const JSON_SCHEMA = {
  name: "socratic_response",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      next_prompt: { type: "string" as const },
      prompt_type: {
        type: "string" as const,
        enum: [...PROMPT_TYPE_VALUES],
      },
      detected_issue: {
        type: "string" as const,
        enum: [...DETECTED_ISSUE_VALUES],
      },
      stop_reason: {
        type: "string" as const,
        enum: [...STOP_REASON_VALUES],
      },
    },
    required: ["next_prompt", "prompt_type", "detected_issue", "stop_reason"],
    additionalProperties: false,
  },
};

const JSON_FALLBACK_INSTRUCTION = `

You MUST respond with valid JSON matching this exact schema:
{
  "next_prompt": "<your one-sentence prompt, <= 12 words>",
  "prompt_type": "<one of: ${PROMPT_TYPE_VALUES.join(", ")}>",
  "detected_issue": "<one of: ${DETECTED_ISSUE_VALUES.join(", ")}>",
  "stop_reason": "<one of: ${STOP_REASON_VALUES.join(", ")}>"
}
Respond with ONLY the JSON object. No other text.`;

export class OpenAiCompatibleLlm implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  public constructor(config: OpenAiCompatibleLlmConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
    });
    this.model = config.model ?? "gpt-4o-mini";
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 256;
  }

  public async generateSocraticPrompt(context: PromptContext): Promise<SocraticOutput> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: context.systemMessage },
    ];

    for (const turn of context.conversationHistory) {
      if (turn.role === "student") {
        messages.push({ role: "user", content: turn.text });
      } else {
        messages.push({ role: "assistant", content: turn.text });
      }
    }

    messages.push({ role: "user", content: context.currentStudentText });

    // Try json_schema first, fall back to json_object if the model doesn't support it
    try {
      return await this.callWithJsonSchema(messages);
    } catch (err: unknown) {
      if (isJsonSchemaUnsupportedError(err)) {
        return await this.callWithJsonObject(messages, context.systemMessage);
      }
      throw err;
    }
  }

  private async callWithJsonSchema(
    messages: OpenAI.ChatCompletionMessageParam[],
  ): Promise<SocraticOutput> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      messages,
      response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
    });

    return this.parseResponse(response);
  }

  private async callWithJsonObject(
    messages: OpenAI.ChatCompletionMessageParam[],
    originalSystemMessage: string,
  ): Promise<SocraticOutput> {
    // Append JSON instruction to system message
    const augmentedMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: originalSystemMessage + JSON_FALLBACK_INSTRUCTION },
      ...messages.slice(1), // skip original system message
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      messages: augmentedMessages,
      response_format: { type: "json_object" },
    });

    return this.parseResponse(response);
  }

  private parseResponse(response: OpenAI.ChatCompletion): SocraticOutput {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI response did not contain message content");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error("OpenAI response contained invalid JSON");
    }

    return {
      nextPrompt: String(parsed.next_prompt ?? ""),
      promptType: String(parsed.prompt_type ?? ""),
      detectedIssue: String(parsed.detected_issue ?? ""),
      stopReason: String(parsed.stop_reason ?? ""),
    };
  }
}

function isJsonSchemaUnsupportedError(err: unknown): boolean {
  if (err instanceof OpenAI.BadRequestError) {
    const msg = String(err.message).toLowerCase();
    return msg.includes("json_schema") || msg.includes("response_format");
  }
  return false;
}
