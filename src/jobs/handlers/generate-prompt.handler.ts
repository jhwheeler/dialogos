import type { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import type { SessionDataSource } from "../../data-sources/session/session.data-source.js";
import type { SourceDataSource } from "../../data-sources/source/source.data-source.js";
import type { TopicDataSource } from "../../data-sources/topic/topic.data-source.js";
import type { JobHandler, JobPayload } from "../../lib/queue/types.js";
import { GeneratePromptPayloadSchema } from "../../lib/queue/types.js";
import type { LlmProvider } from "../../lib/llm/llm-provider.js";
import type { PromptContext } from "../../lib/prompt/types.js";
import { buildMessages } from "../../lib/prompt/system-prompt.js";
import {
  validateOutput,
  validateEnumsForPersistence,
  MAX_ENFORCEMENT_RETRIES,
} from "../../lib/prompt/enforcement.js";

export interface GeneratePromptHandlerDeps {
  turnDataSource: TurnDataSource;
  sessionDataSource: SessionDataSource;
  sourceDataSource: SourceDataSource;
  topicDataSource: TopicDataSource;
  llmProvider: LlmProvider | null;
}

export function createGeneratePromptHandler(deps: GeneratePromptHandlerDeps): JobHandler {
  const { turnDataSource, sessionDataSource, sourceDataSource, topicDataSource, llmProvider } =
    deps;

  return async (payload: JobPayload): Promise<void> => {
    const parsed = GeneratePromptPayloadSchema.parse(payload);
    const startTime = Date.now();

    // If no LLM provider is configured, write placeholder values
    if (!llmProvider) {
      await turnDataSource.updateOne({
        id: parsed.turnId,
        assistantText: "[placeholder: prompt pending real LLM]",
        assistantPromptType: "clarify",
        assistantDetectedIssue: "none",
        latencyMs: 0,
      });
      return;
    }

    // ── Collect context ──────────────────────────────────────────

    // Fetch the current turn
    const turn = await turnDataSource.getOne({ id: parsed.turnId });
    if (!turn) {
      throw new Error(`Turn ${parsed.turnId} not found`);
    }

    // Fetch the session
    const session = await sessionDataSource.getOne({ id: turn.sessionId });
    if (!session) {
      throw new Error(`Session ${turn.sessionId} not found`);
    }

    // Fetch the topic
    const topic = await topicDataSource.getOne({ id: session.topicId });
    if (!topic) {
      throw new Error(`Topic ${session.topicId} not found`);
    }

    // Fetch the source (if linked)
    let sourceContext: PromptContext["source"] = null;
    if (session.sourceId) {
      const source = await sourceDataSource.getOne({ id: session.sourceId });
      if (source && !source.deletedAt) {
        sourceContext = {
          title: source.title,
          sourceType: source.sourceType,
          groundingTier: source.groundingTier,
          citation: source.citation,
          extractedText: source.extractedText,
        };
      }
    }

    // Fetch previous turns for conversation context (last N, ordered by index)
    const allTurns = await turnDataSource.getMany({ sessionId: turn.sessionId });
    const previousTurns = allTurns
      .filter((t) => t.index < turn.index)
      .map((t) => ({
        studentText: t.studentText,
        assistantText: t.assistantText,
      }));

    const promptContext: PromptContext = {
      topicTitle: topic.title,
      topicDescription: topic.description,
      triviumStage: session.triviumStage as PromptContext["triviumStage"],
      source: sourceContext,
      previousTurns,
      currentStudentText: turn.studentText ?? "",
    };

    // ── Build messages and call LLM with enforcement loop ────────

    const messages = buildMessages(promptContext);

    let lastError: string | null = null;
    for (let attempt = 0; attempt <= MAX_ENFORCEMENT_RETRIES; attempt++) {
      try {
        const output = await llmProvider.generateSocraticResponse(messages);

        // Run enforcement validation (TECH_SPEC Section 4.6)
        const violation = validateOutput(output);
        if (violation) {
          lastError = `${violation.rule}: ${violation.detail}`;
          continue; // retry
        }

        // Validate enums before persistence (TECH_SPEC Section 6.4.4)
        if (!validateEnumsForPersistence(output.prompt_type, output.detected_issue)) {
          lastError = "Invalid enum values in model output";
          continue; // retry
        }

        // ── Persist valid output ──────────────────────────────────
        const latencyMs = Date.now() - startTime;
        await turnDataSource.updateOne({
          id: parsed.turnId,
          assistantText: output.next_prompt,
          assistantPromptType: output.prompt_type,
          assistantDetectedIssue: output.detected_issue,
          latencyMs,
        });

        return; // success
      } catch (error) {
        // LLM call or schema parse failure — count as a retry
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    // ── All retries exhausted — fail gracefully ──────────────────
    const latencyMs = Date.now() - startTime;
    console.error(
      `Generate prompt failed for turn ${parsed.turnId} after ${MAX_ENFORCEMENT_RETRIES + 1} attempts. Last error: ${lastError}`,
    );

    await turnDataSource.updateOne({
      id: parsed.turnId,
      assistantText: "I need a moment. Could you rephrase that?",
      assistantPromptType: "clarify",
      assistantDetectedIssue: "none",
      latencyMs,
    });
  };
}
