import type { GetOneTopicFileDataSourceOutput } from "../types/data-source/topic-file/index.js";
import type {
  GetManyTopicFileServiceOutput,
  CreateOneTopicFileServiceOutput,
  DeleteOneTopicFileServiceOutput,
} from "../types/service/topic-file/index.js";

type TopicFileServiceItem = GetManyTopicFileServiceOutput[number];

function topicFileFromDataSourceToService(
  input: GetOneTopicFileDataSourceOutput,
): TopicFileServiceItem {
  return {
    id: input.id,
    kind: input.kind,
    storageKey: input.storageKey,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: Number(input.sizeBytes),
    createdAt: input.createdAt,
  };
}

export class TopicFileMapper {
  public static readonly getMany = {
    output: {
      fromDataSourceToService(
        input: GetOneTopicFileDataSourceOutput[],
      ): GetManyTopicFileServiceOutput {
        return input.map(topicFileFromDataSourceToService);
      },
    },
  };

  public static readonly createOne = {
    output: {
      fromDataSourceToService(
        input: GetOneTopicFileDataSourceOutput,
      ): CreateOneTopicFileServiceOutput {
        return topicFileFromDataSourceToService(input);
      },
    },
  };

  public static readonly deleteOne = {
    output: {
      fromDataSourceToService(
        input: GetOneTopicFileDataSourceOutput,
      ): DeleteOneTopicFileServiceOutput {
        return {
          id: input.id,
        };
      },
    },
  };
}
