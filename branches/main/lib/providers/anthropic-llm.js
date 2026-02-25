import Anthropic from "@anthropic-ai/sdk";
import { PROMPT_TYPE_VALUES, DETECTED_ISSUE_VALUES, STOP_REASON_VALUES, } from "../socratic/types.js";
const SOCRATIC_RESPONSE_TOOL = {
    name: "socratic_response",
    description: "Emit the structured Socratic response for this turn. You MUST call this tool with your response.",
    input_schema: {
        type: "object",
        properties: {
            next_prompt: {
                type: "string",
                description: "The single sentence to speak to the student. Must be <= 12 words. One sentence only.",
            },
            prompt_type: {
                type: "string",
                enum: [...PROMPT_TYPE_VALUES],
                description: "The type of Socratic move being made.",
            },
            detected_issue: {
                type: "string",
                enum: [...DETECTED_ISSUE_VALUES],
                description: "The issue detected in the student's speech, or 'none'.",
            },
            stop_reason: {
                type: "string",
                enum: [...STOP_REASON_VALUES],
                description: "Why the conversation is pausing at this point.",
            },
        },
        required: ["next_prompt", "prompt_type", "detected_issue", "stop_reason"],
    },
};
export class AnthropicLlm {
    client;
    model;
    temperature;
    maxTokens;
    constructor(config) {
        this.client = new Anthropic({ apiKey: config.apiKey });
        this.model = config.model ?? "claude-sonnet-4-20250514";
        this.temperature = config.temperature ?? 0.2;
        this.maxTokens = config.maxTokens ?? 256;
    }
    async generateSocraticPrompt(context) {
        const messages = [];
        for (const turn of context.conversationHistory) {
            if (turn.role === "student") {
                messages.push({ role: "user", content: turn.text });
            }
            else {
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
        const toolUseBlock = response.content.find((block) => block.type === "tool_use");
        if (!toolUseBlock) {
            throw new Error("Anthropic response did not contain a tool_use block");
        }
        const input = toolUseBlock.input;
        return {
            nextPrompt: String(input.next_prompt ?? ""),
            promptType: String(input.prompt_type ?? ""),
            detectedIssue: String(input.detected_issue ?? ""),
            stopReason: String(input.stop_reason ?? ""),
        };
    }
}
