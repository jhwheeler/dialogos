import type { PrismaClient } from "@prisma/client";
import type {
  GetOneSessionDataSourceInput,
  GetOneSessionDataSourceOutput,
  GetManySessionDataSourceInput,
  GetManySessionDataSourceOutput,
  CreateOneSessionDataSourceInput,
  CreateOneSessionDataSourceOutput,
  UpdateOneSessionDataSourceInput,
  UpdateOneSessionDataSourceOutput,
  DeleteOneSessionDataSourceInput,
  DeleteOneSessionDataSourceOutput,
} from "../../types/data-source/session/index.js";

export class SessionDataSource {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOne(
    input: GetOneSessionDataSourceInput,
  ): Promise<GetOneSessionDataSourceOutput | null> {
    return this.prisma.session.findUnique({
      where: { id: input.id },
    });
  }

  public async getMany(
    input: GetManySessionDataSourceInput,
  ): Promise<GetManySessionDataSourceOutput> {
    return this.prisma.session.findMany({
      where: {
        topicId: input.topicId,
        studentId: input.studentId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  public async createOne(
    input: CreateOneSessionDataSourceInput,
  ): Promise<CreateOneSessionDataSourceOutput> {
    return this.prisma.session.create({
      data: {
        studentId: input.studentId,
        topicId: input.topicId,
        sourceId: input.sourceId,
        triviumStage: input.triviumStage,
        status: input.status,
      },
    });
  }

  public async updateOne(
    input: UpdateOneSessionDataSourceInput,
  ): Promise<UpdateOneSessionDataSourceOutput> {
    return this.prisma.session.update({
      where: { id: input.id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.startedAt !== undefined && { startedAt: input.startedAt }),
        ...(input.endedAt !== undefined && { endedAt: input.endedAt }),
      },
    });
  }

  public async deleteOne(
    input: DeleteOneSessionDataSourceInput,
  ): Promise<DeleteOneSessionDataSourceOutput> {
    return this.prisma.session.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    });
  }
}
