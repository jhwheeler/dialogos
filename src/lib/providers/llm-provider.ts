export interface LlmProvider {
  generateSocraticPrompt(context: PromptContext): Promise<SocraticOutput>;
}

export interface PromptContext {
  systemMessage: string;
  conversationHistory: ConversationTurn[];
  currentStudentText: string;
}

export interface ConversationTurn {
  role: "student" | "assistant";
  text: string;
  promptType?: string;
  detectedIssue?: string;
}

export interface SocraticOutput {
  nextPrompt: string;
  promptType: string;
  detectedIssue: string;
  stopReason: string;
}
