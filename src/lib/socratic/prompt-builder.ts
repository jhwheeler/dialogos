import type { PromptContext, ConversationTurn } from "../providers/llm-provider.js";
import { buildSystemPrompt } from "./system-prompt.js";
import type { SystemPromptConfig } from "./system-prompt.js";

export interface PromptBuilderInput {
  /** The current turn's transcribed student text. */
  studentText: string;
  /** Session trivium stage. */
  triviumStage: string;
  /** Topic title. */
  topicTitle: string;
  /** Topic description. */
  topicDescription?: string | null;
  /** Source title (if session has a source). */
  sourceTitle?: string | null;
  /** Source citation. */
  sourceCitation?: string | null;
  /** Source extracted text (for tier 1 grounding). */
  sourceExtractedText?: string | null;
  /** Source grounding tier (1, 2, or 3). */
  groundingTier?: number | null;
  /** Prior turns for this session (already ordered by index). */
  priorTurns: PriorTurn[];
  /** Max number of prior turns to include. Default: 6. */
  maxPriorTurns?: number;
}

export interface PriorTurn {
  studentText: string | null;
  assistantText: string | null;
}

const MAX_STUDENT_TEXT_LENGTH = 2000;
const MAX_EXTRACTED_TEXT_LENGTH = 8000;
const MAX_PRIOR_TURN_TEXT_LENGTH = 2000;

/** Strip control characters (keep newlines and tabs) and XML-like delimiter tags
 *  to prevent prompt injection via tag breakout. */
function sanitizeText(text: string): string {
  return (
    text
      // eslint-disable-next-line no-control-regex -- intentional: strip dangerous control chars for prompt injection prevention
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
      .replace(/<\/?[a-zA-Z_][\w.-]*>/g, "")
  );
}

export function buildPromptContext(input: PromptBuilderInput): PromptContext {
  const maxTurns = input.maxPriorTurns ?? 6;

  // Build conversation history from prior turns (last N)
  const recentTurns = input.priorTurns.slice(-maxTurns);
  const conversationHistory: ConversationTurn[] = [];

  for (const turn of recentTurns) {
    if (turn.studentText) {
      conversationHistory.push({
        role: "student",
        text: `<student_speech>${sanitizeText(turn.studentText).slice(0, MAX_PRIOR_TURN_TEXT_LENGTH)}</student_speech>`,
      });
    }
    if (turn.assistantText) {
      conversationHistory.push({
        role: "assistant",
        text: turn.assistantText,
      });
    }
  }

  // Sanitize current student text
  const currentStudentText = `<student_speech>${sanitizeText(input.studentText).slice(0, MAX_STUDENT_TEXT_LENGTH)}</student_speech>`;

  // Sanitize extracted text
  const cleanExtractedText = input.sourceExtractedText
    ? sanitizeText(input.sourceExtractedText).slice(0, MAX_EXTRACTED_TEXT_LENGTH)
    : undefined;

  // Build system prompt
  const systemPromptConfig: SystemPromptConfig = {
    triviumStage: input.triviumStage,
    topicTitle: input.topicTitle,
    topicDescription: input.topicDescription ?? undefined,
    sourceTitle: input.sourceTitle ?? undefined,
    sourceCitation: input.sourceCitation ?? undefined,
    sourceExtractedText: cleanExtractedText,
    groundingTier: input.groundingTier ?? undefined,
  };

  const systemMessage = buildSystemPrompt(systemPromptConfig);

  return {
    systemMessage,
    conversationHistory,
    currentStudentText,
  };
}
