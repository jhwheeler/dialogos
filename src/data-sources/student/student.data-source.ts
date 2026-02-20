import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  GetOneStudentDataSourceInput,
  GetOneStudentDataSourceOutput,
  GetOneByEmailStudentDataSourceInput,
  GetOneByEmailStudentDataSourceOutput,
  CreateOneStudentDataSourceInput,
  CreateOneStudentDataSourceOutput,
  UpdateOneStudentDataSourceInput,
  UpdateOneStudentDataSourceOutput,
  DeleteOneStudentDataSourceInput,
  DeleteOneStudentDataSourceOutput,
} from "../../types/data-source/student/index.js";

export class StudentDataSource {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOne(
    input: GetOneStudentDataSourceInput,
  ): Promise<GetOneStudentDataSourceOutput | null> {
    return this.prisma.student.findUnique({
      where: { id: input.id },
    });
  }

  public async getOneByEmail(
    input: GetOneByEmailStudentDataSourceInput,
  ): Promise<GetOneByEmailStudentDataSourceOutput | null> {
    return this.prisma.student.findFirst({
      where: {
        email: input.email,
        deletedAt: null,
      },
    });
  }

  public async createOne(
    input: CreateOneStudentDataSourceInput,
  ): Promise<CreateOneStudentDataSourceOutput> {
    return this.prisma.student.create({
      data: {
        email: input.email,
        displayName: input.displayName,
      },
    });
  }

  public async updateOne(
    input: UpdateOneStudentDataSourceInput,
  ): Promise<UpdateOneStudentDataSourceOutput> {
    return this.prisma.student.update({
      where: { id: input.id },
      data: {
        displayName: input.displayName,
        settings: input.settings as Prisma.InputJsonValue | undefined,
        plan: input.plan,
        trialRemainingSeconds: input.trialRemainingSeconds,
      },
    });
  }

  public async deleteOne(
    input: DeleteOneStudentDataSourceInput,
  ): Promise<DeleteOneStudentDataSourceOutput> {
    return this.prisma.student.update({
      where: { id: input.id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
