import type { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import type { PromptGenerationService } from "../../services/prompt-generation/prompt-generation.service.js";
import type { JobHandler, JobPayload } from "../../lib/queue/types.js";
import { GeneratePromptPayloadSchema } from "../../lib/queue/types.js";
import { NotFoundError } from "../../errors/not-found-error.js";

export function createGeneratePromptHandler(
  turnDataSource: TurnDataSource,
  promptGenerationService: PromptGenerationService | null = null,
): JobHandler {
  return async (payload: JobPayload): Promise<void> => {
    const parsed = GeneratePromptPayloadSchema.parse(payload);

    const turn = await turnDataSource.getOne({ id: parsed.turnId });
    if (!turn) {
      throw new NotFoundError(`Turn not found: ${parsed.turnId}`);
    }

    // If the service is configured and we have student text, use real LLM
    if (promptGenerationService && turn.studentText) {
      const result = await promptGenerationService.generate(turn);

      await turnDataSource.updateOne({
        id: parsed.turnId,
        assistantText: result.assistantText,
        assistantPromptType: result.assistantPromptType,
        assistantDetectedIssue: result.assistantDetectedIssue,
        latencyMs: result.latencyMs,
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
