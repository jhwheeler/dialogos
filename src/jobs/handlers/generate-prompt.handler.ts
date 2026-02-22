import type { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import type { JobHandler, JobPayload } from "../../lib/queue/types.js";
import { GeneratePromptPayloadSchema } from "../../lib/queue/types.js";

export function createGeneratePromptHandler(turnDataSource: TurnDataSource): JobHandler {
  return async (payload: JobPayload): Promise<void> => {
    const parsed = GeneratePromptPayloadSchema.parse(payload);

    // No-op: In PR-4 this will call the LLM with Socratic enforcement.
    // For now, write placeholder values to mark the turn as complete.
    await turnDataSource.updateOne({
      id: parsed.turnId,
      assistantText: "[placeholder: prompt pending real LLM]",
      assistantPromptType: "clarify",
      assistantDetectedIssue: "none",
      latencyMs: 0,
    });
  };
}
