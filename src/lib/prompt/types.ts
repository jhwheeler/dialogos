/** Context needed to build the Socratic system prompt and conversation. */
export interface PromptContext {
  /** Topic title. */
  topicTitle: string;
  /** Topic description (optional). */
  topicDescription: string | null;
  /** Trivium stage for this session. */
  triviumStage: "grammar" | "logic" | "rhetoric" | "combined";
  /** Source information (null if no source linked). */
  source: {
    title: string;
    sourceType: string;
    groundingTier: number;
    citation: string | null;
    extractedText: string | null;
  } | null;
  /** Previous turns in chronological order (oldest first). Last N turns. */
  previousTurns: Array<{
    studentText: string | null;
    assistantText: string | null;
  }>;
  /** The current student utterance (already transcribed). */
  currentStudentText: string;
}
