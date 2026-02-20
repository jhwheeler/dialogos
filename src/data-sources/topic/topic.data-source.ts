import type { PrismaClient } from "@prisma/client";
import type {
  GetOneTopicDataSourceInput,
  GetOneTopicDataSourceOutput,
  GetManyTopicDataSourceInput,
  GetManyTopicDataSourceOutput,
  CreateOneTopicDataSourceInput,
  CreateOneTopicDataSourceOutput,
  UpdateOneTopicDataSourceInput,
  UpdateOneTopicDataSourceOutput,
  DeleteOneTopicDataSourceInput,
  DeleteOneTopicDataSourceOutput,
} from "../../types/data-source/topic/index.js";

export class TopicDataSource {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOne(
    input: GetOneTopicDataSourceInput,
  ): Promise<GetOneTopicDataSourceOutput | null> {
    return this.prisma.topic.findUnique({
      where: { id: input.id },
    });
  }

  public async getMany(input: GetManyTopicDataSourceInput): Promise<GetManyTopicDataSourceOutput> {
    return this.prisma.topic.findMany({
      where: {
        studentId: input.studentId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  public async createOne(
    input: CreateOneTopicDataSourceInput,
  ): Promise<CreateOneTopicDataSourceOutput> {
    return this.prisma.topic.create({
      data: {
        studentId: input.studentId,
        title: input.title,
        description: input.description,
      },
    });
  }

  public async updateOne(
    input: UpdateOneTopicDataSourceInput,
  ): Promise<UpdateOneTopicDataSourceOutput> {
    return this.prisma.topic.update({
      where: { id: input.id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
      },
    });
  }

  public async deleteOne(
    input: DeleteOneTopicDataSourceInput,
  ): Promise<DeleteOneTopicDataSourceOutput> {
    return this.prisma.topic.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    });
  }
}
