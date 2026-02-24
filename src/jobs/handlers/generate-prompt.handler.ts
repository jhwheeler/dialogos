import type { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import type { SessionDataSource } from "../../data-sources/session/session.data-source.js";
import type { TopicDataSource } from "../../data-sources/topic/topic.data-source.js";
import type { SourceDataSource } from "../../data-sources/source/source.data-source.js";
import type { LlmProvider } from "../../lib/providers/llm-provider.js";
import type { JobHandler, JobPayload } from "../../lib/queue/types.js";
import { GeneratePromptPayloadSchema } from "../../lib/queue/types.js";
import { buildPromptContext } from "../../lib/socratic/prompt-builder.js";
import { runEnforcementLoop } from "../../lib/socratic/enforcement-loop.js";
import { PROMPT_TYPE_VALUES, DETECTED_ISSUE_VALUES } from "../../lib/socratic/types.js";

export function createGeneratePromptHandler(
  turnDataSource: TurnDataSource,
  sessionDataSource: SessionDataSource | null = null,
  topicDataSource: TopicDataSource | null = null,
  sourceDataSource: SourceDataSource | null = null,
  llmProvider: LlmProvider | null = null,
): JobHandler {
  return async (payload: JobPayload): Promise<void> => {
    const parsed = GeneratePromptPayloadSchema.parse(payload);

    const turn = await turnDataSource.getOne({ id: parsed.turnId });
    if (!turn) {
      throw new Error(`Turn not found: ${parsed.turnId}`);
    }

    // If LLM provider is configured and we have the data sources + student text, use real LLM
    if (llmProvider && sessionDataSource && topicDataSource && turn.studentText) {
      const session = await sessionDataSource.getOne({ id: turn.sessionId });
      if (!session) {
        throw new Error(`Session not found: ${turn.sessionId}`);
      }

      const topic = await topicDataSource.getOne({ id: session.topicId });
      if (!topic) {
        throw new Error(`Topic not found: ${session.topicId}`);
      }

      // Fetch source if session has one
      let source: {
        title: string;
        citation: string | null;
        extractedText: string | null;
        groundingTier: number | null;
      } | null = null;
      if (session.sourceId && sourceDataSource) {
        source = await sourceDataSource.getOne({ id: session.sourceId });
      }

      // Fetch prior turns (last 6)
      const allTurns = await turnDataSource.getMany({ sessionId: turn.sessionId });
      // Exclude the current turn from prior turns
      const priorTurns = allTurns
        .filter((t) => t.id !== turn.id)
        .map((t) => ({
          studentText: t.studentText,
          assistantText: t.assistantText,
          assistantPromptType: t.assistantPromptType,
          assistantDetectedIssue: t.assistantDetectedIssue,
        }));

      const context = buildPromptContext({
        studentText: turn.studentText,
        triviumStage: session.triviumStage,
        topicTitle: topic.title,
        topicDescription: topic.description,
        sourceTitle: source?.title,
        sourceCitation: source?.citation,
        sourceExtractedText: source?.extractedText,
        groundingTier: source?.groundingTier,
        priorTurns,
      });

      const startTime = Date.now();
      const result = await runEnforcementLoop(llmProvider, context);
      const latencyMs = Date.now() - startTime;

      // Validate enums at persistence layer — coerce invalid values to safe defaults
      const promptType = (PROMPT_TYPE_VALUES as readonly string[]).includes(result.promptType)
        ? result.promptType
        : "clarify";
      const detectedIssue = (DETECTED_ISSUE_VALUES as readonly string[]).includes(
        result.detectedIssue,
      )
        ? result.detectedIssue
        : "none";

      await turnDataSource.updateOne({
        id: parsed.turnId,
        assistantText: result.nextPrompt,
        assistantPromptType: promptType,
        assistantDetectedIssue: detectedIssue,
        latencyMs,
      });
    } else {
      // Placeholder fallback (dev without API keys or missing data sources)
      await turnDataSource.updateOne({
        id: parsed.turnId,
        assistantText: "[placeholder: prompt pending real LLM]",
        assistantPromptType: "clarify",
        assistantDetectedIssue: "none",
        latencyMs: 0,
      });
    }
  };
}
