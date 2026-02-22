import type { PrismaClient } from "@prisma/client";
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
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.voiceRate !== undefined && { voiceRate: input.voiceRate }),
        ...(input.autoplay !== undefined && { autoplay: input.autoplay }),
        ...(input.strictness !== undefined && { strictness: input.strictness }),
        ...(input.plan !== undefined && { plan: input.plan }),
        ...(input.trialRemainingSeconds !== undefined && {
          trialRemainingSeconds: input.trialRemainingSeconds,
        }),
      },
    });
  }

  public async ensureExists(input: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<void> {
    await this.prisma.student.upsert({
      where: { id: input.id },
      update: {},
      create: { id: input.id, email: input.email, displayName: input.displayName },
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
