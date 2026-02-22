import type { GetOneTopicDataSourceOutput } from "../types/data-source/topic/index.js";
import type {
  GetOneTopicServiceOutput,
  DeleteOneTopicServiceOutput,
} from "../types/service/topic/index.js";

function topicFromDataSourceToService(
  input: GetOneTopicDataSourceOutput,
): GetOneTopicServiceOutput {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

export class TopicMapper {
  public static readonly getOne = {
    output: {
      fromDataSourceToService: topicFromDataSourceToService,
    },
  };

  public static readonly getMany = {
    output: {
      fromDataSourceToService(input: GetOneTopicDataSourceOutput[]): GetOneTopicServiceOutput[] {
        return input.map(topicFromDataSourceToService);
      },
    },
  };

  public static readonly createOne = {
    output: {
      fromDataSourceToService: topicFromDataSourceToService,
    },
  };

  public static readonly updateOne = {
    output: {
      fromDataSourceToService: topicFromDataSourceToService,
    },
  };

  public static readonly deleteOne = {
    output: {
      fromDataSourceToService(input: GetOneTopicDataSourceOutput): DeleteOneTopicServiceOutput {
        return {
          id: input.id,
        };
      },
    },
  };
}
