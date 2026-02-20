import type { PrismaClient } from "@prisma/client";
import type {
  GetOneTopicFileDataSourceInput,
  GetOneTopicFileDataSourceOutput,
  GetManyTopicFileDataSourceInput,
  GetManyTopicFileDataSourceOutput,
  CreateOneTopicFileDataSourceInput,
  CreateOneTopicFileDataSourceOutput,
  DeleteOneTopicFileDataSourceInput,
  DeleteOneTopicFileDataSourceOutput,
} from "../../types/data-source/topic-file/index.js";

export class TopicFileDataSource {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOne(
    input: GetOneTopicFileDataSourceInput,
  ): Promise<GetOneTopicFileDataSourceOutput | null> {
    return this.prisma.topicFile.findUnique({
      where: { id: input.id },
    });
  }

  public async getMany(
    input: GetManyTopicFileDataSourceInput,
  ): Promise<GetManyTopicFileDataSourceOutput> {
    return this.prisma.topicFile.findMany({
      where: {
        topicId: input.topicId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  public async createOne(
    input: CreateOneTopicFileDataSourceInput,
  ): Promise<CreateOneTopicFileDataSourceOutput> {
    return this.prisma.topicFile.create({
      data: {
        topicId: input.topicId,
        kind: input.kind,
        storageKey: input.storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      },
    });
  }

  public async deleteOne(
    input: DeleteOneTopicFileDataSourceInput,
  ): Promise<DeleteOneTopicFileDataSourceOutput> {
    return this.prisma.topicFile.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    });
  }
}
