import type { GetOneSourceDataSourceOutput } from "../types/data-source/source/index.js";
import type {
  GetOneSourceServiceOutput,
  DeleteOneSourceServiceOutput,
} from "../types/service/source/index.js";

function sourceFromDataSourceToService(
  input: GetOneSourceDataSourceOutput,
): GetOneSourceServiceOutput {
  return {
    id: input.id,
    topicId: input.topicId,
    topicFileId: input.topicFileId,
    sourceType: input.sourceType,
    title: input.title,
    citation: input.citation,
    extractedText: input.extractedText,
    groundingTier: input.groundingTier,
    createdAt: input.createdAt.toISOString(),
  };
}

export class SourceMapper {
  public static readonly getOne = {
    output: {
      fromDataSourceToService: sourceFromDataSourceToService,
    },
  };

  public static readonly getMany = {
    output: {
      fromDataSourceToService(input: GetOneSourceDataSourceOutput[]): GetOneSourceServiceOutput[] {
        return input.map(sourceFromDataSourceToService);
      },
    },
  };

  public static readonly createOne = {
    output: {
      fromDataSourceToService: sourceFromDataSourceToService,
    },
  };

  public static readonly updateOne = {
    output: {
      fromDataSourceToService: sourceFromDataSourceToService,
    },
  };

  public static readonly deleteOne = {
    output: {
      fromDataSourceToService(input: GetOneSourceDataSourceOutput): DeleteOneSourceServiceOutput {
        return {
          id: input.id,
        };
      },
    },
  };
}
