import type { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import type { SessionDataSource } from "../../data-sources/session/session.data-source.js";
import type { TopicDataSource } from "../../data-sources/topic/topic.data-source.js";
import type { SourceDataSource } from "../../data-sources/source/source.data-source.js";
import type { LlmProvider } from "../../lib/providers/llm-provider.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { buildPromptContext } from "../../lib/socratic/prompt-builder.js";
import { runEnforcementLoop } from "../../lib/socratic/enforcement-loop.js";
import { PROMPT_TYPE_VALUES, DETECTED_ISSUE_VALUES } from "../../lib/socratic/types.js";

export interface PromptGenerationResult {
  assistantText: string;
  assistantPromptType: string;
  assistantDetectedIssue: string;
  latencyMs: number;
}

interface TurnInput {
  id: string;
  sessionId: string;
  studentText: string | null;
}

export class PromptGenerationService {
  public constructor(
    private readonly turnDataSource: TurnDataSource,
    private readonly sessionDataSource: SessionDataSource,
    private readonly topicDataSource: TopicDataSource,
    private readonly sourceDataSource: SourceDataSource,
    private readonly llmProvider: LlmProvider,
  ) {}

  public async generate(turn: TurnInput): Promise<PromptGenerationResult> {
    if (!turn.studentText) {
      throw new Error("Cannot generate prompt without student text");
    }

    const session = await this.sessionDataSource.getOne({ id: turn.sessionId });
    if (!session) {
      throw new NotFoundError(`Session not found: ${turn.sessionId}`);
    }

    const topic = await this.topicDataSource.getOne({ id: session.topicId });
    if (!topic) {
      throw new NotFoundError(`Topic not found: ${session.topicId}`);
    }

    // Fetch source if session has one
    let source: {
      title: string;
      citation: string | null;
      extractedText: string | null;
      groundingTier: number | null;
    } | null = null;
    if (session.sourceId) {
      source = await this.sourceDataSource.getOne({ id: session.sourceId });
      if (!source) {
        throw new NotFoundError(`Source not found: ${session.sourceId}`);
      }
    }

    // Fetch prior turns (last 6)
    const allTurns = await this.turnDataSource.getMany({ sessionId: turn.sessionId });
    const priorTurns = allTurns
      .filter((t) => t.id !== turn.id)
      .map((t) => ({
        studentText: t.studentText,
        assistantText: t.assistantText,
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
      bookPhase: session.bookPhase,
      priorTurns,
    });

    const startTime = Date.now();
    const result = await runEnforcementLoop(this.llmProvider, context);
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

    return {
      assistantText: result.nextPrompt,
      assistantPromptType: promptType,
      assistantDetectedIssue: detectedIssue,
      latencyMs,
    };
  }
}
