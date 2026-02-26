import type { GetOneSessionDataSourceOutput } from "../types/data-source/session/index.js";
import type {
  GetOneSessionServiceOutput,
  DeleteOneSessionServiceOutput,
} from "../types/service/session/index.js";

function sessionFromDataSourceToService(
  input: GetOneSessionDataSourceOutput,
): GetOneSessionServiceOutput {
  return {
    id: input.id,
    topicId: input.topicId,
    sourceId: input.sourceId,
    triviumStage: input.triviumStage,
    status: input.status,
    bookPhase: input.bookPhase,
    startedAt: input.startedAt?.toISOString() ?? null,
    endedAt: input.endedAt?.toISOString() ?? null,
    createdAt: input.createdAt.toISOString(),
  };
}

export class SessionMapper {
  public static readonly getOne = {
    output: {
      fromDataSourceToService: sessionFromDataSourceToService,
    },
  };

  public static readonly getMany = {
    output: {
      fromDataSourceToService(
        input: GetOneSessionDataSourceOutput[],
      ): GetOneSessionServiceOutput[] {
        return input.map(sessionFromDataSourceToService);
      },
    },
  };

  public static readonly createOne = {
    output: {
      fromDataSourceToService: sessionFromDataSourceToService,
    },
  };

  public static readonly startOne = {
    output: {
      fromDataSourceToService: sessionFromDataSourceToService,
    },
  };

  public static readonly endOne = {
    output: {
      fromDataSourceToService: sessionFromDataSourceToService,
    },
  };

  public static readonly abortOne = {
    output: {
      fromDataSourceToService: sessionFromDataSourceToService,
    },
  };

  public static readonly deleteOne = {
    output: {
      fromDataSourceToService(input: GetOneSessionDataSourceOutput): DeleteOneSessionServiceOutput {
        return {
          id: input.id,
        };
      },
    },
  };
}
