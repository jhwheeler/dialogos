import type { PrismaClient } from "@prisma/client";
import type {
  GetOneSourceDataSourceInput,
  GetOneSourceDataSourceOutput,
  GetManySourceDataSourceInput,
  GetManySourceDataSourceOutput,
  CreateOneSourceDataSourceInput,
  CreateOneSourceDataSourceOutput,
  UpdateOneSourceDataSourceInput,
  UpdateOneSourceDataSourceOutput,
  DeleteOneSourceDataSourceInput,
  DeleteOneSourceDataSourceOutput,
} from "../../types/data-source/source/index.js";

export class SourceDataSource {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOne(
    input: GetOneSourceDataSourceInput,
  ): Promise<GetOneSourceDataSourceOutput | null> {
    return this.prisma.source.findUnique({
      where: { id: input.id },
    });
  }

  public async getMany(
    input: GetManySourceDataSourceInput,
  ): Promise<GetManySourceDataSourceOutput> {
    return this.prisma.source.findMany({
      where: {
        topicId: input.topicId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  public async createOne(
    input: CreateOneSourceDataSourceInput,
  ): Promise<CreateOneSourceDataSourceOutput> {
    return this.prisma.source.create({
      data: {
        topicId: input.topicId,
        topicFileId: input.topicFileId,
        sourceType: input.sourceType,
        title: input.title,
        citation: input.citation,
        extractedText: input.extractedText,
        groundingTier: input.groundingTier,
      },
    });
  }

  public async updateOne(
    input: UpdateOneSourceDataSourceInput,
  ): Promise<UpdateOneSourceDataSourceOutput> {
    return this.prisma.source.update({
      where: { id: input.id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.citation !== undefined && { citation: input.citation }),
        ...(input.extractedText !== undefined && { extractedText: input.extractedText }),
        ...(input.groundingTier !== undefined && { groundingTier: input.groundingTier }),
        ...(input.preprocessingStatus !== undefined && {
          preprocessingStatus: input.preprocessingStatus,
        }),
        ...(input.preprocessingConfidence !== undefined && {
          preprocessingConfidence: input.preprocessingConfidence,
        }),
      },
    });
  }

  public async updatePreprocessingStatus(input: {
    id: string;
    preprocessingStatus: "none" | "processing" | "pending_confirmation" | "confirmed" | "degraded";
    preprocessingConfidence?: number | null;
    extractedText?: string;
    groundingTier?: number;
  }): Promise<UpdateOneSourceDataSourceOutput> {
    return this.prisma.source.update({
      where: { id: input.id },
      data: {
        preprocessingStatus: input.preprocessingStatus,
        ...(input.preprocessingConfidence !== undefined && {
          preprocessingConfidence: input.preprocessingConfidence,
        }),
        ...(input.extractedText !== undefined && { extractedText: input.extractedText }),
        ...(input.groundingTier !== undefined && { groundingTier: input.groundingTier }),
      },
    });
  }

  public async deleteOne(
    input: DeleteOneSourceDataSourceInput,
  ): Promise<DeleteOneSourceDataSourceOutput> {
    return this.prisma.source.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    });
  }
}
