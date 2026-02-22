import type { GetOneTurnDataSourceOutput } from "../types/data-source/turn/index.js";
import type { GetOneTurnServiceOutput } from "../types/service/turn/index.js";

function turnFromDataSourceToService(input: GetOneTurnDataSourceOutput): GetOneTurnServiceOutput {
  return {
    id: input.id,
    sessionId: input.sessionId,
    index: input.index,
    studentAudioKey: input.studentAudioKey,
    studentText: input.studentText,
    assistantText: input.assistantText,
    assistantPromptType: input.assistantPromptType,
    assistantDetectedIssue: input.assistantDetectedIssue,
    latencyMs: input.latencyMs,
    createdAt: input.createdAt,
  };
}

export class TurnMapper {
  public static readonly getOne = {
    output: {
      fromDataSourceToService: turnFromDataSourceToService,
    },
  };

  public static readonly getMany = {
    output: {
      fromDataSourceToService(input: GetOneTurnDataSourceOutput[]): GetOneTurnServiceOutput[] {
        return input.map(turnFromDataSourceToService);
      },
    },
  };

  public static readonly createOne = {
    output: {
      fromDataSourceToService: turnFromDataSourceToService,
    },
  };
}
